# 订阅支付实现逻辑详细文档

## 概述

本文档详细描述了基于 Next.js + Stripe + Drizzle ORM 的订阅支付系统的完整实现逻辑，包括前端用户交互、后端API处理、数据库操作和Webhook事件处理等各个环节。

## 系统架构

```
用户界面 (React) → API路由 (Next.js) → Stripe API → Webhook → 数据库更新
     ↓                ↓                ↓         ↓           ↓
定价页面        创建Checkout      支付处理    状态同步    订阅激活
```

## 核心组件

### 1. 数据库模式设计

#### 产品表 (products)
```sql
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  stripe_product_id VARCHAR UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 定价表 (prices)
```sql
CREATE TABLE prices (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id),
  stripe_price_id VARCHAR UNIQUE,
  unit_amount INTEGER, -- 以分为单位
  currency VARCHAR(3) DEFAULT 'usd',
  interval VARCHAR, -- 'month' | 'year'
  interval_count INTEGER DEFAULT 1,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 用户订阅表 (user_subscriptions)
```sql
CREATE TABLE user_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  stripe_subscription_id VARCHAR UNIQUE,
  stripe_customer_id VARCHAR,
  status VARCHAR, -- 'active' | 'canceled' | 'past_due' | 'unpaid'
  price_id INTEGER REFERENCES prices(id),
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  canceled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2. 支付流程实现

#### 2.1 订阅计划展示

**文件**: `src/app/pricing/components/subscription-plans.tsx`

```typescript
// 核心逻辑：获取并展示订阅计划
const SubscriptionPlans = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  
  useEffect(() => {
    // 从API获取订阅计划
    fetchSubscriptionPlans();
  }, []);
  
  const handleSubscribe = async (priceId: string) => {
    try {
      // 调用创建Checkout Session的API
      const response = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId })
      });
      
      const { url } = await response.json();
      
      // 重定向到Stripe Checkout页面
      window.location.href = url;
    } catch (error) {
      console.error('创建订阅失败:', error);
    }
  };
};
```

#### 2.2 创建Stripe Checkout Session

**文件**: `src/lib/actions/subscriptions.ts`

```typescript
export async function createSubscriptionCheckout(priceId: string) {
  try {
    // 1. 获取当前用户
    const user = await getCurrentUser();
    if (!user) throw new Error('用户未登录');
    
    // 2. 从数据库获取价格信息
    const price = await db.query.pricesTable.findFirst({
      where: eq(pricesTable.id, parseInt(priceId)),
      with: { product: true }
    });
    
    if (!price) throw new Error('价格不存在');
    
    // 3. 检查或创建Stripe价格
    let stripePriceId = price.stripePriceId;
    if (!stripePriceId) {
      const stripePrice = await stripe.prices.create({
        product: price.product.stripeProductId,
        unit_amount: price.unitAmount,
        currency: price.currency,
        recurring: {
          interval: price.interval as 'month' | 'year',
          interval_count: price.intervalCount
        }
      });
      
      stripePriceId = stripePrice.id;
      
      // 更新数据库中的Stripe价格ID
      await db.update(pricesTable)
        .set({ stripePriceId })
        .where(eq(pricesTable.id, price.id));
    }
    
    // 4. 创建Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      line_items: [{
        price: stripePriceId,
        quantity: 1
      }],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      metadata: {
        userId: user.id,
        priceId: priceId
      }
    });
    
    return { url: session.url };
  } catch (error) {
    console.error('创建Checkout Session失败:', error);
    throw error;
  }
}
```

#### 2.3 支付成功回调处理

**文件**: `src/app/pricing/page.client.tsx`

```typescript
const PricingPageClient = () => {
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const sessionId = urlParams.get('session_id');
    const canceled = urlParams.get('canceled');
    
    if (success === 'true' && sessionId) {
      // 处理订阅成功回调
      handleSubscriptionCallback(sessionId);
    } else if (canceled === 'true') {
      // 处理支付取消
      toast.error(t('subscription.payment.canceled'));
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [t]);
  
  const handleSubscriptionCallback = async (sessionId: string) => {
    try {
      const response = await fetch('/api/subscriptions/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success(t('subscription.success.message'));
        // 重定向到订阅管理页面
        router.push('/dashboard/billing');
      } else {
        toast.error(result.error || t('subscription.error.generic'));
      }
    } catch (error) {
      console.error('处理订阅回调失败:', error);
      toast.error(t('subscription.error.generic'));
    } finally {
      // 清除URL参数
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };
};
```

#### 2.4 订阅回调API处理

**文件**: `src/app/api/subscriptions/callback/route.ts`

```typescript
export async function POST(request: Request) {
  try {
    const { sessionId } = await request.json();
    
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: '缺少session ID' },
        { status: 400 }
      );
    }
    
    // 从Stripe获取Checkout Session详情
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer']
    });
    
    if (session.payment_status === 'paid' && session.subscription) {
      await handleSubscriptionSuccess(session);
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { success: false, error: '支付未完成或订阅创建失败' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('处理订阅回调失败:', error);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

async function handleSubscriptionSuccess(session: Stripe.Checkout.Session) {
  try {
    const subscription = session.subscription as Stripe.Subscription;
    const customer = session.customer as Stripe.Customer;
    const userId = session.metadata?.userId;
    const priceId = session.metadata?.priceId;
    
    if (!userId || !priceId) {
      throw new Error('缺少必要的元数据');
    }
    
    // 1. 创建或更新用户订阅记录
    const userSubscription = await db.insert(userSubscriptionsTable)
      .values({
        userId,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: customer.id,
        status: subscription.status,
        priceId: parseInt(priceId),
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: userSubscriptionsTable.stripeSubscriptionId,
        set: {
          status: subscription.status,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          updatedAt: new Date()
        }
      })
      .returning();
    
    // 2. 记录订阅历史
    await db.insert(subscriptionHistoryTable).values({
      subscriptionId: userSubscription[0].id,
      event: 'subscription_created',
      data: {
        stripeSubscriptionId: subscription.id,
        status: subscription.status,
        amount: subscription.items.data[0].price.unit_amount,
        currency: subscription.items.data[0].price.currency
      },
      createdAt: new Date()
    });
    
    // 3. 执行业务逻辑
    await executeSubscriptionBusinessLogic(userSubscription[0], subscription);
    
    console.log(`订阅成功处理完成: 用户 ${userId}, 订阅 ${subscription.id}`);
  } catch (error) {
    console.error('处理订阅成功失败:', error);
    throw error;
  }
}

async function executeSubscriptionBusinessLogic(
  userSubscription: any,
  stripeSubscription: Stripe.Subscription
) {
  try {
    // 1. 发送欢迎邮件
    await sendWelcomeEmail(userSubscription.userId, {
      subscriptionId: stripeSubscription.id,
      planName: stripeSubscription.items.data[0].price.nickname || '订阅计划'
    });
    
    // 2. 激活用户权限
    await activateUserPermissions(userSubscription.userId, {
      subscriptionLevel: getSubscriptionLevel(stripeSubscription.items.data[0].price.id)
    });
    
    // 3. 记录分析事件
    await recordAnalyticsEvent({
      event: 'subscription_activated',
      userId: userSubscription.userId,
      properties: {
        subscriptionId: stripeSubscription.id,
        amount: stripeSubscription.items.data[0].price.unit_amount,
        currency: stripeSubscription.items.data[0].price.currency,
        interval: stripeSubscription.items.data[0].price.recurring?.interval
      }
    });
    
    // 4. 更新用户积分或奖励
    await updateUserRewards(userSubscription.userId, {
      type: 'subscription_bonus',
      amount: 100 // 订阅奖励积分
    });
    
  } catch (error) {
    console.error('订阅业务逻辑执行失败:', error);
    // 即使业务逻辑失败，也不影响订阅状态的更新
  }
}
```

### 3. Webhook事件处理

**文件**: `src/app/api/webhooks/stripe/route.ts`

```typescript
export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');
  
  let event: Stripe.Event;
  
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error('Webhook签名验证失败:', error);
    return NextResponse.json(
      { error: 'Webhook签名验证失败' },
      { status: 400 }
    );
  }
  
  try {
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;
        
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
        
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
        
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
        
      default:
        console.log(`未处理的事件类型: ${event.type}`);
    }
    
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook处理失败:', error);
    return NextResponse.json(
      { error: 'Webhook处理失败' },
      { status: 500 }
    );
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    // 获取当前订阅信息
    const currentSubscription = await db.query.userSubscriptionsTable.findFirst({
      where: eq(userSubscriptionsTable.stripeSubscriptionId, subscription.id)
    });
    
    await db.update(userSubscriptionsTable)
      .set({
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        updatedAt: new Date()
      })
      .where(eq(userSubscriptionsTable.stripeSubscriptionId, subscription.id));
      
    // 检查是否为已取消订阅的到期处理
    if (currentSubscription && 
        currentSubscription.canceledAt && 
        subscription.status === 'canceled' &&
        new Date() >= new Date(subscription.current_period_end * 1000)) {
      
      // 订阅已取消且已到期，清零订阅积分
      await clearSubscriptionCredits(currentSubscription.userId, subscription.id);
    }
    
    // 记录状态变更历史
    if (currentSubscription) {
      await db.insert(subscriptionHistoryTable).values({
        subscriptionId: currentSubscription.id,
        event: 'subscription_updated',
        data: {
          status: subscription.status,
          previousStatus: currentSubscription.status,
          creditsCleared: currentSubscription.canceledAt && subscription.status === 'canceled'
        },
        createdAt: new Date()
      });
    }
  } catch (error) {
    console.error('处理订阅更新失败:', error);
    throw error;
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    const userSubscription = await db.query.userSubscriptionsTable.findFirst({
      where: eq(userSubscriptionsTable.stripeSubscriptionId, subscription.id)
    });
    
    if (userSubscription) {
      // 更新订阅状态为已删除
      await db.update(userSubscriptionsTable)
        .set({
          status: 'canceled',
          updatedAt: new Date()
        })
        .where(eq(userSubscriptionsTable.stripeSubscriptionId, subscription.id));
      
      // 清零订阅积分（订阅被删除意味着已彻底结束）
      await clearSubscriptionCredits(userSubscription.userId, subscription.id);
      
      // 记录删除历史
      await db.insert(subscriptionHistoryTable).values({
        subscriptionId: userSubscription.id,
        event: 'subscription_deleted',
        data: {
          deletedAt: new Date(),
          creditsCleared: true
        },
        createdAt: new Date()
      });
    }
  } catch (error) {
    console.error('处理订阅删除失败:', error);
    throw error;
  }
}

async function clearSubscriptionCredits(userId: string, subscriptionId: string) {
  try {
    // 1. 获取用户当前的订阅积分
    const userCredits = await db.query.userCreditsTable.findFirst({
      where: eq(userCreditsTable.userId, userId)
    });
    
    if (!userCredits || userCredits.subscriptionCredits <= 0) {
      console.log(`用户 ${userId} 无订阅积分需要清零`);
      return;
    }
    
    // 2. 记录积分清零前的状态
    const clearedAmount = userCredits.subscriptionCredits;
    
    // 3. 清零订阅积分
    await db.update(userCreditsTable)
      .set({
        subscriptionCredits: 0,
        updatedAt: new Date()
      })
      .where(eq(userCreditsTable.userId, userId));
    
    // 4. 记录积分变动历史
    await db.insert(creditsHistoryTable).values({
      userId: userId,
      type: 'subscription_expired_cleanup',
      amount: -clearedAmount,
      balance: userCredits.totalCredits - clearedAmount,
      description: `订阅到期清零积分，订阅ID: ${subscriptionId}`,
      metadata: {
        subscriptionId: subscriptionId,
        clearedAmount: clearedAmount,
        reason: 'subscription_canceled_and_expired'
      },
      createdAt: new Date()
    });
    
    console.log(`已清零用户 ${userId} 的订阅积分 ${clearedAmount}，订阅ID: ${subscriptionId}`);
    
    // 5. 发送通知给用户（可选）
    await sendCreditsClearedNotification(userId, clearedAmount, subscriptionId);
    
  } catch (error) {
    console.error('清零订阅积分失败:', error);
    throw error;
  }
}

async function sendCreditsClearedNotification(userId: string, clearedAmount: number, subscriptionId: string) {
  try {
    // 发送邮件通知用户积分已清零
    await sendEmail({
      to: userId, // 这里应该是用户邮箱，根据实际情况调整
      subject: '订阅积分清零通知',
      template: 'credits_cleared',
      data: {
        clearedAmount,
        subscriptionId,
        date: new Date().toLocaleDateString('zh-CN')
      }
    });
  } catch (error) {
    console.error('发送积分清零通知失败:', error);
    // 通知发送失败不应该影响积分清零操作
  }
}
```

### 4. 订阅积分清零机制

#### 4.1 积分清零触发条件

当满足以下条件时，系统会自动清零用户的订阅积分：

1. **订阅已取消且到期**：用户主动取消订阅（`canceledAt` 不为空），且当前时间已超过订阅周期结束时间
2. **订阅被删除**：Stripe 发送 `customer.subscription.deleted` 事件时

#### 4.2 积分清零逻辑说明

```typescript
// 积分清零的核心逻辑检查
const shouldClearCredits = (subscription, currentSubscription) => {
  // 条件1：订阅已被用户取消
  const isCanceled = currentSubscription?.canceledAt !== null;
  
  // 条件2：订阅状态为 canceled
  const isStatusCanceled = subscription.status === 'canceled';
  
  // 条件3：当前时间已超过订阅周期结束时间
  const isExpired = new Date() >= new Date(subscription.current_period_end * 1000);
  
  return isCanceled && isStatusCanceled && isExpired;
};
```

#### 4.3 积分清零流程

1. **检测触发条件**：在 Webhook 事件处理中检查是否满足清零条件
2. **获取用户积分**：查询用户当前的订阅积分余额
3. **执行清零操作**：将 `subscriptionCredits` 字段设置为 0
4. **记录变动历史**：在积分历史表中记录此次清零操作
5. **发送通知**：可选择发送邮件通知用户积分已清零

#### 4.4 数据库表结构要求

为了支持积分清零功能，需要以下数据库表：

```sql
-- 用户积分表
CREATE TABLE user_credits (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  subscription_credits INTEGER DEFAULT 0, -- 订阅积分
  total_credits INTEGER DEFAULT 0, -- 总积分
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 积分历史表
CREATE TABLE credits_history (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  type VARCHAR NOT NULL, -- 'subscription_expired_cleanup'
  amount INTEGER NOT NULL, -- 变动数量（负数表示扣除）
  balance INTEGER NOT NULL, -- 变动后余额
  description TEXT,
  metadata JSONB, -- 存储相关元数据
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 5. 订阅状态管理

#### 5.1 获取用户订阅状态

```typescript
export async function getUserSubscription(userId?: string) {
  try {
    const user = userId ? { id: userId } : await getCurrentUser();
    if (!user) return null;
    
    const subscription = await db.query.userSubscriptionsTable.findFirst({
      where: eq(userSubscriptionsTable.userId, user.id),
      with: {
        price: {
          with: {
            product: true
          }
        }
      },
      orderBy: desc(userSubscriptionsTable.createdAt)
    });
    
    return subscription;
  } catch (error) {
    console.error('获取用户订阅失败:', error);
    return null;
  }
}
```

#### 5.2 检查活跃订阅

```typescript
export async function hasActiveSubscription(userId?: string): Promise<boolean> {
  try {
    const subscription = await getUserSubscription(userId);
    
    if (!subscription) return false;
    
    // 检查订阅状态和有效期
    const isActive = subscription.status === 'active';
    const isNotExpired = new Date() < new Date(subscription.currentPeriodEnd);
    
    return isActive && isNotExpired;
  } catch (error) {
    console.error('检查活跃订阅失败:', error);
    return false;
  }
}
```

#### 5.3 取消订阅

```typescript
export async function cancelSubscription(subscriptionId: string) {
  try {
    const subscription = await db.query.userSubscriptionsTable.findFirst({
      where: eq(userSubscriptionsTable.id, parseInt(subscriptionId))
    });
    
    if (!subscription) {
      throw new Error('订阅不存在');
    }
    
    // 在Stripe中取消订阅
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true
    });
    
    // 更新数据库中的订阅状态
    await db.update(userSubscriptionsTable)
      .set({
        canceledAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(userSubscriptionsTable.id, subscription.id));
    
    // 记录取消历史
    await db.insert(subscriptionHistoryTable).values({
      subscriptionId: subscription.id,
      event: 'subscription_canceled',
      data: { 
        canceledAt: new Date(),
        note: '订阅积分将在订阅周期结束时清零'
      },
      createdAt: new Date()
    });
    
    // 注意：此时不立即清零积分，积分将在订阅周期结束时通过 Webhook 自动清零
    
    return { success: true };
  } catch (error) {
    console.error('取消订阅失败:', error);
    throw error;
  }
}
```

## 错误处理和日志记录

### 1. 错误分类

```typescript
class SubscriptionError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'SubscriptionError';
  }
}

// 错误代码定义
const ERROR_CODES = {
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  PRICE_NOT_FOUND: 'PRICE_NOT_FOUND',
  SUBSCRIPTION_NOT_FOUND: 'SUBSCRIPTION_NOT_FOUND',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  WEBHOOK_VERIFICATION_FAILED: 'WEBHOOK_VERIFICATION_FAILED',
  DATABASE_ERROR: 'DATABASE_ERROR',
  STRIPE_API_ERROR: 'STRIPE_API_ERROR'
};
```

### 2. 日志记录策略

```typescript
class SubscriptionLogger {
  static logSubscriptionEvent(event: string, data: any) {
    console.log(`[SUBSCRIPTION] ${event}:`, {
      timestamp: new Date().toISOString(),
      event,
      data
    });
  }
  
  static logError(error: Error, context: any) {
    console.error(`[SUBSCRIPTION ERROR]:`, {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      context
    });
  }
}
```

## 安全考虑

### 1. Webhook安全

- 验证Stripe Webhook签名
- 使用HTTPS端点
- 实现幂等性处理
- 限制请求频率

### 2. 数据保护

- 敏感数据加密存储
- 最小权限原则
- 定期安全审计
- PCI DSS合规性

### 3. 用户认证

```typescript
// 中间件验证用户身份
export async function requireAuth(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  
  if (!token) {
    throw new SubscriptionError('未授权访问', ERROR_CODES.USER_NOT_FOUND, 401);
  }
  
  const user = await verifyToken(token);
  if (!user) {
    throw new SubscriptionError('无效令牌', ERROR_CODES.USER_NOT_FOUND, 401);
  }
  
  return user;
}
```

## 性能优化

### 1. 数据库优化

```sql
-- 添加索引提高查询性能
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_stripe_id ON user_subscriptions(stripe_subscription_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_subscription_history_subscription_id ON subscription_history(subscription_id);
```

### 2. 缓存策略

```typescript
// Redis缓存订阅状态
class SubscriptionCache {
  static async getSubscription(userId: string) {
    const cacheKey = `subscription:${userId}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    const subscription = await getUserSubscription(userId);
    if (subscription) {
      await redis.setex(cacheKey, 300, JSON.stringify(subscription)); // 5分钟缓存
    }
    
    return subscription;
  }
  
  static async invalidateSubscription(userId: string) {
    const cacheKey = `subscription:${userId}`;
    await redis.del(cacheKey);
  }
}
```

## 测试策略

### 1. 单元测试

```typescript
describe('订阅支付逻辑', () => {
  test('应该成功创建Checkout Session', async () => {
    const mockUser = { id: 'user123', email: 'test@example.com' };
    const priceId = '1';
    
    jest.spyOn(auth, 'getCurrentUser').mockResolvedValue(mockUser);
    jest.spyOn(stripe.checkout.sessions, 'create').mockResolvedValue({
      id: 'cs_test_123',
      url: 'https://checkout.stripe.com/pay/cs_test_123'
    });
    
    const result = await createSubscriptionCheckout(priceId);
    
    expect(result.url).toBe('https://checkout.stripe.com/pay/cs_test_123');
  });
  
  test('应该正确处理订阅成功回调', async () => {
    const mockSession = {
      id: 'cs_test_123',
      payment_status: 'paid',
      subscription: {
        id: 'sub_test_123',
        status: 'active',
        current_period_start: 1640995200,
        current_period_end: 1643673600
      },
      customer: { id: 'cus_test_123' },
      metadata: { userId: 'user123', priceId: '1' }
    };
    
    jest.spyOn(stripe.checkout.sessions, 'retrieve').mockResolvedValue(mockSession);
    
    const response = await POST(new Request('http://localhost/api/subscriptions/callback', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'cs_test_123' })
    }));
    
    const result = await response.json();
    expect(result.success).toBe(true);
  });
});
```

### 2. 集成测试

```typescript
describe('订阅流程集成测试', () => {
  test('完整的订阅流程', async () => {
    // 1. 创建测试用户
    const user = await createTestUser();
    
    // 2. 创建测试产品和价格
    const { product, price } = await createTestProductAndPrice();
    
    // 3. 创建Checkout Session
    const checkout = await createSubscriptionCheckout(price.id.toString());
    expect(checkout.url).toBeDefined();
    
    // 4. 模拟支付成功
    const session = await simulateSuccessfulPayment(checkout.sessionId);
    
    // 5. 处理回调
    await handleSubscriptionSuccess(session);
    
    // 6. 验证订阅状态
    const subscription = await getUserSubscription(user.id);
    expect(subscription?.status).toBe('active');
  });
});
```

## 监控和告警

### 1. 关键指标监控

```typescript
// 监控指标收集
class SubscriptionMetrics {
  static async recordCheckoutCreated(priceId: string) {
    await metrics.increment('subscription.checkout.created', {
      priceId
    });
  }
  
  static async recordPaymentSuccess(amount: number, currency: string) {
    await metrics.increment('subscription.payment.success');
    await metrics.histogram('subscription.payment.amount', amount, {
      currency
    });
  }
  
  static async recordPaymentFailure(errorCode: string) {
    await metrics.increment('subscription.payment.failure', {
      errorCode
    });
  }
}
```

### 2. 告警配置

```yaml
# 告警规则示例
alerts:
  - name: 订阅支付失败率过高
    condition: subscription.payment.failure.rate > 0.05
    duration: 5m
    action: send_notification
    
  - name: Webhook处理延迟
    condition: subscription.webhook.processing_time > 30s
    duration: 2m
    action: send_notification
    
  - name: 数据库连接异常
    condition: subscription.database.connection_errors > 0
    duration: 1m
    action: send_alert
```

## 部署和运维

### 1. 环境配置

```bash
# 生产环境必需的环境变量
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
DATABASE_URL=postgresql://...
NEXT_PUBLIC_APP_URL=https://yourdomain.com
REDIS_URL=redis://...
```

### 2. 数据库迁移

```typescript
// 迁移脚本示例
export async function up(db: Database) {
  await db.schema
    .createTable('user_subscriptions')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('user_id', 'varchar', (col) => col.notNull())
    .addColumn('stripe_subscription_id', 'varchar', (col) => col.unique())
    .addColumn('status', 'varchar', (col) => col.notNull())
    .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
    .execute();
}
```

### 3. 健康检查

```typescript
// 健康检查端点
export async function GET() {
  try {
    // 检查数据库连接
    await db.select().from(userSubscriptionsTable).limit(1);
    
    // 检查Stripe API
    await stripe.products.list({ limit: 1 });
    
    // 检查Redis连接
    await redis.ping();
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'ok',
        stripe: 'ok',
        redis: 'ok'
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}
```

## 故障排除

### 常见问题和解决方案

1. **支付失败**
   - 检查Stripe API密钥配置
   - 验证产品和价格设置
   - 查看Stripe Dashboard中的错误日志

2. **Webhook事件丢失**
   - 检查Webhook端点URL配置
   - 验证Webhook签名密钥
   - 实现事件重试机制

3. **订阅状态不同步**
   - 检查数据库连接
   - 验证Webhook处理逻辑
   - 手动同步订阅状态

4. **性能问题**
   - 添加数据库索引
   - 实现缓存策略
   - 优化查询语句

## 总结

本文档详细描述了订阅支付系统的完整实现逻辑，涵盖了从前端用户交互到后端数据处理的各个环节。通过遵循这些实现模式和最佳实践，可以构建一个安全、可靠、高性能的订阅支付系统。

关键要点：
- 完整的错误处理和日志记录
- 安全的Webhook验证和处理
- 合理的数据库设计和索引优化
- 全面的测试覆盖
- 有效的监控和告警机制
- 清晰的部署和运维流程

定期审查和更新这些实现，确保系统始终满足业务需求和安全要求。