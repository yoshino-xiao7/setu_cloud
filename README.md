# 雪涼云 Console

**雪涼云 Console** 是 [雪涼云 API](https://cloud.yukiryou.icu/) 的前端控制台，基于 Aurora Glassmorphism（极光毛玻璃）设计风格打造。提供完整的用户仪表盘、API Key 管理、收藏夹系统、AI 绘画、在线音乐播放器以及管理员后台，所有页面均适配桌面端与移动端。

## 功能特性

### 公开页面

- **Landing Page** — 全屏 Hero 首页，支持 OpenGraph / Twitter Card / Schema.org 结构化数据、自动 Sitemap 生成
- **公开收藏夹** — 未登录用户可通过分享链接 `/c/:id` 浏览公开收藏夹
- **用户主页** — 公开的用户个人资料与公开收藏夹展示
- **系统状态页** — 实时展示 API 服务运行状态与性能指标（ECharts 延迟曲线）
- **404 页面** — 自定义毛玻璃风格 404 页面

### 认证系统

- **注册 / 登录** — 阿里云验证码（ESA）安全防护
- **找回密码 / 重置密码** — 邮件验证 + Token 机制
- **JWT Token** — HttpOnly Cookie 存储，自动刷新与 401 拦截
- **请求签名** — 基于 HMAC-SHA256 的前端签名机制（按需加载 `crypto-js/hmac-sha256`）
- **开放重定向防护** — 登录后重定向参数校验，防止恶意跳转

### 用户端（Dashboard）

- **仪表盘概览** — 配额使用率、今日/历史调用统计、最近调用日志表格（含分页）
- **API Key 管理** — 创建、重命名、禁用、删除、一键复制、调用次数与剩余配额可视化
- **积分系统** — 积分余额查看、积分调用图片、积分流水明细
- **收藏夹管理** — 创建多个收藏夹、设置公开/私有、封面设置、QR 二维码分享
- **收藏夹广场** — 浏览其他用户的公开收藏夹，支持点赞、收藏、热度/最新/点赞排序、关键词搜索
- **图片删除申请** — 用户提交图片删除请求，追踪审核状态
- **AI 绘画** — 中文自然语言描述、正反向提示词编辑、checkpoint/LoRA/角色预设选择、AI 历史和 AI 广场
- **个人中心** — 头像、昵称管理、密码修改
- **开发文档** — 内嵌 API 使用指南 & 接口说明
- **关于本站** — 图库收录统计、快捷入口
- **隐私政策** — 合规隐私协议页

### 音乐播放器

- **网易云音乐集成** — 搜索歌曲、热门搜索推荐、推荐歌单/新歌/每日推荐
- **多音质播放** — 支持标准 / 高品质 / 无损 / Hi-Res 音质切换
- **歌词同步** — 逐行高亮歌词与翻译歌词展示
- **MV 播放** — 内嵌 MV 详情与多分辨率播放
- **全局播放器** — 页面底部常驻迷你播放器，跨页面不中断
- **自定义歌单** — 创建、编辑、删除歌单，支持多种播放模式（顺序/随机/循环/单曲）
- **播放历史** — 自动记录播放历史，分页查看与一键清空

### 管理员后台

- **后台概览** — 全站调用统计与系统运行状态
- **用户管理** — 分页查看用户列表、多条件搜索（邮箱/角色/状态）、用户详情抽屉（含 API Key 信息）、封禁/解封/删除用户
- **IP 黑名单** — 永久封禁（批量粘贴多行 IP）/ 批量解封、临时封禁管理（查看/清除）
- **图片库管理** — 图片审核（正常/问题标记）、图片详情查看、图片删除
- **图片删除申请审核** — 查看待审核列表、审批/驳回申请、备注说明
- **AI 生成记录** — 查看所有用户 AI 生图任务、状态、错误和图片预览，并支持管理员直接删除
- **AI 审核队列** — 独立审核 AI 广场投稿，支持全年龄和 R18 分类
- **AI 删除申请** — 独立审核用户提交的 AI 生图删除请求
- **Pixiv 爬虫管理** — 按作品 ID / 作者 / 标签批量抓取、任务队列管理（进度/日志/取消）
- **网易云 Token 管理** — 添加/编辑/启用/禁用/删除 NeteaseCloud Token
- **深紫色主题** — 独立管理员路由与主题色，清晰区分用户端

### 设计与交互

- **毛玻璃风格** — 高斯模糊玻璃质感卡片与弹窗（`LiquidGlass` / `LiquidGlassFilter` 组件）
- **樱粉色主题** — 统一的 `#f586a9` 品牌色系
- **响应式布局** — 全面适配移动端，侧边栏可折叠
- **微动画** — 按钮悬浮、卡片入场、进度条渐变等流畅交互动画
- **SEO 优化** — Schema.org 结构化数据、Sitemap、robots.txt、多搜索引擎验证（Google / 百度 / 360 / 搜狗）
- **无障碍** — 键盘导航支持、`aria-label` 标注、路由切换焦点管理

## 技术栈

| 模块 | 技术选型 | 说明 |
| --- | --- | --- |
| 核心框架 | Vue 3（`<script setup>`） | Composition API |
| 构建工具 | Vite 7 | 极速冷启动与 HMR，gzip/brotli 预压缩 |
| 语言 | TypeScript | 全类型约束（`vue-tsc` 类型检查） |
| UI 组件库 | Naive UI | 高度可定制的 Vue 3 组件库 |
| 状态管理 | Pinia 3 | 轻量级状态管理 |
| 路由 | Vue Router 4 | 含动态权限路由守卫 |
| HTTP 客户端 | Axios | Token 拦截器 + 401 自动刷新 |
| 图表 | ECharts 6 + vue-echarts | 数据可视化 |
| 日期处理 | dayjs | 统一时间格式化（relativeTime 插件，zh-cn 语言包） |
| 加密 | crypto-js (hmac-sha256) | 请求签名（按需加载子模块） |
| 二维码 | qrcode | 收藏夹分享二维码 |
| 截图 | html2canvas | 页面内容截图 |
| SEO | @vueuse/head | 页面 Meta 标签管理 |
| 图标库 | @vicons/ionicons5 | Ionicons 5 图标集 |
| 风格 | CSS Variables + Scoped CSS | 手写毛玻璃效果与动画 |

## 快速开始

### 环境要求

- Node.js 24.18.0（版本由 `.nvmrc` 固定，CI 与 EdgeOne 使用相同版本）
- npm（仓库包含 `package-lock.json`）

### 1. 克隆项目

```bash
git clone https://github.com/yoshino-xiao7/setu_cloud.git
cd setu_cloud
```

### 2. 安装依赖

```bash
npm ci
```

### 3. 配置环境变量

在项目根目录新建 `.env` 文件：

```ini
# ---- 基础配置 ----
# 后端 API 地址
VITE_API_BASE_URL=http://localhost:9898

# 前端站点地址（用于 canonical、分享链接、Schema.org）
VITE_SITE_URL=http://localhost:5173

# 可选：启用前端 Mock 数据，便于无后端验收核心流程
VITE_USE_API_MOCKS=false

# ---- CDN & 资源 ----
# 图片 CDN 域名（Pixiv 代理）
VITE_IMAGE_CDN_URL=https://i.yukiryou.icu

# 随机背景图服务
VITE_BG_IMAGE_URL=https://img.yukiryou.icu/pic?img=ua

# 默认头像
VITE_DEFAULT_AVATAR_URL=https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg

# ---- 阿里云验证码 ----
# SDK 地址
VITE_CAPTCHA_SDK_SRC=https://o.alicdn.com/captcha-frontend/aliyunCaptcha/AliyunCaptcha.js

# ESA 前缀
VITE_CAPTCHA_PREFIX=esa-n7fxgvw9yk

# 场景 ID
VITE_CAPTCHA_SCENE_ID=1pnuejcr
```

所有变量均有内置默认值（定义在 `src/api/env.ts`），本地开发无需全部配置，按需覆盖即可。

### 4. 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:5173` 即可预览。

### 5. 构建生产版本

```bash
npm run build
```

构建产物输出到 `dist/` 目录，同时自动生成 Sitemap。构建过程会自动执行 `vue-tsc` 类型检查，并通过 esbuild 移除所有 `console` 与 `debugger` 语句。

### 6. 本地质量检查

```bash
npm run check
```

该命令会依次执行 lint、类型检查、生产构建和构建体积预算检查。

## 目录结构

```text
setu_cloud/
├── public/                  # 静态资源（favicon、robots.txt、sitemap.xml、og-image）
├── scripts/
│   ├── generate-sitemap.ts  #   Sitemap 自动生成脚本
│   └── check-build-budget.ts #  构建体积预算检查
├── docs/                    # 项目文档
│   ├── SIGNATURE_FRONTEND.md      # 请求签名机制说明
│   ├── FRONTEND_PIXIV_DOC.md      # Pixiv 爬虫前端文档
│   ├── SQUARE_FEATURE.md          # 收藏夹广场功能说明
│   ├── square-feature-api.md      # 收藏夹广场 API 文档
│   ├── frontend_api_doc.md        # 前端 API 接口总文档
│   ├── frontend-refactor-summary.md # 前端重构记录
│   ├── optimization-recommendations.md # 优化建议
│   ├── seo-analysis-report.md     # SEO 分析报告
│   └── backend-*-troubleshooting.md # 后端升级与排障记录
├── src/
│   ├── api/                 # API 接口封装
│   │   ├── env.ts           #   环境变量与配置常量（所有外部域名/服务地址的统一出口）
│   │   ├── http.ts          #   Axios 实例、拦截器、请求签名
│   │   ├── response.ts      #   统一响应处理工具（unwrapApiData）
│   │   ├── mock.ts          #   Mock 数据适配器（仅开发环境，动态导入不影响生产包）
│   │   ├── admin.ts         #   管理员接口
│   │   ├── aiGeneration.ts  #   AI 绘画、AI 审核、AI 删除申请
│   │   ├── apiKey.ts        #   API Key 管理
│   │   ├── auth.ts          #   认证（登录/注册/找回密码）
│   │   ├── collections.ts   #   收藏夹 & 广场
│   │   ├── dashboard.ts     #   仪表盘数据
│   │   ├── favorite.ts      #   收藏操作
│   │   ├── imageDeleteRequest.ts  # 图片删除申请
│   │   ├── music.ts         #   网易云音乐接口
│   │   ├── pixiv.ts         #   Pixiv 爬虫管理
│   │   ├── points.ts        #   积分系统
│   │   ├── setu.ts          #   图片 API 调用
│   │   └── user.ts          #   用户信息
│   ├── admin/               # 管理员页面（AdminOverview、UserManagement 等 7 个路由页面）
│   ├── components/          # 公共组件
│   │   ├── AliyunCaptcha.vue     # 阿里云验证码封装
│   │   ├── SecureCaptcha.vue     # 验证码安全包装
│   │   ├── AuthLayout.vue        # 认证页布局
│   │   ├── LiquidGlass.vue       # 毛玻璃效果组件
│   │   ├── LiquidGlassFilter.vue # 毛玻璃滤镜组件
│   │   ├── GlobalMvPlayer.vue    # 全局 MV 播放器
│   │   ├── ImageDeleteSubmitModal.vue  # 图片删除申请弹窗
│   │   ├── music/           #   音乐相关组件（LyricsPanel、MiniPlayerBar、MvPanel、QueuePanel）
│   │   └── seo/             #   SEO 组件（SchemaOrg）
│   ├── composables/         # 组合式函数
│   │   ├── useApiError.ts        # API 错误信息提取
│   │   ├── useBreakpoint.ts      # 响应式断点（含 rAF 防抖）
│   │   ├── useLocalStorageJson.ts # localStorage JSON 读写
│   │   ├── useRequestGuard.ts    # 请求竞态保护
│   │   └── useSeo.ts             # SEO Meta 标签管理
│   ├── layouts/             # 布局组件
│   │   ├── UserLayout.vue        # 用户端布局（侧边栏 + 顶栏）
│   │   └── AdminLayout.vue       # 管理端布局（深紫色主题）
│   ├── Message/             # 自定义消息提示系统（VNode 渲染）
│   ├── misc/                # 杂项页面（NotFound 404）
│   ├── router/              # 路由配置与权限守卫
│   ├── stores/              # Pinia 状态管理
│   │   ├── auth.ts               # 认证状态（用户信息、Token、签名）
│   │   └── music.ts              # 音乐播放状态（播放列表、歌词、音质）
│   ├── styles/              # 全局样式
│   │   └── liquid-glass.css      # 毛玻璃效果 CSS
│   ├── types/               # TypeScript 类型声明
│   ├── utils/               # 工具函数
│   │   └── dateFormat.ts         # dayjs 统一时间格式化
│   ├── views/
│   │   ├── auth/            # 认证页面（登录/注册/找回密码/重置密码）
│   │   ├── dashboard/       # 用户端页面（含 AI 绘图、AI 历史、AI 广场）
│   │   ├── public/          # 公开页面（LandingPage、PublicCollection、UserProfile）
│   │   └── status/          # 系统状态（SystemStatus）
│   ├── style.css            # 全局入口样式
│   ├── App.vue              # 根组件
│   └── main.ts              # 入口文件
├── index.html               # HTML 入口（含完整 SEO Meta 标签）
├── vite.config.ts           # Vite 配置（手动分包 + 预压缩）
├── tsconfig.json            # TypeScript 配置
└── package.json
```

## 构建优化

项目通过 `vite.config.ts` 进行了多项构建层面的优化：

- **手动分包** — 将 `node_modules` 拆分为 `vendor-vue`（Vue 生态核心）、`vendor-icons`（图标库）、`vendor-charts`（ECharts）、`vendor-crypto`（加密）、`vendor-qrcode`（二维码）、`vendor-html-to-image`（截图）六个独立 chunk，利用浏览器并行加载与缓存策略
- **预压缩** — 构建时通过 `vite-plugin-compression2` 生成 gzip 和 brotli 文件，供支持静态预压缩的服务器直接分发
- **Tree-shaking** — Mock 适配器使用动态 `import()` 加载，不进入生产包；crypto-js 仅导入 `hmac-sha256` 子模块
- **Console 移除** — esbuild 配置 `drop: ['console', 'debugger']`，生产包不包含调试语句

## 开发规范

- **毛玻璃风格** — 新建页面请继承 `.glass-card` 与 `.glass-table` 类，或使用 `LiquidGlass` / `LiquidGlassFilter` 组件，保持全局风格统一
- **图标** — 统一使用 `@vicons/ionicons5`
- **时间格式化** — 统一使用 `src/utils/dateFormat.ts` 中的工具函数（`formatDate`、`formatTimeOnly`、`formatRelative`、`formatDuration` 等），不要在组件内创建本地格式化函数
- **API 封装** — 所有接口请求在 `src/api/` 下定义对应 TypeScript 类型（接口/DTO），使用 `unwrapApiData` 处理响应
- **环境变量** — 新增的外部域名或服务地址统一收归到 `src/api/env.ts`，通过 `VITE_*` 变量支持外部覆盖
- **路由守卫** — 公开页设置 `meta.public: true`，管理员页设置 `meta.requiresAdmin: true`
- **SEO** — 新建公开页面使用 `useSeo()` 设置 Meta 标签，Landing Page 额外维护 Schema.org 结构化数据
- **请求竞态** — 存在多次快速请求的场景使用 `useRequestGuard()` 防止过期响应覆盖
- **消息提示** — 使用 `src/Message/` 中的 `Message.success()` / `Message.error()` 等方法

## 许可证

本项目使用 [MIT License](LICENSE)。
