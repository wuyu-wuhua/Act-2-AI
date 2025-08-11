// 数据库验证脚本
// 在浏览器控制台中运行此脚本来验证数据库状态

async function verifyDatabase() {
  console.log('🔍 开始验证数据库...')
  
  try {
    // 1. 检查用户登录状态
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.log('❌ 请先登录用户')
      return
    }
    
    const userId = user.id
    console.log('✅ 用户已登录:', userId)
    
    // 2. 检查act_users表是否存在
    console.log('2. 检查act_users表...')
    const { data: users, error: usersError } = await supabase
      .from('act_users')
      .select('*')
      .limit(1)
    
    if (usersError) {
      console.error('❌ act_users表不存在或有问题:', usersError)
      return
    }
    
    console.log('✅ act_users表正常')
    
    // 3. 检查act_credit_transactions表是否存在
    console.log('3. 检查act_credit_transactions表...')
    const { data: transactions, error: transError } = await supabase
      .from('act_credit_transactions')
      .select('*')
      .limit(1)
    
    if (transError) {
      console.error('❌ act_credit_transactions表不存在或有问题:', transError)
      return
    }
    
    console.log('✅ act_credit_transactions表正常')
    
    // 4. 检查当前用户是否存在
    console.log('4. 检查当前用户...')
    const { data: currentUser, error: currentUserError } = await supabase
      .from('act_users')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (currentUserError && currentUserError.code === 'PGRST116') {
      console.log('⚠️ 当前用户不存在于数据库中')
    } else if (currentUserError) {
      console.error('❌ 检查当前用户失败:', currentUserError)
      return
    } else {
      console.log('✅ 当前用户存在于数据库中:', currentUser)
    }
    
    // 5. 尝试创建测试用户
    console.log('5. 尝试创建测试用户...')
    const { error: insertError } = await supabase
      .from('act_users')
      .insert({
        id: userId,
        email: user.email,
        google_id: user.user_metadata?.sub,
        google_full_name: user.user_metadata?.full_name,
        google_avatar: user.user_metadata?.avatar_url,
        credits_balance: 0
      })
    
    if (insertError) {
      if (insertError.code === '23505') {
        console.log('ℹ️ 用户已存在（这是正常的）')
      } else {
        console.error('❌ 创建用户失败:', insertError)
        return
      }
    } else {
      console.log('✅ 测试用户创建成功')
    }
    
    // 6. 尝试插入积分交易记录
    console.log('6. 尝试插入积分交易记录...')
    const { error: transInsertError } = await supabase
      .from('act_credit_transactions')
      .insert({
        user_id: userId,
        transaction_type: 'bonus',
        credits_amount: 50,
        balance_before: 0,
        balance_after: 50,
        description: '测试积分',
        reference_id: 'test_bonus'
      })
    
    if (transInsertError) {
      console.error('❌ 插入积分交易记录失败:', transInsertError)
      return
    }
    
    console.log('✅ 积分交易记录插入成功')
    
    // 7. 验证数据
    console.log('7. 验证数据...')
    const { data: finalUser, error: finalUserError } = await supabase
      .from('act_users')
      .select('credits_balance')
      .eq('id', userId)
      .single()
    
    if (finalUserError) {
      console.error('❌ 获取最终用户数据失败:', finalUserError)
      return
    }
    
    console.log('✅ 最终用户积分余额:', finalUser.credits_balance)
    
    console.log('🎉 数据库验证完成！所有功能正常')
    
  } catch (error) {
    console.error('❌ 验证过程中出现错误:', error)
  }
}

// 运行验证
verifyDatabase() 