"use client"

import { useState, useEffect, useRef, useCallback } from "react"
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
  const [nextVideoIndex, setNextVideoIndex] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [preloadProgress, setPreloadProgress] = useState(0)
  const [currentVideoReady, setCurrentVideoReady] = useState(false)
  const currentVideoRef = useRef<HTMLVideoElement>(null)
  const nextVideoRef = useRef<HTMLVideoElement>(null)
  const preloadedVideos = useRef<Map<string, HTMLVideoElement>>(new Map())
  const transitionTimeoutRef = useRef<NodeJS.Timeout>()

  // 预加载单个视频
  const preloadVideo = useCallback(async (src: string): Promise<HTMLVideoElement> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      video.src = src
      video.muted = true
      video.preload = 'auto'
      video.style.display = 'none'
      
      const handleLoad = () => {
        video.removeEventListener('loadeddata', handleLoad)
        video.removeEventListener('error', handleError)
        resolve(video)
      }
      
      const handleError = () => {
        video.removeEventListener('loadeddata', handleLoad)
        video.removeEventListener('error', handleError)
        reject(new Error(`Failed to load video: ${src}`))
      }
      
      video.addEventListener('loadeddata', handleLoad)
      video.addEventListener('error', handleError)
      
      // 开始加载
      video.load()
    })
  }, [])

  // 预加载所有视频
  useEffect(() => {
    const preloadAllVideos = async () => {
      try {
        const totalVideos = videoFiles.length
        let loadedCount = 0
        
        const preloadPromises = videoFiles.map(async (src, index) => {
          try {
            const video = await preloadVideo(src)
            preloadedVideos.current.set(src, video)
            document.body.appendChild(video)
            
            loadedCount++
            setPreloadProgress((loadedCount / totalVideos) * 100)
            
            return video
          } catch (error) {
            console.warn(`Failed to preload video ${src}:`, error)
            return null
          }
        })
        
        await Promise.allSettled(preloadPromises)
        
        // 确保至少有一个视频加载成功
        if (preloadedVideos.current.size > 0) {
          setIsLoading(false)
        } else {
          // 如果没有视频预加载成功，使用默认加载方式
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Error preloading videos:', error)
        setIsLoading(false)
      }
    }

    preloadAllVideos()
    
    return () => {
      // 清理预加载的视频
      preloadedVideos.current.forEach(video => {
        if (video.parentNode) {
          video.parentNode.removeChild(video)
        }
      })
      preloadedVideos.current.clear()
      
      // 清理定时器
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current)
      }
    }
  }, [preloadVideo])

  // 视频切换逻辑
  useEffect(() => {
    if (isLoading || !currentVideoReady) return

    const interval = setInterval(() => {
      if (!isTransitioning) {
        handleVideoTransition()
      }
    }, 10000) // 每10秒切换一次视频

    return () => clearInterval(interval)
  }, [isLoading, isTransitioning, currentVideoReady])

  const handleVideoTransition = useCallback(() => {
    if (isTransitioning) return
    
    setIsTransitioning(true)
    
    // 计算下一个视频索引
    const newNextIndex = (currentVideoIndex + 2) % videoFiles.length
    
    // 直接切换视频，没有过渡效果
    setCurrentVideoIndex(nextVideoIndex)
    setNextVideoIndex(newNextIndex)
    setCurrentVideoReady(false)
    
    setIsTransitioning(false)
  }, [currentVideoIndex, nextVideoIndex, isTransitioning])

  const handleVideoLoad = useCallback(() => {
    setIsLoading(false)
  }, [])

  const handleCurrentVideoReady = useCallback(() => {
    setCurrentVideoReady(true)
  }, [])

  const handleVideoError = useCallback(() => {
    // 如果视频加载失败，切换到下一个
    setCurrentVideoIndex((prev) => (prev + 1) % videoFiles.length)
    setNextVideoIndex((prev) => (prev + 1) % videoFiles.length)
  }, [])

  if (isLoading) {
    return (
      <div className={cn("relative w-full h-full", className)}>
        {/* 黑色背景作为fallback */}
        <div className="absolute inset-0 bg-black" />
        
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mb-4"></div>
          <div className="text-white text-lg">正在加载视频...</div>
          <div className="w-64 bg-gray-700 rounded-full h-2 mt-4">
            <div 
              className="bg-white h-2 rounded-full transition-all duration-300"
              style={{ width: `${preloadProgress}%` }}
            ></div>
          </div>
          <div className="text-white text-sm mt-2">{Math.round(preloadProgress)}%</div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("relative w-full h-full", className)}>
      {/* 黑色背景作为fallback，防止白色屏幕 */}
      <div className="absolute inset-0 bg-black" />
      
      {/* 当前播放的视频 */}
      <video
        ref={currentVideoRef}
        key={`current-${currentVideoIndex}`}
        className="video-background absolute inset-0 w-full h-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        onLoadedData={handleVideoLoad}
        onCanPlay={handleCurrentVideoReady}
        onError={handleVideoError}
      >
        <source src={videoFiles[currentVideoIndex]} type="video/mp4" />
        您的浏览器不支持视频播放。
      </video>
      
      {/* 下一个预加载的视频（透明，用于无缝切换） */}
      <video
        ref={nextVideoRef}
        key={`next-${nextVideoIndex}`}
        className="video-background absolute inset-0 w-full h-full object-cover opacity-0"
        muted
        preload="auto"
        playsInline
      >
        <source src={videoFiles[nextVideoIndex]} type="video/mp4" />
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
              "w-2 h-2 rounded-full transition-all duration-300 cursor-pointer",
              index === currentVideoIndex
                ? "bg-white scale-125"
                : "bg-white/50 hover:bg-white/75"
            )}
            onClick={() => {
              if (!isTransitioning && index !== currentVideoIndex) {
                setCurrentVideoIndex(index)
                setNextVideoIndex((index + 1) % videoFiles.length)
                setCurrentVideoReady(false)
              }
            }}
          />
        ))}
      </div>
    </div>
  )
} 