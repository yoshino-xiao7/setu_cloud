# 雪涼云 Console

**雪涼云 Console** 是 [雪涼云 API](https://cloud.yukiryou.icu/) 的前端控制台，基于 **Aurora Glassmorphism（极光毛玻璃）** 设计风格打造。  
提供完整的用户仪表盘、API Key 管理、收藏夹系统、在线音乐播放器以及管理员后台，所有页面均适配桌面端与移动端。

## ✨ 功能特性

### 🏠 公开页面

- **SEO Landing Page** — 全屏 Hero 首页，支持 OpenGraph / Twitter Card / Schema.org 结构化数据、自动 Sitemap 生成  
- **公开收藏夹** — 未登录用户可通过分享链接 `/c/:id` 浏览公开收藏夹  
- **用户主页** — 公开的用户个人资料与公开收藏夹展示  
- **系统状态页** — 实时展示 API 服务运行状态与性能指标  
- **404 页面** — 自定义毛玻璃风格 404 页面  

### 🔐 认证系统

- **注册 / 登录** — 阿里云验证码（ESA）安全防护  
- **找回密码 / 重置密码** — 邮件验证 + Token 机制  
- **JWT Token** — HttpOnly Cookie 存储，自动刷新与 401 拦截  
- **请求签名** — 基于 CryptoJS 的前端签名机制  

### 👤 用户端（Dashboard）

- **仪表盘概览** — 配额使用率、今日/历史调用统计、最近调用日志表格（含分页）  
- **API Key 管理** — 创建、重命名、禁用、删除、一键复制、调用次数与剩余配额可视化  
- **积分系统** — 积分余额查看、积分调用图片、积分流水明细  
- **收藏夹管理** — 创建多个收藏夹、设置公开/私有、封面设置、QR 二维码分享  
- **收藏夹广场** — 浏览其他用户的公开收藏夹，支持点赞、收藏、热度/最新/点赞排序、关键词搜索  
- **图片删除申请** — 用户提交图片删除请求，追踪审核状态  
- **个人中心** — 头像、昵称管理、密码修改  
- **开发文档** — 内嵌 API 使用指南 & 接口说明  
- **关于本站** — 图库收录统计、快捷入口、看板娘介绍  
- **隐私政策** — 合规隐私协议页  

### 🎵 音乐播放器

- **网易云音乐集成** — 搜索歌曲、热门搜索推荐、推荐歌单/新歌/每日推荐  
- **多音质播放** — 支持标准 / 高品质 / 无损 / Hi-Res 音质切换  
- **歌词同步** — 逐行高亮歌词与翻译歌词展示  
- **MV 播放** — 内嵌 MV 详情与多分辨率播放  
- **全局播放器** — 页面底部常驻迷你播放器，跨页面不中断  
- **自定义歌单** — 创建、编辑、删除歌单，支持多种播放模式（顺序/随机/循环/单曲）  
- **播放历史** — 自动记录播放历史，分页查看与一键清空  

### 🛡️ 管理员后台

- **后台概览** — 全站调用统计与系统运行状态  
- **用户管理** — 分页查看用户列表、多条件搜索（邮箱/角色/状态）、用户详情抽屉（含 API Key 信息）、封禁/解封/删除用户  
- **IP 黑名单** — 永久封禁（批量粘贴多行 IP）/ 批量解封、临时封禁管理（查看/清除）  
- **图片库管理** — 图片审核（正常/问题标记）、图片详情查看、图片删除  
- **图片删除申请审核** — 查看待审核列表、审批/驳回申请、备注说明  
- **Pixiv 爬虫管理** — 按作品 ID / 作者 / 标签批量抓取、任务队列管理（进度/日志/取消）  
- **网易云 Token 管理** — 添加/编辑/启用/禁用/删除 NeteaseCloud Token  
- **深紫色主题** — 独立管理员路由与主题色，清晰区分用户端  

### 🎨 设计与交互

- **毛玻璃风格** — 高斯模糊玻璃质感卡片与弹窗  
- **樱粉色主题** — 统一的 `#f586a9` 品牌色系  
- **响应式布局** — 全面适配移动端，侧边栏可折叠  
- **微动画** — 按钮悬浮、卡片入场、进度条渐变等流畅交互动画  
- **SEO 优化** — Schema.org 结构化数据、Sitemap、robots.txt、多搜索引擎验证  

## 🛠️ 技术栈

| 模块 | 技术选型 | 说明 |
| --- | --- | --- |
| 核心框架 | Vue 3（`<script setup>`） | Composition API |
| 构建工具 | Vite 7 | 极速冷启动与 HMR |
| 语言 | TypeScript | 全类型约束 |
| UI 组件库 | Naive UI | 高度可定制的 Vue 3 组件库 |
| 状态管理 | Pinia 3 | 轻量级状态管理 |
| 路由 | Vue Router 4 | 含动态权限路由守卫 |
| HTTP 客户端 | Axios | Token 拦截器 + 401 自动刷新 |
| 图表 | ECharts 6 + vue-echarts | 数据可视化 |
| 加密 | CryptoJS | 请求签名 |
| 二维码 | qrcode | 收藏夹分享二维码 |
| 截图 | html2canvas | 页面内容截图 |
| SEO | @vueuse/head | 页面 Meta 标签管理 |
| 图标库 | @vicons/ionicons5 | Ionicons 5 图标集 |
| 风格 | CSS Variables + Scoped CSS | 手写毛玻璃效果与动画 |

## 📸 项目预览

| 登录页面 | 用户仪表盘 |
| --- | --- |
| ![登录页面](./img_1.png) | ![用户仪表盘](./img.png) |

| 用户管理 | IP 黑名单 |
| --- | --- |
| ![用户管理](./img_2.png) | ![IP 黑名单](./img_3.png) |

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0  
- pnpm（推荐）或 npm / yarn  

### 1. 克隆项目

```bash
git clone https://github.com/yoshino-xiao7/setu_cloud.git
cd setu_cloud
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

在项目根目录新建 `.env` 文件：

```ini
# 后端 API 地址
VITE_API_BASE_URL=http://localhost:9898

# 前端站点地址（用于 canonical、分享链接、Schema.org）
VITE_SITE_URL=http://localhost:5173

# 可选：启用前端 Mock 数据，便于无后端验收核心流程
VITE_USE_API_MOCKS=false

# 网站标题
VITE_APP_TITLE=雪涼云
```

### 4. 启动开发服务器

```bash
pnpm dev
```

访问 `http://localhost:5173` 即可预览。

### 5. 构建生产版本

```bash
pnpm build
```

构建产物输出到 `dist/` 目录，同时自动生成 Sitemap。

## 📂 目录结构

```text
src/
├── api/                  # API 接口封装
│   ├── admin.ts          #   管理员接口 (用户/黑名单/图片审核)
│   ├── apiKey.ts         #   API Key 管理
│   ├── auth.ts           #   认证 (登录/注册/找回密码)
│   ├── collections.ts    #   收藏夹 & 广场
│   ├── dashboard.ts      #   仪表盘数据
│   ├── favorite.ts       #   收藏操作
│   ├── http.ts           #   Axios 实例与拦截器
│   ├── imageDeleteRequest.ts  #   图片删除申请
│   ├── music.ts          #   网易云音乐接口
│   ├── pixiv.ts          #   Pixiv 爬虫管理
│   ├── points.ts         #   积分系统
│   ├── setu.ts           #   图片 API 调用
│   └── user.ts           #   用户信息
├── admin/                # 管理员页面
│   ├── AdminOverview.vue       #   后台概览
│   ├── UserManagement.vue      #   用户管理
│   ├── AdminIpBlacklist.vue    #   IP 黑名单
│   ├── AdminPixivCrawl.vue     #   Pixiv 爬虫
│   ├── ImageAudit.vue          #   图片库管理
│   ├── AdminImageDeleteRequests.vue  #   删除申请审核
│   ├── AdminImageManagement.vue     #   图片管理
│   └── MusicTokenManagement.vue     #   网易云 Token 管理
├── components/           # 公共组件
│   ├── AuthLayout.vue          #   认证页面布局
│   ├── AliyunCaptcha.vue       #   阿里云验证码
│   ├── GlobalMusicPlayer.vue   #   全局音乐播放器
│   ├── GlobalMvPlayer.vue      #   全局 MV 播放器
│   ├── ImageDeleteSubmitModal.vue  #   图片删除申请弹窗
│   └── seo/SchemaOrg.vue       #   Schema.org 结构化数据
├── composables/          # 组合式函数
│   └── useSeo.ts               #   SEO Meta 管理
├── layouts/              # 布局组件
│   ├── UserLayout.vue          #   用户端布局 (樱粉主题)
│   └── AdminLayout.vue         #   管理员布局 (深紫主题)
├── router/               # 路由配置与权限守卫
├── stores/               # Pinia 状态管理
│   ├── auth.ts                 #   认证状态
│   └── music.ts                #   音乐播放状态
├── views/
│   ├── auth/             # 认证页面
│   ├── dashboard/        # 用户端页面
│   │   ├── UserDashboard.vue       #   仪表盘
│   │   ├── ApiKeyList.vue          #   API Key 管理
│   │   ├── Favorites.vue           #   我的收藏夹
│   │   ├── CollectionSquare.vue    #   收藏夹广场
│   │   ├── MusicPlayer.vue         #   音乐播放器
│   │   ├── MyPlaylists.vue         #   我的歌单
│   │   ├── PlaylistDetail.vue      #   歌单详情
│   │   ├── MusicHistory.vue        #   播放历史
│   │   ├── PointsCall.vue          #   积分调用
│   │   ├── PointsLogsView.vue      #   积分流水
│   │   ├── ProfileView.vue         #   个人中心
│   │   ├── UsageGuide.vue          #   开发文档
│   │   ├── About.vue               #   关于本站
│   │   ├── MyDeleteRequests.vue    #   我的删除申请
│   │   └── PrivacyPolicy.vue      #   隐私政策
│   ├── public/           # 公开页面
│   │   ├── LandingPage.vue         #   首页
│   │   ├── PublicCollectionView.vue #  公开收藏夹
│   │   └── UserProfileView.vue    #   用户主页
│   └── status/
│       └── SystemStatus.vue        #   系统状态
├── misc/NotFound.vue     # 404 页面
├── style.css             # 全局样式
├── App.vue               # 根组件
└── main.ts               # 入口文件
```

## 📝 开发规范

- **毛玻璃风格** — 新建页面请继承 `.glass-card` 与 `.glass-table` 类，保持全局风格统一  
- **图标** — 统一使用 `@vicons/ionicons5`  
- **API 封装** — 所有接口请求需在 `src/api/` 下定义对应 TypeScript 类型（接口/DTO）  
- **路由守卫** — 公开页设置 `meta.public: true`，管理员页设置 `meta.requiresAdmin: true`  
- **SEO** — 新建公开页面请使用 `useSeo()` 设置 Meta 标签  

## 📄 许可证

[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) License © 2024 - 2026 Yuki Ryou
