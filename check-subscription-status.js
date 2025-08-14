// 检查用户订阅状态和周期结束情况
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://dtgpicaheroudwinncro.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0Z3BpY2FoZXJvdWR3aW5uY3JvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDI5ODU3MiwiZXhwIjoyMDY5ODc0NTcyfQ.8JCU_FU7Zn5Jo8igvSLrUzMQPI7nLNOOAnqKxDIKHeQ'
);

async function checkSubscriptionStatus() {
  console.log('🔍 检查订阅状态和周期结束情况...\n');
  
  try {
    // 查看您的账户详细信息
    const { data: userData, error: userError } = await supabase
      .from('act_users')
      .select('*')
      .eq('email', 'lgf626550@gmail.com')
      .single();
    
    if (userError) {
      console.error('❌ 查询用户失败:', userError);
      return;
    }
    
    console.log('👤 您的账户详细信息:');
    console.log({
      id: userData.id,
      email: userData.email,
      总积分: userData.credits_balance,
      订阅积分: userData.subscription_credits,
      充值积分: userData.recharge_credits,
      订阅状态: userData.subscription_status,
      订阅开始: userData.subscription_start_date,
      订阅结束: userData.subscription_end_date,
      订阅计划: userData.subscription_plan_id,
      创建时间: userData.created_at
    });
    
    // 检查是否有过期的订阅积分
    const now = new Date();
    const hasExpiredSubscription = userData.subscription_end_date && 
                                  new Date(userData.subscription_end_date) < now;
    const hasSubscriptionCredits = userData.subscription_credits > 0;
    
    console.log('\n📊 订阅状态分析:');
    console.log(`当前时间: ${now.toISOString()}`);
    
    if (userData.subscription_end_date) {
      const endDate = new Date(userData.subscription_end_date);
      const daysPassed = Math.floor((now - endDate) / (1000 * 60 * 60 * 24));
      
      console.log(`订阅结束时间: ${endDate.toISOString()}`);
      console.log(`是否已过期: ${hasExpiredSubscription ? '是' : '否'}`);
      
      if (hasExpiredSubscription) {
        console.log(`过期天数: ${daysPassed} 天`);
      }
    } else {
      console.log('订阅结束时间: 未设置');
    }
    
    console.log(`是否有订阅积分: ${hasSubscriptionCredits ? '是' : '否'}`);
    console.log(`订阅积分数量: ${userData.subscription_credits}`);
    
    // 判断是否需要清零
    if (hasExpiredSubscription && hasSubscriptionCredits) {
      console.log('\n⚠️ 检测到问题: 订阅已过期但仍有订阅积分!');
      console.log('建议立即清零订阅积分');
      
      // 自动清零
      console.log('\n🔧 正在自动清零过期订阅积分...');
      
      const newBalance = userData.recharge_credits || 0;
      
      const { error: updateError } = await supabase
        .from('act_users')
        .update({ 
          subscription_credits: 0,
          credits_balance: newBalance
        })
        .eq('id', userData.id);
      
      if (updateError) {
        console.error('❌ 清零积分失败:', updateError);
      } else {
        console.log('✅ 订阅积分已清零');
        
        // 记录交易历史
        const { error: historyError } = await supabase
          .from('act_credit_transactions')
          .insert({
            user_id: userData.id,
            transaction_type: 'refund',
            credits_amount: -userData.subscription_credits,
            balance_before: userData.credits_balance,
            balance_after: newBalance,
            description: `过期订阅积分清零 (过期${Math.floor((now - new Date(userData.subscription_end_date)) / (1000 * 60 * 60 * 24))}天)`,
            reference_id: 'expired_cleanup_' + Date.now()
          });
        
        if (historyError) {
          console.error('❌ 记录交易历史失败:', historyError);
        } else {
          console.log('✅ 交易历史已记录');
        }
      }
    } else if (hasExpiredSubscription) {
      console.log('\n✅ 过期订阅的积分已正确清零');
    } else if (hasSubscriptionCredits) {
      console.log('\n✅ 订阅仍有效，积分保留');
    } else {
      console.log('\n✅ 状态正常');
    }
    
  } catch (error) {
    console.error('❌ 检查过程中出现错误:', error);
  }
}

// 运行检查
checkSubscriptionStatus()
  .then(() => {
    console.log('\n✅ 检查完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 检查失败:', error);
    process.exit(1);
  });