import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 错误代码定义
const ERROR_CODES = {
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  PRICE_NOT_FOUND: 'PRICE_NOT_FOUND',
  STRIPE_CONFIG_ERROR: 'STRIPE_CONFIG_ERROR',
  PARAMETER_MISSING: 'PARAMETER_MISSING',
  STRIPE_API_ERROR: 'STRIPE_API_ERROR'
};

// 日志记录类
class SubscriptionLogger {
  static logEvent(event: string, data: any) {
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

export async function POST(request: NextRequest) {
  let userId: string | undefined;
  let priceId: string | undefined;
  let credits: number | undefined;
  let mode: string | undefined;
  let billingCycle: string | undefined;
  
  try {
    const requestData = await request.json();
    userId = requestData.userId;
    priceId = requestData.priceId;
    credits = requestData.credits;
    mode = requestData.mode || 'payment';
    billingCycle = requestData.billingCycle;

    // 参数验证
    if (!priceId || !userId || !credits) {
      SubscriptionLogger.logError(new Error('缺少必要参数'), { priceId, userId, credits });
      return NextResponse.json(
        { 
          error: '缺少必要参数',
          code: ERROR_CODES.PARAMETER_MISSING
        },
        { status: 400 }
      );
    }

    if (!stripe) {
      SubscriptionLogger.logError(new Error('Stripe 未正确配置'), {});
      return NextResponse.json(
        { 
          error: 'Stripe 未正确配置',
          code: ERROR_CODES.STRIPE_CONFIG_ERROR
        },
        { status: 500 }
      );
    }

    // 获取用户信息以获取邮箱
    const { data, error: userError } = await supabase.auth.admin.getUserById(userId);
    const user = data?.user; // 正确访问用户对象
    
    SubscriptionLogger.logEvent('用户信息查询', { 
      userId, 
      userError, 
      userExists: !!user,
      userEmail: user?.email,
      userData: user ? {
        id: user.id,
        email: user.email,
        emailConfirmed: user.email_confirmed_at,
        createdAt: user.created_at
      } : null
    });
    
    if (userError || !user) {
      SubscriptionLogger.logError(new Error('无法获取用户信息'), { userId, userError });
      return NextResponse.json(
        { 
          error: '无法获取用户信息',
          code: ERROR_CODES.USER_NOT_FOUND
        },
        { status: 400 }
      );
    }

    if (!user.email) {
      SubscriptionLogger.logError(new Error('用户邮箱为空'), { 
        userId, 
        userData: {
          id: user.id,
          email: user.email,
          emailConfirmed: user.email_confirmed_at,
          createdAt: user.created_at
        }
      });
      return NextResponse.json(
        { 
          error: '用户邮箱信息不完整',
          code: ERROR_CODES.USER_NOT_FOUND
        },
        { status: 400 }
      );
    }

    SubscriptionLogger.logEvent('用户信息获取成功', { userId, email: user.email });

    // 检查是否存在现有客户记录
    try {
      const customers = await stripe.customers.list({
        email: user.email,
        limit: 1
      });
      
      if (customers.data.length > 0) {
        SubscriptionLogger.logEvent('发现现有客户记录', { 
          customerId: customers.data[0].id,
          email: customers.data[0].email 
        });
        
        // 删除现有客户记录，避免冲突
        await stripe.customers.del(customers.data[0].id);
        SubscriptionLogger.logEvent('已删除现有客户记录', { customerId: customers.data[0].id });
      }
    } catch (error) {
      SubscriptionLogger.logError(error as Error, { context: '清理现有客户记录' });
    }

    // 创建 Stripe Checkout Session - 使用最小化配置
    const sessionConfig: any = {
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: mode, // 'payment' 或 'subscription'
      customer_email: user.email, // 使用原始邮箱
      billing_address_collection: 'auto', // 改为auto，只收集国家/地区
      allow_promotion_codes: false,
    };

    // 只在支付模式下添加特定参数
    if (mode === 'payment') {
      sessionConfig.customer_creation = 'always';
      // 移除 customer_update 参数，因为它需要与 customer 参数一起使用
    } else if (mode === 'subscription') {
      // 订阅模式下，我们已经删除了现有客户记录，Stripe会自动创建新客户
      // 不需要额外的customer_creation参数
    }

    // 添加URL和元数据
    sessionConfig.success_url = mode === 'subscription' 
      ? `${request.nextUrl.origin}/api/credits/update?success=true&session_id={CHECKOUT_SESSION_ID}&userId=${userId}&credits=${credits}`
      : `${request.nextUrl.origin}/api/credits/update?success=true&session_id={CHECKOUT_SESSION_ID}&userId=${userId}&credits=${credits}`;
    
    sessionConfig.cancel_url = mode === 'subscription'
      ? `${request.nextUrl.origin}/pricing?canceled=true`
      : `${request.nextUrl.origin}/credits?canceled=true`;
    
    sessionConfig.metadata = {
      userId,
      credits: credits.toString(),
      mode: mode,
      billingCycle: billingCycle || 'monthly',
      userEmail: user.email // 在元数据中也保存邮箱
    };

    // 创建 Stripe Checkout Session
    const session = await stripe.checkout.sessions.create(sessionConfig);

    SubscriptionLogger.logEvent('Stripe会话创建成功', {
      sessionId: session.id,
      customerEmail: user.email,
      mode: mode,
      priceId
    });

    return NextResponse.json({ 
      sessionId: session.id,
      success: true
    });
  } catch (error) {
    SubscriptionLogger.logError(error as Error, { 
      userId, 
      priceId, 
      mode, 
      credits 
    });
    
    // 根据错误类型返回不同的错误信息
    if (error instanceof Error) {
      if (error.message.includes('No such price')) {
        return NextResponse.json(
          { 
            error: '价格配置不存在',
            code: ERROR_CODES.PRICE_NOT_FOUND
          },
          { status: 400 }
        );
      }
      
      if (error.message.includes('Invalid API key')) {
        return NextResponse.json(
          { 
            error: 'Stripe API配置错误',
            code: ERROR_CODES.STRIPE_CONFIG_ERROR
          },
          { status: 500 }
        );
      }
      
      if (error.message.includes('customer_creation') || error.message.includes('customer_update')) {
        return NextResponse.json(
          { 
            error: 'Stripe配置参数错误',
            code: ERROR_CODES.STRIPE_API_ERROR
          },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        error: '创建支付会话失败',
        code: ERROR_CODES.STRIPE_API_ERROR
      },
      { status: 500 }
    );
  }
} 