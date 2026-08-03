# 系统架构

## 总体数据流

```text
出生信息
→ 高德地点服务解析经纬度与时区
→ OpenFate 确定性排盘
→ 命盘本地保存 / Supabase 云端同步
→ 每日命理规则引擎
→ 问浮生上下文编排
→ 上下文调试 / Ollama / DeepSeek BYOK
```

## 前端与服务端边界

- 浏览器负责表单、交互、本地草稿、主题和用户 BYOK Key 的会话级保存。
- Next.js Route Handlers 负责高德代理、排盘、每日命理和模型请求转发。
- Supabase负责认证、数据库和RLS权限。
- 服务器不保存用户的 DeepSeek BYOK Key。

## 上下文结构

```text
固定安全规则
→ 当前确认命盘
→ 当前会话长期摘要
→ 当前会话最近 8 条消息
→ 本轮问题
```

第 9 条有效消息开始，最早消息会被规则化压缩到长期摘要。每个会话使用独立线程 ID，避免串线。

## 数据存储

- 未登录：`localStorage` / `sessionStorage`
- 已登录：Supabase PostgreSQL
- 业务表：`profiles`、`bazi_records`、`chat_threads`、`chat_messages`、`bracelet_designs`
