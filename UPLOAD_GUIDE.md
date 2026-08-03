# 上传 GitHub 指南

## 最简单方式

1. 解压最终ZIP。
2. 在GitHub创建一个空仓库，例如 `fusheng-ai-guide`。
3. 进入仓库，选择 `Add file → Upload files`。
4. 将解压后文件夹**内部的全部文件和目录**拖入上传区，不要只上传ZIP。
5. Commit message填写：

```text
feat: release Fusheng MVP v1.0.0
```

## 推荐方式（Git）

在项目目录运行：

```bash
git init
git add .
git commit -m "feat: release Fusheng MVP v1.0.0"
git branch -M main
git remote add origin 你的仓库地址
git push -u origin main
```

## 上传前最后确认

```bash
npm install
npm run check
```

确认仓库中没有：

- `.env.local`
- 真实API Key
- `node_modules`
- `.next`
- 测试账号密码
- 真实出生资料
