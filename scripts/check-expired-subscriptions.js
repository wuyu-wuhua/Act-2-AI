#!/usr/bin/env node

/**
 * 检查过期订阅并清零积分
 * 定时运行，确保订阅过期后积分能及时清零
 */

// 请在这里填入你的 Supabase 配置信息
const SUPABASE_URL = 'https://dtgpicaheroudwinncro.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0Z3BpY2FoZXJvdWR3aW5uY3JvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDI5ODU3MiwiZXhwIjoyMDY5ODc0NTcyfQ.8JCU_FU7Zn5Jo8igvSLrUzMQPI7nLNOOAnqKxDIKHeQ';

// 检查配置
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ 缺少必要的 Supabase 配置信息！');
  process.exit(1);
}

// 创建 Supabase 客户端
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// 检查过期订阅
async function checkExpiredSubscriptions() {
  try {
    console.log('🔍 开始检查过期订阅...');
    
    // 查找所有有订阅积分的用户
    const { data: users, error } = await supabase
      .from('act_users')
      .select('*')
      .gt('subscription_credits', 0);
    
    if (error) {
      throw new Error(`查询失败: ${error.message}`);
    }
    
    if (!users || users.length === 0) {
      console.log('✅ 没有找到需要检查的用户');
      return;
    }
    
    console.log(`📊 找到 ${users.length} 个有订阅积分的用户`);
    
    let clearedCount = 0;
    
    for (const user of users) {
      try {
        console.log(`\n🔍 检查用户: ${user.email}`);
        console.log(`   当前积分: ${user.credits_balance}, 订阅积分: ${user.subscription_credits}`);
        
        // 检查订阅状态
        if (user.subscription_status === 'expired' || 
            user.subscription_status === 'cancelled' || 
            user.subscription_status === 'unpaid') {
          
          console.log(`🔴 用户订阅状态为 ${user.subscription_status}，清零积分`);
          
          // 清零订阅积分
          const newBalance = user.recharge_credits;
          
          const { error: updateError } = await supabase
            .from('act_users')
            .update({
              subscription_credits: 0,
              credits_balance: newBalance
            })
            .eq('id', user.id);
          
          if (updateError) {
            console.error(`❌ 更新用户 ${user.email} 失败:`, updateError.message);
            continue;
          }
          
          // 记录交易历史
          await supabase
            .from('act_credit_transactions')
            .insert({
              user_id: user.id,
              transaction_type: 'subscription_expiry',
              credits_amount: -user.subscription_credits,
              balance_before: user.credits_balance,
              balance_after: newBalance,
              description: '定时检查：订阅过期，积分清零',
              reference_id: 'auto_clear_' + Date.now()
            });
          
          console.log(`✅ 用户 ${user.email} 积分清零成功`);
          clearedCount++;
          
        } else if (user.subscription_status === 'active') {
          console.log(`✅ 用户 ${user.email} 订阅状态正常`);
        } else {
          console.log(`⚠️  用户 ${user.email} 订阅状态未知: ${user.subscription_status}`);
        }
        
      } catch (userError) {
        console.error(`❌ 处理用户 ${user.email} 时出错:`, userError.message);
      }
    }
    
    console.log(`\n🎉 检查完成！共清零了 ${clearedCount} 个用户的积分`);
    
  } catch (error) {
    console.error('❌ 检查过期订阅失败:', error.message);
  }
}

// 主函数
async function main() {
  try {
    console.log('🚀 开始检查过期订阅...');
    console.log('🔗 Supabase URL:', SUPABASE_URL);
    
    await checkExpiredSubscriptions();
    
    console.log('\n📝 检查说明：');
    console.log('1. 自动检查所有有订阅积分的用户');
    console.log('2. 如果订阅状态为过期/取消/未付款，自动清零积分');
    console.log('3. 保留充值积分，只清零订阅积分');
    console.log('4. 记录所有清零操作到交易历史');
    
  } catch (error) {
    console.error('💥 程序错误:', error.message);
    process.exit(1);
  }
}

// 运行脚本
if (require.main === module) {
  main();
}
