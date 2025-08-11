import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { userId, creditsToConsume, description, generationId } = await request.json();

    console.log('积分消耗API被调用:', {
      userId,
      creditsToConsume,
      description,
      generationId
    });

    if (!userId || !creditsToConsume || creditsToConsume <= 0) {
      return NextResponse.json(
        { error: '缺少必要参数或积分数量无效' },
        { status: 400 }
      );
    }

    // 获取用户当前积分状态
    const { data: userData, error: userError } = await supabase
      .from('act_users')
      .select('subscription_credits, recharge_credits, credits_balance')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('获取用户积分失败:', userError);
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    const currentSubscriptionCredits = userData.subscription_credits || 0;
    const currentRechargeCredits = userData.recharge_credits || 0;
    const currentTotalCredits = userData.credits_balance || 0;

    // 检查总积分是否足够
    if (currentTotalCredits < creditsToConsume) {
      return NextResponse.json(
        { error: '积分不足', currentCredits: currentTotalCredits, requiredCredits: creditsToConsume },
        { status: 400 }
      );
    }

    // 计算消耗策略：优先消耗订阅积分
    let subscriptionConsumed = 0;
    let rechargeConsumed = 0;

    if (currentSubscriptionCredits >= creditsToConsume) {
      // 订阅积分足够
      subscriptionConsumed = creditsToConsume;
      rechargeConsumed = 0;
    } else {
      // 订阅积分不够，先消耗完订阅积分，再消耗充值积分
      subscriptionConsumed = currentSubscriptionCredits;
      rechargeConsumed = creditsToConsume - subscriptionConsumed;
    }

    const newSubscriptionCredits = currentSubscriptionCredits - subscriptionConsumed;
    const newRechargeCredits = currentRechargeCredits - rechargeConsumed;
    const newTotalCredits = newSubscriptionCredits + newRechargeCredits;

    // 更新用户积分
    const { data, error } = await supabase
      .from('act_users')
      .update({
        subscription_credits: newSubscriptionCredits,
        recharge_credits: newRechargeCredits,
        credits_balance: newTotalCredits
      })
      .eq('id', userId)
      .select('subscription_credits, recharge_credits, credits_balance');

    if (error) {
      console.error('积分更新失败:', error);
      return NextResponse.json(
        { error: '积分更新失败' },
        { status: 500 }
      );
    }

    console.log('积分消耗成功:', {
      userId,
      creditsConsumed: creditsToConsume,
      subscriptionConsumed,
      rechargeConsumed,
      balanceBefore: currentTotalCredits,
      balanceAfter: newTotalCredits
    });

    // 记录积分消耗记录
    const { error: consumptionError } = await supabase
      .from('act_credit_consumption')
      .insert({
        user_id: userId,
        consumption_type: subscriptionConsumed > 0 ? 'subscription' : 'recharge',
        credits_consumed: creditsToConsume,
        subscription_credits_before: currentSubscriptionCredits,
        subscription_credits_after: newSubscriptionCredits,
        recharge_credits_before: currentRechargeCredits,
        recharge_credits_after: newRechargeCredits,
        total_credits_before: currentTotalCredits,
        total_credits_after: newTotalCredits,
        description: description || '积分消耗',
        generation_id: generationId
      });

    if (consumptionError) {
      console.error('记录积分消耗失败:', consumptionError);
    }

    // 记录交易历史
    const { error: transactionError } = await supabase
      .from('act_credit_transactions')
      .insert({
        user_id: userId,
        transaction_type: 'consumption',
        credits_amount: -creditsToConsume,
        balance_before: currentTotalCredits,
        balance_after: newTotalCredits,
        description: description || '积分消耗',
        reference_id: generationId || `consume_${Date.now()}`,
        credit_type: subscriptionConsumed > 0 ? 'subscription' : 'recharge',
        subscription_credits_before: currentSubscriptionCredits,
        subscription_credits_after: newSubscriptionCredits,
        recharge_credits_before: currentRechargeCredits,
        recharge_credits_after: newRechargeCredits
      });

    if (transactionError) {
      console.error('记录交易历史失败:', transactionError);
    }

    return NextResponse.json({
      success: true,
      data: {
        userId,
        creditsConsumed: creditsToConsume,
        subscriptionConsumed,
        rechargeConsumed,
        balanceBefore: currentTotalCredits,
        balanceAfter: newTotalCredits,
        newSubscriptionCredits,
        newRechargeCredits
      }
    });

  } catch (error) {
    console.error('积分消耗API错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
} 