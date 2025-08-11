// 调试积分系统脚本
// 在浏览器控制台中运行此脚本来诊断问题

async function debugCreditsSystem() {
  console.log('🔍 开始调试积分系统...')
  
  try {
    // 1. 检查当前用户
    console.log('1. 检查当前用户...')
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.error('❌ 获取用户失败:', userError)
      return
    }
    
    if (!user) {
      console.log('❌ 用户未登录，请先登录')
      return
    }
    
    const userId = user.id
    console.log('✅ 当前用户ID:', userId)
    console.log('✅ 用户邮箱:', user.email)
    
    // 2. 检查用户是否在数据库中存在
    console.log('2. 检查用户是否在数据库中存在...')
    const { data: dbUser, error: dbError } = await supabase
      .from('act_users')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (dbError) {
      console.error('❌ 数据库查询失败:', dbError)
      
      if (dbError.code === 'PGRST116') {
        console.log('⚠️ 用户不存在于数据库中，尝试创建...')
        
        // 尝试创建用户
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
          console.error('❌ 创建用户失败:', insertError)
          return
        } else {
          console.log('✅ 用户创建成功！')
        }
      }
    } else {
      console.log('✅ 用户存在于数据库中:', dbUser)
    }
    
    // 3. 检查积分API
    console.log('3. 测试积分API...')
    const response = await fetch(`/api/credits?userId=${userId}`)
    
    if (!response.ok) {
      console.error('❌ 积分API调用失败:', response.status, response.statusText)
      const errorText = await response.text()
      console.error('错误详情:', errorText)
      return
    }
    
    const data = await response.json()
    console.log('✅ 积分API响应:', data)
    
    // 4. 尝试送积分
    console.log('4. 尝试送积分...')
    const bonusResponse = await fetch('/api/credits', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId })
    })
    
    if (!bonusResponse.ok) {
      console.error('❌ 送积分失败:', bonusResponse.status, bonusResponse.statusText)
      const errorText = await bonusResponse.text()
      console.error('错误详情:', errorText)
      return
    }
    
    const bonusData = await bonusResponse.json()
    console.log('✅ 送积分响应:', bonusData)
    
    // 5. 再次检查积分
    console.log('5. 再次检查积分...')
    const finalResponse = await fetch(`/api/credits?userId=${userId}`)
    const finalData = await finalResponse.json()
    console.log('✅ 最终积分状态:', finalData)
    
    console.log('🎉 调试完成！')
    
  } catch (error) {
    console.error('❌ 调试过程中出现错误:', error)
  }
}

// 运行调试
debugCreditsSystem() 