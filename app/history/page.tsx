"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { User } from '@supabase/supabase-js'

interface GenerationHistory {
  id: string
  title: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  thumbnail_url?: string
  video_url?: string
  created_at: string
  duration: number
  credits_used: number
  style: string
}

export default function HistoryPage() {
  const [lang, setLang] = useState<"zh" | "en">("zh")
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [generations, setGenerations] = useState<GenerationHistory[]>([])
  const [filter, setFilter] = useState<'all' | 'completed' | 'processing' | 'failed'>('all')

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
        await loadGenerationHistory(user.id)
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
        
        if (session?.user) {
          await loadGenerationHistory(session.user.id)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const loadGenerationHistory = async (userId: string) => {
    try {
      // 这里应该从数据库加载生成历史
      // 暂时使用模拟数据
      const mockGenerations: GenerationHistory[] = [
        {
          id: '1',
          title: '夏日海滩风格视频',
          status: 'completed',
          thumbnail_url: '/api/placeholder/300/200',
          video_url: '/api/placeholder/video',
          created_at: '2025/08/04 11:08',
          duration: 15,
          credits_used: 150,
          style: '夏日海滩'
        },
        {
          id: '2',
          title: '城市夜景风格视频',
          status: 'processing',
          created_at: '2025/08/04 10:30',
          duration: 20,
          credits_used: 200,
          style: '城市夜景'
        },
        {
          id: '3',
          title: '复古电影风格视频',
          status: 'completed',
          thumbnail_url: '/api/placeholder/300/200',
          video_url: '/api/placeholder/video',
          created_at: '2025/08/03 15:20',
          duration: 12,
          credits_used: 120,
          style: '复古电影'
        },
        {
          id: '4',
          title: '科幻风格视频',
          status: 'failed',
          created_at: '2025/08/03 14:15',
          duration: 18,
          credits_used: 180,
          style: '科幻'
        }
      ]
      setGenerations(mockGenerations)
    } catch (error) {
      console.error('Error loading generation history:', error)
    }
  }

  const handleLangChange = (newLang: "zh" | "en") => {
    setLang(newLang)
    localStorage.setItem("language", newLang)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100'
      case 'processing':
        return 'text-blue-600 bg-blue-100'
      case 'pending':
        return 'text-yellow-600 bg-yellow-100'
      case 'failed':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return currentContent.completed
      case 'processing':
        return currentContent.processing
      case 'pending':
        return currentContent.pending
      case 'failed':
        return currentContent.failed
      default:
        return status
    }
  }

  const filteredGenerations = generations.filter(gen => {
    if (filter === 'all') return true
    return gen.status === filter
  })

  const content = {
    zh: {
      title: "生成历史",
      subtitle: "查看您所有的视频生成记录",
      all: "全部",
      completed: "已完成",
      processing: "处理中",
      pending: "等待中",
      failed: "失败",
      noHistory: "暂无生成记录",
      duration: "时长",
      creditsUsed: "消耗积分",
      style: "风格",
      download: "下载",
      retry: "重试",
      delete: "删除",
      seconds: "秒",
      credits: "积分"
    },
    en: {
      title: "Generation History",
      subtitle: "View all your video generation records",
      all: "All",
      completed: "Completed",
      processing: "Processing",
      pending: "Pending",
      failed: "Failed",
      noHistory: "No generation history yet",
      duration: "Duration",
      creditsUsed: "Credits Used",
      style: "Style",
      download: "Download",
      retry: "Retry",
      delete: "Delete",
      seconds: "s",
      credits: "credits"
    }
  }

  const currentContent = content[lang]

  if (loading) {
    return (
      <main className="relative min-h-screen bg-gray-50">
        <Navigation lang={lang} onLangChange={handleLangChange} />
        <div className="relative z-10 pt-20 pb-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-64 bg-gray-200 rounded"></div>
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
      <main className="relative min-h-screen bg-gray-50">
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
    <main className="relative min-h-screen bg-gray-50">
      <Navigation lang={lang} onLangChange={handleLangChange} />
      
      <div className="relative z-10 pt-20 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          {/* 页面标题 */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {currentContent.title}
            </h1>
            <p className="text-gray-600">
              {currentContent.subtitle}
            </p>
          </div>

          {/* 筛选器 */}
          <div className="mb-6">
            <div className="flex space-x-2">
              {(['all', 'completed', 'processing', 'failed'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  {currentContent[status]}
                </button>
              ))}
            </div>
          </div>

          {/* 生成历史列表 */}
          {filteredGenerations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGenerations.map((generation) => (
                <Card key={generation.id} className="overflow-hidden">
                  <div className="aspect-video bg-gray-100 relative">
                    {generation.thumbnail_url ? (
                      <img
                        src={generation.thumbnail_url}
                        alt={generation.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(generation.status)}`}>
                        {getStatusText(generation.status)}
                      </span>
                    </div>
                  </div>
                  
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-1">
                      {generation.title}
                    </h3>
                    
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>{currentContent.duration}:</span>
                        <span>{generation.duration}{currentContent.seconds}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{currentContent.creditsUsed}:</span>
                        <span>{generation.credits_used} {currentContent.credits}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{currentContent.style}:</span>
                        <span>{generation.style}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>时间:</span>
                        <span>{generation.created_at}</span>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex space-x-2">
                      {generation.status === 'completed' && generation.video_url && (
                        <Button size="sm" className="flex-1">
                          {currentContent.download}
                        </Button>
                      )}
                      {generation.status === 'failed' && (
                        <Button size="sm" variant="outline" className="flex-1">
                          {currentContent.retry}
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="px-3">
                        {currentContent.delete}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500 text-lg">{currentContent.noHistory}</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
} 