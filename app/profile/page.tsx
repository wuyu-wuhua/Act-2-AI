"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { User } from '@supabase/supabase-js'
import { Ripple } from "@/components/magicui/ripple"

interface Transaction {
  id: string
  type: 'recharge' | 'consumption'
  amount: number
  description: string
  transaction_type?: string
  created_at: string
}

interface CreditStats {
  current: number
  subscriptionCredits: number
  rechargeCredits: number
  totalEarned: number
  totalSpent: number
  subscriptionStatus?: string
  subscriptionEndDate?: string
  daysUntilExpiry?: number
}

export default function ProfilePage() {
  const [lang, setLang] = useState<"zh" | "en">("en")
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview'>('overview')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [creditStats, setCreditStats] = useState<CreditStats>({
    current: 0,
    subscriptionCredits: 0,
    rechargeCredits: 0,
    totalEarned: 0,
    totalSpent: 0
  })

  // 从localStorage读取语言设置
  useEffect(() => {
    const savedLang = localStorage.getItem("language") as "zh" | "en"
    if (savedLang) {
      setLang(savedLang)
    }
  }, [])

  // 检查用户会话
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
      
      if (user) {
        await loadUserData(user.id)
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
        
        if (session?.user) {
          await loadUserData(session.user.id)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // 处理支付成功消息
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const success = urlParams.get('success')
      const creditsAdded = urlParams.get('credits_added')
      const error = urlParams.get('error')

      if (success && creditsAdded) {
        alert(`订阅成功！已为您添加 ${creditsAdded} 积分。`)
        // 立即重新加载用户数据以显示最新积分
        if (user) {
          loadUserData(user.id)
        }
        // 清除 URL 参数
        window.history.replaceState({}, document.title, window.location.pathname)
      } else if (error) {
        alert(`积分更新失败：${error}`)
        // 清除 URL 参数
        window.history.replaceState({}, document.title, window.location.pathname)
      }
    }
  }, [user])

  // 优化后的数据加载函数
  const loadUserData = useCallback(async (userId: string) => {
    try {
      console.log('🔍 开始加载用户数据...', userId)
      
      // 并行加载数据以提高速度
      const [userResult, transactionsResult, purchasesResult] = await Promise.all([
        // 获取用户基本信息
        supabase
          .from('act_users')
          .select('id, email, google_id, google_full_name, google_avatar, credits_balance, subscription_credits, recharge_credits, subscription_status, subscription_end_date')
          .eq('id', userId)
          .single(),
        
        // 获取积分交易记录
        supabase
          .from('act_credit_transactions')
          .select('*')
          .eq('user_id', userId),
        
        // 获取积分购买记录
        supabase
          .from('act_credit_purchases')
          .select('*')
          .eq('user_id', userId)
      ])

      // 检查用户是否存在
      if (userResult.error && userResult.error.code === 'PGRST116') {
        console.log('⚠️ 用户不存在于数据库中，创建新用户...')
        
        // 获取当前认证用户
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          console.log('❌ 用户未登录')
          return
        }
        
        // 创建新用户记录
        const { error: insertError } = await supabase
          .from('act_users')
          .insert({
            id: userId,
            email: user.email,
            google_id: user.user_metadata?.sub,
            google_full_name: user.user_metadata?.full_name,
            google_avatar: user.user_metadata?.avatar_url,
            credits_balance: 50, // 直接设置50积分
            subscription_credits: 0,
            recharge_credits: 50
          })

        if (insertError) {
          console.error('❌ 创建用户记录失败:', insertError)
          return
        }
        
        // 创建积分交易记录
        await supabase
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
        
        console.log('✅ 新用户创建成功！')
      } else if (userResult.error) {
        console.error('❌ 获取用户数据失败:', userResult.error)
        return
      }

      // 获取最终用户数据
      const finalUser = userResult.data || userResult.data
      if (!finalUser) {
        console.error('❌ 无法获取用户数据')
        return
      }

      // 处理交易记录
      const transactions = transactionsResult.data || []
      const purchases = purchasesResult.data || []
      
      // 合并并排序交易记录
      const allTransactions = [
        ...transactions.map(t => ({ ...t, source: 'transactions' })),
        ...purchases.map(t => ({ ...t, source: 'purchases' }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)

      // 快速计算积分统计
      let totalEarned = 0
      let totalSpent = 0

      // 并行处理两个表的统计
      const [earned1, spent1] = transactions.reduce((acc, trans) => {
        if (['purchase', 'bonus', 'subscription_purchase', 'subscription_renewal'].includes(trans.transaction_type)) {
          acc[0] += trans.credits_amount
        } else if (['consumption', 'subscription_expiry'].includes(trans.transaction_type)) {
          acc[1] += Math.abs(trans.credits_amount)
        }
        return acc
      }, [0, 0])

      const [earned2, spent2] = purchases.reduce((acc, trans) => {
        if (['purchase', 'bonus', 'subscription', 'subscription_renewal'].includes(trans.transaction_type)) {
          acc[0] += trans.credits_amount
        } else if (['consumption', 'subscription_expiry'].includes(trans.transaction_type)) {
          acc[1] += Math.abs(trans.credits_amount)
        }
        return acc
      }, [0, 0])

      totalEarned = earned1 + earned2
      totalSpent = spent1 + spent2

      // 计算距离过期天数
      let daysUntilExpiry: number | undefined
      if (finalUser.subscription_end_date && finalUser.subscription_status === 'cancelled') {
        const endDate = new Date(finalUser.subscription_end_date)
        const now = new Date()
        const diffTime = endDate.getTime() - now.getTime()
        daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      }

      // 更新积分统计
      setCreditStats({
        current: finalUser.credits_balance || 0,
        subscriptionCredits: finalUser.subscription_credits || 0,
        rechargeCredits: finalUser.recharge_credits || 0,
        totalEarned,
        totalSpent,
        subscriptionStatus: finalUser.subscription_status,
        subscriptionEndDate: finalUser.subscription_end_date,
        daysUntilExpiry
      })

      // 转换交易记录格式
      const formattedTransactions: Transaction[] = allTransactions.map((trans: any) => {
        let displayDescription = trans.description
        let displayAmount = trans.credits_amount
        
        if (trans.transaction_type === 'subscription_expiry') {
          displayDescription = currentContent.subscriptionExpiry
          displayAmount = -Math.abs(trans.credits_amount)
        } else if (trans.transaction_type === 'subscription_renewal') {
          displayDescription = currentContent.subscriptionRenewal
          displayAmount = Math.abs(trans.credits_amount)
        }
        
        return {
          id: trans.id.toString(),
          type: (['purchase', 'bonus', 'subscription', 'subscription_purchase', 'subscription_renewal'].includes(trans.transaction_type)) ? 'recharge' : 'consumption',
          amount: displayAmount,
          description: displayDescription,
          transaction_type: trans.transaction_type,
          created_at: new Date(trans.created_at).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          }).replace(/\//g, '/')
        }
      })

      setTransactions(formattedTransactions)
      console.log('✅ 用户数据加载完成！')
      
    } catch (error) {
      console.error('❌ 加载用户数据时出现错误:', error)
    }
  }, [])

  // 手动刷新数据
  const handleRefresh = useCallback(async () => {
    if (!user || refreshing) return
    
    setRefreshing(true)
    console.log('🔄 手动刷新数据...')
    
    try {
      await loadUserData(user.id)
      console.log('✅ 手动刷新完成')
    } catch (error) {
      console.error('❌ 手动刷新失败:', error)
    } finally {
      // 确保刷新状态被重置
      setRefreshing(false)
    }
  }, [user, loadUserData, refreshing])
  
  // 强制检查订阅状态和积分
  const handleForceCheck = useCallback(async () => {
    if (!user || refreshing) return
    
    setRefreshing(true);
    console.log('⚡ 强制检查订阅状态...');
    
    try {
      const response = await fetch('/api/subscription/force-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: user.id })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ 强制检查完成:', result);
        
        if (result.actionTaken && result.actionTaken !== '无需操作') {
          alert(`订阅状态已更新：${result.actionTaken}`);
        }
        
        // 重新加载数据
        await loadUserData(user.id);
      } else {
        console.error('强制检查失败:', result.error);
        alert('检查失败：' + result.error);
      }
    } catch (error) {
      console.error('❌ 强制检查异常:', error);
      alert('检查过程中出现错误');
    } finally {
      setRefreshing(false);
    }
  }, [user, refreshing, loadUserData]);

  // 检查订阅到期状态
  const handleCheckExpiry = useCallback(async () => {
    if (!user || refreshing) return
    
    setRefreshing(true);
    console.log('🔍 检查订阅到期状态...');
    
    try {
      const response = await fetch('/api/subscription/check-expired', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: user.id })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ 订阅到期检查完成:', result);
        
        if (result.needsCleanup) {
          const shouldClear = confirm(
            `检测到您的订阅已取消且周期结束，订阅积分 ${result.subscriptionCredits} 将被清零，充值积分 ${result.rechargeCredits} 将保留。\n\n是否现在执行积分清零？`
          );
          
          if (shouldClear) {
            await handleClearExpiredCredits();
          }
        } else {
          alert(`订阅状态：${result.actionTaken}`);
        }
        
        // 重新加载数据
        await loadUserData(user.id);
      } else {
        console.error('订阅到期检查失败:', result.error);
        alert('检查失败：' + result.error);
      }
    } catch (error) {
      console.error('❌ 订阅到期检查异常:', error);
      alert('检查过程中出现错误');
    } finally {
      setRefreshing(false);
    }
  }, [user, refreshing, loadUserData]);

  // 执行积分清零
  const handleClearExpiredCredits = useCallback(async () => {
    if (!user || refreshing) return
    
    setRefreshing(true);
    console.log('🧹 执行积分清零...');
    
    try {
      const response = await fetch('/api/subscription/check-expired', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: user.id })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ 积分清零完成:', result);
        alert(`积分清零完成！\n清零订阅积分：${result.clearedSubscriptionCredits}\n保留充值积分：${result.remainingRechargeCredits}\n新的积分余额：${result.newCreditsBalance}`);
        
        // 重新加载数据
        await loadUserData(user.id);
      } else {
        console.error('积分清零失败:', result.error);
        alert(`清零失败：${result.error}\n原因：${result.reason || '未知原因'}`);
      }
    } catch (error) {
      console.error('❌ 积分清零异常:', error);
      alert('清零过程中出现错误');
    } finally {
      setRefreshing(false);
    }
  }, [user, refreshing, loadUserData]);

  // 设置实时数据监听
  useEffect(() => {
    if (!user) return

    // 监听用户积分变化
    const userSubscription = supabase
      .channel('user_credits_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'act_users',
          filter: `id=eq.${user.id}`
        },
        async (payload) => {
          console.log('🔔 检测到用户积分变化:', payload)
          // 延迟1秒后刷新数据，避免频繁更新，并检查是否正在刷新
          setTimeout(() => {
            if (!refreshing) {
              loadUserData(user.id)
            }
          }, 1000)
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'act_credit_transactions',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          console.log('🔔 检测到积分交易变化:', payload)
          // 延迟1秒后刷新数据，并检查是否正在刷新
          setTimeout(() => {
            if (!refreshing) {
              loadUserData(user.id)
            }
          }, 1000)
        }
      )
      .subscribe()

    // 设置定时刷新（每60秒检查一次，减少频率）
    const intervalId = setInterval(() => {
      if (user && !refreshing) {
        console.log('⏰ 定时刷新用户数据...')
        loadUserData(user.id)
      }
    }, 60000)

    return () => {
      userSubscription.unsubscribe()
      clearInterval(intervalId)
    }
  }, [user, refreshing, loadUserData])

  const handleLangChange = (newLang: "zh" | "en") => {
    setLang(newLang)
    localStorage.setItem("language", newLang)
  }

  const content = {
    zh: {
      title: "个人中心",
      creditOverview: "积分概览",
      currentCredits: "当前积分",
      totalEarned: "累计获得",
      totalSpent: "累计消费",
      consumption: "消费",
      noTransactions: "暂无交易记录",
      subscriptionExpiry: "订阅周期结束",
      subscriptionRenewal: "订阅周期续费，积分重置"
    },
    en: {
      title: "Personal Center",
      creditOverview: "Credit Overview",
      currentCredits: "Current Credits",
      totalEarned: "Total Earned",
      totalSpent: "Total Spent",
      consumption: "Consumption",
      noTransactions: "No transactions yet",
      subscriptionExpiry: "Subscription Period Ended",
      subscriptionRenewal: "Subscription Renewed, Credits Reset"
    }
  }

  const currentContent = content[lang]

  if (loading) {
    return (
      <main className="relative min-h-screen">
        <Ripple className="opacity-30" />
        <Navigation lang={lang} onLangChange={handleLangChange} />
        <div className="relative z-10 pt-20 pb-16 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-gray-200 rounded"></div>
                ))}
              </div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="relative min-h-screen">
        <Ripple className="opacity-30" />
        <Navigation lang={lang} onLangChange={handleLangChange} />
        <div className="relative z-10 pt-20 pb-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">请先登录</h1>
            <a href="/login">
              <Button>去登录</Button>
            </a>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="relative min-h-screen">
      <Ripple className="opacity-30" />
      <Navigation lang={lang} onLangChange={handleLangChange} />
      
      <div className="relative z-10 pt-20 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          {/* 页面标题 */}
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            {currentContent.title}
          </h1>

          {/* 用户信息区域 */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                    {user.user_metadata?.avatar_url ? (
                      <img
                        src={user.user_metadata.avatar_url}
                        alt="Avatar"
                        className="w-14 h-14 rounded-full"
                      />
                    ) : (
                      <span className="text-white text-xl font-bold">
                        {user.user_metadata?.full_name?.[0] || user.email?.[0] || 'U'}
                      </span>
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {user.user_metadata?.full_name || user.email}
                    </h2>
                    <p className="text-gray-600">{user.email}</p>
                  </div>
                </div>
                
                                 {/* 充值积分按钮和订阅状态 */}
                 <div className="flex flex-col items-end space-y-2">
                   <Button 
                     onClick={() => window.location.href = '/credits'}
                     className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium px-6 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                   >
                     <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                     </svg>
                     充值积分
                   </Button>
                   <p className="text-sm text-gray-500">当前积分: {creditStats.current}</p>
                   
                   {/* 订阅状态显示 */}
                   {creditStats.subscriptionStatus && creditStats.subscriptionStatus !== 'none' && (
                     <div className="text-right">
                       <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                         creditStats.subscriptionStatus === 'active' ? 'bg-green-100 text-green-800' :
                         creditStats.subscriptionStatus === 'cancelled' ? 'bg-yellow-100 text-yellow-800' :
                         'bg-red-100 text-red-800'
                       }`}>
                         {creditStats.subscriptionStatus === 'active' ? '订阅活跃' :
                          creditStats.subscriptionStatus === 'cancelled' ? '订阅已取消' :
                          '订阅已过期'}
                       </div>
                       {creditStats.subscriptionStatus === 'cancelled' && creditStats.daysUntilExpiry !== undefined && (
                         <p className="text-xs text-gray-500 mt-1">
                           {creditStats.daysUntilExpiry > 0 ? 
                             `${creditStats.daysUntilExpiry}天后积分清零` : 
                             '积分已清零'}
                         </p>
                       )}
                     </div>
                   )}
                 </div>
              </div>
            </CardContent>
          </Card>

          {/* 积分概览区域 */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  {currentContent.currentCredits}
                </h3>
                <p className="text-3xl font-bold text-blue-600">
                  {creditStats.current}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  订阅积分
                </h3>
                <p className="text-2xl font-bold text-purple-600">
                  {creditStats.subscriptionCredits}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  充值积分
                </h3>
                <p className="text-2xl font-bold text-green-600">
                  {creditStats.rechargeCredits}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  {currentContent.totalEarned}
                </h3>
                <div className="flex items-center">
                  <p className="text-2xl font-bold text-green-600 mr-2">
                    {creditStats.totalEarned}
                  </p>
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  {currentContent.totalSpent}
                </h3>
                <div className="flex items-center">
                  <p className="text-2xl font-bold text-orange-600 mr-2">
                    {creditStats.totalSpent}
                  </p>
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 积分概览区域 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {currentContent.creditOverview}
                </h3>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className={`p-2 text-gray-400 hover:text-gray-600 transition-all duration-200 rounded-full ${
                      refreshing 
                        ? 'animate-spin text-blue-500' 
                        : 'hover:bg-gray-100 hover:scale-110'
                    }`}
                    title={refreshing ? '刷新中...' : '刷新数据'}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  
                  {/* 显示强制检查按钮仅当订阅已取消时 */}
                  {creditStats.subscriptionStatus === 'cancelled' && (
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={handleCheckExpiry}
                        disabled={refreshing}
                        className={`px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-all duration-200 ${
                          refreshing 
                            ? 'opacity-50 cursor-not-allowed' 
                            : 'hover:scale-105 shadow-lg'
                        }`}
                        title="检查订阅到期状态"
                      >
                        检查到期
                      </button>
                      
                      <button 
                        onClick={handleForceCheck}
                        disabled={refreshing}
                        className={`px-3 py-1 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-full transition-all duration-200 ${
                          refreshing 
                            ? 'opacity-50 cursor-not-allowed' 
                            : 'hover:scale-105 shadow-lg'
                        }`}
                        title="强制检查订阅状态和积分"
                      >
                        检查状态
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="max-h-96 overflow-y-auto space-y-4 pr-2 transaction-scroll">
                {transactions.length > 0 ? (
                  transactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          transaction.type === 'consumption' ? 'bg-red-100' : 'bg-green-100'
                        }`}>
                          <svg className={`w-4 h-4 ${
                            transaction.type === 'consumption' ? 'text-red-600' : 'text-green-600'
                          }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={
                              transaction.type === 'consumption' 
                                ? "M19 14l-7 7m0 0l-7-7m7 7V3" 
                                : "M5 10l7-7m0 0l7 7m-7-7v18"
                            } />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {transaction.transaction_type === 'subscription_expiry' 
                              ? currentContent.subscriptionExpiry
                              : transaction.transaction_type === 'subscription_renewal'
                              ? currentContent.subscriptionRenewal
                              : transaction.type === 'consumption' 
                              ? currentContent.consumption 
                              : (transaction.transaction_type === 'bonus' ? '赠送' : transaction.description)
                            }
                          </p>
                          <p className="text-sm text-gray-500">{transaction.created_at}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${
                          transaction.type === 'consumption' || transaction.transaction_type === 'subscription_expiry' ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {transaction.amount > 0 ? '+' : ''}{transaction.amount}积分
                        </p>
                        <p className="text-sm text-gray-500">
                          {transaction.transaction_type === 'subscription_expiry' 
                            ? currentContent.subscriptionExpiry
                            : transaction.transaction_type === 'subscription_renewal'
                            ? currentContent.subscriptionRenewal
                            : transaction.description
                          }
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    {currentContent.noTransactions}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
} 