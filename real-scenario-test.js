// 测试真实场景：在订阅周期结束前取消订阅，周期结束时清零积分
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://dtgpicaheroudwinncro.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0Z3BpY2FoZXJvdWR3aW5uY3JvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDI5ODU3MiwiZXhwIjoyMDY5ODc0NTcyfQ.8JCU_FU7Zn5Jo8igvSLrUzMQPI7nLNOOAnqKxDIKHeQ'
);

async function testRealScenario() {
  console.log('🔬 测试真实场景：周期结束前取消订阅...\n');
  
  try {
    const userId = 'c6cf518d-4be5-48c3-a3a1-e3c54423f591';
    
    // 1. 设置场景：模拟用户在周期结束前取消了订阅
    console.log('1️⃣ 设置场景：模拟在周期结束前取消订阅...');
    
    // 设置一个过去的结束时间（比如1小时前）
    const pastEndDate = new Date();
    pastEndDate.setHours(pastEndDate.getHours() - 1);
    
    const { error: setupError } = await supabase
      .from('act_users')
      .update({
        subscription_status: 'active', // 当前状态是active，但结束日期已过
        subscription_end_date: pastEndDate.toISOString(), // 周期已结束
        subscription_credits: 1300, // 仍有订阅积分
        credits_balance: 1350, // 总积分
        recharge_credits: 50 // 充值积分
      })
      .eq('id', userId);
    
    if (setupError) {
      console.error('❌ 设置场景失败:', setupError);
      return;
    }
    
    console.log('✅ 场景设置完成');
    console.log(`   用户在周期结束前点击了"取消订阅"`);
    console.log(`   订阅状态: active (但周期已结束)`);
    console.log(`   周期结束时间: ${pastEndDate.toISOString()} (已过期)`);
    console.log(`   订阅积分: 1300 (应该被清零)`);
    console.log(`   充值积分: 50 (应该保留)`);
    
    // 2. 验证当前状态
    console.log('\n2️⃣ 验证当前状态...');
    const { data: currentUser, error: userError } = await supabase
      .from('act_users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (userError) {
      console.error('❌ 查询失败:', userError);
      return;
    }
    
    console.log('当前状态:', {
      订阅状态: currentUser.subscription_status,
      订阅结束时间: currentUser.subscription_end_date,
      订阅积分: currentUser.subscription_credits,
      充值积分: currentUser.recharge_credits,
      总积分: currentUser.credits_balance
    });
    
    // 3. 检查清理条件
    const now = new Date();
    const endDate = new Date(currentUser.subscription_end_date);
    
    console.log('\n3️⃣ 清理条件分析...');
    console.log(`当前时间: ${now.toISOString()}`);
    console.log(`订阅结束: ${endDate.toISOString()}`);
    console.log(`已过期: ${now > endDate ? '是' : '否'} (过期 ${Math.round((now - endDate) / (1000 * 60))} 分钟)`);
    console.log(`有订阅积分: ${currentUser.subscription_credits > 0 ? '是' : '否'}`);
    
    const shouldClear = now > endDate && currentUser.subscription_credits > 0;
    console.log(`应该清零: ${shouldClear ? '是' : '否'}`);
    
    if (shouldClear) {
      // 4. 运行清理逻辑
      console.log('\n4️⃣ 运行自动清理逻辑...');
      
      const response = await fetch('http://localhost:3000/api/subscription/cleanup', {
        method: 'GET'
      });
      
      const cleanupResult = await response.json();
      console.log('清理结果:', cleanupResult);
      
      // 5. 验证清理后状态
      console.log('\n5️⃣ 验证清理后状态...');
      const { data: afterUser, error: afterError } = await supabase
        .from('act_users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (afterError) {
        console.error('❌ 查询清理后状态失败:', afterError);
        return;
      }
      
      console.log('清理后状态:', {
        订阅状态: afterUser.subscription_status,
        订阅结束时间: afterUser.subscription_end_date,
        订阅积分: afterUser.subscription_credits,
        充值积分: afterUser.recharge_credits,
        总积分: afterUser.credits_balance
      });
      
      // 6. 验证结果
      console.log('\n6️⃣ 验证结果...');
      
      const isCorrect = afterUser.subscription_credits === 0 && 
                       afterUser.credits_balance === 50 && 
                       afterUser.recharge_credits === 50;
      
      if (isCorrect) {
        console.log('🎉 测试通过！周期结束时积分已正确清零');
        console.log('✅ 订阅积分: 0 (已清零)');
        console.log('✅ 充值积分: 50 (已保留)');
        console.log('✅ 总积分: 50 (仅充值积分)');
      } else {
        console.log('❌ 测试失败！积分清零不正确');
        console.log(`   订阅积分: ${afterUser.subscription_credits} (应为0)`);
        console.log(`   充值积分: ${afterUser.recharge_credits} (应为50)`);
        console.log(`   总积分: ${afterUser.credits_balance} (应为50)`);
      }
      
      // 7. 查看交易记录
      console.log('\n7️⃣ 查看相关交易记录...');
      const { data: transactions, error: transError } = await supabase
        .from('act_credit_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(2);
      
      if (!transError && transactions?.length > 0) {
        console.log('最新交易记录:');
        transactions.forEach((trans, index) => {
          console.log(`  ${index + 1}. ${trans.transaction_type} | ${trans.credits_amount} | ${trans.description}`);
        });
      }
      
    } else {
      console.log('\n⚠️ 清理条件不满足，无法进行测试');
    }
    
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error);
  }
}

// 运行测试
testRealScenario()
  .then(() => {
    console.log('\n✅ 测试完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  });