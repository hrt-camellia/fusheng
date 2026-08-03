# 部署说明

## 建议平台

可部署到支持Next.js Route Handlers的Node.js托管平台，例如Vercel。

## 环境变量

在托管平台后台填写：

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
AMAP_WEB_SERVICE_KEY=
NEXT_PUBLIC_APP_URL=https://你的域名
```

不要上传 `.env.local`。

## Supabase回调

将Supabase中的Site URL和Redirect URLs更新为正式域名：

```text
https://你的域名
https://你的域名/**
```

## AI模式

公开演示版推荐默认使用上下文调试模式，不配置开发者公共DeepSeek Key。体验者可选择本地Ollama或填写自己的DeepSeek Key。

## 上线前检查

```bash
npm install
npm run check
npm run start
```

同时检查注册邮件、登录、退出、云端恢复、地点搜索、夜间主题和移动端布局。
