import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '定价 - Act 2 AI视频风格迁移',
  description: '选择适合您的AI视频风格迁移积分套餐，从基础版到高级版，满足不同用户需求',
  keywords: 'AI视频风格迁移, 定价, 积分套餐, 视频特效, AI工具',
}

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
} 