import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature') as string;

  let event;

  try {
    event = stripe!.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  console.log('🔔 收到webhook事件:', event.type);

  try {
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
      case 'checkout.session.completed':
        // 移除这个事件的处理，避免重复添加积分
        console.log('⏭️  跳过 checkout.session.completed 事件，避免重复处理');
        break;
      case 'invoice.payment_succeeded':
        // 移除这个事件的处理，避免重复添加积分
        console.log('⏭️  跳过 invoice.payment_succeeded 事件，避免重复处理');
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      default:
        console.log(`未处理的事件类型: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook处理错误:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

// 处理订阅创建
async function handleSubscriptionCreated(subscription: any) {
  try {
    console.log('🔍 处理订阅创建:', subscription.id);
    console.log('📋 订阅元数据:', subscription.metadata);
    
    // 方法1：从元数据获取用户ID
    let userId = subscription.metadata?.userId;
    
    // 方法2：如果元数据没有，从客户邮箱查找
    if (!userId && subscription.customer) {
      const customerResponse = await stripe!.customers.retrieve(subscription.customer);
      const customer = customerResponse as any;
      
      if (customer && !customer.deleted && customer.email) {
        const { data: users } = await supabase
          .from('act_users')
          .select('id')
          .eq('email', customer.email)
          .limit(1);
        
        if (users && users.length > 0) {
          userId = users[0].id;
          console.log('✅ 通过邮箱找到用户ID:', userId);
        }
      }
    }
    
    if (userId) {
      console.log('✅ 开始为用户添加订阅积分:', userId);
      await addSubscriptionCredits(userId, 1300);
    } else {
      console.log('❌ 无法找到用户ID');
    }
    
  } catch (error) {
    console.error('❌ 处理订阅创建失败:', error);
  }
}

// 处理结账完成
async function handleCheckoutCompleted(session: any) {
  try {
    console.log('🔍 处理结账完成:', session.id);
    console.log('📋 会话元数据:', session.metadata);
    
    const userId = session.metadata?.userId;
    if (userId && session.mode === 'subscription') {
      console.log('✅ 开始为用户添加订阅积分:', userId);
      await addSubscriptionCredits(userId, 1300);
    }
    
  } catch (error) {
    console.error('❌ 处理结账完成失败:', error);
  }
}

// 处理支付成功
async function handlePaymentSucceeded(invoice: any) {
  try {
    console.log('🔍 处理支付成功:', invoice.id);
    
    if (invoice.subscription) {
      const subscription = await stripe!.subscriptions.retrieve(invoice.subscription);
      const userId = subscription.metadata?.userId;
      
      if (userId) {
        console.log('✅ 开始为用户添加订阅积分:', userId);
        await addSubscriptionCredits(userId, 1300);
      }
    }
    
  } catch (error) {
    console.error('❌ 处理支付成功失败:', error);
  }
}

// 处理订阅更新
async function handleSubscriptionUpdated(subscription: any) {
  try {
    console.log('🔍 处理订阅更新:', subscription.id, '状态:', subscription.status);
    console.log('📋 订阅详情:', {
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd: subscription.current_period_end,
      cancelAt: subscription.cancel_at
    });
    
    const userId = subscription.metadata?.userId;
    if (!userId) {
      console.log('❌ 无法找到用户ID，尝试通过客户邮箱查找...');
      
      // 尝试通过客户邮箱查找用户
      if (subscription.customer) {
        const customerResponse = await stripe!.customers.retrieve(subscription.customer);
        const customer = customerResponse as any;
        
        if (customer && !customer.deleted && customer.email) {
          const { data: users } = await supabase
            .from('act_users')
            .select('id')
            .eq('email', customer.email)
            .limit(1);
          
          if (users && users.length > 0) {
            const foundUserId = users[0].id;
            console.log('✅ 通过邮箱找到用户ID:', foundUserId);
            await handleSubscriptionStatusChange(foundUserId, subscription);
            return;
          }
        }
      }
      
      console.log('❌ 无法找到用户，跳过处理');
      return;
    }
    
    await handleSubscriptionStatusChange(userId, subscription);
    
  } catch (error) {
    console.error('❌ 处理订阅更新失败:', error);
  }
}

// 处理订阅状态变化
async function handleSubscriptionStatusChange(userId: string, subscription: any) {
  try {
    const now = new Date();
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
    const cancelAt = subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null;
    
    console.log('📊 时间计算:', {
      当前时间: now.toISOString(),
      周期结束时间: currentPeriodEnd.toISOString(),
      取消时间: cancelAt?.toISOString(),
      周期已结束: now >= currentPeriodEnd,
      取消时间已到: cancelAt && now >= cancelAt
    });
    
    // 情况1：订阅状态直接变为已取消/未付款
    if (subscription.status === 'canceled' || subscription.status === 'unpaid' || subscription.status === 'past_due') {
      console.log('🔴 订阅状态表明已结束，立即清零积分');
      await clearSubscriptionCredits(userId);
      return;
    }
    
    // 情况2：订阅设置为周期结束时取消
    if (subscription.cancel_at_period_end) {
      if (now >= currentPeriodEnd) {
        console.log('🔴 订阅周期已结束且已取消，清零积分');
        await clearSubscriptionCredits(userId);
        return;
      } else {
        console.log('⏳ 订阅将在周期结束时取消，积分保留到周期结束');
        // 更新订阅状态为已取消
        await supabase
          .from('act_users')
          .update({
            subscription_status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);
        return;
      }
    }
    
    // 情况3：有明确的取消时间
    if (cancelAt && now >= cancelAt) {
      console.log('🔴 订阅取消时间已到，清零积分');
      await clearSubscriptionCredits(userId);
      return;
    }
    
    // 情况4：订阅活跃
    if (subscription.status === 'active') {
      console.log('✅ 订阅活跃，更新状态');
      await supabase
        .from('act_users')
        .update({
          subscription_status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
    }
    
  } catch (error) {
    console.error('❌ 处理订阅状态变化失败:', error);
  }
}

// 处理订阅删除
async function handleSubscriptionDeleted(subscription: any) {
  try {
    console.log('🔍 处理订阅删除:', subscription.id);
    console.log('📋 订阅元数据:', subscription.metadata);
    console.log('👤 订阅客户ID:', subscription.customer);
    
    // 方法1：从元数据获取用户ID
    let userId = subscription.metadata?.userId;
    
    // 方法2：如果元数据没有，从客户邮箱查找
    if (!userId && subscription.customer) {
      console.log('❌ 订阅中没有用户ID，尝试从客户信息获取...');
      
      const customerResponse = await stripe!.customers.retrieve(subscription.customer);
      const customer = customerResponse as any;
      
      if (customer && !customer.deleted && customer.email) {
        const { data: users } = await supabase
          .from('act_users')
          .select('id')
          .eq('email', customer.email)
          .limit(1);
        
        if (users && users.length > 0) {
          userId = users[0].id;
          console.log('✅ 通过邮箱找到用户ID:', userId);
        }
      }
    }
    
    if (userId) {
      console.log('🔴 订阅删除，清零积分');
      await clearSubscriptionCredits(userId);
    } else {
      console.log('❌ 无法找到用户ID，跳过积分清零');
    }
    
  } catch (error) {
    console.error('❌ 处理订阅删除失败:', error);
  }
}

// 添加订阅积分
async function addSubscriptionCredits(userId: string, credits: number) {
  try {
    console.log(`🚀 为用户 ${userId} 添加 ${credits} 订阅积分`);
    
    // 获取用户当前积分
    const { data: user, error: fetchError } = await supabase
      .from('act_users')
      .select('credits_balance, subscription_credits, recharge_credits')
      .eq('id', userId)
      .single();
    
    if (fetchError) {
      console.error('❌ 获取用户积分失败:', fetchError);
      return;
    }
    
    // 防重复检查1：如果用户已经有订阅积分，跳过添加
    if (user.subscription_credits > 0) {
      console.log(`⏭️  用户已有订阅积分 ${user.subscription_credits}，跳过重复添加`);
      return;
    }
    
    // 防重复检查2：检查最近是否有订阅积分添加的交易
    const { data: recentTransactions } = await supabase
      .from('act_credit_transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('transaction_type', 'subscription_purchase')
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // 最近5分钟
      .limit(1);
    
    if (recentTransactions && recentTransactions.length > 0) {
      console.log(`⏭️  用户最近5分钟内已有订阅积分添加交易，跳过重复添加`);
      return;
    }
    
    const currentBalance = user?.credits_balance || 0;
    const currentSubscriptionCredits = user?.subscription_credits || 0;
    const currentRechargeCredits = user?.recharge_credits || 0;
    
    // 设置新的订阅积分和总积分
    const newSubscriptionCredits = credits;
    const newBalance = currentRechargeCredits + newSubscriptionCredits;
    
    console.log('📊 积分计算:', {
      当前订阅积分: currentSubscriptionCredits,
      新订阅积分: newSubscriptionCredits,
      充值积分: currentRechargeCredits,
      当前总积分: currentBalance,
      新总积分: newBalance
    });
    
    // 更新用户积分
    const { error: updateError } = await supabase
      .from('act_users')
      .update({
        subscription_credits: newSubscriptionCredits,
        credits_balance: newBalance,
        subscription_status: 'active'
      })
      .eq('id', userId);
    
    if (updateError) {
      console.error('❌ 更新用户积分失败:', updateError);
      return;
    }
    
    // 记录积分交易历史
    await supabase
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
    
    console.log(`✅ 用户 ${userId} 订阅积分添加成功: ${credits}`);
    
  } catch (error) {
    console.error('❌ 添加订阅积分失败:', error);
  }
}

// 清零订阅积分
async function clearSubscriptionCredits(userId: string) {
  try {
    console.log(`🔴 为用户 ${userId} 清零订阅积分`);
    
    // 获取用户当前积分
    const { data: user, error: fetchError } = await supabase
      .from('act_users')
      .select('credits_balance, subscription_credits, recharge_credits')
      .eq('id', userId)
      .single();
    
    if (fetchError) {
      console.error('❌ 获取用户积分失败:', fetchError);
      return;
    }
    
    const currentBalance = user?.credits_balance || 0;
    const currentSubscriptionCredits = user?.subscription_credits || 0;
    const currentRechargeCredits = user?.recharge_credits || 0;
    
    // 只保留充值积分
    const newBalance = currentRechargeCredits;
    
    console.log('📊 积分清零计算:', {
      当前订阅积分: currentSubscriptionCredits,
      充值积分: currentRechargeCredits,
      当前总积分: currentBalance,
      新总积分: newBalance
    });
    
    // 更新用户积分
    const { error: updateError } = await supabase
      .from('act_users')
      .update({
        subscription_credits: 0,
        credits_balance: newBalance,
        subscription_status: 'expired'
      })
      .eq('id', userId);
    
    if (updateError) {
      console.error('❌ 更新用户积分失败:', updateError);
      return;
    }
    
    // 记录交易历史
    if (currentSubscriptionCredits > 0) {
      await supabase
        .from('act_credit_transactions')
        .insert({
          user_id: userId,
          transaction_type: 'subscription_expiry',
          credits_amount: -currentSubscriptionCredits,
          balance_before: currentBalance,
          balance_after: newBalance,
          description: '订阅积分清零',
          reference_id: 'webhook_' + Date.now()
        });
    }
    
    console.log(`✅ 用户 ${userId} 订阅积分清零成功`);
    
  } catch (error) {
    console.error('❌ 清零订阅积分失败:', error);
  }
}
