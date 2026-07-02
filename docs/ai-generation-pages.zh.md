# AI 绘画前端页面

本文档说明当前 `setu_cloud` 中 AI 绘画相关前端页面。

## 用户路由

- `/dashboard/ai-draw`：创建 AI 生图任务、翻译提示词、展示服务状态并跟踪当前任务。
- `/dashboard/ai-assets`：选择 checkpoint、LoRA、角色和提示词预设，然后回填绘图草稿。
- `/dashboard/ai-history`：查看当前用户任务，支持状态筛选、详情预览、图片下载、提交审核、局部重绘入口和删除申请。
- `/dashboard/ai-square`：展示审核通过的公共 AI 图片，默认查看全年龄分类。

用户菜单在 `src/layouts/UserLayout.vue` 中接入，路由在 `src/router/index.ts` 中注册。

## 管理员路由

- `/admin/ai-generations`：按任务 ID、用户 ID、生成状态、审核状态、删除状态和记录状态搜索 AI 任务。管理员可以下架、直接删除或申请删除本地归档图。
- `/admin/ai-workers`：展示 `/ai/capabilities` 返回的 worker 节点状态。
- `/admin/ai-reviews`：审核用户提交到 AI 广场的图片。
- `/admin/ai-delete-requests`：审核用户提交的 AI 生图删除申请。

管理员菜单在 `src/layouts/AdminLayout.vue` 中接入。

## API 客户端

`src/api/aiGeneration.ts` 是前端接口契约来源，当前覆盖：

- 用户会话接口：`/ai/generations`、`/ai/prompt/translate`、`/ai/delete-requests`、`/ai/capabilities`、`/ai/status` 和 `/ai/square`。
- API Key 接口：`/ai-api/generations` 和 `/ai-api/prompt/translate`。
- 管理员接口：`/admin/ai/generations`、`/admin/ai/reviews`、`/admin/ai/delete-requests` 和本地图片删除。

## 当前生图能力

`AiDraw.vue` 支持单角色和双角色生图、NSFW 可见性设置、LoRA 权重、尺寸、steps、CFG、seed、checkpoint 选择、提示词翻译、服务可用性、队列估算和当前任务轮询。

生成图片默认私有。用户必须主动提交审核，审核通过后才会进入 AI 广场。

## 验证

```bash
cd setu_cloud
npm run lint
npm run typecheck
npm run build
```
