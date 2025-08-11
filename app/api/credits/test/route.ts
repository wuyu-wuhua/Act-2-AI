import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

// 测试API：手动给用户送积分
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
      .select('credits_balance')
      .eq('id', userId)
      .single()

    if (userError) {
      console.error('Error fetching user data:', userError)
      return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 })
    }

    const currentCredits = userData?.credits_balance || 0

    // 添加积分交易记录
    const { data: transaction, error: transError } = await supabase
      .from('act_credit_transactions')
      .insert({
        user_id: userId,
        transaction_type: 'bonus',
        credits_amount: 50,
        balance_before: currentCredits,
        balance_after: currentCredits + 50,
        description: '测试积分赠送',
        reference_id: 'test_bonus'
      })
      .select()
      .single()

    if (transError) {
      console.error('Error creating transaction:', transError)
      return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 })
    }

    // 更新用户积分余额
    const { error: updateError } = await supabase
      .from('act_users')
      .update({ credits_balance: currentCredits + 50 })
      .eq('id', userId)

    if (updateError) {
      console.error('Error updating user credits:', updateError)
      return NextResponse.json({ error: 'Failed to update user credits' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Test bonus added successfully',
      credits: 50,
      newBalance: currentCredits + 50
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 