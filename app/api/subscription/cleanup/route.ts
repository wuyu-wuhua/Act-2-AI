import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 日志记录类
class CleanupLogger {
  static logEvent(event: string, data: any) {
    console.log(`[CLEANUP] ${event}:`, {
      timestamp: new Date().toISOString(),
      event,
      data
    });
  }
  
  static logError(error: Error, context: any) {
    console.error(`[CLEANUP ERROR]:`, {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      context
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    // 验证请求（可以添加API密钥验证）
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CLEANUP_API_KEY}`) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    CleanupLogger.logEvent('开始订阅清理任务', {});
    
    // 执行订阅清理任务
    const result = await performSubscriptionCleanup();
    
    return NextResponse.json({
      success: true,
      message: '订阅清理任务完成',
      result
    });
    
  } catch (error) {
    CleanupLogger.logError(error as Error, {});
    return NextResponse.json(
      { error: '订阅清理任务失败' },
      { status: 500 }
    );
  }
}

// 执行订阅清理任务
async function performSubscriptionCleanup() {
  try {
    const now = new Date();
    let processedCount = 0;
    let clearedCount = 0;
    
    CleanupLogger.logEvent('开始检查过期的订阅', { currentTime: now.toISOString() });
    
    // 🔧 修复：分步查找所有需要清零的订阅情况
    let allExpiredUsers = [];
    
    // 1. 查找已取消且已过期的订阅（这是主要的清零场景）
    const { data: canceledExpired, error: queryError1 } = await supabase
      .from('act_users')
      .select('id, credits_balance, subscription_credits, recharge_credits, subscription_status, subscription_end_date')
      .in('subscription_status', ['canceled', 'cancelled', 'past_due'])
      .lt('subscription_end_date', now.toISOString())
      .gt('subscription_credits', 0);
    
    // 2. 查找状态为expired且有订阅积分的用户
    const { data: expiredUsers, error: queryError2 } = await supabase
      .from('act_users')
      .select('id, credits_balance, subscription_credits, recharge_credits, subscription_status, subscription_end_date')
      .eq('subscription_status', 'expired')
      .gt('subscription_credits', 0);
    
    // 3. 查找有结束日期且已过期的订阅（不限状态）
    const { data: dateExpired, error: queryError3 } = await supabase
      .from('act_users')
      .select('id, credits_balance, subscription_credits, recharge_credits, subscription_status, subscription_end_date')
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
      CleanupLogger.logEvent('没有找到过期的订阅', {});
      return { processedCount: 0, clearedCount: 0 };
    }
    
    CleanupLogger.logEvent('找到过期订阅', { 
      count: expiredSubscriptions.length,
      breakdown: {
        canceledExpired: canceledExpired?.length || 0,
        expiredStatus: expiredUsers?.length || 0,
        dateExpired: dateExpired?.length || 0
      }
    });
    
    // 处理每个过期的订阅
    for (const subscription of expiredSubscriptions) {
      try {
        processedCount++;
        
        if (subscription.subscription_credits > 0) {
          // 🔧 修复：确定清零原因并记录详细信息
          const now = new Date();
          const endDate = subscription.subscription_end_date ? new Date(subscription.subscription_end_date) : null;
          
          let clearReason = 'unknown';
          if (subscription.subscription_status === 'expired') {
            clearReason = 'status_expired';
          } else if (['canceled', 'cancelled', 'past_due'].includes(subscription.subscription_status)) {
            if (endDate && now >= endDate) {
              clearReason = 'canceled_and_period_ended';
            } else {
              clearReason = 'canceled_immediate';
            }
          } else if (endDate && now >= endDate) {
            clearReason = 'period_ended';
          }
          
          // 清零订阅积分（保留充值积分）
          await clearExpiredSubscriptionCredits(subscription.id, subscription.subscription_credits, subscription.recharge_credits, clearReason);
          clearedCount++;
          
          CleanupLogger.logEvent('已清零过期订阅积分', {
            userId: subscription.id,
            clearedSubscriptionCredits: subscription.subscription_credits,
            remainingRechargeCredits: subscription.recharge_credits,
            subscriptionStatus: subscription.subscription_status,
            subscriptionEndDate: subscription.subscription_end_date,
            clearReason: clearReason,
            currentTime: now.toISOString()
          });
        }
        
        // 更新订阅状态
        await updateExpiredSubscriptionStatus(subscription.id);
        
      } catch (error) {
        CleanupLogger.logError(error as Error, {
          userId: subscription.id,
          context: '处理过期订阅'
        });
      }
    }
    
    CleanupLogger.logEvent('订阅清理任务完成', {
      processedCount,
      clearedCount,
      totalExpired: expiredSubscriptions.length
    });
    
    return {
      processedCount,
      clearedCount,
      totalExpired: expiredSubscriptions.length
    };
    
  } catch (error) {
    CleanupLogger.logError(error as Error, { context: '执行订阅清理任务' });
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
        subscription_status: 'expired',
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
        transaction_type: 'subscription_expiry',
        credits_amount: -subscriptionCredits,
        balance_before: subscriptionCredits + rechargeCredits,
        balance_after: newBalance,
        description: `订阅积分清零 (原因: ${reason}, 清零订阅积分: ${subscriptionCredits}, 保留充值积分: ${rechargeCredits})`,
        reference_id: 'cleanup_' + Date.now()
      });
    
    if (historyError) {
      CleanupLogger.logError(historyError as Error, {
        context: '记录积分清零交易历史',
        userId
      });
    }
    
  } catch (error) {
    CleanupLogger.logError(error as Error, { userId, subscriptionCredits, rechargeCredits });
    throw error;
  }
}

// 更新过期订阅状态
async function updateExpiredSubscriptionStatus(userId: string) {
  try {
    const { error } = await supabase
      .from('act_users')
      .update({ 
        subscription_status: 'expired',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
    
    if (error) {
      throw new Error(`更新订阅状态失败: ${error.message}`);
    }
    
  } catch (error) {
    CleanupLogger.logError(error as Error, { userId });
    throw error;
  }
}

// 手动触发清理的GET端点（用于测试）
export async function GET() {
  try {
    CleanupLogger.logEvent('手动触发订阅清理', {});
    
    const result = await performSubscriptionCleanup();
    
    return NextResponse.json({
      success: true,
      message: '手动订阅清理任务完成',
      result
    });
    
  } catch (error) {
    CleanupLogger.logError(error as Error, {});
    return NextResponse.json(
      { error: '手动订阅清理任务失败' },
      { status: 500 }
    );
  }
} 