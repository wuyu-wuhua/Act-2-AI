import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '在线 AI 视频特效生成器 | Act Two AI',
  description: '使用 Act Two AI (基于 act one) 模型在线生成 AI 特效视频。上传视频和参考图，一分钟内获得惊艳效果。专为特效师打造。',
  keywords: 'AI 视频生成器, act one 工具, 在线视频特效, 图像转视频, 视频风格化, 特效制作, 免费 AI 视频, 视频 AI 工具',
}

export default function GeneratorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
} 