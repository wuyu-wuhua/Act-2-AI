"use client"

export function CleanBackground({ className }: { className?: string }) {
  return (
    <div className={`fixed inset-0 -z-10 ${className}`}>
      {/* 简洁的渐变背景 */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-100" />
      
      {/* 微妙的纹理 */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.05)_1px,transparent_0)] bg-[size:20px_20px]" />
      </div>
      
      {/* 顶部装饰 */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-blue-50/50 to-transparent" />
      
      {/* 底部装饰 */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-gray-50/50 to-transparent" />
    </div>
  )
} 