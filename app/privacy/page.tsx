"use client"

import { useState, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { ProfessionalBackground } from "@/components/professional-background"

export default function PrivacyPage() {
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
      title: "隐私政策",
      subtitle: "了解我们如何保护您的个人信息",
      lastUpdated: "最后更新时间：2024年12月",
      commitment: {
        title: "隐私保护承诺",
        desc: "我们深知个人信息的重要性，承诺以最严格的标准保护您的隐私。本政策详细说明了我们如何收集、使用和保护您的个人信息。"
      },
      collection: {
        title: "信息收集",
        desc: "我们收集以下类型的信息来提供和改进我们的服务：",
        account: "账户信息：注册时提供的姓名、邮箱地址、Google账户信息",
        usage: "使用数据：您使用我们服务的频率、功能偏好、上传的视频内容",
        technical: "技术信息：设备信息、IP地址、浏览器类型、操作系统",
        content: "内容数据：您上传的视频文件、生成的AI内容"
      },
      usage: {
        title: "信息使用",
        desc: "我们使用收集的信息用于以下目的：",
        items: [
          "提供和改进AI视频处理服务",
          "处理您的账户注册和登录",
          "发送服务相关通知和更新",
          "提供客户支持和故障排除",
          "分析使用模式以优化用户体验",
          "防止欺诈和滥用行为"
        ]
      },
      sharing: {
        title: "信息共享",
        desc: "我们不会出售、出租或交易您的个人信息。我们可能在以下情况下共享信息：",
        providers: "服务提供商：与帮助我们提供服务的第三方合作伙伴",
        legal: "法律要求：当法律要求或为了保护我们的权利时",
        business: "业务转让：在公司合并、收购或资产转让时",
        security: "安全保护：为保护用户和公众安全"
      },
      security: {
        title: "数据安全",
        items: [
          "我们采用行业标准的安全措施保护您的数据",
          "所有数据传输都使用SSL加密",
          "我们定期更新安全协议和系统",
          "员工访问个人数据受到严格限制",
          "我们监控系统以防止未经授权的访问"
        ]
      },
      storage: {
        title: "数据存储",
        items: [
          "您的数据存储在我们安全的服务器上",
          "我们可能使用第三方云服务提供商",
          "数据可能存储在中国境内或境外",
          "我们保留数据的时间不超过提供服务所需的时间",
          "账户删除后，相关数据将在合理时间内删除"
        ]
      },
      cookies: {
        title: "Cookie和跟踪技术",
        items: [
          "我们使用Cookie来改善用户体验",
          "Cookie帮助我们记住您的偏好设置",
          "您可以在浏览器设置中禁用Cookie",
          "我们可能使用分析工具来了解网站使用情况",
          "我们不会使用Cookie进行第三方广告跟踪"
        ]
      },
      rights: {
        title: "您的权利",
        desc: "您对您的个人信息拥有以下权利：",
        access: "访问权：查看我们持有的您的个人信息",
        correct: "更正权：要求更正不准确的信息",
        delete: "删除权：要求删除您的个人信息",
        limit: "限制权：限制我们处理您的信息",
        portability: "数据可携带权：以结构化格式获取您的数据",
        object: "反对权：反对我们处理您的信息"
      },
      children: {
        title: "儿童隐私",
        desc: "我们的服务不面向13岁以下的儿童。我们不会故意收集13岁以下儿童的个人信息。如果您认为我们可能收集了儿童的信息，请立即联系我们。"
      },
      international: {
        title: "国际数据传输",
        desc: "您的信息可能被传输到中国境外进行处理。我们确保所有国际数据传输都符合适用的数据保护法律，并采取适当的安全措施保护您的信息。"
      },
      updates: {
        title: "政策更新",
        desc: "我们可能会不时更新本隐私政策。重大变更时，我们会通过电子邮件或网站公告通知您。建议您定期查看本政策以了解我们如何保护您的信息。"
      },
      contact: {
        title: "联系我们",
        desc: "如果您对本隐私政策有任何疑问或需要行使您的权利，请通过以下方式联系我们：",
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
      title: "Privacy Policy",
      subtitle: "Learn how we protect your personal information",
      lastUpdated: "Last updated: December 2024",
      commitment: {
        title: "Privacy Protection Commitment",
        desc: "We deeply understand the importance of personal information and are committed to protecting your privacy with the strictest standards. This policy details how we collect, use, and protect your personal information."
      },
      collection: {
        title: "Information Collection",
        desc: "We collect the following types of information to provide and improve our services:",
        account: "Account Information: Name, email address, and Google account information provided during registration",
        usage: "Usage Data: Frequency of your use of our services, feature preferences, uploaded video content",
        technical: "Technical Information: Device information, IP address, browser type, operating system",
        content: "Content Data: Video files you upload, AI-generated content"
      },
      usage: {
        title: "Information Usage",
        desc: "We use the collected information for the following purposes:",
        items: [
          "Provide and improve AI video processing services",
          "Process your account registration and login",
          "Send service-related notifications and updates",
          "Provide customer support and troubleshooting",
          "Analyze usage patterns to optimize user experience",
          "Prevent fraud and abuse"
        ]
      },
      sharing: {
        title: "Information Sharing",
        desc: "We do not sell, rent, or trade your personal information. We may share information in the following circumstances:",
        providers: "Service Providers: With third-party partners who help us provide services",
        legal: "Legal Requirements: When required by law or to protect our rights",
        business: "Business Transfers: During company mergers, acquisitions, or asset transfers",
        security: "Security Protection: To protect user and public safety"
      },
      security: {
        title: "Data Security",
        items: [
          "We adopt industry-standard security measures to protect your data",
          "All data transmission uses SSL encryption",
          "We regularly update security protocols and systems",
          "Employee access to personal data is strictly restricted",
          "We monitor systems to prevent unauthorized access"
        ]
      },
      storage: {
        title: "Data Storage",
        items: [
          "Your data is stored on our secure servers",
          "We may use third-party cloud service providers",
          "Data may be stored within or outside China",
          "We retain data for no longer than necessary to provide services",
          "After account deletion, related data will be deleted within a reasonable time"
        ]
      },
      cookies: {
        title: "Cookies and Tracking Technologies",
        items: [
          "We use cookies to improve user experience",
          "Cookies help us remember your preference settings",
          "You can disable cookies in your browser settings",
          "We may use analytics tools to understand website usage",
          "We do not use cookies for third-party advertising tracking"
        ]
      },
      rights: {
        title: "Your Rights",
        desc: "You have the following rights regarding your personal information:",
        access: "Right of Access: View your personal information we hold",
        correct: "Right of Correction: Request correction of inaccurate information",
        delete: "Right of Deletion: Request deletion of your personal information",
        limit: "Right of Restriction: Restrict our processing of your information",
        portability: "Right of Data Portability: Obtain your data in a structured format",
        object: "Right of Objection: Object to our processing of your information"
      },
      children: {
        title: "Children's Privacy",
        desc: "Our services are not intended for children under 13. We do not knowingly collect personal information from children under 13. If you believe we may have collected information from a child, please contact us immediately."
      },
      international: {
        title: "International Data Transfers",
        desc: "Your information may be transferred outside China for processing. We ensure all international data transfers comply with applicable data protection laws and take appropriate security measures to protect your information."
      },
      updates: {
        title: "Policy Updates",
        desc: "We may update this privacy policy from time to time. For significant changes, we will notify you via email or website announcement. We recommend you regularly review this policy to understand how we protect your information."
      },
      contact: {
        title: "Contact Us",
        desc: "If you have any questions about this privacy policy or need to exercise your rights, please contact us through the following methods:",
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
      {/* 专业背景 */}
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
            <p className="text-gray-500 text-sm mt-4">
              {currentContent.lastUpdated}
            </p>
          </div>

          {/* 隐私政策介绍 */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-10 mb-12 border border-blue-200 shadow-2xl text-center">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🔒</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-800">{currentContent.commitment.title}</h3>
            </div>
            <p className="text-gray-700 text-xl leading-relaxed">
              {currentContent.commitment.desc}
            </p>
          </div>

          {/* 隐私政策内容 */}
          <div className="space-y-8">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-10 border border-blue-200 shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center">
                  <span className="text-3xl">📊</span>
                </div>
                <h2 className="text-4xl font-bold text-gray-800">{currentContent.collection.title}</h2>
              </div>
              <p className="text-gray-700 text-xl mb-8">
                {currentContent.collection.desc}
              </p>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mt-3 flex-shrink-0"></div>
                  <span className="text-gray-700 text-xl"><strong>{currentContent.collection.account.split(/[：:]/)[0]}{lang === "zh" ? "：" : ": "}</strong>{currentContent.collection.account.split(/[：:]/)[1]}</span>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mt-3 flex-shrink-0"></div>
                  <span className="text-gray-700 text-xl"><strong>{currentContent.collection.usage.split(/[：:]/)[0]}{lang === "zh" ? "：" : ": "}</strong>{currentContent.collection.usage.split(/[：:]/)[1]}</span>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mt-3 flex-shrink-0"></div>
                  <span className="text-gray-700 text-xl"><strong>{currentContent.collection.technical.split(/[：:]/)[0]}{lang === "zh" ? "：" : ": "}</strong>{currentContent.collection.technical.split(/[：:]/)[1]}</span>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mt-3 flex-shrink-0"></div>
                  <span className="text-gray-700 text-xl"><strong>{currentContent.collection.content.split(/[：:]/)[0]}{lang === "zh" ? "：" : ": "}</strong>{currentContent.collection.content.split(/[：:]/)[1]}</span>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-10 border border-indigo-200 shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center">
                  <span className="text-3xl">🎯</span>
                </div>
                <h2 className="text-4xl font-bold text-gray-800">{currentContent.usage.title}</h2>
              </div>
              <p className="text-gray-700 text-xl mb-8">{currentContent.usage.desc}</p>
              <div className="space-y-6">
                {currentContent.usage.items.map((item, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="w-3 h-3 bg-indigo-500 rounded-full mt-3 flex-shrink-0"></div>
                    <span className="text-gray-700 text-xl">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-10 border border-green-200 shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center">
                  <span className="text-3xl">🤝</span>
                </div>
                <h2 className="text-4xl font-bold text-gray-800">{currentContent.sharing.title}</h2>
              </div>
              <p className="text-gray-700 text-xl mb-8">{currentContent.sharing.desc}</p>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-3 h-3 bg-green-500 rounded-full mt-3 flex-shrink-0"></div>
                  <span className="text-gray-700 text-xl"><strong>{currentContent.sharing.providers.split(/[：:]/)[0]}{lang === "zh" ? "：" : ": "}</strong>{currentContent.sharing.providers.split(/[：:]/)[1]}</span>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-3 h-3 bg-green-500 rounded-full mt-3 flex-shrink-0"></div>
                  <span className="text-gray-700 text-xl"><strong>{currentContent.sharing.legal.split(/[：:]/)[0]}{lang === "zh" ? "：" : ": "}</strong>{currentContent.sharing.legal.split(/[：:]/)[1]}</span>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-3 h-3 bg-green-500 rounded-full mt-3 flex-shrink-0"></div>
                  <span className="text-gray-700 text-xl"><strong>{currentContent.sharing.business.split(/[：:]/)[0]}{lang === "zh" ? "：" : ": "}</strong>{currentContent.sharing.business.split(/[：:]/)[1]}</span>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-3 h-3 bg-green-500 rounded-full mt-3 flex-shrink-0"></div>
                  <span className="text-gray-700 text-xl"><strong>{currentContent.sharing.security.split(/[：:]/)[0]}{lang === "zh" ? "：" : ": "}</strong>{currentContent.sharing.security.split(/[：:]/)[1]}</span>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-10 border border-orange-200 shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center">
                  <span className="text-3xl">🛡️</span>
                </div>
                <h2 className="text-4xl font-bold text-gray-800">{currentContent.security.title}</h2>
              </div>
              <div className="space-y-6">
                {currentContent.security.items.map((item, index) => (
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
                  <span className="text-3xl">💾</span>
                </div>
                <h2 className="text-4xl font-bold text-gray-800">{currentContent.storage.title}</h2>
              </div>
              <div className="space-y-6">
                {currentContent.storage.items.map((item, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="w-3 h-3 bg-red-500 rounded-full mt-3 flex-shrink-0"></div>
                    <span className="text-gray-700 text-xl">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-10 border border-purple-200 shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
                  <span className="text-3xl">🍪</span>
                </div>
                <h2 className="text-4xl font-bold text-gray-800">{currentContent.cookies.title}</h2>
              </div>
              <div className="space-y-6">
                {currentContent.cookies.items.map((item, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="w-3 h-3 bg-purple-500 rounded-full mt-3 flex-shrink-0"></div>
                    <span className="text-gray-700 text-xl">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-10 border border-teal-200 shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-2xl flex items-center justify-center">
                  <span className="text-3xl">⚖️</span>
                </div>
                <h2 className="text-4xl font-bold text-gray-800">{currentContent.rights.title}</h2>
              </div>
              <p className="text-gray-700 text-xl mb-8">{currentContent.rights.desc}</p>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-3 h-3 bg-teal-500 rounded-full mt-3 flex-shrink-0"></div>
                  <span className="text-gray-700 text-xl"><strong>{currentContent.rights.access.split('：')[0]}：</strong>{currentContent.rights.access.split('：')[1]}</span>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-3 h-3 bg-teal-500 rounded-full mt-3 flex-shrink-0"></div>
                  <span className="text-gray-700 text-xl"><strong>{currentContent.rights.correct.split('：')[0]}：</strong>{currentContent.rights.correct.split('：')[1]}</span>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-3 h-3 bg-teal-500 rounded-full mt-3 flex-shrink-0"></div>
                  <span className="text-gray-700 text-xl"><strong>{currentContent.rights.delete.split('：')[0]}：</strong>{currentContent.rights.delete.split('：')[1]}</span>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-3 h-3 bg-teal-500 rounded-full mt-3 flex-shrink-0"></div>
                  <span className="text-gray-700 text-xl"><strong>{currentContent.rights.limit.split('：')[0]}：</strong>{currentContent.rights.limit.split('：')[1]}</span>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-3 h-3 bg-teal-500 rounded-full mt-3 flex-shrink-0"></div>
                  <span className="text-gray-700 text-xl"><strong>{currentContent.rights.portability.split('：')[0]}：</strong>{currentContent.rights.portability.split('：')[1]}</span>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-3 h-3 bg-teal-500 rounded-full mt-3 flex-shrink-0"></div>
                  <span className="text-gray-700 text-xl"><strong>{currentContent.rights.object.split('：')[0]}：</strong>{currentContent.rights.object.split('：')[1]}</span>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-10 border border-yellow-200 shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center">
                  <span className="text-3xl">👶</span>
                </div>
                <h2 className="text-4xl font-bold text-gray-800">{currentContent.children.title}</h2>
              </div>
              <p className="text-gray-700 text-xl leading-relaxed">
                {currentContent.children.desc}
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-10 border border-lime-200 shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-gradient-to-r from-lime-500 to-green-500 rounded-2xl flex items-center justify-center">
                  <span className="text-3xl">🌍</span>
                </div>
                <h2 className="text-4xl font-bold text-gray-800">{currentContent.international.title}</h2>
              </div>
              <p className="text-gray-700 text-xl leading-relaxed">
                {currentContent.international.desc}
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-10 border border-gray-200 shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-gradient-to-r from-gray-500 to-slate-500 rounded-2xl flex items-center justify-center">
                  <span className="text-3xl">📝</span>
                </div>
                <h2 className="text-4xl font-bold text-gray-800">{currentContent.updates.title}</h2>
              </div>
              <p className="text-gray-700 text-xl leading-relaxed">
                {currentContent.updates.desc}
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
              className="bg-blue-600 text-white hover:bg-blue-700 px-8 py-4 text-xl font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg inline-flex items-center gap-2"
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