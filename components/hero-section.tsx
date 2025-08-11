import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { User } from '@supabase/supabase-js'

export function HeroSection({ lang = "en" }: { lang?: "zh" | "en" }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // 检查用户会话
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const handleExploreClick = () => {
    if (user) {
      // 用户已登录，直接跳转到生成页面
      window.location.href = '/generator'
    } else {
      // 用户未登录，跳转到登录页面，并保存返回路径
      localStorage.setItem('returnTo', '/generator')
      window.location.href = '/login'
    }
  }

  const content = {
    zh: {
      title: "Act Two AI 视频特效",
      subtitle: "基于 act one 模型的强大 AI 视频生成能力，为特效师和视频创作者提供前沿解决方案",
      exploreBtn: "开始探索",
      casesBtn: "案例展示"
    },
    en: {
      title: "Act Two AI Video Effects",
      subtitle: "Powerful AI video generation capabilities based on act one model, providing cutting-edge solutions for VFX artists and video creators",
      exploreBtn: "Start Exploring",
      casesBtn: "View Cases"
    }
  }

  const currentContent = content[lang]

  return (
    <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-5xl text-center">
        <div className="space-y-8">
          <h1 className="text-6xl md:text-8xl font-bold text-white leading-tight">
            {currentContent.title}
          </h1>
          <p className="text-xl md:text-3xl text-gray-200 max-w-3xl mx-auto leading-relaxed">
            {currentContent.subtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center pt-8">
            <button 
              onClick={handleExploreClick}
              className="bg-white text-black hover:bg-gray-100 px-10 py-4 text-xl font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              {currentContent.exploreBtn}
            </button>
            <a href="/cases" className="border-2 border-white text-white hover:bg-white hover:text-black px-10 py-4 text-xl font-semibold rounded-lg transition-all duration-300 transform hover:scale-105">
              {currentContent.casesBtn}
            </a>
          </div>
        </div>
      </div>
    </div>
  )
} 