# 订阅积分不添加问题修复说明

## 问题描述

用户反馈订阅成功后积分没有添加到账户中，导致订阅功能无法正常使用。

## 问题分析

经过代码分析，发现以下几个可能导致订阅积分不添加的问题：

### 1. Webhook处理逻辑问题
- `handleSubscriptionCreated` 函数中缺少错误处理
- 订阅状态更新失败时没有中断流程
- 积分添加逻辑可能被跳过

### 2. 积分更新函数问题
- `updateUserCredits` 函数中订阅积分计算逻辑有误
- 缺少订阅状态的正确更新
- 交易历史记录不完整

### 3. 数据库更新问题
- 订阅信息更新失败时没有回滚
- 积分更新和状态更新不同步

## 解决方案

### 1. 修复Webhook订阅创建处理

```typescript
async function handleSubscriptionCreated(subscription: any) {
  try {
    // 获取订阅的元数据
    const { userId, credits } = subscription.metadata || {};
    
    if (userId && credits) {
      // 先更新订阅基本信息
      const { error: updateError } = await supabase
        .from('act_users')
        .update({
          subscription_start_date: new Date(subscription.current_period_start * 1000).toISOString(),
          subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString(),
          stripe_subscription_id: subscription.id,
          stripe_customer_id: subscription.customer,
          subscription_status: 'active' // 确保订阅状态为active
        })
        .eq('id', userId);
      
      if (updateError) {
        // 如果更新失败，记录错误并返回
        WebhookLogger.logError(updateError, { 
          context: '更新订阅基本信息失败',
          userId,
          subscriptionId: subscription.id
        });
        return;
      }
      
      // 订阅创建时更新积分
      await updateUserCredits(userId, parseInt(credits), 'subscription_purchase');
      
      // 记录订阅信息
      await recordSubscriptionInfo(userId, subscription, parseInt(credits));
    }
  } catch (error) {
    WebhookLogger.logError(error as Error, { 
      subscriptionId: subscription.id,
      context: '处理订阅创建'
    });
  }
}
```

### 2. 修复积分更新函数

```typescript
async function updateUserCredits(userId: string, credits: number, transactionType: string) {
  try {
    // 获取用户当前积分信息
    const { data: currentData, error: currentError } = await supabase
      .from('act_users')
      .select('credits_balance, subscription_credits, recharge_credits, subscription_status')
      .eq('id', userId)
      .single();
    
    if (currentError) {
      WebhookLogger.logError(currentError as Error, { userId, credits });
      return;
    }
    
    const currentBalance = currentData?.credits_balance || 0;
    const currentSubscriptionCredits = currentData?.subscription_credits || 0;
    const currentRechargeCredits = currentData?.recharge_credits || 0;
    
    let newSubscriptionCredits = currentSubscriptionCredits;
    let newRechargeCredits = currentRechargeCredits;
    
    if (transactionType === 'subscription_purchase') {
      // 订阅购买时，重置订阅积分为新的积分数量
      newSubscriptionCredits = credits;
    } else if (transactionType === 'purchase') {
      // 充值购买时，增加充值积分
      newRechargeCredits += credits;
    }
    
    const newBalance = newSubscriptionCredits + newRechargeCredits;
    
    // 更新用户积分
    const { error } = await supabase
      .from('act_users')
      .update({
        credits_balance: newBalance,
        subscription_credits: newSubscriptionCredits,
        recharge_credits: newRechargeCredits,
        subscription_status: transactionType === 'subscription_purchase' ? 'active' : undefined
      })
      .eq('id', userId);
    
    if (error) {
      WebhookLogger.logError(error as Error, { userId, credits });
      return;
    }
    
    // 记录交易历史
    await supabase
      .from('act_credit_transactions')
      .insert({
        user_id: userId,
        transaction_type: transactionType,
        credits_amount: credits,
        balance_before: currentBalance,
        balance_after: newBalance,
        description: `积分更新: ${transactionType} (${credits}积分)`,
        reference_id: 'webhook_' + Date.now()
      });
      
  } catch (error) {
    WebhookLogger.logError(error as Error, { userId, credits, transactionType });
  }
}
```

### 3. 增强错误处理和日志记录

- 在每个关键步骤添加详细的日志记录
- 添加错误处理和回滚机制
- 确保数据库操作的原子性

## 测试验证

### 1. 运行测试脚本

```bash
# 测试订阅积分添加功能
node scripts/test-subscription-credits.js
```

### 2. 检查Webhook日志

在Stripe Dashboard中查看webhook事件：
- `customer.subscription.created` 事件是否正常触发
- 检查webhook响应状态
- 查看服务器日志中的错误信息

### 3. 验证数据库更新

检查以下字段是否正确更新：
- `subscription_credits`: 订阅积分
- `credits_balance`: 总积分余额
- `subscription_status`: 订阅状态
- `stripe_subscription_id`: Stripe订阅ID

## 常见问题排查

### 1. Webhook未触发
- 检查Stripe Webhook配置
- 验证Webhook端点URL
- 检查Webhook密钥配置

### 2. 元数据缺失
- 确保创建Checkout Session时传递了正确的元数据
- 检查`userId`和`credits`字段是否存在

### 3. 数据库权限问题
- 检查Supabase服务角色密钥配置
- 验证数据库表权限
- 检查RLS策略设置

### 4. 积分计算错误
- 验证积分计算公式
- 检查数据类型转换
- 确保积分不为负数

## 预防措施

### 1. 监控和告警
- 设置Webhook失败告警
- 监控积分更新成功率
- 记录详细的错误日志

### 2. 数据一致性检查
- 定期验证积分余额一致性
- 检查订阅状态同步
- 监控异常积分变动

### 3. 回滚机制
- 实现积分更新失败的回滚
- 添加事务处理
- 设置重试机制

## 总结

通过以上修复，订阅积分添加功能应该能够正常工作。主要改进包括：

1. **增强错误处理**: 添加详细的错误检查和日志记录
2. **修复积分逻辑**: 确保订阅积分正确计算和更新
3. **同步状态更新**: 保证积分更新和订阅状态同步
4. **完善交易记录**: 记录所有积分变动历史

如果问题仍然存在，请检查：
- Stripe Webhook配置
- 数据库连接和权限
- 环境变量配置
- 服务器日志中的具体错误信息
