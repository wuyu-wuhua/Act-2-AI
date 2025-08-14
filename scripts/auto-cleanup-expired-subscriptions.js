#!/usr/bin/env node

/**
 * 自动清理过期订阅积分的定时任务脚本
 * 当订阅被取消且周期结束后，自动清零订阅积分但保留充值积分
 * 
 * 使用方法：
 * 1. 手动运行：node scripts/auto-cleanup-expired-subscriptions.js
 * 2. 定时任务：添加到cron或使用node-cron包
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// 创建Supabase客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 日志记录类
class CleanupLogger {
  static logEvent(event, data) {
    console.log(`[AUTO-CLEANUP] ${event}:`, {
      timestamp: new Date().toISOString(),
      event,
      data
    });
  }
  
  static logError(error, context) {
    console.error(`[AUTO-CLEANUP ERROR]:`, {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      context
    });
  }
}

// 执行自动清理任务
async function performAutoCleanup() {
  try {
    const now = new Date();
    let processedCount = 0;
    let clearedCount = 0;
    
    CleanupLogger.logEvent('开始自动清理过期订阅积分', { currentTime: now.toISOString() });
    
    // 查找所有已取消且已过期的订阅（这是主要的清零场景）
    const { data: expiredSubscriptions, error: queryError } = await supabase
      .from('act_users')
      .select('id, email, subscription_status, subscription_end_date, subscription_credits, recharge_credits, credits_balance')
      .eq('subscription_status', 'cancelled')
      .lt('subscription_end_date', now.toISOString())
      .gt('subscription_credits', 0);
    
    if (queryError) {
      throw new Error(`查询过期订阅失败: ${queryError.message}`);
    }
    
    if (!expiredSubscriptions || expiredSubscriptions.length === 0) {
      CleanupLogger.logEvent('没有找到需要清理的过期订阅', {});
      return { processedCount: 0, clearedCount: 0 };
    }
    
    CleanupLogger.logEvent('找到过期订阅', { 
      count: expiredSubscriptions.length,
      subscriptions: expiredSubscriptions.map(sub => ({
        id: sub.id,
        email: sub.email,
        subscriptionCredits: sub.subscription_credits,
        rechargeCredits: sub.recharge_credits,
        endDate: sub.subscription_end_date
      }))
    });
    
    // 处理每个过期的订阅
    for (const subscription of expiredSubscriptions) {
      try {
        processedCount++;
        
        // 清零订阅积分，保留充值积分
        const newCreditsBalance = subscription.recharge_credits;
        
        const { error: updateError } = await supabase
          .from('act_users')
          .update({
            subscription_credits: 0,
            credits_balance: newCreditsBalance,
            subscription_status: 'expired',
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.id);
        
        if (updateError) {
          throw new Error(`更新用户积分失败: ${updateError.message}`);
        }
        
        // 记录积分清零交易历史
        const { error: transactionError } = await supabase
          .from('act_credit_transactions')
          .insert({
            user_id: subscription.id,
            transaction_type: 'subscription_expiry',
            credits_amount: -subscription.subscription_credits,
            balance_before: subscription.credits_balance,
            balance_after: newCreditsBalance,
            description: `自动清理过期订阅积分 (清零订阅积分: ${subscription.subscription_credits}, 保留充值积分: ${subscription.recharge_credits})`,
            reference_id: 'auto_cleanup_' + Date.now()
          });
        
        if (transactionError) {
          CleanupLogger.logError(transactionError, {
            context: '记录积分清零交易历史',
            userId: subscription.id
          });
          // 即使记录历史失败，也不影响积分清零的主要操作
        }
        
        clearedCount++;
        
        CleanupLogger.logEvent('已自动清零过期订阅积分', {
          userId: subscription.id,
          email: subscription.email,
          clearedSubscriptionCredits: subscription.subscription_credits,
          remainingRechargeCredits: subscription.recharge_credits,
          newBalance: newCreditsBalance,
          endDate: subscription.subscription_end_date
        });
        
      } catch (error) {
        CleanupLogger.logError(error, {
          userId: subscription.id,
          email: subscription.email,
          context: '处理过期订阅'
        });
      }
    }
    
    CleanupLogger.logEvent('自动清理任务完成', {
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
    CleanupLogger.logError(error, { context: '执行自动清理任务' });
    throw error;
  }
}

// 主函数
async function main() {
  try {
    console.log('🚀 开始执行自动清理过期订阅积分任务...');
    
    const result = await performAutoCleanup();
    
    console.log('✅ 自动清理任务完成！');
    console.log('📊 任务结果:', {
      处理用户数: result.processedCount,
      清零用户数: result.clearedCount,
      总过期订阅数: result.totalExpired
    });
    
    // 如果清理了积分，发送通知（可选）
    if (result.clearedCount > 0) {
      console.log(`🔔 已自动清理 ${result.clearedCount} 个用户的过期订阅积分`);
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ 自动清理任务失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

// 导出函数供其他模块使用
module.exports = {
  performAutoCleanup,
  CleanupLogger
};
