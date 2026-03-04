# 🏮 拾遗 · Shiyi Notes

一款基于 Cloudflare Workers + KV 驱动的轻量化个人笔记系统。追求宣纸感的极致阅读体验与沉浸式创作。

## ✨ 特性
- **文人美学**：藏青、暖米、纯白三色布局，模拟传统宣纸质感。
- **高效创作**：支持 Markdown 预览、Ctrl+S 快捷存档、实时字数统计。
- **动态交互**：阅读页标题自动吸附，带毛玻璃模糊效果。
- **安全可靠**：密码环境变量加密，Serverless 架构，全球加速。

## 🚀 快速部署
1. **创建 KV**：在 Cloudflare 创建名为 `JIANDAN_NOTES` 的 Namespace。
2. **设置变量**：在 Worker 设置中添加 `PASSWORD` 加密变量作为你的登录密码。
3. **上传代码**：将 `index.js` 内容粘贴至 Worker 即可。

## 🛠️ 技术栈
- Cloudflare Workers (JavaScript ES Modules)
- Cloudflare KV (存储)
- Marked.js (Markdown 解析)
