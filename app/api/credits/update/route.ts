import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const success = searchParams.get('success');
    const sessionId = searchParams.get('session_id');
    const userId = searchParams.get('userId');
    const credits = searchParams.get('credits');

    console.log('积分更新API被调用:', {
      success,
      sessionId,
      userId,
      credits
    });

    if (!success || !sessionId || !userId || !credits) {
      console.error('缺少必要参数');
      return NextResponse.redirect(new URL('/profile?error=missing_params', request.url));
    }

    // 获取用户当前积分和订阅状态
    const { data: userData, error: userError } = await supabase
      .from('act_users')
      .select('subscription_credits, recharge_credits, credits_balance, subscription_status, subscription_end_date, subscription_plan_id')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('获取用户积分失败:', userError);
      return NextResponse.redirect(new URL('/profile?error=user_not_found', request.url));
    }

    const currentSubscriptionCredits = userData.subscription_credits || 0;
    const currentRechargeCredits = userData.recharge_credits || 0;
    const currentTotalCredits = userData.credits_balance || 0;
    const currentSubscriptionStatus = userData.subscription_status || 'none';
    const currentSubscriptionEndDate = userData.subscription_end_date;
    const currentSubscriptionPlanId = userData.subscription_plan_id;
    const creditsToAdd = parseInt(credits);

    // 根据积分数量判断套餐类型
    let packageDescription = '订阅套餐积分';
    let creditType = 'recharge';
    let newSubscriptionCredits = currentSubscriptionCredits;
    let newRechargeCredits = currentRechargeCredits;
    let isRenewal = false; // 声明isRenewal变量

    // 根据积分数量判断是否为订阅积分
    if (credits === '1300' || credits === '4000' || credits === '20000' || credits === '50000') {
      creditType = 'subscription';
      
      // 计算订阅开始和结束时间
      const now = new Date();
      const startDate = now.toISOString();
      let endDate: string;
      let planId: string;
      
      // 根据积分数量判断订阅周期和套餐ID
      if (credits === '1300') {
        // 基础版月付订阅，30天后到期
        const endTime = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        endDate = endTime.toISOString();
        planId = 'basic_monthly';
        packageDescription = 'Act-2-AI 基础版月付订阅';
      } else if (credits === '4000') {
        // 专业版月付订阅，30天后到期
        const endTime = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        endDate = endTime.toISOString();
        planId = 'pro_monthly';
        packageDescription = 'Act-2-AI 专业版月付订阅';
      } else if (credits === '20000') {
        // 基础版年付订阅，365天后到期
        const endTime = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
        endDate = endTime.toISOString();
        planId = 'basic_yearly';
        packageDescription = 'Act-2-AI 基础版年付订阅';
      } else {
        // 专业版年付订阅，365天后到期
        const endTime = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
        endDate = endTime.toISOString();
        planId = 'pro_yearly';
        packageDescription = 'Act-2-AI 专业版年付订阅';
      }
      
      // 检查是否为订阅续期
      isRenewal = currentSubscriptionStatus === 'active' && 
                  currentSubscriptionEndDate && 
                  new Date(startDate) > new Date(currentSubscriptionEndDate);

      if (isRenewal) {
        // 订阅续期：重置积分
        console.log('检测到订阅续期，重置积分:', {
          userId,
          oldCredits: currentSubscriptionCredits,
          newCredits: creditsToAdd,
          oldEndDate: currentSubscriptionEndDate,
          newEndDate: endDate
        });

        // 调用续期函数重置积分
        const { error: renewalError } = await supabase
          .rpc('renew_subscription_credits', {
            p_user_id: userId,
            p_plan_id: planId,
            p_credits_amount: creditsToAdd,
            p_start_date: startDate,
            p_end_date: endDate,
            p_description: packageDescription
          });

        if (renewalError) {
          console.error('订阅续期失败:', renewalError);
          return NextResponse.redirect(new URL('/profile?error=renewal_failed', request.url));
        }

        newSubscriptionCredits = creditsToAdd;
        newRechargeCredits = currentRechargeCredits; // 充值积分保持不变
      } else {
        // 新订阅或订阅更新：累加积分
        console.log('新订阅或订阅更新，累加积分:', {
          userId,
          currentCredits: currentSubscriptionCredits,
          addingCredits: creditsToAdd
        });

        // 调用订阅积分添加函数
      const { error: subscriptionError } = await supabase
        .rpc('add_subscription_credits', {
          p_user_id: userId,
          p_credits_to_add: creditsToAdd,
            p_plan_id: planId,
          p_start_date: startDate,
          p_end_date: endDate,
          p_description: packageDescription
        });
      
      if (subscriptionError) {
        console.error('更新订阅状态失败:', subscriptionError);
        // 继续执行，不中断流程
        }

        newSubscriptionCredits = currentSubscriptionCredits + creditsToAdd;
      }
    } else {
      // 充值积分
      newRechargeCredits = currentRechargeCredits + creditsToAdd;
    }

    const newTotalCredits = newSubscriptionCredits + newRechargeCredits;

    // 更新用户积分（如果上面的RPC调用没有完全更新）
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
      return NextResponse.redirect(new URL('/profile?error=update_failed', request.url));
    }

    console.log('积分更新成功:', {
      userId,
      addedCredits: credits,
      creditType,
      isRenewal: creditType === 'subscription' && isRenewal,
      balanceBefore: currentTotalCredits,
      balanceAfter: newTotalCredits,
      subscriptionCredits: newSubscriptionCredits,
      rechargeCredits: newRechargeCredits
    });

    // 记录积分交易历史
    const transactionType = creditType === 'subscription' 
      ? (isRenewal ? 'subscription_renewal' : 'subscription_purchase') 
      : 'purchase';

    const { error: historyError } = await supabase
      .from('act_credit_transactions')
      .insert({
        user_id: userId,
        transaction_type: transactionType,
        credits_amount: parseInt(credits),
        balance_before: currentTotalCredits,
        balance_after: newTotalCredits,
        description: packageDescription,
        reference_id: sessionId.substring(0, 20), // 限制长度
        credit_type: creditType,
        subscription_credits_before: currentSubscriptionCredits,
        subscription_credits_after: newSubscriptionCredits,
        recharge_credits_before: currentRechargeCredits,
        recharge_credits_after: newRechargeCredits
      });

    if (historyError) {
      console.error('记录交易历史失败:', historyError);
    } else {
      console.log('交易历史记录成功!');
    }

    // 根据积分数量判断套餐详细信息
    let packageName = 'Act-2-AI 基础版月付';
    let packageType = 'monthly';
    let amountPaid = 39.90;
    
    if (credits === '4000') {
      packageName = 'Act-2-AI 专业版月付';
      amountPaid = 99.90;
    } else if (credits === '20000') {
      packageName = 'Act-2-AI 基础版年付';
      packageType = 'yearly';
      amountPaid = 399.90;
    } else if (credits === '50000') {
      packageName = 'Act-2-AI 专业版年付';
      packageType = 'yearly';
      amountPaid = 999.90;
    }

    // 同时记录到 act_credit_purchases 表作为积分流水表
    const { error: purchaseError } = await supabase
      .from('act_credit_purchases')
      .insert({
        user_id: userId,
        transaction_type: creditType === 'subscription' ? 'subscription' : 'purchase',
        transaction_status: 'completed',
        credits_amount: parseInt(credits),
        balance_before: currentTotalCredits,
        balance_after: newTotalCredits,
        amount_paid: amountPaid,
        currency: 'USD',
        payment_method: 'stripe',
        payment_status: 'completed',
        package_id: creditType === 'subscription' ? 'subscription_monthly' : 'credit_package',
        package_name: packageName,
        package_type: packageType,
        transaction_id: sessionId,
        session_id: sessionId,
        reference_id: sessionId.substring(0, 20),
        description: packageDescription,
        notes: `用户购买${packageName}，获得${credits}积分${isRenewal ? '（续期重置）' : ''}`,
        credit_type: creditType,
        subscription_credits_before: currentSubscriptionCredits,
        subscription_credits_after: newSubscriptionCredits,
        recharge_credits_before: currentRechargeCredits,
        recharge_credits_after: newRechargeCredits
      });

    if (purchaseError) {
      console.error('记录积分购买流水失败:', purchaseError);
    } else {
      console.log('积分购买流水记录成功!');
    }

    // 重定向到个人中心，显示成功消息
    const successMessage = isRenewal ? 'subscription_renewed' : 'credits_added';
    return NextResponse.redirect(new URL(`/profile?success=true&${successMessage}=${credits}`, request.url));

  } catch (error) {
    console.error('积分更新API错误:', error);
    return NextResponse.redirect(new URL('/profile?error=server_error', request.url));
  }
} 