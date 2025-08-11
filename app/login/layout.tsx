import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '登录 - Act 2 AI视频风格迁移',
  description: '使用Google账户登录Act 2 AI，开始您的AI视频风格迁移之旅',
  keywords: '登录, Google登录, AI视频风格迁移, 用户认证',
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
} 