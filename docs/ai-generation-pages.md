# AI 绘画前端页面

## 页面入口

用户后台新增：

- `/dashboard/ai-draw`: AI 绘图页面。
- `/dashboard/ai-history`: 我的 AI 历史。
- `/dashboard/ai-square`: AI 广场。

管理员后台新增：

- `/admin/ai-generations`: 所有 AI 生成记录。
- `/admin/ai-reviews`: AI 独立审核队列。

菜单已分别接入 `UserLayout.vue` 和 `AdminLayout.vue`。

## 用户绘图页

`src/views/dashboard/AiDraw.vue`

能力来自 `GET /ai/capabilities`，所以页面看到的 checkpoint、LoRA、角色预设不是直连本机，而是本机 worker 上报后由云端缓存返回。

提交参数：

- 中文 prompt
- checkpoint
- LoRA 和 LoRA 权重
- 角色预设
- 宽高、steps、cfg、seed

创建任务调用 `POST /ai/generations`。页面展示 50 积分提示；管理员账号实际不扣积分，由后端判定。

## 我的历史

`src/views/dashboard/AiHistory.vue`

只读取当前登录用户自己的任务：

- 状态筛选
- 预览已完成图片
- 复制 prompt
- 提交独立审核
- 审核分类选择 `GENERAL` 或 `R18`

图片 URL 使用后端返回的签名 URL 或公开 URL，前端不直接访问 OSS key。

## AI 广场

`src/views/dashboard/AiSquare.vue`

读取 `GET /ai/square`，只展示审核通过且 `publicVisible=true` 的图片。支持 `GENERAL`、`R18` 和全部分类筛选。

## 管理员页面

`src/admin/AdminAiGenerations.vue`

- 查看所有任务。
- 按用户 ID、任务状态、审核状态筛选。
- 查看 OSS 预览图、prompt、参数、错误信息。
- 对公开图片执行下架。

`src/admin/AdminAiReviews.vue`

- 查看 AI 独立审核队列。
- 按审核状态和分类筛选。
- 审核通过后进入 AI 广场。
- 审核拒绝需要填写原因。

## 本地验证

```powershell
cd C:\Users\rdpuser\Documents\setu_cd\setu_cloud
$env:Path='C:\Program Files\nodejs;' + $env:Path
npm ci
npm run typecheck
npm run build
```
