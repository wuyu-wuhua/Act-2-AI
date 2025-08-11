"use client"

import { useState, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { WarmBackground } from "@/components/warm-background"

export default function AboutPage() {
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
      title: "关于我们",
      subtitle: "致力于为创作者提供最前沿的 AI 视频特效技术",
      mission: {
        title: "我们的使命",
        p1: "Act Two AI 视频特效是一个专注于 AI 视频生成技术的创新平台。我们基于 act one 模型，为特效师、视频创作者和内容制作人提供强大的视频风格迁移和特效生成工具。",
        p2: "我们的目标是让每个人都能轻松创建专业级的视频特效，无需复杂的技术背景，只需上传视频和参考图像，即可获得惊艳的 AI 生成效果。"
      },
      advantages: {
        tech: {
          title: "先进技术",
          desc: "基于最新的 act one 模型，提供业界领先的 AI 视频生成能力"
        },
        creative: {
          title: "创意无限",
          desc: "支持多种艺术风格，让您的创意想法快速变为现实"
        },
        efficient: {
          title: "高效便捷",
          desc: "简单三步操作，几分钟内即可获得专业级视频特效"
        }
      },
      features: {
        title: "技术特色",
        actOne: {
          title: "基于 act one 模型",
          desc: "采用业界领先的 act one 技术，确保生成效果的专业性和稳定性"
        },
        styleTransfer: {
          title: "智能风格迁移",
          desc: "通过参考图像智能学习艺术风格，实现精准的视频风格转换"
        },
        quality: {
          title: "高质量输出",
          desc: "支持多种视频格式，生成高质量、高分辨率的视频特效"
        },
        cloud: {
          title: "云端处理",
          desc: "强大的云端计算能力，无需本地硬件要求，随时随地使用"
        }
      },
      applications: {
        title: "应用场景",
        film: {
          title: "🎬 影视制作",
          desc: "为电影、电视剧、广告等提供专业的视频特效制作服务"
        },
        social: {
          title: "📱 社交媒体",
          desc: "为短视频、直播、社交媒体内容创作提供创意特效"
        },
        art: {
          title: "🎨 艺术创作",
          desc: "支持艺术家进行数字艺术创作和实验性视频制作"
        },
        business: {
          title: "🏢 商业应用",
          desc: "为企业宣传、产品展示、品牌营销提供专业视频解决方案"
        }
      },
      cta: {
        title: "准备开始您的创作之旅？",
        subtitle: "立即体验 Act Two AI 视频特效的强大功能",
        startBtn: "开始创作",
        contactBtn: "联系我们"
      }
    },
    en: {
      title: "About Us",
      subtitle: "Committed to providing creators with cutting-edge AI video effects technology",
      mission: {
        title: "Our Mission",
        p1: "Act Two AI Video Effects is an innovative platform focused on AI video generation technology. Based on the act one model, we provide powerful video style transfer and effects generation tools for VFX artists, video creators, and content producers.",
        p2: "Our goal is to enable everyone to easily create professional-grade video effects without complex technical backgrounds. Simply upload videos and reference images to achieve stunning AI-generated effects."
      },
      advantages: {
        tech: {
          title: "Advanced Technology",
          desc: "Based on the latest act one model, providing industry-leading AI video generation capabilities"
        },
        creative: {
          title: "Unlimited Creativity",
          desc: "Support multiple artistic styles, quickly turning your creative ideas into reality"
        },
        efficient: {
          title: "Efficient & Convenient",
          desc: "Simple three-step operation, professional-grade video effects in minutes"
        }
      },
      features: {
        title: "Technical Features",
        actOne: {
          title: "Based on act one Model",
          desc: "Adopting industry-leading act one technology to ensure professional and stable generation effects"
        },
        styleTransfer: {
          title: "Intelligent Style Transfer",
          desc: "Intelligently learn artistic styles through reference images for precise video style conversion"
        },
        quality: {
          title: "High-Quality Output",
          desc: "Support multiple video formats, generating high-quality, high-resolution video effects"
        },
        cloud: {
          title: "Cloud Processing",
          desc: "Powerful cloud computing capabilities, no local hardware requirements, use anytime, anywhere"
        }
      },
      applications: {
        title: "Application Scenarios",
        film: {
          title: "🎬 Film Production",
          desc: "Provide professional video effects production services for movies, TV series, and advertisements"
        },
        social: {
          title: "📱 Social Media",
          desc: "Provide creative effects for short videos, live streaming, and social media content creation"
        },
        art: {
          title: "🎨 Artistic Creation",
          desc: "Support artists in digital art creation and experimental video production"
        },
        business: {
          title: "🏢 Business Applications",
          desc: "Provide professional video solutions for corporate promotion, product display, and brand marketing"
        }
      },
      cta: {
        title: "Ready to Start Your Creative Journey?",
        subtitle: "Experience the powerful features of Act Two AI Video Effects now",
        startBtn: "Start Creating",
        contactBtn: "Contact Us"
      }
    }
  }

  const currentContent = content[lang]

  return (
    <main className="relative min-h-screen">
      <WarmBackground />
      <Navigation lang={lang} onLangChange={handleLangChange} />
      
      <div className="relative z-10 pt-20 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          {/* 页面标题 */}
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-7xl font-bold text-gray-800 mb-6">
              {currentContent.title}
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto">
              {currentContent.subtitle}
            </p>
          </div>

          {/* 公司介绍 */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-10 mb-12 border border-orange-200 shadow-2xl">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🎯</span>
              </div>
              <h2 className="text-4xl font-bold text-gray-800">{currentContent.mission.title}</h2>
            </div>
            <div className="space-y-6">
              <p className="text-gray-700 text-xl leading-relaxed">
                {currentContent.mission.p1}
              </p>
              <p className="text-gray-700 text-xl leading-relaxed">
                {currentContent.mission.p2}
              </p>
            </div>
          </div>

          {/* 核心优势 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-8 border border-orange-200 text-center hover:scale-105 transition-all duration-300 shadow-xl">
              <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">🚀</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">{currentContent.advantages.tech.title}</h3>
              <p className="text-gray-700 text-lg">
                {currentContent.advantages.tech.desc}
              </p>
            </div>
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-8 border border-amber-200 text-center hover:scale-105 transition-all duration-300 shadow-xl">
              <div className="w-16 h-16 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">🎨</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">{currentContent.advantages.creative.title}</h3>
              <p className="text-gray-700 text-lg">
                {currentContent.advantages.creative.desc}
              </p>
            </div>
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-8 border border-yellow-200 text-center hover:scale-105 transition-all duration-300 shadow-xl">
              <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">⚡</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">{currentContent.advantages.efficient.title}</h3>
              <p className="text-gray-700 text-lg">
                {currentContent.advantages.efficient.desc}
              </p>
            </div>
          </div>

          {/* 技术特色 */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-10 mb-12 border border-orange-200 shadow-2xl">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">{currentContent.features.title}</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-3 flex-shrink-0"></div>
                <div>
                  <h4 className="text-gray-800 font-semibold mb-2">{currentContent.features.actOne.title}</h4>
                  <p className="text-gray-700">
                    {currentContent.features.actOne.desc}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-3 flex-shrink-0"></div>
                <div>
                  <h4 className="text-gray-800 font-semibold mb-2">{currentContent.features.styleTransfer.title}</h4>
                  <p className="text-gray-700">
                    {currentContent.features.styleTransfer.desc}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-3 flex-shrink-0"></div>
                <div>
                  <h4 className="text-gray-800 font-semibold mb-2">{currentContent.features.quality.title}</h4>
                  <p className="text-gray-700">
                    {currentContent.features.quality.desc}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-3 flex-shrink-0"></div>
                <div>
                  <h4 className="text-gray-800 font-semibold mb-2">{currentContent.features.cloud.title}</h4>
                  <p className="text-gray-700">
                    {currentContent.features.cloud.desc}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 应用场景 */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-10 mb-12 border border-orange-200 shadow-2xl">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">{currentContent.applications.title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-gray-800 font-semibold mb-3">{currentContent.applications.film.title}</h4>
                <p className="text-gray-700">
                  {currentContent.applications.film.desc}
                </p>
              </div>
              <div>
                <h4 className="text-gray-800 font-semibold mb-3">{currentContent.applications.social.title}</h4>
                <p className="text-gray-700">
                  {currentContent.applications.social.desc}
                </p>
              </div>
              <div>
                <h4 className="text-gray-800 font-semibold mb-3">{currentContent.applications.art.title}</h4>
                <p className="text-gray-700">
                  {currentContent.applications.art.desc}
                </p>
              </div>
              <div>
                <h4 className="text-gray-800 font-semibold mb-3">{currentContent.applications.business.title}</h4>
                <p className="text-gray-700">
                  {currentContent.applications.business.desc}
                </p>
              </div>
            </div>
          </div>

          {/* 联系我们 */}
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">{currentContent.cta.title}</h2>
            <p className="text-gray-700 text-lg mb-8">
              {currentContent.cta.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="/generator" 
                className="bg-orange-600 text-white hover:bg-orange-700 px-8 py-4 text-xl font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                {currentContent.cta.startBtn}
              </a>
              <a 
                href="/contact" 
                className="border-2 border-orange-600 text-orange-600 hover:bg-orange-600 hover:text-white px-8 py-4 text-xl font-semibold rounded-lg transition-all duration-300 transform hover:scale-105"
              >
                {currentContent.cta.contactBtn}
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
} 