# 安全与密钥处理

## 可公开配置

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Supabase Publishable Key本身允许用于客户端，真正的数据隔离依赖RLS。

## 私密配置

- `AMAP_WEB_SERVICE_KEY`
- 用户自己的 DeepSeek API Key
- 任何 Supabase Secret / Service Role Key

高德Key只在服务端读取。DeepSeek BYOK Key只保存在当前浏览器会话，并通过请求头临时发送到同源Route Handler。

## 仓库禁止提交

- `.env.local`
- API Key或JWT
- 测试账号密码
- 真实出生信息
- `node_modules`与`.next`

提交前运行：

```bash
npm run check:secrets
```

## 生产部署补充

项目内置的地点限流为单实例内存限流，适合作品演示和低流量场景。多实例或高流量部署应改为共享限流存储，并为高德Key配置白名单和用量告警。
