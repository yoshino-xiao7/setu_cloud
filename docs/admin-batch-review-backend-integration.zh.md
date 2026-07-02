# 管理端批量审核后端联调文档

本文档说明控制台使用的管理端批量审核联调约定。

## 通用要求

- 管理端接口必须使用现有管理员登录会话。
- 失败响应应沿用后端统一响应格式，并保留 traceId 或错误信息。
- 如果批量操作可能部分成功，后端应返回单项结果。
- 前端应保留失败项可见，并在成功操作后刷新列表。

## 图片删除申请审核

普通图库图片继续使用图库删除申请审核流程。AI 生图删除申请使用独立 AI 接口：

- `GET /admin/ai/delete-requests`
- `GET /admin/ai/delete-requests/{id}`
- `POST /admin/ai/delete-requests/{id}/approve`
- `POST /admin/ai/delete-requests/{id}/reject`

审核通过会隐藏或删除 AI 生图记录，并清理云端存储。本地归档图删除是独立流程，通过 `/admin/ai/generations/{id}/local-image/delete` 创建 worker 删除指令。

## 图库投稿审核

图库投稿审核继续使用后端 gallery upload 审核工作流。前端应保持 `src/api/galleryUpload.ts` 中的批次状态模型和管理端审核视图。

预期审核结果：

- 审核通过的图片发布到公共图库索引。
- 审核拒绝的图片保留审计信息，并在需要时触发存储清理。
- 发布失败或清理失败应继续对管理员可见，方便后续重试。

## 错误处理

如果后端错误信息对管理员有操作价值，前端应直接展示。校验失败时应保持当前行或弹窗打开，方便管理员修正请求。

## 验证

```bash
cd setu_cloud
npm run typecheck
npm run build
```
