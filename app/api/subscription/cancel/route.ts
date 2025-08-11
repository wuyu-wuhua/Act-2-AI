import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: '用户ID是必需的' },
        { status: 400 }
      );
    }

    console.log('取消订阅请求:', { userId });

    // 调用取消订阅函数
    const { data, error } = await supabase
      .rpc('cancel_subscription', {
        p_user_id: userId
      });

    if (error) {
      console.error('取消订阅失败:', error);
      return NextResponse.json(
        { error: '取消订阅失败', details: error.message },
        { status: 500 }
      );
    }

    console.log('取消订阅成功:', data);

    return NextResponse.json({
      success: true,
      message: data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('取消订阅异常:', error);
    return NextResponse.json(
      { error: '取消订阅过程中出现错误' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: '用户ID是必需的' },
        { status: 400 }
      );
    }

    // 获取用户订阅状态
    const { data: userData, error: userError } = await supabase
      .from('act_users')
      .select('subscription_status, subscription_end_date, subscription_credits, subscription_plan_id')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('获取用户订阅状态失败:', userError);
      return NextResponse.json(
        { error: '获取用户订阅状态失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      subscriptionStatus: userData.subscription_status,
      subscriptionEndDate: userData.subscription_end_date,
      subscriptionCredits: userData.subscription_credits,
      subscriptionPlanId: userData.subscription_plan_id,
      canCancel: userData.subscription_status === 'active',
      daysUntilExpiry: userData.subscription_end_date 
        ? Math.ceil((new Date(userData.subscription_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : null
    });

  } catch (error) {
    console.error('获取订阅状态异常:', error);
    return NextResponse.json(
      { error: '获取订阅状态过程中出现错误' },
      { status: 500 }
    );
  }
} 