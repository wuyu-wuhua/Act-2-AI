"use client"

export function ProfessionalBackground({ className }: { className?: string }) {
  return (
    <div className={`fixed inset-0 -z-10 ${className}`}>
      {/* 专业的蓝色渐变背景 */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50" />
      
      {/* 装饰性几何形状 */}
      <div className="absolute top-32 left-20 w-48 h-48 bg-gradient-to-br from-blue-200/20 to-indigo-200/20 rounded-full blur-2xl" />
      <div className="absolute bottom-32 right-20 w-56 h-56 bg-gradient-to-br from-slate-200/15 to-blue-200/15 rounded-full blur-2xl" />
      
      {/* 微妙的线条装饰 */}
      <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-200/30 to-transparent" />
      <div className="absolute bottom-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-indigo-200/30 to-transparent" />
      
      {/* 点状纹理 */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_2px_2px,rgba(59,130,246,0.1)_1px,transparent_0)] bg-[size:30px_30px]" />
      </div>
    </div>
  )
} 