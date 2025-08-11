"use client"

import { useState, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { WarmBackground } from "@/components/warm-background"

export default function TermsPage() {
  const [lang, setLang] = useState<"zh" | "en">("zh")

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
      title: "服务条款",
      subtitle: "了解我们的服务条款和使用政策",
      lastUpdated: "最后更新时间：2024年12月",
      introduction: {
        title: "服务条款说明",
        desc: "通过使用 Act 2 AI 的服务，您同意遵守以下条款和条件。这些条款旨在保护您的权益，同时确保我们能够为您提供优质的服务。"
      },
      overview: {
        title: "服务概述",
        desc: "Act 2 AI（以下简称\"我们\"）提供基于人工智能的视频风格迁移和特效生成服务。通过使用我们的服务，您同意遵守以下条款和条件。"
      },
      responsibilities: {
        title: "用户责任",
        items: [
          "您必须提供真实、准确的注册信息",
          "您有责任保护您的账户安全，不得与他人共享账户信息",
          "您不得使用我们的服务进行任何违法或有害活动",
          "您不得上传包含版权侵权、色情、暴力等不当内容的视频",
          "您对上传的内容拥有合法权利或获得相应授权"
        ]
      },
      usage: {
        title: "服务使用",
        items: [
          "我们提供视频风格迁移、特效生成等AI功能",
          "服务可能因技术维护、系统升级等原因暂时中断",
          "我们保留修改、暂停或终止服务的权利",
          "免费用户和付费用户可能享有不同的服务权限"
        ]
      },
      intellectualProperty: {
        title: "知识产权",
        items: [
          "我们的平台、技术、算法等知识产权归我们所有",
          "您上传的原始内容仍归您所有",
          "通过我们的AI生成的内容，您享有使用权",
          "您不得复制、分发我们的专有技术"
        ]
      },
      disclaimer: {
        title: "免责声明",
        items: [
          "我们尽力确保服务的稳定性和准确性，但不保证100%无错误",
          "AI生成的内容可能存在不准确或不当之处",
          "我们不对因使用服务而产生的任何直接或间接损失负责",
          "您使用AI生成内容时需自行判断其适用性"
        ]
      },
      fees: {
        title: "费用和支付",
        items: [
          "部分高级功能可能需要付费使用",
          "费用标准可能随时调整，我们会提前通知",
          "付费后不支持退款，除非服务出现严重问题",
          "我们使用安全的第三方支付平台处理支付"
        ]
      },
      termination: {
        title: "账户终止",
        items: [
          "您可以随时删除账户",
          "我们有权因违反条款而暂停或终止您的账户",
          "账户终止后，您的数据将在合理时间内删除",
          "已付费但未使用的服务可能无法退款"
        ]
      },
      modifications: {
        title: "条款修改",
        desc: "我们可能会不时更新这些服务条款。重大变更时，我们会通过电子邮件或网站公告通知您。继续使用服务即表示您接受更新后的条款。"
      },
      contact: {
        title: "联系我们",
        desc: "如果您对这些服务条款有任何疑问，请通过以下方式联系我们：",
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
        }
      },
      backButton: "返回登录页面"
    },
    en: {
      title: "Terms of Service",
      subtitle: "Learn about our terms of service and usage policies",
      lastUpdated: "Last updated: December 2024",
      introduction: {
        title: "Terms of Service Description",
        desc: "By using Act 2 AI services, you agree to comply with the following terms and conditions. These terms are designed to protect your rights while ensuring we can provide you with quality services."
      },
      overview: {
        title: "Service Overview",
        desc: "Act 2 AI (hereinafter referred to as 'we') provides AI-based video style transfer and effects generation services. By using our services, you agree to comply with the following terms and conditions."
      },
      responsibilities: {
        title: "User Responsibilities",
        items: [
          "You must provide true and accurate registration information",
          "You are responsible for protecting your account security and must not share account information with others",
          "You must not use our services for any illegal or harmful activities",
          "You must not upload videos containing copyright infringement, pornography, violence, or other inappropriate content",
          "You have legal rights to the uploaded content or have obtained appropriate authorization"
        ]
      },
      usage: {
        title: "Service Usage",
        items: [
          "We provide AI functions such as video style transfer and effects generation",
          "Services may be temporarily interrupted due to technical maintenance, system upgrades, etc.",
          "We reserve the right to modify, suspend, or terminate services",
          "Free users and paid users may have different service permissions"
        ]
      },
      intellectualProperty: {
        title: "Intellectual Property",
        items: [
          "Our platform, technology, algorithms, and other intellectual property belong to us",
          "Your original uploaded content remains yours",
          "You have usage rights for content generated through our AI",
          "You must not copy or distribute our proprietary technology"
        ]
      },
      disclaimer: {
        title: "Disclaimer",
        items: [
          "We strive to ensure service stability and accuracy but do not guarantee 100% error-free operation",
          "AI-generated content may contain inaccuracies or inappropriate elements",
          "We are not responsible for any direct or indirect losses arising from using our services",
          "You need to judge the applicability of AI-generated content yourself"
        ]
      },
      fees: {
        title: "Fees and Payment",
        items: [
          "Some advanced features may require payment",
          "Fee standards may be adjusted at any time, and we will notify you in advance",
          "No refunds after payment unless there are serious service issues",
          "We use secure third-party payment platforms to process payments"
        ]
      },
      termination: {
        title: "Account Termination",
        items: [
          "You can delete your account at any time",
          "We have the right to suspend or terminate your account for violations of terms",
          "After account termination, your data will be deleted within a reasonable time",
          "Paid but unused services may not be refundable"
        ]
      },
      modifications: {
        title: "Terms Modifications",
        desc: "We may update these terms of service from time to time. For significant changes, we will notify you via email or website announcement. Continued use of services indicates your acceptance of updated terms."
      },
      contact: {
        title: "Contact Us",
        desc: "If you have any questions about these terms of service, please contact us through the following methods:",
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
        }
      },
      backButton: "Back to Login Page"
    }
  }

  const currentContent = content[lang]

  return (
    <main className="relative min-h-screen">
      {/* 温暖背景 */}
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
            <p className="text-gray-500 text-sm mt-4">
              {currentContent.lastUpdated}
            </p>
          </div>

          {/* 服务条款介绍 */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-10 mb-12 border border-orange-200 shadow-2xl text-center">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl flex items-center justify-center">
                <span className="text-2xl">📋</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-800">{currentContent.introduction.title}</h3>
            </div>
            <p className="text-gray-700 text-xl leading-relaxed">
              {currentContent.introduction.desc}
            </p>
          </div>

          {/* 服务条款内容 */}
          <div className="space-y-8">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-10 border border-orange-200 shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center">
                  <span className="text-3xl">🎯</span>
                </div>
                <h2 className="text-4xl font-bold text-gray-800">{currentContent.overview.title}</h2>
              </div>
              <p className="text-gray-700 text-xl leading-relaxed">
                {currentContent.overview.desc}
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-10 border border-blue-200 shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center">
                  <span className="text-3xl">👤</span>
                </div>
                <h2 className="text-4xl font-bold text-gray-800">{currentContent.responsibilities.title}</h2>
              </div>
              <div className="space-y-6">
                {currentContent.responsibilities.items.map((item, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mt-3 flex-shrink-0"></div>
                    <span className="text-gray-700 text-xl">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-10 border border-green-200 shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center">
                  <span className="text-3xl">⚡</span>
                </div>
                <h2 className="text-4xl font-bold text-gray-800">{currentContent.usage.title}</h2>
              </div>
              <div className="space-y-6">
                {currentContent.usage.items.map((item, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="w-3 h-3 bg-green-500 rounded-full mt-3 flex-shrink-0"></div>
                    <span className="text-gray-700 text-xl">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-10 border border-orange-200 shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center">
                  <span className="text-3xl">🔒</span>
                </div>
                <h2 className="text-4xl font-bold text-gray-800">{currentContent.intellectualProperty.title}</h2>
              </div>
              <div className="space-y-6">
                {currentContent.intellectualProperty.items.map((item, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="w-3 h-3 bg-orange-500 rounded-full mt-3 flex-shrink-0"></div>
                    <span className="text-gray-700 text-xl">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-10 border border-red-200 shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-pink-500 rounded-2xl flex items-center justify-center">
                  <span className="text-3xl">⚠️</span>
                </div>
                <h2 className="text-4xl font-bold text-gray-800">{currentContent.disclaimer.title}</h2>
              </div>
              <div className="space-y-6">
                {currentContent.disclaimer.items.map((item, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="w-3 h-3 bg-red-500 rounded-full mt-3 flex-shrink-0"></div>
                    <span className="text-gray-700 text-xl">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-10 border border-indigo-200 shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center">
                  <span className="text-3xl">💰</span>
                </div>
                <h2 className="text-4xl font-bold text-gray-800">{currentContent.fees.title}</h2>
              </div>
              <div className="space-y-6">
                {currentContent.fees.items.map((item, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="w-3 h-3 bg-indigo-500 rounded-full mt-3 flex-shrink-0"></div>
                    <span className="text-gray-700 text-xl">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-10 border border-teal-200 shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-2xl flex items-center justify-center">
                  <span className="text-3xl">🚪</span>
                </div>
                <h2 className="text-4xl font-bold text-gray-800">{currentContent.termination.title}</h2>
              </div>
              <div className="space-y-6">
                {currentContent.termination.items.map((item, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="w-3 h-3 bg-teal-500 rounded-full mt-3 flex-shrink-0"></div>
                    <span className="text-gray-700 text-xl">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-10 border border-gray-200 shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-gradient-to-r from-gray-500 to-slate-500 rounded-2xl flex items-center justify-center">
                  <span className="text-3xl">📝</span>
                </div>
                <h2 className="text-4xl font-bold text-gray-800">{currentContent.modifications.title}</h2>
              </div>
              <p className="text-gray-700 text-xl leading-relaxed">
                {currentContent.modifications.desc}
              </p>
            </div>

            {/* 联系我们 */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-10 border border-blue-200 shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center">
                  <span className="text-3xl">💬</span>
                </div>
                <h2 className="text-4xl font-bold text-gray-800">{currentContent.contact.title}</h2>
              </div>
              <p className="text-gray-700 text-xl mb-8">
                {currentContent.contact.desc}
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* 邮件支持 */}
                <div className="bg-blue-50/80 backdrop-blur-md rounded-xl p-8 border border-blue-100 hover:border-blue-200 hover:scale-105 transition-all duration-300">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">{currentContent.contact.email.title}</h3>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-blue-500/20 rounded-lg p-4">
                      <p className="text-blue-300 text-sm mb-1">{currentContent.contact.email.label}</p>
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
                      <span>{currentContent.contact.email.time}</span>
                    </div>
                    <p className="text-gray-600 text-sm">
                      {currentContent.contact.email.desc}
                    </p>
                  </div>
                </div>
                
                {/* 电话支持 */}
                <div className="bg-green-50/80 backdrop-blur-md rounded-xl p-8 border border-green-100 hover:border-green-200 hover:scale-105 transition-all duration-300">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">{currentContent.contact.phone.title}</h3>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-green-500/20 rounded-lg p-4">
                      <p className="text-green-300 text-sm mb-1">{currentContent.contact.phone.label}</p>
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
                      <span>{currentContent.contact.phone.time}</span>
                    </div>
                    <p className="text-gray-600 text-sm">
                      {currentContent.contact.phone.desc}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 返回按钮 */}
          <div className="text-center mt-12">
            <a 
              href="/login" 
              className="bg-orange-600 text-white hover:bg-orange-700 px-8 py-4 text-xl font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg inline-flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              {currentContent.backButton}
            </a>
          </div>
        </div>
      </div>
    </main>
  )
} 