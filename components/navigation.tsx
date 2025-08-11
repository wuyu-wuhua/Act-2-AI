"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { User } from '@supabase/supabase-js'

interface NavigationProps {
  lang: "zh" | "en"
  onLangChange: (lang: "zh" | "en") => void
}

export function Navigation({ lang = "en", onLangChange }: NavigationProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false)
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  
  const langDropdownRef = useRef<HTMLDivElement>(null)
  const userDropdownRef = useRef<HTMLDivElement>(null)

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

  // 点击外部关闭下拉菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setIsLangDropdownOpen(false)
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const content = {
    zh: {
      home: "首页",
      about: "关于我们",
      cases: "作品集",
      pricing: "定价",
      contact: "联系我们",
      startProject: "开始项目",
      profile: "个人中心",
      history: "历史记录",
      generate: "开始生成",
      logout: "退出登录"
    },
    en: {
      home: "Home",
      about: "About",
      cases: "Portfolio",
      pricing: "Pricing",
      contact: "Contact",
      startProject: "Start Project",
      profile: "Profile",
      history: "History",
      generate: "Generate",
      logout: "Sign Out"
    }
  }

  const currentContent = content[lang]

  const zhMenuItems = [
    { href: "/", label: currentContent.home },
    { href: "/cases", label: currentContent.cases },
    { href: "/pricing", label: currentContent.pricing },
    { href: "/about", label: currentContent.about },
    { href: "/contact", label: currentContent.contact },
  ]

  const enMenuItems = [
    { href: "/", label: currentContent.home },
    { href: "/cases", label: currentContent.cases },
    { href: "/pricing", label: currentContent.pricing },
    { href: "/about", label: currentContent.about },
    { href: "/contact", label: currentContent.contact },
  ]

  const toggleLangDropdown = () => {
    setIsLangDropdownOpen(!isLangDropdownOpen)
  }

  const toggleUserDropdown = () => {
    setIsUserDropdownOpen(!isUserDropdownOpen)
  }

  const handleLogout = async () => {
    try {
      console.log('开始退出登录...')
      
      // 先关闭用户下拉菜单
      setIsUserDropdownOpen(false)
      
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('退出登录错误:', error)
        alert('退出登录失败，请重试')
        return
      }
      
      console.log('退出登录成功，正在跳转...')
      
      // 清除本地存储的用户相关数据
      localStorage.removeItem('returnTo')
      
      // 强制刷新页面以确保状态完全清除
      window.location.href = '/'
      
    } catch (error) {
      console.error('退出登录异常:', error)
      alert('退出登录过程中出现错误，请重试')
    }
  }

  const getUserInitials = (user: User) => {
    if (user.user_metadata?.full_name) {
      return user.user_metadata.full_name.charAt(0).toUpperCase()
    }
    if (user.email) {
      return user.email.charAt(0).toUpperCase()
    }
    return 'U'
  }

  const getUserDisplayName = (user: User) => {
    if (user.user_metadata?.full_name) {
      return user.user_metadata.full_name
    }
    if (user.email) {
      return user.email.split('@')[0]
    }
    return 'User'
  }

  const ctaText = currentContent.startProject

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/20 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <a href="/" className="flex items-center space-x-2">
              <img 
                src="/images/logo.png" 
                alt="Act 2 AI Logo" 
                className="h-8 w-8 object-contain"
              />
              <span className="text-white font-bold text-xl">
                Act 2 AI
              </span>
            </a>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {(lang === "zh" ? zhMenuItems : enMenuItems).map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="text-white/80 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>

          {/* Right side - Language selector and CTA */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Language Selector */}
            <div className="relative" ref={langDropdownRef}>
              <button
                onClick={toggleLangDropdown}
                className="text-white/80 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{lang === "zh" ? "中文" : "English"}</span>
              </button>
              {isLangDropdownOpen && (
                <div className="absolute right-0 mt-2 w-32 bg-white/95 backdrop-blur-md rounded-lg shadow-lg border border-white/20 overflow-hidden">
                  <button
                    onClick={() => {
                      onLangChange("zh")
                      setIsLangDropdownOpen(false)
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    中文
                  </button>
                  <button
                    onClick={() => {
                      onLangChange("en")
                      setIsLangDropdownOpen(false)
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    English
                  </button>
                </div>
              )}
            </div>

            {/* User Avatar or CTA Button */}
            {!loading && (
              user ? (
                <div className="relative" ref={userDropdownRef}>
                  <button
                    onClick={toggleUserDropdown}
                    className="w-12 h-12 rounded-full border-2 border-white/20 hover:border-white/40 transition-all duration-200 overflow-hidden bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center"
                  >
                    {user.user_metadata?.avatar_url ? (
                      <img
                        src={user.user_metadata.avatar_url}
                        alt="Profile"
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <span className="text-white text-lg font-bold">
                        {getUserInitials(user)}
                      </span>
                    )}
                  </button>
                  {isUserDropdownOpen && (
                    <div className="absolute right-1/2 transform translate-x-1/2 mt-2 w-64 bg-white/95 backdrop-blur-md rounded-lg shadow-lg border border-white/20 overflow-hidden z-50">
                      <div className="px-4 py-3 border-b border-gray-200">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center overflow-hidden">
                            {user.user_metadata?.avatar_url ? (
                              <img
                                src={user.user_metadata.avatar_url}
                                alt="Profile"
                                className="w-full h-full object-cover rounded-full"
                              />
                            ) : (
                              <span className="text-white text-sm font-bold">
                                {getUserInitials(user)}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{getUserDisplayName(user)}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </div>
                      <div className="py-1">
                        <a href="/profile" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors" onClick={() => setIsUserDropdownOpen(false)}>
                          <svg className="w-4 h-4 mr-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {currentContent.profile}
                        </a>
                        <a href="/history" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors" onClick={() => setIsUserDropdownOpen(false)}>
                          <svg className="w-4 h-4 mr-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {currentContent.history}
                        </a>
                        <a href="/generator" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors" onClick={() => setIsUserDropdownOpen(false)}>
                          <svg className="w-4 h-4 mr-3 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          {currentContent.generate}
                        </a>
                        <button onClick={handleLogout} className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                          <svg className="w-4 h-4 mr-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          {currentContent.logout}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <a href="/login">
                  <Button size="sm" className="bg-white text-black hover:bg-gray-100 font-medium">
                    {ctaText}
                  </Button>
                </a>
              )
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-white/80 hover:text-white p-2 rounded-md transition-colors"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-black/95 backdrop-blur-md border-b border-white/10">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {/* Mobile Logo */}
            <div className="px-3 py-2 border-b border-white/10">
              <a href="/" className="flex items-center space-x-2" onClick={() => setIsMenuOpen(false)}>
                <img 
                  src="/images/logo.png" 
                  alt="Act 2 AI Logo" 
                  className="h-6 w-6 object-contain"
                />
                <span className="text-white font-bold text-lg">
                  Act 2 AI
                </span>
              </a>
            </div>
            {(lang === "zh" ? zhMenuItems : enMenuItems).map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-white/80 hover:text-white block px-3 py-2 rounded-md text-base font-medium transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
            
            {/* Mobile Language Selector */}
            <div className="px-3 py-2">
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    onLangChange("zh")
                    setIsMenuOpen(false)
                  }}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    lang === "zh" ? "bg-white text-black" : "text-white/80 hover:text-white"
                  }`}
                >
                  中文
                </button>
                <button
                  onClick={() => {
                    onLangChange("en")
                    setIsMenuOpen(false)
                  }}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    lang === "en" ? "bg-white text-black" : "text-white/80 hover:text-white"
                  }`}
                >
                  English
                </button>
              </div>
            </div>

            {/* Mobile User Info or CTA */}
            {!loading && (
              user ? (
                <div className="px-3 py-2 border-t border-white/10">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full border-2 border-white/20 overflow-hidden bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
                      {user.user_metadata?.avatar_url ? (
                        <img
                          src={user.user_metadata.avatar_url}
                          alt="Profile"
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <span className="text-white text-sm font-bold">
                          {getUserInitials(user)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{getUserDisplayName(user)}</p>
                      <p className="text-xs text-white/60">{user.email}</p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    <a href="/profile" className="block text-sm text-white/80 hover:text-white transition-colors" onClick={() => setIsMenuOpen(false)}>{currentContent.profile}</a>
                    <a href="/history" className="block text-sm text-white/80 hover:text-white transition-colors" onClick={() => setIsMenuOpen(false)}>{currentContent.history}</a>
                    <a href="/generator" className="block text-sm text-white/80 hover:text-white transition-colors" onClick={() => setIsMenuOpen(false)}>{currentContent.generate}</a>
                    <button onClick={handleLogout} className="block w-full text-left text-sm text-white/80 hover:text-white transition-colors">{currentContent.logout}</button>
                  </div>
                </div>
              ) : (
                <div className="px-3 py-2">
                  <a href="/login">
                    <Button size="sm" className="w-full bg-white text-black hover:bg-gray-100 font-medium">
                      {ctaText}
                    </Button>
                  </a>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </nav>
  )
} 