"use client"

import { useEffect, useState } from "react"

interface GradientBackgroundProps {
  className?: string
}

export function GradientBackground({ className }: GradientBackgroundProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <div className={`fixed inset-0 -z-10 ${className}`}>
      {/* 动态渐变背景 */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900"
        style={{
          background: `
            radial-gradient(circle at ${mousePosition.x * 100}% ${mousePosition.y * 100}%, 
              rgba(147, 51, 234, 0.3) 0%, 
              rgba(59, 130, 246, 0.2) 25%, 
              rgba(99, 102, 241, 0.1) 50%, 
              transparent 100%
            ),
            linear-gradient(135deg, 
              rgba(147, 51, 234, 0.8) 0%, 
              rgba(59, 130, 246, 0.6) 50%, 
              rgba(99, 102, 241, 0.8) 100%
            )
          `
        }}
      />
      
      {/* 动态粒子效果 */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`
            }}
          />
        ))}
      </div>
      
      {/* 网格效果 */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>
    </div>
  )
} 