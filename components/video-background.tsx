"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

interface VideoBackgroundProps {
  className?: string
}

const videoFiles = [
  "/成品案例/视频1.mp4",
  "/成品案例/视频2.mp4",
  "/成品案例/视频3.mp4",
  "/成品案例/视频4.mp4",
  "/成品案例/视频5.mp4",
]

export function VideoBackground({ className }: VideoBackgroundProps) {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentVideoIndex((prev) => (prev + 1) % videoFiles.length)
    }, 10000) // 每10秒切换一次视频

    return () => clearInterval(interval)
  }, [])

  const handleVideoLoad = () => {
    setIsLoading(false)
  }

  const handleVideoError = () => {
    // 如果视频加载失败，切换到下一个
    setCurrentVideoIndex((prev) => (prev + 1) % videoFiles.length)
  }

  return (
    <div className={cn("relative w-full h-full", className)}>
      {/* 加载状态 */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
        </div>
      )}
      
      {/* 视频背景 */}
      <video
        key={currentVideoIndex}
        className="video-background"
        autoPlay
        muted
        loop
        playsInline
        onLoadedData={handleVideoLoad}
        onError={handleVideoError}
      >
        <source src={videoFiles[currentVideoIndex]} type="video/mp4" />
        您的浏览器不支持视频播放。
      </video>
      
      {/* 视频遮罩 */}
      <div className="video-overlay" />
      
      {/* 额外的玻璃罩层 */}
      <div className="absolute inset-0 bg-white/2 backdrop-blur-[0.5px] z-0" />
      
      {/* 视频切换指示器 */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-10">
        {videoFiles.map((_, index) => (
          <div
            key={index}
            className={cn(
              "w-2 h-2 rounded-full transition-all duration-300",
              index === currentVideoIndex
                ? "bg-white scale-125"
                : "bg-white/50"
            )}
          />
        ))}
      </div>
    </div>
  )
} 