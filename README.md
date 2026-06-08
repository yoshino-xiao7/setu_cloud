# 雪涼云 Console

**雪涼云 Console** 是 [雪涼云 API](https://cloud.yukiryou.icu/) 的前端控制台，基于 **Aurora Glassmorphism（极光毛玻璃）** 设计风格打造。
提供完整的用户仪表盘、API Key 管理、收藏夹系统、在线音乐播放器以及管理员后台，所有页面均适配桌面端与移动端。

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
- **请求签名** — 基于 HMAC-SHA256 的前端签名机制

### 用户端（Dashboard）

- **仪表盘概览** — 配额使用率、今日/历史调用统计、最近调用日志表格（含分页）
- **API Key 管理** — 创建、重命名、禁用、删除、一键复制、调用次数与剩余配额可视化
- **积分系统** — 积分余额查看、积分调用图片、积分流水明细
- **收藏夹管理** — 创建多个收藏夹、设置公开/私有、封面设置、QR 二维码分享
- **收藏夹广场** — 浏览其他用户的公开收藏夹，支持点赞、收藏、热度/最新/点赞排序、关键词搜索
- **图片删除申请** — 用户提交图片删除请求，追踪审核状态
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
- **Pixiv 爬虫管理** — 按作品 ID / 作者 / 标签批量抓取、任务队列管理（进度/日志/取消）
- **网易云 Token 管理** — 添加/编辑/启用/禁用/删除 NeteaseCloud Token
- **深紫色主题** — 独立管理员路由与主题色，清晰区分用户端

### 设计与交互

- **毛玻璃风格** — 高斯模糊玻璃质感卡片与弹窗
- **樱粉色主题** — 统一的 `#f586a9` 品牌色系
- **响应式布局** — 全面适配移动端，侧边栏可折叠
- **微动画** — 按钮悬浮、卡片入场、进度条渐变等流畅交互动画
- **SEO 优化** — Schema.org 结构化数据、Sitemap、robots.txt、多搜索引擎验证

## 技术栈

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
| 日期处理 | dayjs | 统一时间格式化 |
| 加密 | crypto-js (hmac-sha256) | 请求签名（按需加载） |
| 二维码 | qrcode | 收藏夹分享二维码 |
| 截图 | html2canvas | 页面内容截图 |
| SEO | @vueuse/head | 页面 Meta 标签管理 |
| 图标库 | @vicons/ionicons5 | Ionicons 5 图标集 |
| 风格 | CSS Variables + Scoped CSS | 手写毛玻璃效果与动画 |

## 快速开始

### 环境要求

- Node.js >= 18
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
# ---- 基础配置 ----
# 后端 API 地址
VITE_API_BASE_URL=http://localhost:9898

# 前端站点地址（用于 canonical、分享链接、Schema.org）
VITE_SITE_URL=http://localhost:5173

# 可选：启用前端 Mock 数据，便于无后端验收核心流程
VITE_USE_API_MOCKS=false

# ---- CDN & 代理 ----
# 下载代理域名
VITE_DOWNLOAD_PROXY_URL=https://download.yukiryou.top

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

所有变量均有内置默认值，本地开发无需全部配置，按需覆盖即可。

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

## 目录结构

```text
src/
├── api/                  # API 接口封装
│   ├── admin.ts          #   管理员接口 (用户/黑名单/图片审核)
│   ├── apiKey.ts         #   API Key 管理
│   ├── auth.ts           #   认证 (登录/注册/找回密码)
│   ├── collections.ts    #   收藏夹 & 广场
│   ├── dashboard.ts      #   仪表盘数据
│   ├── env.ts            #   环境变量与配置常量
│   ├── favorite.ts       #   收藏操作
│   ├── http.ts           #   Axios 实例与拦截器
│   ├── imageDeleteRequest.ts  #   图片删除申请
│   ├── mock.ts           #   Mock 数据适配器 (开发环境)
│   ├── music.ts          #   网易云音乐接口
│   ├── pixiv.ts          #   Pixiv 爬虫管理
│   ├── points.ts         #   积分系统
│   ├── response.ts       #   统一响应处理工具
│   ├── setu.ts           #   图片 API 调用
│   └── user.ts           #   用户信息
├── admin/                # 管理员页面
├── components/           # 公共组件
├── composables/          # 组合式函数
├── layouts/              # 布局组件 (用户端 / 管理员端)
├── router/               # 路由配置与权限守卫
├── stores/               # Pinia 状态管理
├── utils/                # 工具函数 (日期格式化等)
├── views/
│   ├── auth/             # 认证页面
│   ├── dashboard/        # 用户端页面
│   ├── public/           # 公开页面
│   └── status/           # 系统状态
├── misc/                 # 404 等杂项页面
├── style.css             # 全局样式
├── App.vue               # 根组件
└── main.ts               # 入口文件
```

## 开发规范

- **毛玻璃风格** — 新建页面请继承 `.glass-card` 与 `.glass-table` 类，保持全局风格统一
- **图标** — 统一使用 `@vicons/ionicons5`
- **时间格式化** — 统一使用 `src/utils/dateFormat.ts` 中的工具函数，不要在组件内创建本地格式化函数
- **API 封装** — 所有接口请求需在 `src/api/` 下定义对应 TypeScript 类型（接口/DTO），使用 `unwrapApiData` 处理响应
- **路由守卫** — 公开页设置 `meta.public: true`，管理员页设置 `meta.requiresAdmin: true`
- **SEO** — 新建公开页面请使用 `useSeo()` 设置 Meta 标签
- **环境变量** — 新增的外部域名或服务地址请统一收归到 `src/api/env.ts`

## 许可证

[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) License © 2024 - 2026 Yuki Ryou
