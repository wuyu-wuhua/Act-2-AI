"use client"

import { useState, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { ProfessionalBackground } from "@/components/professional-background"

export default function ContactPage() {
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
      title: "联系我们",
      subtitle: "联系我们的客服团队，获取专业支持",
      support: {
        title: "专业客服支持",
        desc: "如果您在帮助中心找不到答案，我们的专业客服团队随时为您提供支持"
      },
      email: {
        title: "邮件支持",
        label: "邮箱地址",
        time: "24小时内回复",
        desc: "适合详细的技术问题咨询和项目合作洽谈"
      },
      phone: {
        title: "电话支持",
        label: "电话号码",
        time: "工作日 9:00-18:00",
        desc: "适合紧急问题咨询和实时技术支持"
      },
      faq: {
        title: "常见问题",
        q1: {
          title: "如何使用 AI 视频特效生成器？",
          answer: "只需三步：上传视频素材、提供参考图像、等待生成结果。我们的系统会自动处理并生成特效视频。"
        },
        q2: {
          title: "支持哪些视频格式？",
          answer: "支持 MP4 和 MOV 格式，文件大小最大不超过 500MB。建议使用高清视频以获得最佳效果。"
        },
        q3: {
          title: "生成时间需要多久？",
          answer: "通常需要 10 分钟内完成，具体时间取决于视频长度和复杂度。最长可生成 30 秒的视频。"
        },
        q4: {
          title: "如何获得更好的生成效果？",
          answer: "建议使用清晰的参考图像，确保视频质量良好，并选择与参考图像风格匹配的视频内容。"
        }
      },
      moreHelp: {
        title: "需要更多帮助？",
        subtitle: "我们的客服团队随时为您提供专业的技术支持和咨询服务",
        startBtn: "开始体验",
        casesBtn: "查看案例"
      }
    },
    en: {
      title: "Contact Us",
      subtitle: "Contact our customer service team for professional support",
      support: {
        title: "Professional Customer Support",
        desc: "If you can't find answers in our help center, our professional customer service team is always ready to provide support"
      },
      email: {
        title: "Email Support",
        label: "Email Address",
        time: "Response within 24 hours",
        desc: "Suitable for detailed technical consultations and project cooperation discussions"
      },
      phone: {
        title: "Phone Support",
        label: "Phone Number",
        time: "Weekdays 9:00-18:00",
        desc: "Suitable for urgent inquiries and real-time technical support"
      },
      faq: {
        title: "Frequently Asked Questions",
        q1: {
          title: "How to use the AI video effects generator?",
          answer: "Just three steps: upload video material, provide reference images, and wait for generation results. Our system will automatically process and generate effects videos."
        },
        q2: {
          title: "What video formats are supported?",
          answer: "Supports MP4 and MOV formats, with maximum file size of 500MB. We recommend using high-definition videos for best results."
        },
        q3: {
          title: "How long does generation take?",
          answer: "Usually completed within 10 minutes, depending on video length and complexity. Maximum video length is 30 seconds."
        },
        q4: {
          title: "How to get better generation results?",
          answer: "We recommend using clear reference images, ensuring good video quality, and selecting video content that matches the reference image style."
        }
      },
      moreHelp: {
        title: "Need More Help?",
        subtitle: "Our customer service team is always ready to provide professional technical support and consultation services",
        startBtn: "Start Experience",
        casesBtn: "View Cases"
      }
    }
  }

  const currentContent = content[lang]

  return (
    <main className="relative min-h-screen">
      <ProfessionalBackground />
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

          {/* 联系信息介绍 */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-10 mb-12 border border-blue-200 shadow-2xl text-center">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                <span className="text-2xl">💬</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-800">{currentContent.support.title}</h3>
            </div>
            <p className="text-gray-700 text-xl leading-relaxed">
              {currentContent.support.desc}
            </p>
          </div>

          {/* 联系方式卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {/* 邮件支持 */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-8 border border-blue-200 hover:border-blue-300 hover:scale-105 transition-all duration-300 shadow-xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{currentContent.email.title}</h3>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-blue-500/20 rounded-lg p-4">
                  <p className="text-blue-300 text-sm mb-1">{currentContent.email.label}</p>
                  <a 
                    href="mailto:q9425916@gmail.com" 
                    className="text-blue-400 text-lg font-semibold hover:text-blue-300 transition-colors"
                  >
                    q9425916@gmail.com
                  </a>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{currentContent.email.time}</span>
                </div>
                <p className="text-gray-600 text-sm">
                  {currentContent.email.desc}
                </p>
              </div>
            </div>

            {/* 电话支持 */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-8 border border-green-200 hover:border-green-300 hover:scale-105 transition-all duration-300 shadow-xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{currentContent.phone.title}</h3>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-green-500/20 rounded-lg p-4">
                  <p className="text-green-300 text-sm mb-1">{currentContent.phone.label}</p>
                  <a 
                    href="tel:+02362872229" 
                    className="text-green-400 text-lg font-semibold hover:text-green-300 transition-colors"
                  >
                    +023 6287 2229
                  </a>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{currentContent.phone.time}</span>
                </div>
                <p className="text-gray-600 text-sm">
                  {currentContent.phone.desc}
                </p>
              </div>
            </div>
          </div>

          {/* 常见问题 */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-10 mb-12 border border-blue-200 shadow-2xl">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                <span className="text-2xl">❓</span>
              </div>
              <h2 className="text-4xl font-bold text-gray-800">{currentContent.faq.title}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-blue-50/80 backdrop-blur-md rounded-xl p-6 border border-blue-100">
                <h4 className="text-gray-800 font-bold text-lg mb-3 flex items-center gap-2">
                  <span className="text-blue-600">🔧</span>
                  {currentContent.faq.q1.title}
                </h4>
                <p className="text-gray-700">
                  {currentContent.faq.q1.answer}
                </p>
              </div>
              <div className="bg-green-50/80 backdrop-blur-md rounded-xl p-6 border border-green-100">
                <h4 className="text-gray-800 font-bold text-lg mb-3 flex items-center gap-2">
                  <span className="text-green-600">📁</span>
                  {currentContent.faq.q2.title}
                </h4>
                <p className="text-gray-700">
                  {currentContent.faq.q2.answer}
                </p>
              </div>
              <div className="bg-yellow-50/80 backdrop-blur-md rounded-xl p-6 border border-yellow-100">
                <h4 className="text-gray-800 font-bold text-lg mb-3 flex items-center gap-2">
                  <span className="text-yellow-600">⏱️</span>
                  {currentContent.faq.q3.title}
                </h4>
                <p className="text-gray-700">
                  {currentContent.faq.q3.answer}
                </p>
              </div>
              <div className="bg-purple-50/80 backdrop-blur-md rounded-xl p-6 border border-purple-100">
                <h4 className="text-gray-800 font-bold text-lg mb-3 flex items-center gap-2">
                  <span className="text-purple-600">✨</span>
                  {currentContent.faq.q4.title}
                </h4>
                <p className="text-gray-700">
                  {currentContent.faq.q4.answer}
                </p>
              </div>
            </div>
          </div>

          {/* 更多帮助 */}
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">{currentContent.moreHelp.title}</h3>
            <p className="text-gray-600 mb-8">
              {currentContent.moreHelp.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="/generator" 
                className="bg-blue-600 text-white hover:bg-blue-700 px-8 py-4 text-xl font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                {currentContent.moreHelp.startBtn}
              </a>
              <a 
                href="/cases" 
                className="border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white px-8 py-4 text-xl font-semibold rounded-lg transition-all duration-300 transform hover:scale-105"
              >
                {currentContent.moreHelp.casesBtn}
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
} 