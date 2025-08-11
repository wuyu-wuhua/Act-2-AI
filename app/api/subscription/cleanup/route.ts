import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    console.log('开始处理过期订阅积分...');

    // 调用数据库函数来处理过期的订阅
    const { data, error } = await supabase
      .rpc('api_smart_cleanup_subscriptions'); // 使用新的智能清理函数

    if (error) {
      console.error('处理过期订阅失败:', error);
      return NextResponse.json(
        { error: '处理过期订阅失败', details: error.message },
        { status: 500 }
      );
    }

    console.log('过期订阅处理完成:', data);

    // 获取处理结果统计
    const { data: stats, error: statsError } = await supabase
      .from('act_users')
      .select('subscription_status, subscription_credits, subscription_end_date')
      .in('subscription_status', ['active', 'cancelled', 'expired']);

    if (statsError) {
      console.error('获取统计信息失败:', statsError);
    }

    const activeCount = stats?.filter(s => s.subscription_status === 'active').length || 0;
    const cancelledCount = stats?.filter(s => s.subscription_status === 'cancelled').length || 0;
    const expiredCount = stats?.filter(s => s.subscription_status === 'expired').length || 0;
    const totalSubscriptionCredits = stats?.reduce((sum, s) => sum + (s.subscription_credits || 0), 0) || 0;

    // 计算即将过期的订阅数量
    const now = new Date();
    const expiringSoonCount = stats?.filter(s => {
      if (s.subscription_status === 'active' && s.subscription_end_date) {
        const endDate = new Date(s.subscription_end_date);
        const daysUntilExpiry = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return daysUntilExpiry > 0 && daysUntilExpiry <= 7; // 7天内过期
      }
      return false;
    }).length || 0;

    return NextResponse.json({
      success: true,
      data: {
        cleanupResult: data,
        statistics: {
          activeSubscriptions: activeCount,
          cancelledSubscriptions: cancelledCount,
          expiredSubscriptions: expiredCount,
          expiringSoonSubscriptions: expiringSoonCount,
          totalSubscriptionCredits: totalSubscriptionCredits
        },
        message: '过期订阅积分处理完成'
      }
    });

  } catch (error) {
    console.error('订阅清理API错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

// 也支持GET请求来查看过期订阅状态
export async function GET(request: NextRequest) {
  try {
    console.log('查询过期订阅状态...');

    // 查询即将过期的订阅
    const { data: expiringSubscriptions, error } = await supabase
      .from('act_expiring_subscriptions')
      .select('*')
      .order('days_until_expiry', { ascending: true });

    if (error) {
      console.error('查询过期订阅失败:', error);
      return NextResponse.json(
        { error: '查询过期订阅失败', details: error.message },
        { status: 500 }
      );
    }

    // 统计信息
    const expiringCount = expiringSubscriptions?.filter(s => s.expiry_status === '即将过期').length || 0;
    const expiredCount = expiringSubscriptions?.filter(s => s.expiry_status === '已过期').length || 0;
    const activeCount = expiringSubscriptions?.filter(s => s.expiry_status === '活跃').length || 0;

    // 获取需要清理的订阅详情
    const { data: cleanupCandidates, error: cleanupError } = await supabase
      .from('act_users')
      .select('id, email, subscription_status, subscription_end_date, subscription_credits')
      .or('subscription_status.eq.cancelled,subscription_status.eq.active')
      .lt('subscription_end_date', new Date().toISOString())
      .gt('subscription_credits', 0);

    if (cleanupError) {
      console.error('获取清理候选失败:', cleanupError);
    }

    return NextResponse.json({
      success: true,
      data: {
        expiringSubscriptions: expiringSubscriptions || [],
        cleanupCandidates: cleanupCandidates || [],
        statistics: {
          activeSubscriptions: activeCount,
          expiringSubscriptions: expiringCount,
          expiredSubscriptions: expiredCount,
          totalSubscriptions: expiringSubscriptions?.length || 0,
          cleanupCandidatesCount: cleanupCandidates?.length || 0
        },
        message: '过期订阅状态查询完成'
      }
    });

  } catch (error) {
    console.error('查询过期订阅API错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
} 