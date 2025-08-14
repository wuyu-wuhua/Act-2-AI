import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { userId, clearAll } = body;
    
    // 🔧 新增：如果指定clearAll=true，则清零所有过期用户
    if (clearAll === true) {
      return await clearAllExpiredUsers();
    }
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '缺少用户ID或clearAll参数' },
        { status: 400 }
      );
    }
    
    console.log('🔧 强制清零订阅积分:', { userId });
    
    // 获取用户当前积分信息
    const { data: userData, error: userError } = await supabase
      .from('act_users')
      .select('credits_balance, subscription_credits, recharge_credits')
      .eq('id', userId)
      .single();
    
    if (userError) {
      console.error('❌ 查询用户失败:', userError.message);
      return NextResponse.json(
        { success: false, error: '查询用户失败' },
        { status: 500 }
      );
    }
    
    if (!userData) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }
    
    const currentBalance = userData.credits_balance || 0;
    const subscriptionCredits = userData.subscription_credits || 0;
    const rechargeCredits = userData.recharge_credits || 0;
    
    console.log('👤 用户当前积分状态:', {
      userId,
      总积分: currentBalance,
      订阅积分: subscriptionCredits,
      充值积分: rechargeCredits
    });
    
    if (subscriptionCredits === 0) {
      return NextResponse.json({
        success: true,
        message: '订阅积分已经是0，无需清零',
        actionTaken: '无需操作'
      });
    }
    
    // 清零订阅积分，保留充值积分
    const newBalance = rechargeCredits;
    
    const { error: updateError } = await supabase
      .from('act_users')
      .update({ 
        subscription_credits: 0,
        credits_balance: newBalance,
        subscription_status: 'expired'
      })
      .eq('id', userId);
    
    if (updateError) {
      console.error('❌ 清零订阅积分失败:', updateError.message);
      return NextResponse.json(
        { success: false, error: '清零订阅积分失败' },
        { status: 500 }
      );
    }
    
    // 记录积分清零交易历史
    const { error: historyError } = await supabase
      .from('act_credit_transactions')
      .insert({
        user_id: userId,
        transaction_type: 'refund',
        credits_amount: -subscriptionCredits,
        balance_before: currentBalance,
        balance_after: newBalance,
        description: '强制清零订阅积分 - 系统修复',
        reference_id: 'force_clear_' + Date.now()
      });
    
    if (historyError) {
      console.warn('⚠️ 记录交易历史失败:', historyError.message);
    }
    
    console.log('✅ 强制清零订阅积分成功:', {
      userId,
      清零前总积分: currentBalance,
      清零前订阅积分: subscriptionCredits,
      清零前充值积分: rechargeCredits,
      清零后总积分: newBalance,
      清零后订阅积分: 0,
      清零后充值积分: rechargeCredits
    });
    
    return NextResponse.json({
      success: true,
      message: '订阅积分清零成功',
      actionTaken: `清零了 ${subscriptionCredits} 订阅积分`,
      data: {
        before: {
          totalCredits: currentBalance,
          subscriptionCredits: subscriptionCredits,
          rechargeCredits: rechargeCredits
        },
        after: {
          totalCredits: newBalance,
          subscriptionCredits: 0,
          rechargeCredits: rechargeCredits
        }
      }
    });
    
  } catch (error) {
    console.error('❌ 强制清零订阅积分失败:', error);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

// 🔧 新增：批量清理所有过期用户的订阅积分
async function clearAllExpiredUsers() {
  try {
    console.log('🚨 开始批量清零所有过期用户的订阅积分');
    
    // 查找所有expired状态且有订阅积分的用户
    const { data: expiredUsers, error: queryError } = await supabase
      .from('act_users')
      .select('id, email, credits_balance, subscription_credits, recharge_credits, subscription_status, subscription_end_date')
      .eq('subscription_status', 'expired')
      .gt('subscription_credits', 0);

    if (queryError) {
      console.error('❌ 查询过期用户失败:', queryError);
      return NextResponse.json(
        { success: false, error: '查询过期用户失败', details: queryError.message },
        { status: 500 }
      );
    }

    if (!expiredUsers || expiredUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: '没有需要清零的过期用户',
        clearedCount: 0
      });
    }

    console.log(`📋 找到 ${expiredUsers.length} 个需要清零的过期用户`);

    let clearedCount = 0;
    const results = [];

    // 处理每个过期用户
    for (const user of expiredUsers) {
      try {
        const newBalance = user.recharge_credits || 0;
        
        // 清零订阅积分，只保留充值积分
        const { error: updateError } = await supabase
          .from('act_users')
          .update({
            subscription_credits: 0,
            credits_balance: newBalance
          })
          .eq('id', user.id);

        if (updateError) {
          console.error(`❌ 更新用户 ${user.email} 失败:`, updateError);
          results.push({
            email: user.email,
            status: 'failed',
            error: updateError.message
          });
          continue;
        }

        // 记录交易历史
        const { error: historyError } = await supabase
          .from('act_credit_transactions')
          .insert({
            user_id: user.id,
            transaction_type: 'refund',
            credits_amount: -user.subscription_credits,
            balance_before: user.credits_balance,
            balance_after: newBalance,
            description: `批量清零过期订阅积分 (状态: expired, 清零积分: ${user.subscription_credits}, 保留充值积分: ${user.recharge_credits || 0})`,
            reference_id: 'batch_clear_expired_' + Date.now() + '_' + user.id.slice(-8)
          });

        if (historyError) {
          console.error(`❌ 记录交易历史失败 ${user.email}:`, historyError);
        }

        clearedCount++;
        results.push({
          email: user.email,
          status: 'success',
          clearedCredits: user.subscription_credits,
          remainingRechargeCredits: user.recharge_credits || 0,
          newBalance: newBalance
        });

        console.log(`✅ 已清零用户 ${user.email} 的订阅积分: ${user.subscription_credits}, 保留充值积分: ${user.recharge_credits || 0}`);

      } catch (error) {
        console.error(`❌ 处理用户 ${user.email} 时出错:`, error);
        results.push({
          email: user.email,
          status: 'failed',
          error: (error as Error).message
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `批量清零完成，处理了 ${clearedCount}/${expiredUsers.length} 个用户`,
      clearedCount,
      totalFound: expiredUsers.length,
      results
    });

  } catch (error) {
    console.error('❌ 批量清零过程中出现错误:', error);
    return NextResponse.json(
      { success: false, error: '批量清零失败', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// GET 方法用于查看需要清零的用户
export async function GET() {
  try {
    const { data: expiredUsers, error: queryError } = await supabase
      .from('act_users')
      .select('id, email, subscription_status, subscription_end_date, subscription_credits, recharge_credits, credits_balance')
      .eq('subscription_status', 'expired')
      .gt('subscription_credits', 0);

    if (queryError) {
      return NextResponse.json(
        { error: '查询过期用户失败', details: queryError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: '需要清零的过期用户列表',
      count: expiredUsers?.length || 0,
      users: expiredUsers?.map(user => ({
        email: user.email,
        subscriptionStatus: user.subscription_status,
        subscriptionEndDate: user.subscription_end_date,
        subscriptionCredits: user.subscription_credits,
        rechargeCredits: user.recharge_credits,
        totalCredits: user.credits_balance
      })) || []
    });

  } catch (error) {
    return NextResponse.json(
      { error: '查询失败', details: (error as Error).message },
      { status: 500 }
    );
  }
}

