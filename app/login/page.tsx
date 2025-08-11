"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ShineBorder } from "@/components/magicui/shine-border"
import { RetroGrid } from "@/components/magicui/retro-grid"
import { User } from '@supabase/supabase-js'

export default function LoginPage() {
  const [lang, setLang] = useState<"zh" | "en">("en")
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [signingIn, setSigningIn] = useState(false)

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
        // 检查是否是新用户，如果是则送50积分
        await checkAndGiveWelcomeBonus(user.id)
        
        // 如果用户已登录且有返回路径，跳转到返回路径
        const returnTo = localStorage.getItem('returnTo')
        if (returnTo) {
          localStorage.removeItem('returnTo')
          window.location.href = returnTo
        }
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
        
        if (session?.user && event === 'SIGNED_IN') {
          // 新用户登录时送50积分
          await checkAndGiveWelcomeBonus(session.user.id)
          
          // 登录成功后，如果有返回路径，清除它
          if (localStorage.getItem('returnTo')) {
            localStorage.removeItem('returnTo')
          }
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const checkAndGiveWelcomeBonus = async (userId: string) => {
    try {
      console.log('🔍 开始检查用户积分...', userId)
      
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
        return
      }

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

    } catch (error) {
      console.error('❌ 积分赠送过程中出现错误:', error)
    }
  }

  const handleLangChange = (newLang: "zh" | "en") => {
    setLang(newLang)
    localStorage.setItem("language", newLang)
  }

  const content = {
    zh: {
      title: "欢迎回来",
      subtitle: "使用您的 Google 账户登录 Act 2 AI",
      secureLogin: "安全登录",
      description: "登录后即可使用 Act 2 AI 的所有功能，包括视频风格迁移、特效生成等高级功能",
      googleLogin: "使用 Google 账户登录",
      termsText: "登录即表示您同意我们的",
      termsLink: "服务条款",
      and: "和",
      privacyLink: "隐私政策",
      welcome: "欢迎回来",
      credits: "积分余额",
      logout: "退出登录",
      loading: "加载中...",
      signingIn: "正在登录...",
    },
    en: {
      title: "Welcome Back",
      subtitle: "Sign in to Act 2 AI with your Google account",
      secureLogin: "Secure Login",
      description: "After logging in, you can use all features of Act 2 AI, including video style transfer, effects generation and other advanced features",
      googleLogin: "Sign in with Google",
      termsText: "By signing in, you agree to our",
      termsLink: "Terms of Service",
      and: "and",
      privacyLink: "Privacy Policy",
      welcome: "Welcome back",
      credits: "Credits Balance",
      logout: "Sign out",
      loading: "Loading...",
      signingIn: "Signing in...",
    }
  }

  const currentContent = content[lang]

  const handleGoogleSignIn = async () => {
    setSigningIn(true)
    try {
      // 检查是否有返回路径
      const returnTo = localStorage.getItem('returnTo') || '/generator'
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${returnTo}`
        }
      })
      
      if (error) {
        console.error('Sign in error:', error)
        alert('登录失败，请重试')
      }
    } catch (error) {
      console.error('Sign in exception:', error)
      alert('登录过程中出现错误')
    } finally {
      setSigningIn(false)
    }
  }

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Sign out error:', error)
      } else {
        window.location.href = '/'
      }
    } catch (error) {
      console.error('Sign out exception:', error)
    }
  }

  if (loading) {
    return (
      <main className="relative min-h-screen bg-gray-50">
        <RetroGrid 
          angle={65}
          cellSize={60}
          opacity={0.8}
          lightLineColor="rgba(0,0,0,0.3)"
          darkLineColor="rgba(0,0,0,0.3)"
        />
        <Navigation lang={lang} onLangChange={handleLangChange} />
        <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
          <div className="w-full max-w-md">
            <ShineBorder shineColor={["#A07CFE", "#FE8FB5", "#FFBE7B"]}>
              <Card className="bg-white/90 backdrop-blur-xl border-0 shadow-2xl">
                <CardContent className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                  <p className="text-gray-600">{currentContent.loading}</p>
                </CardContent>
              </Card>
            </ShineBorder>
          </div>
        </div>
      </main>
    )
  }

  if (user) {
    return (
      <main className="relative min-h-screen bg-gray-50">
        <RetroGrid 
          angle={65}
          cellSize={60}
          opacity={0.8}
          lightLineColor="rgba(0,0,0,0.3)"
          darkLineColor="rgba(0,0,0,0.3)"
        />
        <Navigation lang={lang} onLangChange={handleLangChange} />
        <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
          <div className="w-full max-w-md">
            <ShineBorder shineColor={["#A07CFE", "#FE8FB5", "#FFBE7B"]}>
              <Card className="bg-white/90 backdrop-blur-xl border-0 shadow-2xl">
                <CardHeader className="text-center pb-8">
                  <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    {user.user_metadata?.avatar_url ? (
                      <img
                        src={user.user_metadata.avatar_url}
                        alt="Profile"
                        className="w-16 h-16 rounded-full border-2 border-white"
                      />
                    ) : (
                      <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )}
                  </div>
                  <CardTitle className="text-3xl font-bold text-gray-900 mb-2">
                    {currentContent.welcome}
                  </CardTitle>
                  <p className="text-gray-600 text-sm">
                    {user.email}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    {currentContent.credits}: 50
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <Button 
                      onClick={() => window.location.href = '/generator'}
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 py-4 text-base font-medium rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105"
                    >
                      开始使用
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={handleSignOut}
                      className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 py-4 text-base font-medium rounded-lg transition-all duration-300"
                    >
                      {currentContent.logout}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </ShineBorder>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="relative min-h-screen bg-gray-50">
      {/* 复古网格背景 */}
      <RetroGrid 
        angle={65}
        cellSize={60}
        opacity={0.8}
        lightLineColor="rgba(0,0,0,0.3)"
        darkLineColor="rgba(0,0,0,0.3)"
      />
      
      <Navigation lang={lang} onLangChange={handleLangChange} />
      
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-md">
          {/* 登录卡片 */}
          <ShineBorder shineColor={["#A07CFE", "#FE8FB5", "#FFBE7B"]}>
            <Card className="bg-white/90 backdrop-blur-xl border-0 shadow-2xl">
              <CardHeader className="text-center pb-8">
                <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <CardTitle className="text-3xl font-bold text-gray-900 mb-2">
                  {currentContent.title}
                </CardTitle>
                <p className="text-gray-600 text-sm">
                  {currentContent.subtitle}
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 分隔线 */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-transparent px-2 text-gray-500">{currentContent.secureLogin}</span>
                  </div>
                </div>
                
                {/* 说明文字 */}
                <div className="text-center">
                  <p className="text-gray-500 text-xs leading-relaxed">
                    {currentContent.description}
                  </p>
                </div>
                
                {/* 谷歌登录按钮 */}
                <Button 
                  className="w-full bg-white text-gray-900 hover:bg-gray-100 py-4 text-base font-medium rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleGoogleSignIn}
                  disabled={signingIn}
                >
                  <div className="flex items-center justify-center gap-3">
                    {signingIn ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
                    ) : (
                      <svg className="w-6 h-6" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    )}
                    <span>{signingIn ? currentContent.signingIn : currentContent.googleLogin}</span>
                  </div>
                </Button>
              </CardContent>
            </Card>
          </ShineBorder>
          
          {/* 底部说明 */}
          <div className="text-center mt-8">
            <p className="text-gray-500 text-sm">
              {currentContent.termsText}
              <a href="/terms" className="text-gray-700 hover:underline ml-1">{currentContent.termsLink}</a>
              {currentContent.and}
              <a href="/privacy" className="text-gray-700 hover:underline ml-1">{currentContent.privacyLink}</a>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
} 