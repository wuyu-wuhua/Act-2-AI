import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 日志记录类
class ForceCleanupLogger {
  static logEvent(event: string, data: any) {
    console.log(`[FORCE_CLEANUP] ${event}:`, {
      timestamp: new Date().toISOString(),
      event,
      data
    });
  }
  
  static logError(error: Error, context: any) {
    console.error(`[FORCE_CLEANUP ERROR]:`, {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      context
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    ForceCleanupLogger.logEvent('开始强制订阅清理', {});
    
    const result = await performForceCleanup();
    
    return NextResponse.json({
      success: true,
      message: '强制订阅清理完成',
      result
    });
    
  } catch (error) {
    ForceCleanupLogger.logError(error as Error, {});
    return NextResponse.json(
      { error: '强制订阅清理失败', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// GET端点用于手动触发
export async function GET() {
  try {
    ForceCleanupLogger.logEvent('手动触发强制订阅清理', {});
    
    const result = await performForceCleanup();
    
    return NextResponse.json({
      success: true,
      message: '手动强制订阅清理完成',
      result
    });
    
  } catch (error) {
    ForceCleanupLogger.logError(error as Error, {});
    return NextResponse.json(
      { error: '手动强制订阅清理失败', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// 执行强制清理任务
async function performForceCleanup() {
  try {
    const now = new Date();
    let processedCount = 0;
    let clearedCount = 0;
    
    ForceCleanupLogger.logEvent('开始查找需要强制清理的订阅', { currentTime: now.toISOString() });
    
    // 🔧 使用更简单的查询方式，分别查找不同类型的过期订阅
    let allExpiredUsers = [];
    
    // 1. 查找已取消且已过期的订阅
    const { data: canceledExpired, error: queryError1 } = await supabase
      .from('act_users')
      .select('id, email, credits_balance, subscription_credits, recharge_credits, subscription_status, subscription_end_date')
      .in('subscription_status', ['canceled', 'cancelled', 'past_due'])
      .lt('subscription_end_date', now.toISOString())
      .gt('subscription_credits', 0);
    
    // 2. 查找状态为expired且有订阅积分的用户
    const { data: expiredUsers, error: queryError2 } = await supabase
      .from('act_users')
      .select('id, email, credits_balance, subscription_credits, recharge_credits, subscription_status, subscription_end_date')
      .eq('subscription_status', 'expired')
      .gt('subscription_credits', 0);
    
    // 3. 查找有结束日期且已过期的订阅（不限状态）
    const { data: dateExpired, error: queryError3 } = await supabase
      .from('act_users')
      .select('id, email, credits_balance, subscription_credits, recharge_credits, subscription_status, subscription_end_date')
      .lt('subscription_end_date', now.toISOString())
      .not('subscription_end_date', 'is', null)
      .gt('subscription_credits', 0);
    
    if (queryError1 || queryError2 || queryError3) {
      const error = queryError1 || queryError2 || queryError3;
      throw new Error(`查询过期订阅失败: ${error?.message}`);
    }
    
    // 合并所有结果并去重
    const allUsers = [
      ...(canceledExpired || []),
      ...(expiredUsers || []),
      ...(dateExpired || [])
    ];
    
    // 使用 Set 去重
    const uniqueUserIds = new Set();
    const expiredSubscriptions = allUsers.filter(user => {
      if (uniqueUserIds.has(user.id)) {
        return false;
      }
      uniqueUserIds.add(user.id);
      return true;
    });
    
    if (!expiredSubscriptions || expiredSubscriptions.length === 0) {
      ForceCleanupLogger.logEvent('没有找到需要强制清理的订阅', {});
      return { 
        processedCount: 0, 
        clearedCount: 0,
        breakdown: {
          canceledExpired: 0,
          expiredStatus: 0,
          dateExpired: 0
        }
      };
    }
    
    ForceCleanupLogger.logEvent('找到需要强制清理的订阅', { 
      count: expiredSubscriptions.length,
      breakdown: {
        canceledExpired: canceledExpired?.length || 0,
        expiredStatus: expiredUsers?.length || 0,
        dateExpired: dateExpired?.length || 0
      },
      userIds: expiredSubscriptions.map(u => u.id)
    });
    
    // 处理每个需要清零的用户
    for (const user of expiredSubscriptions) {
      try {
        processedCount++;
        
        if (user.subscription_credits > 0) {
          const endDate = user.subscription_end_date ? new Date(user.subscription_end_date) : null;
          let clearReason = 'force_cleanup';
          
          // 确定清零原因
          if (user.subscription_status === 'expired') {
            clearReason = 'status_expired';
          } else if (['canceled', 'cancelled', 'past_due'].includes(user.subscription_status)) {
            if (endDate && now >= endDate) {
              clearReason = 'canceled_and_period_ended';
            } else {
              clearReason = 'canceled_immediate';
            }
          } else if (endDate && now >= endDate) {
            clearReason = 'period_ended';
          }
          
          ForceCleanupLogger.logEvent('强制清零过期订阅积分', {
            userId: user.id,
            email: user.email,
            subscriptionCredits: user.subscription_credits,
            subscriptionStatus: user.subscription_status,
            subscriptionEndDate: user.subscription_end_date,
            clearReason,
            currentTime: now.toISOString()
          });
          
          // 清零订阅积分（保留充值积分）
          await clearExpiredSubscriptionCredits(user.id, user.subscription_credits, user.recharge_credits, clearReason);
          clearedCount++;
          
          // 更新订阅状态为expired
          await supabase
            .from('act_users')
            .update({ 
              subscription_status: 'expired',
              updated_at: now.toISOString()
            })
            .eq('id', user.id);
        }
        
      } catch (error) {
        ForceCleanupLogger.logError(error as Error, {
          context: '处理强制清零订阅',
          userId: user.id
        });
      }
    }
    
    ForceCleanupLogger.logEvent('强制订阅清理任务完成', {
      processedCount,
      clearedCount,
      totalFound: expiredSubscriptions.length
    });
    
    return {
      processedCount,
      clearedCount,
      totalFound: expiredSubscriptions.length,
      breakdown: {
        canceledExpired: canceledExpired?.length || 0,
        expiredStatus: expiredUsers?.length || 0,
        dateExpired: dateExpired?.length || 0
      }
    };
    
  } catch (error) {
    ForceCleanupLogger.logError(error as Error, { context: '执行强制清理任务' });
    throw error;
  }
}

// 清零过期订阅的积分（仅清零订阅积分，保留充值积分）
async function clearExpiredSubscriptionCredits(userId: string, subscriptionCredits: number, rechargeCredits: number, reason: string = 'expired') {
  try {
    // 只清零订阅积分，保持充值积分
    const newBalance = rechargeCredits; // 只保留充值积分
    
    const { error: updateError } = await supabase
      .from('act_users')
      .update({ 
        subscription_credits: 0,
        credits_balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
    
    if (updateError) {
      throw new Error(`更新用户积分失败: ${updateError.message}`);
    }
    
    // 记录积分清零交易历史
    const { error: historyError } = await supabase
      .from('act_credit_transactions')
      .insert({
        user_id: userId,
        transaction_type: 'refund',
        credits_amount: -subscriptionCredits,
        balance_before: subscriptionCredits + rechargeCredits,
        balance_after: newBalance,
        description: `强制清零订阅积分 (原因: ${reason}, 清零订阅积分: ${subscriptionCredits}, 保留充值积分: ${rechargeCredits})`,
        reference_id: 'force_cleanup_' + Date.now()
      });
    
    if (historyError) {
      ForceCleanupLogger.logError(historyError as Error, {
        context: '记录积分清零交易历史',
        userId
      });
    }
    
    ForceCleanupLogger.logEvent('订阅积分强制清零成功', {
      userId,
      clearedSubscriptionCredits: subscriptionCredits,
      remainingRechargeCredits: rechargeCredits,
      newTotalBalance: newBalance,
      reason
    });
    
  } catch (error) {
    ForceCleanupLogger.logError(error as Error, { userId, subscriptionCredits, rechargeCredits });
    throw error;
  }
}