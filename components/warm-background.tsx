"use client"

export function WarmBackground({ className }: { className?: string }) {
  return (
    <div className={`fixed inset-0 -z-10 ${className}`}>
      {/* 温暖的渐变背景 */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50" />
      
      {/* 装饰性圆形 */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-gradient-to-br from-orange-200/30 to-yellow-200/30 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-gradient-to-br from-amber-200/20 to-orange-200/20 rounded-full blur-3xl" />
      
      {/* 微妙的网格 */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>
    </div>
  )
} 