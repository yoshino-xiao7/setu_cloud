# 后端 2.5.0 图库投稿重大更新日志

更新时间：2026-06-10  
适用后端版本：`setu-api 2.5.0`  
前端相关入口：用户端 `/dashboard/gallery-upload`，管理端 `/admin/gallery-submissions`

## 更新摘要

本次更新将“图库投稿”从原来的管理员新增图片流程扩展为完整的用户投稿、OSS 直传、人工审核、发布入库链路。普通用户可以在前端提交图片批次，前端使用后端下发的 STS 凭证直传 `setu-pending`，完成上传后进入人工审核；管理员可以在后台查看投稿批次、预览待审图片，并执行通过发布或拒绝清理。

配套前端也补齐了投稿入口、我的投稿记录、投稿详情、管理端审核列表和审核详情，并修复了移动端选择图片触发不稳定的问题。

## 核心变化

### 1. 新增用户投稿链路

- 新增用户侧“图库投稿”入口。
- 支持单批次选择多张 `JPG/PNG` 图片。
- 前端本地校验默认限制：
  - 单批次最多 `5` 张。
  - 单张最大 `10MB`。
  - 单批次总大小最大 `100MB`。
- 支持两种投稿模式：
  - `MULTI_PID_P0`：多张图片分别发布为独立 `pid`，每张 `p=0`。
  - `SINGLE_PID_MULTI_PAGE`：同一批次共享一个 `pid`，每张图片使用独立 `pageIndex`。
- 支持批次默认信息和单图覆盖信息：
  - 标题、作者、R18、AI 类型、标签。
  - 单图页码、标题、作者、标签。
- 上传前可计算 SHA-256，后端在完成投稿时仍会基于 OSS 文件重新校验。

### 2. 接入 OSS 直传

- 新增 `ali-oss` 依赖。
- 初始化投稿批次后，前端使用后端返回的：
  - `credentials`
  - `uploadPolicy.bucket`
  - `uploadPolicy.endpoint`
  - `items[].objectKey`
- 前端不再自行拼接 OSS object key，完全以服务端返回值为准。
- 每张图片上传完成后收集：
  - `submissionId`
  - `objectKey`
  - `etag`
  - `sha256`
- 所有文件上传成功后调用 complete 接口，批次进入 `WAITING_MANUAL_REVIEW`。

### 3. 新增投稿状态查询

- 用户侧“我的投稿”支持按状态筛选和分页。
- 支持查看投稿批次详情。
- 详情中展示：
  - 批次状态。
  - 每张投稿图片的预览图。
  - 投稿项状态、页码、大小、标签。
  - 审核拒绝原因。
  - 发布后的 public pid/p。
- 支持取消仍处于 `UPLOADING` 或 `WAITING_MANUAL_REVIEW` 的投稿批次。

### 4. 新增管理端投稿审核

- 新增后台“投稿审核”入口。
- 管理员可以按批次状态筛选投稿。
- 支持查看投稿批次详情和短期预览图。
- 支持审核通过并发布：
  - 可填写审核备注。
  - 可选择是否立即发布。
  - 可统一覆盖 R18、AI 类型和规范化标签。
- 支持审核拒绝：
  - 必填拒绝原因。
  - 可选择严重程度。
- 对 `REJECT_DELETE_FAILED` 状态进行明确展示，便于管理员识别“拒绝成功但 OSS 清理失败”的异常情况。

### 5. 发布后查询来源扩展

`/setu/v2` 新增用户投稿来源查询能力：

```text
/setu/v2?num=5&source=yukiryou
/setu/v2?num=5&source=all
/setu/v2?num=5&source=pixiv
```

发布后的用户投稿图片 URL 走正式图库地址，和 Pixiv 来源在返回结构上保持兼容。

## 前端实现记录

新增文件：

- `src/api/galleryUpload.ts`：图库投稿 API、DTO、SHA-256 计算、OSS 上传封装。
- `src/views/dashboard/GalleryUpload.vue`：用户端投稿和我的投稿页面。
- `src/admin/GallerySubmissionReview.vue`：管理端投稿审核页面。
- `src/utils/galleryUploadStatus.ts`：投稿状态、模式、标签和文件大小展示工具。

修改文件：

- `src/router/index.ts`：新增用户端和管理端路由。
- `src/layouts/UserLayout.vue`：新增“图库投稿”菜单入口。
- `src/layouts/AdminLayout.vue`：新增“投稿审核”菜单入口。
- `vite.config.ts`：将 `ali-oss` 及其相关依赖拆分到 `vendor-oss`，避免上传 SDK 进入业务路由包。
- `package.json` / `package-lock.json`：新增 `ali-oss`。

补充修复：

- 移动端点击“选择投稿图片”无反应的问题已修复，上传区域会直接调用 `NUpload.openOpenFileDialog()`。
- 图片删除申请页面增加请求取消兜底和图片 fallback，降低快速切换、坏缩略图、慢图加载导致的“持续转圈”体验问题。

## 认证和签名影响

本次新增的 `/gallery/**` 和 `/admin/**` 接口继续使用现有登录态与请求签名机制：

- 登录态通过 HttpOnly `SID` Cookie 携带。
- 前端使用 `signSecret` 生成：
  - `X-Timestamp`
  - `X-Nonce`
  - `X-Signature`
- 签名 URI 只使用 path，不包含 query string。

现有 `src/api/http.ts` 已覆盖该规则，因此新增 API 默认走统一签名拦截器。

## 风险和注意事项

### OSS CORS

如果直传时报 `403` 或无法读取 `ETag`，优先检查 OSS CORS：

- 是否允许当前前端域名。
- 是否允许 `PUT`。
- 是否允许 `Content-Type` 请求头。
- 是否暴露 `ETag` 响应头。

拿不到 `ETag` 不影响 complete，但会降低前端可观测性。

### STS 有效期

上传必须在后端返回的 STS 凭证有效期内完成。大批量图片、弱网或移动端后台切换时，可能触发 STS 过期，需要重新初始化投稿批次。

### 预览 URL 过期

投稿详情里的 `previewUrl` 是短期地址。预览失效后重新请求详情即可，不应在前端长期缓存。

### 上传 SDK 体积

`ali-oss` 构建后体积较大，但已通过动态导入和 `vendor-oss` 分包处理。只有进入上传流程时才会加载该 SDK。

## 验证记录

前端已通过：

```bash
npm run lint
npm run typecheck
npm run build
npm run check:build-budget
```

本地路由冒烟：

- `/dashboard/gallery-upload` 返回正常。
- `/admin/gallery-submissions` 返回正常。

## 建议联调顺序

1. 普通用户登录，确认 `SID` Cookie 和 `signSecret` 正常。
2. 使用 1 张小 JPG 初始化 `MULTI_PID_P0` 投稿。
3. 确认 OSS 直传成功并调用 complete。
4. 用户侧查看“我的投稿”，确认状态为 `WAITING_MANUAL_REVIEW`。
5. 管理员进入“投稿审核”，打开详情并预览图片。
6. 管理员通过并立即发布。
7. 调用 `/setu/v2?source=yukiryou&num=5` 验证发布结果。
8. 再走一条拒绝流程，确认用户侧能看到 `REJECTED` 和拒绝原因。

## 相关文档

- `docs/gallery-upload-frontend-integration.md`：接口级联调说明。
- `docs/SIGNATURE_FRONTEND.md`：前端请求签名说明。
