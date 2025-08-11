"use client"

import { useState, useEffect } from "react"
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
        // 重新加载用户数据以显示最新积分
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

  const loadUserData = async (userId: string) => {
    try {
      console.log('🔍 开始加载用户数据...', userId)
      
      // 首先确保用户在数据库中存在
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('❌ 用户未登录')
        return
      }

      // 检查用户是否已在数据库中存在
      const { data: existingUser, error: checkError } = await supabase
        .from('act_users')
        .select('id, credits_balance')
        .eq('id', userId)
        .single()

      let isNewUser = false

      if (checkError && checkError.code === 'PGRST116') {
        console.log('⚠️ 用户不存在于数据库中，创建新用户...')
        
        // 用户不存在，创建新用户记录
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
          console.error('❌ 创建用户记录失败:', insertError)
          return
        }
        
        console.log('✅ 新用户创建成功！')
        isNewUser = true
      } else if (checkError) {
        console.error('❌ 检查用户失败:', checkError)
        return
      } else {
        console.log('✅ 用户已存在于数据库中，当前积分:', existingUser?.credits_balance || 0)
      }

      // 如果是新用户，直接送50积分
      if (isNewUser) {
        console.log('🎁 新用户，直接送50积分...')
        
        // 创建积分交易记录
        const { error: transError } = await supabase
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

        if (transError) {
          console.error('❌ 创建积分交易记录失败:', transError)
          return
        }

        // 更新用户积分余额
        const { error: updateError } = await supabase
          .from('act_users')
          .update({ credits_balance: 50 })
          .eq('id', userId)

        if (updateError) {
          console.error('❌ 更新用户积分失败:', updateError)
          return
        }

        console.log('🎉 新用户50积分赠送成功！')
      } else {
        // 对于老用户，检查是否需要送积分
        console.log('🔍 检查老用户是否需要送积分...')
        
        // 获取用户交易记录
        const { data: transactions, error: transError } = await supabase
          .from('act_credit_transactions')
          .select('id')
          .eq('user_id', userId)

        if (transError) {
          console.error('❌ 获取交易记录失败:', transError)
          return
        }

        const currentCredits = existingUser?.credits_balance || 0
        const hasTransactions = transactions && transactions.length > 0

        console.log('📊 用户状态:', {
          currentCredits,
          hasTransactions: hasTransactions,
          transactionCount: transactions?.length || 0
        })

        // 判断是否应该送积分：没有交易记录且积分为0
        if (!hasTransactions && currentCredits === 0) {
          console.log('🎁 老用户但无交易记录且积分为0，送50积分...')
          
          // 创建积分交易记录
          const { error: bonusTransError } = await supabase
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

          if (bonusTransError) {
            console.error('❌ 创建积分交易记录失败:', bonusTransError)
            return
          }

          // 更新用户积分余额
          const { error: bonusUpdateError } = await supabase
            .from('act_users')
            .update({ credits_balance: 50 })
            .eq('id', userId)

          if (bonusUpdateError) {
            console.error('❌ 更新用户积分失败:', bonusUpdateError)
            return
          }

          console.log('🎉 老用户50积分赠送成功！')
        } else {
          console.log('ℹ️ 用户已有交易记录或积分，无需赠送')
        }
      }

      // 获取最新的用户数据
      const { data: finalUser, error: finalError } = await supabase
        .from('act_users')
        .select('subscription_credits, recharge_credits, credits_balance, subscription_status, subscription_end_date')
        .eq('id', userId)
        .single()

      if (finalError) {
        console.error('❌ 获取最终用户数据失败:', finalError)
        return
      }

      // 获取积分交易记录（从两个表合并）
      const { data: transactions1, error: transError1 } = await supabase
        .from('act_credit_transactions')
        .select('*')
        .eq('user_id', userId)

      const { data: transactions2, error: transError2 } = await supabase
        .from('act_credit_purchases')
        .select('*')
        .eq('user_id', userId)

      if (transError1 || transError2) {
        console.error('❌ 获取交易记录失败:', transError1 || transError2)
        return
      }

      // 合并两个表的交易记录
      const allTransactions = [
        ...(transactions1 || []).map(t => ({ ...t, source: 'transactions' })),
        ...(transactions2 || []).map(t => ({ ...t, source: 'purchases' }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)

      // 计算积分统计（从两个表合并）
      const { data: allTrans1, error: allTransError1 } = await supabase
        .from('act_credit_transactions')
        .select('transaction_type, credits_amount')
        .eq('user_id', userId)

      const { data: allTrans2, error: allTransError2 } = await supabase
        .from('act_credit_purchases')
        .select('transaction_type, credits_amount')
        .eq('user_id', userId)

      let totalEarned = 0
      let totalSpent = 0

      // 处理第一个表的交易记录
      if (!allTransError1 && allTrans1) {
        allTrans1.forEach(trans => {
          if (trans.transaction_type === 'purchase' || trans.transaction_type === 'bonus' || trans.transaction_type === 'subscription_purchase' || trans.transaction_type === 'subscription_renewal') {
            totalEarned += trans.credits_amount
          } else if (trans.transaction_type === 'consumption' || trans.transaction_type === 'subscription_expiry') {
            totalSpent += Math.abs(trans.credits_amount)
          }
        })
      }

      // 处理第二个表的交易记录
      if (!allTransError2 && allTrans2) {
        allTrans2.forEach(trans => {
          if (trans.transaction_type === 'purchase' || trans.transaction_type === 'bonus' || trans.transaction_type === 'subscription' || trans.transaction_type === 'subscription_renewal') {
            totalEarned += trans.credits_amount
          } else if (trans.transaction_type === 'consumption' || trans.transaction_type === 'subscription_expiry') {
            totalSpent += Math.abs(trans.credits_amount)
          }
        })
      }

      // 计算距离过期天数
      let daysUntilExpiry: number | undefined;
      if (finalUser.subscription_end_date && finalUser.subscription_status === 'cancelled') {
        const endDate = new Date(finalUser.subscription_end_date);
        const now = new Date();
        const diffTime = endDate.getTime() - now.getTime();
        daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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
        // 特殊处理订阅相关的交易类型
        let displayDescription = trans.description;
        let displayAmount = trans.credits_amount;
        
        if (trans.transaction_type === 'subscription_expiry') {
          // 订阅周期结束，显示为消费类型
          displayDescription = currentContent.subscriptionExpiry;
          displayAmount = -Math.abs(trans.credits_amount);
        } else if (trans.transaction_type === 'subscription_renewal') {
          // 订阅续费，显示为充值类型
          displayDescription = currentContent.subscriptionRenewal;
          displayAmount = Math.abs(trans.credits_amount);
        }
        
        return {
          id: trans.id.toString(),
          type: (trans.transaction_type === 'purchase' || trans.transaction_type === 'bonus' || trans.transaction_type === 'subscription' || trans.transaction_type === 'subscription_purchase' || trans.transaction_type === 'subscription_renewal') ? 'recharge' : 'consumption',
          amount: displayAmount,
          description: displayDescription,
          transaction_type: trans.transaction_type, // 添加原始交易类型
          created_at: new Date(trans.created_at).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          }).replace(/\//g, '/')
        };
      })

      setTransactions(formattedTransactions)
      console.log('✅ 用户数据加载完成！')
      
    } catch (error) {
      console.error('❌ 加载用户数据时出现错误:', error)
    }
  }

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
                <button 
                  onClick={() => user && loadUserData(user.id)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
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