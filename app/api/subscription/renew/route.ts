import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { user_id, plan_credits = 1300 } = await request.json();

    if (!user_id) {
      return NextResponse.json(
        { error: '用户ID是必需的' },
        { status: 400 }
      );
    }

    console.log(`开始处理用户 ${user_id} 的订阅续费，计划积分: ${plan_credits}`);

    // 调用数据库函数来处理订阅续费
    const { data, error } = await supabase
      .rpc('manual_subscription_renewal', {
        p_user_id: user_id,
        p_plan_credits: plan_credits
      });

    if (error) {
      console.error('订阅续费失败:', error);
      return NextResponse.json(
        { error: '订阅续费失败', details: error.message },
        { status: 500 }
      );
    }

    console.log('订阅续费完成:', data);

    return NextResponse.json({
      success: true,
      data: data,
      message: '订阅续费成功'
    });

  } catch (error) {
    console.error('订阅续费API错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

// 支持GET请求来查看用户的订阅状态
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');

    if (!user_id) {
      return NextResponse.json(
        { error: '用户ID是必需的' },
        { status: 400 }
      );
    }

    console.log(`查询用户 ${user_id} 的订阅状态...`);

    // 查询用户订阅状态
    const { data: userData, error } = await supabase
      .from('act_users')
      .select('id, email, subscription_status, subscription_start_date, subscription_end_date, subscription_credits, recharge_credits, credits_balance')
      .eq('id', user_id)
      .single();

    if (error) {
      console.error('查询用户订阅状态失败:', error);
      return NextResponse.json(
        { error: '查询用户订阅状态失败', details: error.message },
        { status: 500 }
      );
    }

    // 查询最近的交易记录
    const { data: transactions, error: transError } = await supabase
      .from('act_credit_transactions')
      .select('transaction_type, credits_amount, description, created_at')
      .eq('user_id', user_id)
      .in('transaction_type', ['subscription_renewal', 'subscription_expiry', 'subscription_purchase'])
      .order('created_at', { ascending: false })
      .limit(5);

    if (transError) {
      console.error('查询交易记录失败:', transError);
    }

    return NextResponse.json({
      success: true,
      data: {
        user: userData,
        recentTransactions: transactions || [],
        message: '用户订阅状态查询完成'
      }
    });

  } catch (error) {
    console.error('查询用户订阅状态API错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
