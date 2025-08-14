import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 检查并处理订阅到期后的积分清零
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: '用户ID是必需的' },
        { status: 400 }
      );
    }

    console.log('检查用户订阅到期状态:', userId);
    
    // 获取用户当前状态
    const { data: userData, error: userError } = await supabase
      .from('act_users')
      .select('id, subscription_status, subscription_end_date, subscription_credits, recharge_credits, credits_balance, email')
      .eq('id', userId)
      .single();
    
    if (userError) {
      console.error('获取用户数据失败:', userError);
      return NextResponse.json(
        { error: '获取用户数据失败' },
        { status: 500 }
      );
    }
    
    const now = new Date();
    const endDate = userData.subscription_end_date ? new Date(userData.subscription_end_date) : null;
    
    console.log('用户订阅状态:', {
      status: userData.subscription_status,
      endDate: endDate?.toISOString(),
      subscriptionCredits: userData.subscription_credits,
      rechargeCredits: userData.recharge_credits,
      currentTime: now.toISOString()
    });
    
    let actionTaken = '无需操作';
    let newCreditsBalance = userData.credits_balance;
    let needsCleanup = false;
    
    // 核心逻辑：检查订阅是否已取消且周期已结束
    if (userData.subscription_status === 'cancelled' && endDate && now >= endDate) {
      if (userData.subscription_credits > 0) {
        needsCleanup = true;
        actionTaken = '订阅已取消且周期结束，需要清零订阅积分';
      } else {
        actionTaken = '订阅已取消且周期结束，订阅积分已清零';
      }
    } else if (userData.subscription_status === 'cancelled' && endDate && now < endDate) {
      const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      actionTaken = `订阅已取消，${daysRemaining}天后积分将清零`;
    } else if (userData.subscription_status === 'active') {
      if (endDate && now >= endDate) {
        actionTaken = '订阅已到期但状态仍为活跃，需要处理';
      } else {
        actionTaken = '订阅正常活跃中';
      }
    } else if (userData.subscription_status === 'expired') {
      actionTaken = '订阅已过期，积分已清零';
    }
    
    return NextResponse.json({
      success: true,
      userId: userId,
      email: userData.email,
      subscriptionStatus: userData.subscription_status,
      subscriptionEndDate: userData.subscription_end_date,
      currentCreditsBalance: userData.credits_balance,
      subscriptionCredits: userData.subscription_credits,
      rechargeCredits: userData.recharge_credits,
      needsCleanup: needsCleanup,
      actionTaken: actionTaken,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('检查订阅到期状态时发生错误:', error);
    return NextResponse.json(
      { error: '检查订阅到期状态时发生错误' },
      { status: 500 }
    );
  }
}

// 执行订阅到期后的积分清零
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: '用户ID是必需的' },
        { status: 400 }
      );
    }

    console.log('执行用户订阅积分清零:', userId);
    
    // 获取用户当前状态
    const { data: userData, error: userError } = await supabase
      .from('act_users')
      .select('id, subscription_status, subscription_end_date, subscription_credits, recharge_credits, credits_balance, email')
      .eq('id', userId)
      .single();
    
    if (userError) {
      console.error('获取用户数据失败:', userError);
      return NextResponse.json(
        { error: '获取用户数据失败' },
        { status: 500 }
      );
    }
    
    const now = new Date();
    const endDate = userData.subscription_end_date ? new Date(userData.subscription_end_date) : null;
    
    // 验证是否可以执行清零操作
    if (userData.subscription_status !== 'cancelled' || !endDate || now < endDate) {
      return NextResponse.json(
        { 
          error: '不符合清零条件',
          reason: '订阅必须已取消且周期已结束'
        },
        { status: 400 }
      );
    }
    
    if (userData.subscription_credits <= 0) {
      return NextResponse.json(
        { 
          error: '无需清零',
          reason: '订阅积分已为0'
        },
        { status: 400 }
      );
    }
    
    // 执行积分清零：清零订阅积分，保留充值积分
    const newCreditsBalance = userData.recharge_credits;
    
    const { error: updateError } = await supabase
      .from('act_users')
      .update({
        subscription_credits: 0,
        credits_balance: newCreditsBalance,
        subscription_status: 'expired',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
    
    if (updateError) {
      console.error('更新用户积分失败:', updateError);
      return NextResponse.json(
        { error: '更新用户积分失败' },
        { status: 500 }
      );
    }
    
    // 记录积分清零交易历史
    const { error: transactionError } = await supabase
      .from('act_credit_transactions')
      .insert({
        user_id: userId,
        transaction_type: 'subscription_expiry',
        credits_amount: -userData.subscription_credits,
        balance_before: userData.credits_balance,
        balance_after: newCreditsBalance,
        description: `订阅周期结束，积分清零 (清零订阅积分: ${userData.subscription_credits}, 保留充值积分: ${userData.recharge_credits})`,
        reference_id: 'expiry_cleanup_' + Date.now()
      });
    
    if (transactionError) {
      console.error('记录交易历史失败:', transactionError);
      // 即使记录历史失败，也不影响积分清零的主要操作
    }
    
    console.log('订阅积分清零完成:', {
      userId: userId,
      clearedCredits: userData.subscription_credits,
      remainingCredits: userData.recharge_credits,
      newBalance: newCreditsBalance
    });
    
    return NextResponse.json({
      success: true,
      userId: userId,
      email: userData.email,
      action: '积分清零完成',
      clearedSubscriptionCredits: userData.subscription_credits,
      remainingRechargeCredits: userData.recharge_credits,
      newCreditsBalance: newCreditsBalance,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('执行订阅积分清零时发生错误:', error);
    return NextResponse.json(
      { error: '执行订阅积分清零时发生错误' },
      { status: 500 }
    );
  }
}

// 获取用户订阅到期状态
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: '用户ID是必需的' },
        { status: 400 }
      );
    }
    
    // 获取用户状态
    const { data: userData, error: userError } = await supabase
      .from('act_users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (userError) {
      return NextResponse.json(
        { error: '获取用户数据失败' },
        { status: 500 }
      );
    }
    
    const now = new Date();
    const endDate = userData.subscription_end_date ? new Date(userData.subscription_end_date) : null;
    
    let statusDescription = '';
    let daysRemaining = null;
    let canClearCredits = false;
    
    if (endDate) {
      daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (userData.subscription_status === 'active') {
        statusDescription = daysRemaining > 0 ? `订阅活跃，${daysRemaining}天后到期` : '订阅已到期，等待处理';
      } else if (userData.subscription_status === 'cancelled') {
        if (daysRemaining > 0) {
          statusDescription = `订阅已取消，${daysRemaining}天后积分将清零`;
        } else {
          statusDescription = '订阅已取消且过期，可以清零积分';
          canClearCredits = userData.subscription_credits > 0;
        }
      } else if (userData.subscription_status === 'expired') {
        statusDescription = '订阅已过期，积分已清零';
      }
    } else {
      statusDescription = `订阅状态：${userData.subscription_status || '无订阅'}`;
    }
    
    return NextResponse.json({
      userId: userData.id,
      email: userData.email,
      subscriptionStatus: userData.subscription_status,
      subscriptionEndDate: userData.subscription_end_date,
      subscriptionCredits: userData.subscription_credits,
      rechargeCredits: userData.recharge_credits,
      creditsBalance: userData.credits_balance,
      daysRemaining: daysRemaining,
      statusDescription: statusDescription,
      canClearCredits: canClearCredits,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('获取订阅到期状态时发生错误:', error);
    return NextResponse.json(
      { error: '获取订阅到期状态时发生错误' },
      { status: 500 }
    );
  }
}
