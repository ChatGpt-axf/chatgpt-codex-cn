# Google 与 Bing SEO 规则

Google 和 Bing 共用可抓取静态 HTML、canonical、语义结构、内部链接和标准 Sitemap 基础，但主动通知能力不同。任何提交都不保证抓取、收录、排名或 AI 引用。

## 共同基础

- 每个可索引页面只有一个绝对自 canonical、一个清晰 H1、唯一 Title 与准确 Description。
- 使用语义化 HTML、可抓取链接和与可见正文一致的 JSON-LD。FAQPage 只用于实际显示 FAQ 的页面。
- Open Graph、文章日期、作者、来源与实体名称必须来自真实页面和站点配置。
- Sitemap 排除 draft、noindex、redirect 和空集合，所有 URL 使用准确 `lastmod`。
- 永久迁移使用直接 301，避免链式跳转、循环和无关首页重定向；重定向源不进入 Sitemap。
- 多语言扩展时为独立语言 URL 预留双向 `hreflang` 与 `x-default`，不能只翻译元标签。
- 维持静态渲染、有限脚本、稳定尺寸和压缩媒体，为 LCP、INP、CLS 留出良好架构基础；生产环境仍需真实用户数据验证。

## Google

- 通过 Google Search Console 完成站点验证并提交 `/sitemap-index.xml` 或 `/sitemap.xml`。
- `Googlebot` 必须能抓取公开正文、canonical、robots meta 和结构化数据。
- 普通内容页不使用 IndexNow。Google Indexing API 不能当作普通网页批量提交接口；它只适用于官方文档限定的页面类型。
- Google AI Overviews / AI Mode 继承 Google Search 的抓取和索引基础，本项目不提供独立“保证进入 AI 答案”的提交方式。

## Bing

- 通过 Bing Webmaster Tools 完成站点验证并提交 Sitemap。
- `Bingbot` 必须能抓取公开正文与内部链接。
- 新增、更新和删除 URL 可通过 IndexNow 通知。Key 从 `.env` 读取；默认 Key 文件为 `/<INDEXNOW_KEY>.txt`，自定义 `INDEXNOW_KEY_LOCATION` 时必须自行确保该地址公开可访问。
- Bing Copilot 依赖 Bing 的开放 Web 搜索与索引基础；IndexNow 只是变更通知，不代表已经进入索引或答案。

官方参考：[Google Sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)、[Google Indexing API 使用范围](https://developers.google.com/search/apis/indexing-api/v3/using-api)、[Bing Webmaster Tools](https://www.bing.com/webmasters/)、[IndexNow 协议](https://www.indexnow.org/documentation)。
