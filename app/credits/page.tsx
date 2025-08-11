"use client"

import { useState, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { LightTechBackground } from "@/components/light-tech-background"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { User } from '@supabase/supabase-js'
import { getStripe } from "@/lib/stripe"

export default function CreditsPage() {
  const [lang, setLang] = useState<"zh" | "en">("en")
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [processingPayment, setProcessingPayment] = useState<number | null>(null)

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
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error) {
        console.error('获取用户信息失败:', error);
        setUser(null)
        setLoading(false)
        return
      }
      
      if (user) {
        console.log('获取到用户信息:', {
          id: user.id,
          email: user.email,
          emailConfirmed: user.email_confirmed_at
        });
      }
      
      setUser(user)
      setLoading(false)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('认证状态变更:', event, session?.user?.email);
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // 处理支付结果
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const success = urlParams.get('success')
    const canceled = urlParams.get('canceled')
    const sessionId = urlParams.get('session_id')

    if (canceled) {
      alert('支付已取消。')
      // 清除 URL 参数
      window.history.replaceState({}, document.title, window.location.pathname)
    }
    // 成功的情况现在由积分更新API处理，会重定向到个人中心
  }, [])

  const handleLangChange = (newLang: "zh" | "en") => {
    setLang(newLang)
    localStorage.setItem("language", newLang)
  }

  const content = {
    zh: {
      title: "积分充值",
      subtitle: "选择适合您的积分套餐",
      currentCredits: "当前积分",
      buyCredits: "购买积分",
      credits: "积分",
      package1: {
        title: "基础积分包",
        desc: "适合轻度使用",
        price: 39.9,
        credits: 1000,
        popular: false
      },
      package2: {
        title: "标准积分包",
        desc: "适合日常使用",
        price: 69.9,
        credits: 2000,
        popular: true
      },
      package3: {
        title: "高级积分包",
        desc: "适合专业用户",
        price: 99.9,
        credits: 3600,
        popular: false
      },
      popular: "最热门的",
      bestValue: "最超值",
      buyNow: "立即购买",
      backToProfile: "返回个人中心"
    },
    en: {
      title: "Credit Packages",
      subtitle: "Choose the credit package that suits you",
      currentCredits: "Current Credits",
      buyCredits: "Buy Credits",
      credits: "Credits",
      package1: {
        title: "Basic Package",
        desc: "Perfect for light usage",
        price: 39.9,
        credits: 1000,
        popular: false
      },
      package2: {
        title: "Standard Package",
        desc: "Perfect for daily usage",
        price: 69.9,
        credits: 2000,
        popular: true
      },
      package3: {
        title: "Premium Package",
        desc: "Perfect for professionals",
        price: 99.9,
        credits: 3600,
        popular: false
      },
      popular: "Most Popular",
      bestValue: "Best Value",
      buyNow: "Buy Now",
      backToProfile: "Back to Profile"
    }
  }

  const currentContent = content[lang]

  // 积分套餐数据
  const creditPackages = [
    {
      title: currentContent.package1.title,
      desc: currentContent.package1.desc,
      price: currentContent.package1.price,
      credits: currentContent.package1.credits,
      popular: currentContent.package1.popular,
      bestValue: false
    },
    {
      title: currentContent.package2.title,
      desc: currentContent.package2.desc,
      price: currentContent.package2.price,
      credits: currentContent.package2.credits,
      popular: currentContent.package2.popular,
      bestValue: true
    },
    {
      title: currentContent.package3.title,
      desc: currentContent.package3.desc,
      price: currentContent.package3.price,
      credits: currentContent.package3.credits,
      popular: currentContent.package3.popular,
      bestValue: false
    }
  ]

  // Stripe 价格 ID 映射
  const stripePriceIds = {
    0: 'price_1RsgmtP9YNEyAXtbLw9kCriI', // 基础包 39.9
    1: 'price_1RsgnFP9YNEyAXtbHyJ1r082', // 标准包 69.9
    2: 'price_1RsgnUP9YNEyAXtbXM4QtB3X'  // 高级包 99.9
  }

  const handleBuyCredits = async (packageIndex: number) => {
    if (!user) {
      alert('请先登录')
      return
    }

    // 检查用户邮箱信息
    if (!user.email) {
      console.error('用户邮箱信息缺失:', user);
      alert('用户邮箱信息不完整，请重新登录')
      return
    }

    console.log('用户信息:', {
      id: user.id,
      email: user.email,
      emailConfirmed: user.email_confirmed_at
    });

    if (processingPayment !== null) {
      return
    }

    setProcessingPayment(packageIndex)

    try {
      const stripe = await getStripe()
      if (!stripe) {
        throw new Error('Stripe 未初始化')
      }

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: stripePriceIds[packageIndex as keyof typeof stripePriceIds],
          userId: user.id,
          credits: creditPackages[packageIndex].credits,
        }),
      })

      const { sessionId, error } = await response.json()

      if (error) {
        throw new Error(error)
      }

      // 重定向到 Stripe Checkout
      const result = await stripe.redirectToCheckout({
        sessionId,
      })

      if (result.error) {
        throw new Error(result.error.message)
      }
    } catch (error) {
      console.error('支付失败:', error)
      alert(`支付失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setProcessingPayment(null)
    }
  }

  if (loading) {
    return (
      <main className="relative min-h-screen">
        <LightTechBackground />
        <Navigation lang={lang} onLangChange={handleLangChange} />
        <div className="relative z-10 pt-20 pb-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="animate-pulse">
              <div className="h-12 bg-gray-200 rounded w-1/3 mx-auto mb-4"></div>
              <div className="h-6 bg-gray-200 rounded w-1/2 mx-auto mb-12"></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-80 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="relative min-h-screen">
        <LightTechBackground />
        <Navigation lang={lang} onLangChange={handleLangChange} />
        <div className="relative z-10 pt-20 pb-16 px-4">
          <div className="max-w-6xl mx-auto text-center">
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
      <LightTechBackground />
      <Navigation lang={lang} onLangChange={handleLangChange} />
      
      <div className="relative z-10 pt-20 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          {/* 页面标题 */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 tracking-tight">
              {currentContent.title}
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              {currentContent.subtitle}
            </p>
          </div>

          {/* 返回按钮 */}
          <div className="text-center mb-8">
            <a href="/profile">
              <Button variant="outline" className="mb-4">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                {currentContent.backToProfile}
              </Button>
            </a>
          </div>

          {/* 积分套餐 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {creditPackages.map((pkg, index) => (
              <Card 
                key={index}
                className={`bg-white/95 backdrop-blur-sm border shadow-sm hover:shadow-md transition-shadow relative ${
                  pkg.popular ? "border-purple-500 border-2" : "border-gray-200"
                }`}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <div className="bg-purple-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                      {currentContent.popular}
                    </div>
                  </div>
                )}
                
                {pkg.bestValue && (
                  <div className="absolute -top-3 right-4">
                    <div className="bg-green-500 text-white text-xs font-medium px-2 py-1 rounded">
                      {currentContent.bestValue}
                    </div>
                  </div>
                )}

                <CardHeader className={`pb-6 ${pkg.popular ? "pt-8" : ""}`}>
                  <div className="text-center">
                    <CardTitle className={`text-2xl font-semibold mb-2 ${
                      pkg.popular ? "text-purple-600" : "text-gray-900"
                    }`}>
                      {pkg.title}
                    </CardTitle>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {pkg.desc}
                    </p>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div className="text-center">
                    <div className="mb-2">
                      <span className="text-4xl font-bold text-gray-900">
                        ${pkg.price}
                      </span>
                    </div>
                    <p className="text-lg font-medium text-gray-900">
                      {pkg.credits.toLocaleString()} {currentContent.credits}
                    </p>
                    <p className="text-sm text-gray-500">
                      ${(pkg.price / pkg.credits * 100).toFixed(1)} / 100 {currentContent.credits}
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700 text-sm">立即到账</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700 text-sm">永久有效</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700 text-sm">无使用限制</span>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => handleBuyCredits(index)}
                    disabled={processingPayment !== null}
                    className={`w-full py-3 text-sm font-medium rounded-md ${
                      pkg.popular
                        ? "bg-purple-500 text-white hover:bg-purple-600"
                        : "bg-gray-900 text-white hover:bg-gray-800"
                    }`}
                  >
                    {processingPayment === index ? (
                      <div className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        处理中...
                      </div>
                    ) : (
                      currentContent.buyNow
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
} 