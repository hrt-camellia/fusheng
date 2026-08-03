# 浮生｜AI 命理与情绪陪伴产品 MVP

「浮生」是一款面向迷茫年轻人的响应式 AI 命理与情绪陪伴产品原型。项目以确定性八字排盘为基础，将命盘计算、每日命理推演、上下文记忆、云端同步和水晶手串 DIY 组合成完整产品流程。

> 本项目中的命理、水晶和每日推演内容仅用于文化娱乐、自我反思与生活灵感，不构成医疗、法律、投资或重大人生决策建议。

## 核心能力

- **真实账号体系**：Supabase 邮箱注册、邮箱确认、密码登录、退出、密码重置和 Cookie 会话保持。
- **出生地点与排盘**：高德行政区/地址搜索自动取得经纬度与时区，支持真太阳时和两种换日规则。
- **确定性计算与 AI 解读分离**：四柱由 `@openfate/bazi-engine` 计算，模型只能解释已确认命盘，不能重新排盘。
- **每日命理推演**：依据个人日主、当日干支与五行关系生成固定的幸运色、数字、配饰、食物、花和时段。
- **多会话上下文**：固定命盘、长期摘要、最近 8 条消息和本轮问题组成三层上下文；第 9 条有效消息开始自动归入摘要。
- **上下文调试模式**：无需模型和 Token，直接查看实际命盘、摘要、近期消息和会话隔离状态。
- **可插拔模型**：支持本机 Ollama，以及用户自带 DeepSeek API Key（BYOK）；仓库不包含开发者公共模型 Key。
- **水晶手串 DIY**：6/8/10/12 mm 混合珠径、自动补齐、白水晶可见性增强、保存、恢复、删除和 SVG 导出。
- **云端迁移与同步**：命盘、聊天线程、消息、长期摘要和手串方案可从本机迁移到 Supabase，并在其他设备恢复。
- **昼夜疗愈主题**：白天为浅紫暖白界面，日落后可自动切换星河夜间主题，也支持手动固定主题。

## 技术栈

- Next.js 15 / React 19 / TypeScript
- Tailwind CSS / Framer Motion / Lucide React
- Supabase Auth + PostgreSQL + Row Level Security
- `@openfate/bazi-engine`
- 高德 Web 服务（出生地点解析）
- Ollama / DeepSeek BYOK

## 本地启动

### 1. 环境要求

- Node.js 20+
- npm 10+
- 一个 Supabase 项目
- 一个高德 Web 服务 Key

Ollama 与 DeepSeek API Key 均为可选项；默认可使用“上下文调试模式”。

### 2. 安装

```bash
npm install
```

Windows PowerShell：

```powershell
Copy-Item .env.example .env.local
```

macOS / Linux：

```bash
cp .env.example .env.local
```

### 3. 配置环境变量

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
AMAP_WEB_SERVICE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

说明：

- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 可以用于浏览器，数据安全依赖数据库 RLS。
- 不要在项目中加入 Supabase Secret Key 或 Service Role Key。
- `AMAP_WEB_SERVICE_KEY` 只在服务端 Route Handler 中读取，不能添加 `NEXT_PUBLIC_` 前缀。
- DeepSeek BYOK Key 由用户在页面中填写，仅保存在当前浏览器的 `sessionStorage`，不会写入数据库或源码。

### 4. 初始化 Supabase

在 Supabase SQL Editor 中执行：

```text
supabase/setup.sql
```

然后在 Supabase 控制台配置：

```text
Authentication → URL Configuration
Site URL: http://localhost:3000
Redirect URLs: http://localhost:3000/**
```

生产部署时替换为正式域名。

### 5. 启动

```bash
npm run dev
```

打开：

```text
http://localhost:3000
```

## AI 模式

### 上下文调试（默认）

不调用任何模型、不消耗 Token。用于验证：

- 当前确认命盘是否注入；
- 多个会话是否隔离；
- 最近消息窗口是否保持 8 条；
- 更早消息是否进入长期摘要；
- 云端恢复后上下文是否一致。

### Ollama

本地运行，不产生云端 Token 费用。示例：

```bash
ollama list
ollama pull qwen3:4b
```

在产品的“AI 设置”中填写本机模型名称。

### DeepSeek BYOK

用户自行在 DeepSeek 开放平台创建 API Key，并在“AI 设置”中临时填写。费用由该 Key 所属账户承担，项目维护者不提供公共开发者额度。

## 数据与隐私

- 未登录数据优先保存在浏览器本机。
- 登录后可主动同步到 Supabase。
- 所有业务表均使用 `user_id` 和 RLS 隔离。
- 命盘包含出生时间和地点，属于敏感个人信息；公开演示时不要使用真实隐私数据。
- 仓库不得提交 `.env.local`、API Key、测试账号密码或真实出生资料。
## 产品界面

### 首页与昼夜主题

白天主题：

![浮生白天首页](docs/screenshots/01-home-day.png)

夜间星河主题：

![浮生夜间首页](docs/screenshots/01-home-night.png)

### 八字命盘

支持出生地点逐级选择、经纬度解析、真太阳时校正与命盘生成。

![八字命盘](docs/screenshots/02-bazi.png)

### AI 上下文记忆

采用“固定命盘、长期摘要、近期消息”三层上下文结构，并提供可视化调试报告。

![AI上下文调试](docs/screenshots/03-chat-context.png)

### 每日运势

结合用户命盘与当前日期生成确定性的每日运势信息。

![每日运势](docs/screenshots/04-fortune.png)

### 水晶手串设计

支持珠径选择、混合水晶搭配、尺寸计算、自动补齐与方案保存。

![水晶手串设计](docs/screenshots/05-bracelet.png)

### 登录与云端同步

基于 Supabase Auth、PostgreSQL 与 RLS，实现账号登录、数据迁移和跨设备恢复。

![云端数据同步](docs/screenshots/06-cloud-sync.png)
## 质量检查

安装依赖后运行：

```bash
npm run check:secrets
npm run check:syntax
npm run check:imports
npm run test:pure
npm run typecheck
npm run lint
npm run build
```

或一次运行：

```bash
npm run check
```

八字公开样例校验：

```bash
npm run verify:bazi
```

## 目录结构

```text
src/
├── app/                    # 页面、Route Handlers、认证回调
├── components/             # UI、排盘、聊天、手串、主题组件
├── data/                   # 水晶素材数据
├── lib/                    # 排盘、命理、上下文、同步和安全工具
└── types/                  # TypeScript 类型
supabase/
├── setup.sql               # 新项目完整初始化脚本
└── migrations/             # 迭代迁移记录
scripts/                    # 语法、密钥、导入和排盘检查
```

## 公开部署建议

- 默认保持“上下文调试模式”，不配置平台公共 DeepSeek Key。
- 高德请求已经加入基础频率限制和短时缓存；正式高流量部署仍建议使用 Redis/Upstash 等共享限流服务。
- 在托管平台的 Environment Variables 中配置 Supabase 与高德参数，不上传 `.env.local`。
- 配置高德控制台可用的 IP 白名单、调用监控和告警。
- 部署前执行 `npm run check`。

更多说明见：

- [`docs/architecture.md`](docs/architecture.md)
- [`docs/security.md`](docs/security.md)
- [`docs/deployment.md`](docs/deployment.md)
- [`docs/demo-checklist.md`](docs/demo-checklist.md)

## 许可证

项目代码采用 MIT License。第三方依赖与参考项目说明见 [`NOTICE.md`](NOTICE.md)。
