# Public 文件夹说明

## Logo 和 Favicon 文件放置

请将您的 `logo.png` 文件放置在此文件夹中。

### 文件要求：
- 文件名：`logo.png`
- 格式：PNG（推荐）或 JPG
- 尺寸：建议 32x32 像素或更大（会自动缩放）
- 背景：透明背景效果最佳

### 放置位置：
```
public/
├── images/
│   └── logo.png      ← 请将您的 logo 文件放在这里
├── favicon.ico       ← 网站图标（自动从 logo.png 生成）
├── 成品案例/
└── README.md
```

### 注意事项：
- 文件路径在代码中已经设置为 `/images/logo.png`
- 图片会自动适应导航栏的高度
- 支持透明背景的 PNG 文件效果最佳
- favicon.ico 会自动从您的 logo.png 生成，用于浏览器标签页图标 