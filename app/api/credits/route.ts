import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

// 获取用户积分信息
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    
    // 从URL参数获取用户ID（简化版本）
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // 获取用户积分信息
    const { data: userData, error: userError } = await supabase
      .from('act_users')
      .select('credits_balance')
      .eq('id', userId)
      .single()

    if (userError) {
      console.error('Error fetching user credits:', userError)
      // 如果用户不存在，返回0积分而不是错误
      if (userError.code === 'PGRST116') {
        return NextResponse.json({
          currentCredits: 0,
          totalEarned: 0,
          totalSpent: 0,
          transactions: []
        })
      }
      return NextResponse.json({ error: 'Failed to fetch user credits' }, { status: 500 })
    }

    // 获取积分交易记录
    const { data: transactions, error: transError } = await supabase
      .from('act_credit_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (transError) {
      console.error('Error fetching transactions:', transError)
    }

    // 计算积分统计
    const { data: stats, error: statsError } = await supabase
      .from('act_credit_transactions')
      .select('transaction_type, credits_amount')
      .eq('user_id', userId)

    let totalEarned = 0
    let totalSpent = 0

    if (!statsError && stats) {
      stats.forEach(stat => {
        if (stat.transaction_type === 'purchase' || stat.transaction_type === 'bonus') {
          totalEarned += stat.credits_amount
        } else if (stat.transaction_type === 'consumption') {
          totalSpent += Math.abs(stat.credits_amount)
        }
      })
    }

    return NextResponse.json({
      currentCredits: userData?.credits_balance || 0,
      totalEarned,
      totalSpent,
      transactions: transactions || []
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// 新用户注册送积分
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // 获取用户当前积分余额
    const { data: userData, error: userError } = await supabase
      .from('act_users')
      .select('credits_balance, recharge_credits, subscription_credits')
      .eq('id', userId)
      .single()

    if (userError) {
      console.error('Error fetching user data:', userError)
      // 如果用户不存在，返回错误
      if (userError.code === 'PGRST116') {
        return NextResponse.json({ error: 'User not found in database' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 })
    }

    // 获取用户交易记录
    const { data: transactions, error: transError } = await supabase
      .from('act_credit_transactions')
      .select('id')
      .eq('user_id', userId)

    if (transError) {
      console.error('Error fetching transactions:', transError)
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
    }

    const currentCredits = userData?.credits_balance || 0
    const hasTransactions = transactions && transactions.length > 0

    // 判断是否应该送积分：没有交易记录且积分为0
    if (hasTransactions || currentCredits > 0) {
      return NextResponse.json({ 
        message: 'User already has transactions or credits, no bonus needed',
        reason: hasTransactions ? 'has_transactions' : 'has_credits'
      })
    }

    // 开始事务：添加积分交易记录和更新用户余额
    const { data: transaction, error: transInsertError } = await supabase
      .from('act_credit_transactions')
      .insert({
        user_id: userId,
        transaction_type: 'bonus',
        credits_amount: 50,
        balance_before: 0,
        balance_after: 50,
        description: '新用户注册奖励',
        reference_id: 'signup_bonus'
      })
      .select()
      .single()

    if (transInsertError) {
      console.error('Error creating transaction:', transInsertError)
      return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 })
    }

    // 更新用户积分余额 - 同时更新recharge_credits和credits_balance
    const { error: updateError } = await supabase
      .from('act_users')
      .update({ 
        recharge_credits: 50,
        credits_balance: 50
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Error updating user credits:', updateError)
      return NextResponse.json({ error: 'Failed to update user credits' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Welcome bonus added successfully',
      credits: 50
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 