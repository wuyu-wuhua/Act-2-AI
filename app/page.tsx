"use client"

import { useState, useEffect } from "react"
import { VideoBackground } from "@/components/video-background"
import { Navigation } from "@/components/navigation"
import { HeroSection } from "@/components/hero-section"

export default function HomePage() {
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

  return (
    <main className="relative min-h-screen">
      {/* 视频背景 */}
      <VideoBackground />
      
      {/* 导航栏 */}
      <Navigation lang={lang} onLangChange={handleLangChange} />
      
      {/* 英雄区域 */}
      <HeroSection lang={lang} />
    </main>
  )
} 