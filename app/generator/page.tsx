"use client"

import { useState, useRef, useEffect } from 'react'
import { Navigation } from "@/components/navigation"
import { LightTechBackground } from "@/components/light-tech-background"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface UploadState {
  file: File | null
  preview: string | null
  uploading: boolean
  uploaded: boolean
  error: string | null
}

interface GenerationState {
  generating: boolean
  completed: boolean
  result: string | null
  error: string | null
}

export default function GeneratorPage() {
  const [lang, setLang] = useState<"zh" | "en">("zh")
  const [step, setStep] = useState(1)
  const [imageUpload, setImageUpload] = useState<UploadState>({
    file: null,
    preview: null,
    uploading: false,
    uploaded: false,
    error: null
  })
  const [videoUpload, setVideoUpload] = useState<UploadState>({
    file: null,
    preview: null,
    uploading: false,
    uploaded: false,
    error: null
  })
  const [generation, setGeneration] = useState<GenerationState>({
    generating: false,
    completed: false,
    result: null,
    error: null
  })

  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

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

  const content = {
    zh: {
      title: "AI 视频特效生成器",
      subtitle: "基于 act one 模型的智能视频风格迁移",
      description: "上传您的参考图像和视频，AI 将自动学习风格并生成惊艳的特效视频",
      steps: {
        step1: "选择风格",
        step2: "上传视频", 
        step3: "生成特效"
      },
      imageUpload: {
        title: "选择风格参考",
        desc: "上传一张图片作为 AI 特效的风格参考。AI 将尝试学习其风格并应用于您的视频。支持 JPG 和 PNG 格式，文件大小最大不超过 5MB。",
        dragText: "拖拽风格图片到此处",
        clickText: "或点击下方按钮选择文件",
        selectButton: "选择图片文件",
        uploading: "上传中...",
        reupload: "重新上传",
        nextStep: "下一步",
        fileSizeError: "文件大小不能超过5MB",
        fileTypeError: "请上传图片文件"
      },
      videoUpload: {
        title: "上传视频素材",
        desc: "请上传您希望进行 AI 特效处理的视频文件。支持 MP4 和 MOV 格式，文件大小最大不超过 500MB。",
        dragText: "拖拽视频文件到此处",
        clickText: "或点击下方按钮选择文件",
        selectButton: "选择视频文件",
        uploading: "上传中...",
        reupload: "重新上传",
        prevStep: "上一步",
        nextStep: "下一步",
        generateButton: "开始生成特效视频",
        fileSizeError: "文件大小不能超过500MB",
        fileTypeError: "请上传视频文件"
      },
      generation: {
        title: "AI 特效生成",
        desc: "AI 正在分析您的风格参考和视频，生成独特的特效视频",
        generating: "AI 正在生成中...",
        waiting: "请耐心等待，预计在 10分钟内完成。您的视频最长可生成 30 秒。",
        download: "下载视频",
        regenerate: "重新生成",
        prevStep: "上一步",
        readyTitle: "准备开始生成",
        readyDesc: "已准备好开始生成AI特效视频，点击下方按钮开始处理",
        failed: "生成失败",
        failedDesc: "抱歉，生成失败了。请检查您的输入、文件内容或稍后重试。",
        retry: "重试"
      }
    },
    en: {
      title: "AI Video Effects Generator",
      subtitle: "Intelligent Video Style Transfer Based on act one Model",
      description: "Upload your reference image and video, AI will automatically learn the style and generate stunning effects videos",
      steps: {
        step1: "Choose Style",
        step2: "Upload Video",
        step3: "Generate Effects"
      },
      imageUpload: {
        title: "Choose Style Reference",
        desc: "Upload an image as a style reference for AI effects. AI will try to learn its style and apply it to your video. Supports JPG and PNG formats, maximum file size 5MB.",
        dragText: "Drag style image here",
        clickText: "Or click the button below to select file",
        selectButton: "Select Image File",
        uploading: "Uploading...",
        reupload: "Re-upload",
        nextStep: "Next Step",
        fileSizeError: "File size cannot exceed 5MB",
        fileTypeError: "Please upload an image file"
      },
      videoUpload: {
        title: "Upload Video Material",
        desc: "Please upload the video file you want to process with AI effects. Supports MP4 and MOV formats, maximum file size 500MB.",
        dragText: "Drag video file here",
        clickText: "Or click the button below to select file",
        selectButton: "Select Video File",
        uploading: "Uploading...",
        reupload: "Re-upload",
        prevStep: "Previous Step",
        nextStep: "Next Step",
        generateButton: "Start Generating Effects Video",
        fileSizeError: "File size cannot exceed 500MB",
        fileTypeError: "Please upload a video file"
      },
      generation: {
        title: "AI Effects Generation",
        desc: "AI is analyzing your style reference and video to generate unique effects video",
        generating: "AI is generating...",
        waiting: "Please wait patiently, expected to complete within 10 minutes. Your video can be up to 30 seconds long.",
        download: "Download Video",
        regenerate: "Regenerate",
        prevStep: "Previous Step",
        readyTitle: "Ready to Generate",
        readyDesc: "Ready to start generating AI effects video, click the button below to begin processing",
        failed: "Generation Failed",
        failedDesc: "Sorry, generation failed. Please check your input, file content, or try again later.",
        retry: "Retry"
      }
    }
  }

  const currentContent = content[lang]

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setImageUpload(prev => ({ ...prev, error: currentContent.imageUpload.fileSizeError }))
      return
    }

    if (!file.type.startsWith('image/')) {
      setImageUpload(prev => ({ ...prev, error: currentContent.imageUpload.fileTypeError }))
      return
    }

    setImageUpload(prev => ({ ...prev, uploading: true, error: null }))

    // 模拟上传过程
    setTimeout(() => {
      const preview = URL.createObjectURL(file)
      setImageUpload(prev => ({
        ...prev,
        file,
        preview,
        uploading: false,
        uploaded: true
      }))
    }, 1500)
  }

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 500 * 1024 * 1024) {
      setVideoUpload(prev => ({ ...prev, error: currentContent.videoUpload.fileSizeError }))
      return
    }

    if (!file.type.startsWith('video/')) {
      setVideoUpload(prev => ({ ...prev, error: currentContent.videoUpload.fileTypeError }))
      return
    }

    setVideoUpload(prev => ({ ...prev, uploading: true, error: null }))

    // 模拟上传过程
    setTimeout(() => {
      const preview = URL.createObjectURL(file)
      setVideoUpload(prev => ({
        ...prev,
        file,
        preview,
        uploading: false,
        uploaded: true
      }))
    }, 2000)
  }

  const handleGenerate = () => {
    setGeneration(prev => ({ ...prev, generating: true, error: null }))
    
    // 模拟生成过程
    setTimeout(() => {
      setGeneration(prev => ({
        ...prev,
        generating: false,
        completed: true,
        result: "/成品案例/视频1.mp4"
      }))
    }, 10000)
  }

  return (
    <main className="relative min-h-screen">
      <LightTechBackground />
      <Navigation lang={lang} onLangChange={handleLangChange} />
      
      <div className="relative z-10 pt-20 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          {/* 页面标题 */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 tracking-tight">
              {currentContent.title}
            </h1>
            <h2 className="text-xl md:text-2xl text-gray-600 mb-6 font-medium">
              {currentContent.subtitle}
            </h2>
            <p className="text-base text-gray-500 max-w-2xl mx-auto leading-relaxed">
              {currentContent.description}
            </p>
          </div>

          {/* 步骤指示器 */}
          <div className="flex justify-center mb-16">
            <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center space-x-6">
                {[1, 2, 3].map((stepNumber) => (
                  <div key={stepNumber} className="flex items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                      step >= stepNumber 
                        ? 'bg-gray-900 text-white' 
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      {stepNumber}
                    </div>
                    {stepNumber < 3 && (
                      <div className={`w-16 h-0.5 mx-3 transition-all duration-300 ${
                        step > stepNumber ? 'bg-gray-900' : 'bg-gray-200'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-3 text-xs text-gray-500 font-medium">
                <span>{currentContent.steps.step1}</span>
                <span>{currentContent.steps.step2}</span>
                <span>{currentContent.steps.step3}</span>
              </div>
            </div>
          </div>

          {/* 动态步骤内容 */}
          <div className="min-h-[600px]">
            {/* 步骤1：上传参考图 */}
            {step === 1 && (
              <Card className="bg-white/95 backdrop-blur-sm border border-gray-200 shadow-sm">
                <CardHeader className="pb-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <CardTitle className="text-2xl text-gray-900 font-semibold mb-2">{currentContent.imageUpload.title}</CardTitle>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        {currentContent.imageUpload.desc}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {!imageUpload.uploaded ? (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-gray-400 transition-all duration-300 bg-gray-50">
                        <input
                          ref={imageInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        <div className="space-y-4">
                          <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">{currentContent.imageUpload.dragText}</h3>
                          <p className="text-gray-500 text-sm mb-6">{currentContent.imageUpload.clickText}</p>
                          <Button 
                            onClick={() => imageInputRef.current?.click()}
                            disabled={imageUpload.uploading}
                            className="bg-gray-900 text-white hover:bg-gray-800 px-6 py-2.5 text-sm font-medium rounded-md"
                          >
                            {imageUpload.uploading ? (
                              <div className="flex items-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                {currentContent.imageUpload.uploading}
                              </div>
                            ) : (
                              currentContent.imageUpload.selectButton
                            )}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="aspect-square max-w-xs mx-auto bg-gray-100 rounded-lg overflow-hidden">
                          <img 
                            src={imageUpload.preview!} 
                            alt="参考图"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">
                            {imageUpload.file?.name} ({(imageUpload.file?.size! / 1024 / 1024).toFixed(1)}MB)
                          </span>
                          <Button 
                            variant="outline" 
                            onClick={() => setImageUpload({
                              file: null,
                              preview: null,
                              uploading: false,
                              uploaded: false,
                              error: null
                            })}
                            className="border-gray-300 text-gray-700 hover:bg-gray-50 text-sm"
                          >
                            {currentContent.imageUpload.reupload}
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {imageUpload.error && (
                      <div className="text-red-600 text-sm mt-2">{imageUpload.error}</div>
                    )}
                    
                    {imageUpload.uploaded && (
                      <Button 
                        onClick={() => setStep(2)}
                        className="w-full bg-gray-900 text-white hover:bg-gray-800 py-3 text-sm font-medium rounded-md"
                      >
                        {currentContent.imageUpload.nextStep}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 步骤2：上传视频 */}
            {step === 2 && (
              <Card className="bg-white/95 backdrop-blur-sm border border-gray-200 shadow-sm">
                <CardHeader className="pb-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <CardTitle className="text-2xl text-gray-900 font-semibold mb-2">{currentContent.videoUpload.title}</CardTitle>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        {currentContent.videoUpload.desc}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {!videoUpload.uploaded ? (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-gray-400 transition-all duration-300 bg-gray-50">
                        <input
                          ref={videoInputRef}
                          type="file"
                          accept="video/*"
                          onChange={handleVideoUpload}
                          className="hidden"
                        />
                        <div className="space-y-4">
                          <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">{currentContent.videoUpload.dragText}</h3>
                          <p className="text-gray-500 text-sm mb-6">{currentContent.videoUpload.clickText}</p>
                          <Button 
                            onClick={() => videoInputRef.current?.click()}
                            disabled={videoUpload.uploading}
                            className="bg-gray-900 text-white hover:bg-gray-800 px-6 py-2.5 text-sm font-medium rounded-md"
                          >
                            {videoUpload.uploading ? (
                              <div className="flex items-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                {currentContent.videoUpload.uploading}
                              </div>
                            ) : (
                              currentContent.videoUpload.selectButton
                            )}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                          <video 
                            src={videoUpload.preview!} 
                            className="w-full h-full object-cover"
                            controls
                          />
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">
                            {videoUpload.file?.name} ({(videoUpload.file?.size! / 1024 / 1024).toFixed(1)}MB)
                          </span>
                          <Button 
                            variant="outline" 
                            onClick={() => setVideoUpload({
                              file: null,
                              preview: null,
                              uploading: false,
                              uploaded: false,
                              error: null
                            })}
                            className="border-gray-300 text-gray-700 hover:bg-gray-50 text-sm"
                          >
                            {currentContent.videoUpload.reupload}
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {videoUpload.error && (
                      <div className="text-red-600 text-sm mt-2">{videoUpload.error}</div>
                    )}
                    
                    <div className="flex gap-4">
                      <Button 
                        variant="outline"
                        onClick={() => setStep(1)}
                        className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 py-3 text-sm font-medium rounded-md"
                      >
                        {currentContent.videoUpload.prevStep}
                      </Button>
                      <Button 
                        onClick={() => setStep(3)}
                        disabled={!videoUpload.uploaded}
                        className="flex-1 bg-gray-900 text-white hover:bg-gray-800 py-3 text-sm font-medium rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {currentContent.videoUpload.nextStep}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 步骤3：生成结果 */}
            {step === 3 && (
              <Card className="bg-white/95 backdrop-blur-sm border border-gray-200 shadow-sm">
                <CardHeader className="pb-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <CardTitle className="text-2xl text-gray-900 font-semibold mb-2">{currentContent.generation.title}</CardTitle>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        {currentContent.generation.desc}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {!generation.generating && !generation.completed && !generation.error && (
                      <div className="text-center py-16">
                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-4">{currentContent.generation.readyTitle}</h3>
                        <p className="text-gray-600 text-sm mb-8 leading-relaxed">
                          {currentContent.generation.readyDesc}
                        </p>
                        <div className="flex gap-4 justify-center">
                          <Button 
                            variant="outline"
                            onClick={() => setStep(2)}
                            className="border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-2.5 text-sm font-medium rounded-md"
                          >
                            {currentContent.generation.prevStep}
                          </Button>
                          <Button 
                            onClick={handleGenerate}
                            className="bg-gray-900 text-white hover:bg-gray-800 px-6 py-2.5 text-sm font-medium rounded-md"
                          >
                            {currentContent.videoUpload.generateButton}
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {generation.generating && (
                      <div className="text-center py-16">
                        <div className="relative mb-8">
                          <div className="animate-spin rounded-full h-24 w-24 border-4 border-gray-200 border-t-gray-900 mx-auto"></div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </div>
                        </div>
                        <h3 className="text-2xl font-semibold mb-4 text-gray-900">
                          {currentContent.generation.generating}
                        </h3>
                        <p className="text-gray-600 text-sm max-w-md mx-auto leading-relaxed">
                          {currentContent.generation.waiting}
                        </p>
                        <div className="mt-8 flex justify-center space-x-1">
                          <div className="w-2 h-2 bg-gray-900 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-900 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2 h-2 bg-gray-900 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                      </div>
                    )}
                    
                    {generation.completed && generation.result && (
                      <div className="space-y-6">
                        <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                          <video 
                            src={generation.result} 
                            className="w-full h-full object-cover"
                            controls
                            autoPlay
                          />
                        </div>
                        <div className="flex gap-4">
                          <Button className="flex-1 bg-gray-900 text-white hover:bg-gray-800 py-3 text-sm font-medium rounded-md">
                            {currentContent.generation.download}
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setStep(1)
                              setImageUpload({
                                file: null,
                                preview: null,
                                uploading: false,
                                uploaded: false,
                                error: null
                              })
                              setVideoUpload({
                                file: null,
                                preview: null,
                                uploading: false,
                                uploaded: false,
                                error: null
                              })
                              setGeneration({
                                generating: false,
                                completed: false,
                                result: null,
                                error: null
                              })
                            }}
                            className="border-gray-300 text-gray-700 hover:bg-gray-50 py-3 text-sm font-medium rounded-md"
                          >
                            {currentContent.generation.regenerate}
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {generation.error && (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">{currentContent.generation.failed}</h3>
                        <p className="text-gray-600 text-sm mb-6 leading-relaxed">
                          {currentContent.generation.failedDesc}
                        </p>
                        <div className="flex gap-4 justify-center">
                          <Button 
                            variant="outline"
                            onClick={() => setStep(2)}
                            className="border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-2.5 text-sm font-medium rounded-md"
                          >
                            {currentContent.generation.prevStep}
                          </Button>
                          <Button 
                            onClick={handleGenerate}
                            className="bg-gray-900 text-white hover:bg-gray-800 px-6 py-2.5 text-sm font-medium rounded-md"
                          >
                            {currentContent.generation.retry}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </main>
  )
} 