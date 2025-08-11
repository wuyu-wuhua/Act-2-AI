import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 日志记录类
class WebhookLogger {
  static logEvent(event: string, data: any) {
    console.log(`[WEBHOOK] ${event}:`, {
      timestamp: new Date().toISOString(),
      event,
      data
    });
  }
  
  static logError(error: Error, context: any) {
    console.error(`[WEBHOOK ERROR]:`, {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      context
    });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');
  
  if (!signature) {
    WebhookLogger.logError(new Error('缺少Stripe签名'), {});
    return NextResponse.json(
      { error: '缺少Stripe签名' },
      { status: 400 }
    );
  }
  
  let event: any;
  
  try {
    if (!stripe) {
      throw new Error('Stripe client not initialized');
    }
    
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    WebhookLogger.logError(error as Error, { signature });
    return NextResponse.json(
      { error: 'Webhook签名验证失败' },
      { status: 400 }
    );
  }
  
  try {
    WebhookLogger.logEvent('Webhook事件接收', { type: event.type });
    
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;
        
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
        
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
        
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;
        
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;
        
      default:
        WebhookLogger.logEvent('未处理的事件类型', { type: event.type });
    }
    
    return NextResponse.json({ received: true });
  } catch (error) {
    WebhookLogger.logError(error as Error, { eventType: event.type });
    return NextResponse.json(
      { error: 'Webhook处理失败' },
      { status: 500 }
    );
  }
}

async function handleCheckoutSessionCompleted(session: any) {
  try {
    const { userId, credits, mode, userEmail } = session.metadata;
    
    if (!userId || !credits) {
      WebhookLogger.logError(new Error('缺少必要的元数据'), { sessionId: session.id });
      return;
    }
    
    WebhookLogger.logEvent('支付完成', {
      sessionId: session.id,
      userId,
      credits,
      mode,
      userEmail
    });
    
    // 如果是积分购买，直接更新用户积分
    if (mode === 'payment') {
      await updateUserCredits(userId, parseInt(credits));
    }
    
    // 如果是订阅，也需要更新积分（订阅套餐包含积分）
    if (mode === 'subscription') {
      await updateUserCredits(userId, parseInt(credits));
    }
    
  } catch (error) {
    WebhookLogger.logError(error as Error, { sessionId: session.id });
  }
}

async function handleSubscriptionCreated(subscription: any) {
  try {
    WebhookLogger.logEvent('订阅创建', {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      status: subscription.status
    });
    
    // 获取订阅的元数据
    const { userId, credits } = subscription.metadata || {};
    
    if (userId && credits) {
      WebhookLogger.logEvent('订阅创建 - 更新积分', {
        subscriptionId: subscription.id,
        userId,
        credits
      });
      
      // 订阅创建时也更新积分
      await updateUserCredits(userId, parseInt(credits));
    }
    
  } catch (error) {
    WebhookLogger.logError(error as Error, { subscriptionId: subscription.id });
  }
}

async function handleSubscriptionUpdated(subscription: any) {
  try {
    WebhookLogger.logEvent('订阅更新', {
      subscriptionId: subscription.id,
      status: subscription.status
    });
    
    // 更新数据库中的订阅状态
    
  } catch (error) {
    WebhookLogger.logError(error as Error, { subscriptionId: subscription.id });
  }
}

async function handleSubscriptionDeleted(subscription: any) {
  try {
    WebhookLogger.logEvent('订阅删除', {
      subscriptionId: subscription.id
    });
    
    // 处理订阅取消逻辑
    
  } catch (error) {
    WebhookLogger.logError(error as Error, { subscriptionId: subscription.id });
  }
}

async function handleInvoicePaymentSucceeded(invoice: any) {
  try {
    WebhookLogger.logEvent('发票支付成功', {
      invoiceId: invoice.id,
      subscriptionId: invoice.subscription,
      amount: invoice.amount_paid
    });
    
    // 处理定期付款成功逻辑
    if (invoice.subscription && stripe) {
      // 获取订阅信息
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
      const { userId, credits } = subscription.metadata || {};
      
      if (userId && credits) {
        WebhookLogger.logEvent('订阅续期处理', {
          subscriptionId: subscription.id,
          userId,
          credits,
          status: subscription.status
        });
        
        // 检查是否为续期（订阅状态为active且不是第一次付款）
        if (subscription.status === 'active') {
          // 获取用户当前订阅状态
          const { data: userData, error: userError } = await supabase
            .from('act_users')
            .select('subscription_status, subscription_end_date, subscription_credits')
            .eq('id', userId)
            .single();
          
          if (!userError && userData) {
            const now = new Date();
            const isRenewal = userData.subscription_status === 'active' && 
                             userData.subscription_end_date && 
                             new Date(userData.subscription_end_date) < now;
            
            if (isRenewal) {
              // 处理订阅续期：重置积分
              WebhookLogger.logEvent('检测到订阅续期，重置积分', {
                userId,
                oldCredits: userData.subscription_credits,
                newCredits: parseInt(credits)
              });
              
              // 计算新的订阅周期
              const startDate = now.toISOString();
              let endDate: string;
              let planId: string;
              
              if (credits === '1300' || credits === '4000') {
                // 月付订阅
                const endTime = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                endDate = endTime.toISOString();
                planId = credits === '1300' ? 'basic_monthly' : 'pro_monthly';
              } else {
                // 年付订阅
                const endTime = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
                endDate = endTime.toISOString();
                planId = credits === '20000' ? 'basic_yearly' : 'pro_yearly';
              }
              
              // 调用续期函数重置积分
              const { error: renewalError } = await supabase
                .rpc('renew_subscription_credits', {
                  p_user_id: userId,
                  p_plan_id: planId,
                  p_credits_amount: parseInt(credits),
                  p_start_date: startDate,
                  p_end_date: endDate,
                  p_description: '订阅续期积分重置'
                });
              
              if (renewalError) {
                WebhookLogger.logError(renewalError as Error, { 
                  context: '订阅续期失败',
                  userId, 
                  credits 
                });
              } else {
                WebhookLogger.logEvent('订阅续期成功', { 
                  userId, 
                  credits,
                  planId
                });
              }
            } else {
              // 新订阅或首次付款
              await updateUserCredits(userId, parseInt(credits));
            }
          }
        }
      }
    }
    
  } catch (error) {
    WebhookLogger.logError(error as Error, { invoiceId: invoice.id });
  }
}

async function handleInvoicePaymentFailed(invoice: any) {
  try {
    WebhookLogger.logEvent('发票支付失败', {
      invoiceId: invoice.id,
      subscriptionId: invoice.subscription,
      attemptCount: invoice.attempt_count
    });
    
    // 处理支付失败逻辑
    
  } catch (error) {
    WebhookLogger.logError(error as Error, { invoiceId: invoice.id });
  }
}

async function updateUserCredits(userId: string, credits: number) {
  try {
    WebhookLogger.logEvent('开始更新积分', { userId, credits });
    
    // 获取用户当前积分
    const { data: currentData, error: currentError } = await supabase
      .from('act_users')
      .select('credits_balance')
      .eq('id', userId)
      .single();
    
    if (currentError) {
      WebhookLogger.logError(currentError as Error, { userId, credits });
      return;
    }
    
    const currentBalance = currentData?.credits_balance || 0;
    const newBalance = currentBalance + credits;
    
    // 更新用户积分
    const { data, error } = await supabase
      .from('act_users')
      .update({ 
        credits_balance: newBalance
      })
      .eq('id', userId)
      .select('credits_balance');
    
    if (error) {
      WebhookLogger.logError(error as Error, { userId, credits });
      return;
    }
    
    WebhookLogger.logEvent('积分更新成功', { 
      userId, 
      addedCredits: credits,
      newTotalCredits: data?.[0]?.credits_balance 
    });
    
    // 记录积分交易历史
    const { error: historyError } = await supabase
      .from('act_credit_transactions')
      .insert({
        user_id: userId,
        transaction_type: 'subscription_purchase',
        credits_amount: credits,
        balance_before: currentBalance,
        balance_after: newBalance,
        description: '订阅套餐积分',
        reference_id: 'webhook_' + Date.now()
      });
    
    if (historyError) {
      WebhookLogger.logError(historyError as Error, { 
        context: '记录积分交易历史',
        userId, 
        credits 
      });
    }
    
  } catch (error) {
    WebhookLogger.logError(error as Error, { userId, credits });
  }
} 