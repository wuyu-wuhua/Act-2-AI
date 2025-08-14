// 手动测试清理功能
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://dtgpicaheroudwinncro.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0Z3BpY2FoZXJvdWR3aW5uY3JvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDI5ODU3MiwiZXhwIjoyMDY5ODc0NTcyfQ.8JCU_FU7Zn5Jo8igvSLrUzMQPI7nLNOOAnqKxDIKHeQ'
);

async function manualTestCleanup() {
  console.log('🔧 手动测试清理功能...\n');
  
  try {
    const userId = 'c6cf518d-4be5-48c3-a3a1-e3c54423f591';
    
    // 1. 查看当前状态
    console.log('1️⃣ 查看当前状态...');
    const { data: currentUser, error: userError } = await supabase
      .from('act_users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (userError) {
      console.error('❌ 查询用户失败:', userError);
      return;
    }
    
    console.log('当前用户状态:', {
      订阅状态: currentUser.subscription_status,
      订阅结束时间: currentUser.subscription_end_date,
      订阅积分: currentUser.subscription_credits,
      充值积分: currentUser.recharge_credits,
      总积分: currentUser.credits_balance
    });
    
    // 2. 设置测试场景：订阅状态为active但结束日期已过
    if (currentUser.subscription_credits === 0) {
      console.log('\n2️⃣ 设置测试场景：给用户1300订阅积分...');
      
      const { error: setupError } = await supabase
        .from('act_users')
        .update({
          subscription_credits: 1300,
          credits_balance: currentUser.recharge_credits + 1300,
          subscription_status: 'active',
          subscription_end_date: '2025-08-13T08:00:00.000Z' // 今天早上8点（已过期）
        })
        .eq('id', userId);
      
      if (setupError) {
        console.error('❌ 设置测试场景失败:', setupError);
        return;
      }
      
      console.log('✅ 测试场景设置完成');
    }
    
    // 3. 再次查看状态
    console.log('\n3️⃣ 查看设置后的状态...');
    const { data: updatedUser, error: updatedError } = await supabase
      .from('act_users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (updatedError) {
      console.error('❌ 查询更新后状态失败:', updatedError);
      return;
    }
    
    console.log('更新后用户状态:', {
      订阅状态: updatedUser.subscription_status,
      订阅结束时间: updatedUser.subscription_end_date,
      订阅积分: updatedUser.subscription_credits,
      充值积分: updatedUser.recharge_credits,
      总积分: updatedUser.credits_balance
    });
    
    // 4. 检查是否应该被清理
    const now = new Date();
    const endDate = updatedUser.subscription_end_date ? new Date(updatedUser.subscription_end_date) : null;
    
    console.log('\n4️⃣ 清理条件检查...');
    console.log(`当前时间: ${now.toISOString()}`);
    console.log(`订阅结束时间: ${endDate?.toISOString() || 'null'}`);
    console.log(`是否已过期: ${endDate && now > endDate ? '是' : '否'}`);
    console.log(`是否有订阅积分: ${updatedUser.subscription_credits > 0 ? '是' : '否'}`);
    
    const shouldBeCleaned = endDate && now > endDate && updatedUser.subscription_credits > 0;
    console.log(`是否应该被清理: ${shouldBeCleaned ? '是' : '否'}`);
    
    if (shouldBeCleaned) {
      console.log('\n5️⃣ 调用清理API...');
      
      try {
        const response = await fetch('http://localhost:3000/api/subscription/cleanup', {
          method: 'GET'
        });
        
        const result = await response.json();
        console.log('清理API结果:', result);
        
        // 6. 验证清理结果
        console.log('\n6️⃣ 验证清理结果...');
        const { data: finalUser, error: finalError } = await supabase
          .from('act_users')
          .select('*')
          .eq('id', userId)
          .single();
        
        if (finalError) {
          console.error('❌ 查询最终状态失败:', finalError);
          return;
        }
        
        console.log('清理后用户状态:', {
          订阅状态: finalUser.subscription_status,
          订阅结束时间: finalUser.subscription_end_date,
          订阅积分: finalUser.subscription_credits,
          充值积分: finalUser.recharge_credits,
          总积分: finalUser.credits_balance
        });
        
        const wasCleared = finalUser.subscription_credits === 0;
        console.log(`\n清理结果: ${wasCleared ? '✅ 成功清零' : '❌ 未清零'}`);
        
      } catch (error) {
        console.error('❌ 调用清理API失败:', error);
      }
    } else {
      console.log('\n⚠️ 当前条件不满足清理要求，跳过清理测试');
    }
    
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error);
  }
}

// 运行测试
manualTestCleanup()
  .then(() => {
    console.log('\n✅ 测试完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  });