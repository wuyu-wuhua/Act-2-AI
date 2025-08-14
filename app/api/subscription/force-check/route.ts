import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 强制检查和清理用户的过期订阅积分
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: '用户ID是必需的' },
        { status: 400 }
      );
    }

    console.log('强制检查用户订阅状态:', userId);
    
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
    
    // 检查是否需要清零积分
    // 主要逻辑：当订阅被取消且周期结束后，清零订阅积分
    const shouldClearCredits = (
      userData.subscription_status === 'cancelled' && 
      endDate && 
      now >= endDate && 
      userData.subscription_credits > 0
    );
    
    if (shouldClearCredits) {
      console.log('检测到需要清零过期订阅积分');
      
      // 清零订阅积分，保留充值积分
      newCreditsBalance = userData.recharge_credits;
      
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
      
      // 记录交易历史 - 使用subscription_expiry类型
      const { error: transactionError } = await supabase
        .from('act_credit_transactions')
        .insert({
          user_id: userId,
          transaction_type: 'subscription_expiry',
          credits_amount: -userData.subscription_credits,
          balance_before: userData.credits_balance,
          balance_after: newCreditsBalance,
          description: `订阅周期结束，积分清零 (清零订阅积分: ${userData.subscription_credits}, 保留充值积分: ${userData.recharge_credits})`,
          reference_id: 'force_check_' + Date.now()
        });
      
      if (transactionError) {
        console.error('记录交易历史失败:', transactionError);
      }
      
      actionTaken = `已清零订阅积分 ${userData.subscription_credits}，保留充值积分 ${userData.recharge_credits}`;
      
      console.log('订阅积分清零完成:', {
        clearedCredits: userData.subscription_credits,
        remainingCredits: userData.recharge_credits,
        newBalance: newCreditsBalance
      });
    } else if (userData.subscription_status === 'cancelled' && endDate && now < endDate) {
      const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      actionTaken = `订阅已取消，${daysRemaining}天后积分将清零`;
    } else if (userData.subscription_status === 'active') {
      actionTaken = '订阅正常活跃中';
    } else if (userData.subscription_status === 'expired') {
      actionTaken = '订阅已过期，积分已清零';
    }
    
    return NextResponse.json({
      success: true,
      userId: userId,
      email: userData.email,
      subscriptionStatus: userData.subscription_status,
      subscriptionEndDate: userData.subscription_end_date,
      originalCreditsBalance: userData.credits_balance,
      newCreditsBalance: newCreditsBalance,
      subscriptionCredits: shouldClearCredits ? 0 : userData.subscription_credits,
      rechargeCredits: userData.recharge_credits,
      actionTaken: actionTaken,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('强制检查过期订阅时发生错误:', error);
    return NextResponse.json(
      { error: '强制检查过程中发生错误' },
      { status: 500 }
    );
  }
}

// 获取用户订阅详细状态
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
    
    if (endDate) {
      daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (userData.subscription_status === 'active') {
        statusDescription = daysRemaining > 0 ? `订阅活跃，${daysRemaining}天后到期` : '订阅已到期，等待处理';
      } else if (userData.subscription_status === 'cancelled') {
        statusDescription = daysRemaining > 0 ? `订阅已取消，${daysRemaining}天后积分清零` : '订阅已取消且过期，积分应已清零';
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
      needsCleanup: (
        userData.subscription_status === 'cancelled' && 
        endDate && 
        now >= endDate && 
        userData.subscription_credits > 0
      ),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('获取订阅状态时发生错误:', error);
    return NextResponse.json(
      { error: '获取订阅状态时发生错误' },
      { status: 500 }
    );
  }
}