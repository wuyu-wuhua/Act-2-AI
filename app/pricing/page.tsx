"use client"

import { useState, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { LightTechBackground } from "@/components/light-tech-background"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { User } from '@supabase/supabase-js'
import { getStripe } from "@/lib/stripe"

export default function PricingPage() {
  const [lang, setLang] = useState<"zh" | "en">("en")
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly")
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
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const success = urlParams.get('success')
      const canceled = urlParams.get('canceled')
      const sessionId = urlParams.get('session_id')

      if (success && sessionId) {
        alert('订阅成功！您的积分已添加到账户中。')
        // 清除 URL 参数
        window.history.replaceState({}, document.title, window.location.pathname)
      } else if (canceled) {
        alert('订阅已取消。')
        // 清除 URL 参数
        window.history.replaceState({}, document.title, window.location.pathname)
      }
    }
  }, [])

  const handleLangChange = (newLang: "zh" | "en") => {
    setLang(newLang)
    localStorage.setItem("language", newLang)
  }

  const content = {
    zh: {
      title: "选择最适合您的计划",
      subtitle: "所有计划都包含使用我们核心功能的权限",
      cancelText: "随时可取消",
      monthly: "每月",
      yearly: "年订阅",
      discount: "优惠",
      popular: "最热门的",
      subscribe: "订阅",
      plan1: {
        title: "基础版",
        desc: "非常适合爱好者和初学者",
        features: [
          "最长30秒视频",
          "1080p视频分辨率",
          "带音效的视频",
          "优先处理",
          "商业使用权"
        ]
      },
      plan2: {
        title: "专业版",
        desc: "为创作者和专业人士而设",
        features: [
          "最长30秒视频",
          "1080p视频分辨率",
          "带音效的视频",
          "最快的处理速度",
          "商业使用权",
          "优先支持"
        ]
      }
    },
    en: {
      title: "Choose the plan that suits you best",
      subtitle: "All plans include access to our core features",
      cancelText: "Cancel anytime",
      monthly: "Monthly",
      yearly: "Yearly",
      discount: "Save",
      popular: "Most Popular",
      subscribe: "Subscribe",
      plan1: {
        title: "Basic",
        desc: "Very suitable for enthusiasts and beginners",
        features: [
          "Max 30-second video",
          "1080p video resolution",
          "Video with sound effects",
          "Priority processing",
          "Commercial use rights"
        ]
      },
      plan2: {
        title: "Professional",
        desc: "Designed for creators and professionals",
        features: [
          "Max 30-second video",
          "1080p video resolution",
          "Video with sound effects",
          "Fastest processing speed",
          "Commercial use rights",
          "Priority support"
        ]
      }
    }
  }

  const currentContent = content[lang]

  // 订阅方案数据
  const plans = {
    monthly: [
      {
        title: currentContent.plan1.title,
        desc: currentContent.plan1.desc,
        price: 39.9,
        credits: 1300,
        features: currentContent.plan1.features,
        discount: null,
        popular: false
      },
      {
        title: currentContent.plan2.title,
        desc: currentContent.plan2.desc,
        price: 99.9,
        credits: 4000,
        features: currentContent.plan2.features,
        discount: null,
        popular: true
      }
    ],
    yearly: [
      {
        title: currentContent.plan1.title,
        desc: currentContent.plan1.desc,
        price: 442.8, // 年付总价
        credits: 20000,
        features: currentContent.plan1.features,
        discount: 25,
        popular: false
      },
      {
        title: currentContent.plan2.title,
        desc: currentContent.plan2.desc,
        price: 838.8, // 年付总价
        credits: 50000,
        features: currentContent.plan2.features,
        discount: 30,
        popular: true
      }
    ]
  }

  const currentPlans = plans[billingCycle]

  // Stripe 价格 ID 映射
  const stripePriceIds = {
    monthly: {
      0: 'price_1RsgQ6P9YNEyAXtbQoRYdABx', // 基础版月付 39.9
      1: 'price_1RsgRpP9YNEyAXtbWGU31Pe7'  // 专业版月付 99.9
    },
    yearly: {
      0: 'price_1RsgVfP9YNEyAXtbsP1LQlzD', // 基础版年付 442.8
      1: 'price_1RsgWJP9YNEyAXtbZFfMbOpy'  // 专业版年付 838.8
    }
  }

  const handleSubscribe = async (planIndex: number) => {
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

    setProcessingPayment(planIndex)

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
          priceId: stripePriceIds[billingCycle][planIndex as keyof typeof stripePriceIds.monthly],
          userId: user.id,
          credits: currentPlans[planIndex].credits,
          mode: 'subscription',
          billingCycle: billingCycle
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
      console.error('订阅失败:', error)
      alert(`订阅失败: ${error instanceof Error ? error.message : '未知错误'}`)
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[1, 2].map((i) => (
                  <div key={i} className="h-80 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
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

          {/* 订阅周期切换 */}
          <div className="text-center mb-12">
            <div className="inline-flex bg-gray-100 rounded-lg p-1 relative">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  billingCycle === "monthly"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {currentContent.monthly}
              </button>
              <button
                onClick={() => setBillingCycle("yearly")}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  billingCycle === "yearly"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {currentContent.yearly}
              </button>
              <div className="absolute -top-2 -right-2">
                <div className="bg-green-500 text-white text-xs font-medium px-2 py-1 rounded-full">
                  优惠30%
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-3">
              {currentContent.cancelText}
            </p>
          </div>

          {/* 定价套餐 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {currentPlans.map((plan, index) => (
              <Card 
                key={index}
                className={`bg-white/95 backdrop-blur-sm border shadow-sm hover:shadow-md transition-shadow relative ${
                  plan.popular ? "border-purple-500 border-2" : "border-gray-200"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <div className="bg-purple-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                      {currentContent.popular}
                    </div>
                  </div>
                )}
                
                {plan.discount && (
                  <div className="absolute -top-3 right-4">
                    <div className="bg-green-500 text-white text-xs font-medium px-2 py-1 rounded">
                      {currentContent.discount} {plan.discount}%
                    </div>
                  </div>
                )}

                <CardHeader className={`pb-6 ${plan.popular ? "pt-8" : ""}`}>
                  <div className="text-center">
                    <CardTitle className={`text-2xl font-semibold mb-2 ${
                      plan.popular ? "text-purple-600" : "text-gray-900"
                    }`}>
                      {plan.title}
                    </CardTitle>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {plan.desc}
                    </p>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div className="text-center">
                    <div className="mb-2">
                      <span className="text-4xl font-bold text-gray-900">
                        ${plan.price}
                      </span>
                      <span className="text-gray-600 ml-1">
                        {billingCycle === "monthly" ? "/月" : "/年"}
                      </span>
                    </div>
                    {billingCycle === "yearly" && (
                      <p className="text-xs text-gray-500 mb-2">
                        相当于每月 ${(plan.price / 12).toFixed(1)}
                      </p>
                    )}
                    <p className="text-lg font-medium text-gray-900">
                      {billingCycle === "monthly" ? "每月" : "每年"} {plan.credits.toLocaleString()} 积分
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-700 text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  <Button 
                    onClick={() => handleSubscribe(index)}
                    disabled={processingPayment !== null}
                    className={`w-full py-3 text-sm font-medium rounded-md ${
                      plan.popular
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
                      currentContent.subscribe
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