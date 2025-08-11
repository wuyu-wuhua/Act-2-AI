"use client"

import { useState, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { CleanBackground } from "@/components/clean-background"

interface CaseStudy {
  id: number
  title: string
  description: string
  originalVideo: string
  generatedVideo: string
  referenceImage: string
  style: string
  category: string
}

export default function CasesPage() {
  const [lang, setLang] = useState<"zh" | "en">("en")

  // 从localStorage读取语言设置
  useEffect(() => {
    const savedLang = localStorage.getItem("language") as "zh" | "en"
    if (savedLang) {
      setLang(savedLang)
    }
  }, [])

  const handleLangChange = (newLang: "zh" | "en") => {
    setLang(newLang)
    localStorage.setItem("language", newLang)
  }

  const content = {
    zh: {
      title: "Act Two AI 视频特效案例",
      subtitle: "探索 act one 的无限创意",
      desc: "通过实际案例直观展示 act one 模型的强大能力和本工具站的价值",
      referenceStyle: "参考风格",
      experienceBtn: "立即体验",
      compareBtn: "对比",
      cta: {
        title: "准备好创造您的专属特效了吗？",
        button: "开始创建"
      }
    },
    en: {
      title: "Act Two AI Video Effects Cases",
      subtitle: "Explore the Unlimited Creativity of act one",
      desc: "Intuitively demonstrate the powerful capabilities of the act one model and the value of this tool through actual cases",
      referenceStyle: "Reference Style",
      experienceBtn: "Experience Now",
      compareBtn: "Compare",
      cta: {
        title: "Ready to Create Your Exclusive Effects?",
        button: "Start Creating"
      }
    }
  }

  const caseStudies: CaseStudy[] = [
    {
      id: 1,
      title: lang === "zh" ? "城市夜景风格化" : "Urban Night Scene Stylization",
      description: lang === "zh" ? "将普通城市街景转换为梦幻夜景风格，营造科幻电影氛围" : "Transform ordinary urban street scenes into dreamy night scene styles, creating a sci-fi movie atmosphere",
      originalVideo: "/成品案例/视频1.mp4",
      generatedVideo: "/成品案例/视频2.mp4",
      referenceImage: "/api/placeholder/300/200",
      style: lang === "zh" ? "科幻夜景" : "Sci-fi Night Scene",
      category: lang === "zh" ? "城市景观" : "Urban Landscape"
    },
    {
      id: 2,
      title: lang === "zh" ? "人物肖像艺术化" : "Portrait Artistic Transformation",
      description: lang === "zh" ? "将真实人物肖像转换为油画风格，展现古典艺术美感" : "Transform real portraits into oil painting styles, showcasing classical artistic beauty",
      originalVideo: "/成品案例/视频3.mp4",
      generatedVideo: "/成品案例/视频4.mp4",
      referenceImage: "/api/placeholder/300/200",
      style: lang === "zh" ? "古典油画" : "Classical Oil Painting",
      category: lang === "zh" ? "人物肖像" : "Portrait"
    },
    {
      id: 3,
      title: lang === "zh" ? "自然风光魔幻化" : "Natural Landscape Magic Transformation",
      description: lang === "zh" ? "将自然风景转换为魔幻世界风格，创造奇幻视觉效果" : "Transform natural landscapes into magical world styles, creating fantastical visual effects",
      originalVideo: "/成品案例/视频5.mp4",
      generatedVideo: "/成品案例/视频1.mp4",
      referenceImage: "/api/placeholder/300/200",
      style: lang === "zh" ? "魔幻世界" : "Magical World",
      category: lang === "zh" ? "自然风光" : "Natural Landscape"
    }
  ]

  const currentContent = content[lang]

  return (
    <main className="relative min-h-screen">
      <CleanBackground />
      <Navigation lang={lang} onLangChange={handleLangChange} />
      
      <div className="relative z-10 pt-20 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          {/* 页面标题 */}
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-7xl font-bold text-gray-800 mb-6">
              {currentContent.title}
            </h1>
            <h2 className="text-2xl md:text-3xl text-gray-600 mb-8">
              {currentContent.subtitle}
            </h2>
            <p className="text-lg md:text-xl text-gray-500 max-w-3xl mx-auto">
              {currentContent.desc}
            </p>
          </div>

          {/* 案例展示网格 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            {caseStudies.map((caseStudy) => (
              <div key={caseStudy.id} className="bg-white/80 backdrop-blur-md rounded-xl overflow-hidden border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                {/* 视频预览区域 */}
                <div className="relative aspect-video">
                  <video 
                    className="w-full h-full object-cover"
                    autoPlay 
                    muted 
                    loop 
                    playsInline
                  >
                    <source src={caseStudy.generatedVideo} type="video/mp4" />
                  </video>
                  <div className="absolute top-4 left-4 bg-black/50 px-3 py-1 rounded-full">
                    <span className="text-white text-sm font-medium">{caseStudy.style}</span>
                  </div>
                </div>

                {/* 案例信息 */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    {caseStudy.title}
                  </h3>
                  <p className="text-gray-600 mb-4 line-clamp-3">
                    {caseStudy.description}
                  </p>
                  
                  {/* 参考图预览 */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-16 h-16 bg-gray-600 rounded-lg overflow-hidden">
                      <img 
                        src={caseStudy.referenceImage} 
                        alt={currentContent.referenceStyle}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">{currentContent.referenceStyle}</p>
                      <p className="text-gray-800 font-medium">{caseStudy.style}</p>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex gap-3">
                    <a 
                      href="/generator" 
                      className="flex-1 bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-lg font-semibold text-center transition-colors duration-200"
                    >
                      {currentContent.experienceBtn}
                    </a>
                    <button className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors duration-200">
                      {currentContent.compareBtn}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 底部CTA */}
          <div className="text-center mt-16">
            <h3 className="text-3xl font-bold text-gray-800 mb-6">
              {currentContent.cta.title}
            </h3>
            <a 
              href="/generator" 
              className="inline-block bg-blue-600 text-white hover:bg-blue-700 px-8 py-4 text-xl font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              {currentContent.cta.button}
            </a>
          </div>
        </div>
      </div>
    </main>
  )
} 