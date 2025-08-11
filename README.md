# Act 2 AI - AI视频生成平台

基于Next.js和Supabase的AI视频生成平台，支持谷歌登录和积分系统。

## 功能特性

- 🔐 谷歌OAuth登录
- 💰 积分系统（1秒视频 = 10积分，新用户赠送50积分）
- 📹 AI视频生成
- 🗄️ Supabase存储桶文件管理
- 🌐 中英文双语支持
- 📱 响应式设计

## 技术栈

- **前端**: Next.js 14, React 18, TypeScript
- **认证**: NextAuth.js
- **数据库**: Supabase
- **存储**: Supabase Storage
- **样式**: Tailwind CSS
- **UI组件**: Radix UI

## 环境设置

### 1. 安装依赖

```bash
npm install
```

### 2. 环境变量配置

复制 `env.example` 文件为 `.env.local` 并填写以下配置：

```env
# Supabase配置
NEXT_PUBLIC_SUPABASE_URL=https://dtgpicaheroudwinncro.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 谷歌OAuth配置
GOOGLE_CLIENT_ID=1036841007624-ulij16rrf4gub0n2b1ct3mrdv7bapnvg.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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

# 应用配置
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key-here-change-this-in-production
```

### 3. 数据库设置

1. 在Supabase中创建数据库表（使用 `database_schema.sql`）
2. 创建存储桶 `act-ai-files`
3. 设置存储桶权限

### 4. 谷歌OAuth设置

1. 在 [Google Cloud Console](https://console.cloud.google.com/) 创建项目
2. 启用 Google+ API
3. 创建OAuth 2.0凭据
4. 添加授权重定向URI: `http://localhost:3000/api/auth/callback/google`

## 开发

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

## 项目结构

```
├── app/                    # Next.js App Router
│   ├── api/auth/          # NextAuth API路由
│   ├── login/             # 登录页面
│   ├── generator/         # 视频生成页面
│   └── ...
├── components/            # React组件
│   ├── providers/         # 上下文提供者
│   └── ui/               # UI组件
├── lib/                  # 工具库
│   ├── auth.ts           # NextAuth配置
│   ├── supabase.ts       # Supabase客户端
│   └── utils.ts          # 工具函数
├── types/                # TypeScript类型定义
└── database_schema.sql   # 数据库表结构
```

## 数据库表

- `act_users` - 用户信息
- `act_subscription_plans` - 订阅计划
- `act_payment_records` - 支付记录
- `act_user_usage` - 使用记录
- `act_video_generations` - 视频生成历史
- `act_user_files` - 用户文件

## 部署

1. 设置生产环境变量
2. 构建项目: `npm run build`
3. 启动生产服务器: `npm start`

## 许可证

MIT 