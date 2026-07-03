# 前端长期可维护重构说明

更新时间：2026-07-03

## 目标

本次重构目标是让前端项目在保持现有 UI 和使用逻辑不变的前提下，逐步提高长期可维护性：

- 页面组件只负责页面编排、交互入口和渲染。
- API URL、请求参数和后端响应类型集中在 `src/api`。
- 业务常量、页面本地类型、纯工具函数从大页面中抽离。
- 注释保留在解释业务约束、兼容逻辑和非显而易见行为的位置，删除或避免“历史修复点”式噪音注释。
- 每轮重构后用 `npm run lint`、`npm run typecheck`、必要时 `npm run build` 验证。

## 当前结构分析

前端已经具备较好的基础分层：

- `src/api`：大部分后端接口已集中管理。
- `src/composables`：AI 绘图、上传草稿、轮询、错误处理等逻辑已经有复用封装。
- `src/stores`：认证、音乐、AI 绘图草稿等跨页面状态已进入 Pinia。
- `src/utils`：日期、导航、状态展示等纯工具已有沉淀。

主要维护风险集中在以下区域：

- 部分 `.vue` 页面仍然很大，例如 `GalleryUpload.vue`、`AiDraw.vue`、`ImageAudit.vue`、`PointsCall.vue`。
- 少量页面曾直接调用 `http` 并拼接接口路径，导致后端契约分散。
- 页面内混合了本地数据模型、业务常量、错误响应兼容解析、请求编排和 UI 渲染。
- 一些历史注释描述“修复点”而不是解释当前业务规则，后续应逐步清理。

## 本轮已完成

### 1. 投稿上传页面基础定义抽离

从 `src/views/dashboard/GalleryUpload.vue` 抽离：

- `src/constants/galleryUpload.ts`
  - 投稿最大文件数。
  - 单文件大小限制。
  - 单批次大小限制。
  - 完成上传超时时间。
  - 草稿 localStorage key。
  - 允许的图片 MIME 类型。
- `src/types/galleryUploadLocal.ts`
  - `LocalUploadItem`
  - `GalleryUploadIncompleteItem`
  - `GalleryUploadIncompletePayload`
- `src/utils/uploadIntentKey.ts`
  - `createUploadIntentKey`
  - `createClientItemId`

这样 `GalleryUpload.vue` 不再承担基础类型和通用 ID 生成逻辑，后续可以继续抽离上传流程 composable。

### 2. 页面直接请求收口到 API 层

新增或扩展 API 文件：

- `src/api/status.ts`
  - `fetchImageCount`
  - `fetchStatusOverview`
  - 系统状态相关响应类型。
- `src/api/dashboard.ts`
  - `fetchUsageOverview`
  - `fetchUsageLogs`
- `src/api/setu.ts`
  - `fetchSetuImages`
- `src/api/admin.ts`
  - `syncAdminImageCount`

已替换以下页面中的裸 `http` 调用：

- `src/views/dashboard/About.vue`
- `src/views/dashboard/UserDashboard.vue`
- `src/views/status/SystemStatus.vue`
- `src/views/dashboard/PointsCall.vue`
- `src/admin/AdminOverview.vue`

重构后页面仍保留原来的数据兼容解析和 UI 状态逻辑，避免改变用户可见行为。

## 保持不变的行为

本轮重构未改变：

- 路由。
- 页面模板结构。
- UI 文案。
- Naive UI 组件使用方式。
- 上传校验规则的数值。
- localStorage 草稿 key。
- `/setu/v2` 查询参数构造方式。
- 后端响应兼容处理逻辑。

## 后续重构路线

### 阶段 1：继续收口页面级 API 契约

- 检查 `src/views`、`src/admin` 是否重新出现 `http` 直接调用。
- 新增接口时优先放入对应 `src/api/*.ts`。
- API 文件中保留请求参数和响应类型，页面只调用具名函数。

建议检查命令：

```bash
rg "from '@/api/http'|http\\." src/views src/admin -n
```

### 阶段 2：拆分超大页面的业务逻辑

优先顺序：

1. `GalleryUpload.vue`
   - 抽 `useGalleryUploadSession`
   - 抽 `useGalleryUploadIncompleteRecovery`
   - 抽 `useGalleryUploadRecords`
2. `AiDraw.vue`
   - 继续拆生成表单、资源选择、近期任务、双角色遮罩面板。
3. `ImageAudit.vue`
   - 抽审核列表查询、批量操作、图片可用性检查逻辑。
4. `PointsCall.vue`
   - 抽 `useSetuCallForm` 和 `useSetuResultsDeck`。

拆分原则：

- 先抽纯类型、常量、工具函数。
- 再抽无 UI 的 composable。
- 最后拆业务组件。
- 每次只移动一个清晰职责，避免同时改模板和业务流程。

### 阶段 3：统一模块目录

当单个业务域文件继续增多时，可以引入模块目录，例如：

```text
src/modules/galleryUpload/
  constants.ts
  types.ts
  useGalleryUploadSession.ts
  useGalleryUploadRecords.ts
  incompleteRecovery.ts
```

当前项目已有 `api`、`composables`、`utils` 分层，短期内先沿用现有结构，避免一次性迁移造成大 diff。

### 阶段 4：注释规范

应该保留的注释：

- 后端兼容多种响应结构的原因。
- 上传幂等 key、草稿恢复、过期批次恢复等业务约束。
- 与浏览器 API、OSS 上传、轮询生命周期相关的非显而易见逻辑。

应该减少的注释：

- “修复点”“这里使用某工具”这类历史说明。
- 与代码字面含义重复的注释。
- 已经过时的路径或实现细节。

## 验证要求

每轮重构至少执行：

```bash
npm run lint
npm run typecheck
```

触及路由、构建配置、公共样式、API 层或大型页面时，额外执行：

```bash
npm run build
```

涉及 UI 布局时，应使用浏览器手动检查核心页面，确认：

- 页面仍可打开。
- 原交互入口仍存在。
- 表单默认值不变。
- 关键按钮、弹窗、列表和分页行为不变。

## 2026-07-02 第二轮补充

### 投稿未完成恢复逻辑抽离

新增 `src/utils/galleryUploadIncomplete.ts`，承接投稿上传失败时的后端错误兼容解析和本地条目标记逻辑：

- `getErrorResponseData`
- `getGalleryUploadIncompletePayload`
- `markGalleryUploadIncompleteItems`

`GalleryUpload.vue` 现在只负责：

- 调用工具函数解析 `GALLERY_UPLOAD_INCOMPLETE`。
- 根据返回的本地条目更新页面状态。
- 拼接用户可见错误消息。
- 保存草稿并展示错误提示。

这样后端错误结构兼容、按 `clientItemId` / `submissionId` / `filename` 匹配本地图片、保留已成功上传图片状态等规则，已经从页面组件中移出。页面模板和用户交互流程没有改变。

### 下一步建议

`GalleryUpload.vue` 仍然偏大，下一轮建议继续抽离：

- 上传批次会话：`ensureInitResponse`、`refreshInitResponseForUploadRetry`、`applyPreparedItemsToLocal`。
- 文件选择与本地条目同步：`makeLocalUploadItem`、`syncUploadItems`、`addNativeFiles`。
- 投稿记录列表：`fetchRecords`、`openDetail`、`confirmCancel`。

优先抽无 UI 的 composable，确认 `lint`、`typecheck`、`build` 通过后，再考虑拆模板组件。

## 2026-07-02 第三轮补充

### 投稿文件选择校验抽离

新增 `src/utils/galleryUploadFiles.ts`，集中处理投稿文件选择阶段的纯规则：

- `getAcceptedGalleryUploadContentType`
  - 兼容 `image/jpeg`、`image/png`、`image/jpg`。
  - 当浏览器没有提供可靠 MIME 时，回退检查 `.jpg`、`.jpeg`、`.png` 扩展名。
- `selectGalleryUploadFiles`
  - 根据剩余可选数量截断文件。
  - 校验单文件 10MB 限制。
  - 校验单批次 100MB 限制。
  - 返回可加入的 `UploadFileInfo[]` 和各类跳过计数。

`GalleryUpload.vue` 继续负责展示原来的提示消息、草稿恢复判断、同步本地列表和持久化文件。这样上传入口的规则和用户提示被拆开，后续如果新增拖拽、粘贴上传或批量恢复入口，可以复用同一套校验逻辑。

### 下一步建议

`GalleryUpload.vue` 的本地上传会话仍然可以继续拆：

- `applyPreparedItemsToLocal` 可抽为“后端 prepared items 合并本地条目”的纯函数。
- `ensureInitResponse` 和 `refreshInitResponseForUploadRetry` 可进入 `useGalleryUploadSession`。
- `loadRecords`、`openDetailByBatchId`、`confirmCancel` 可进入 `useGalleryUploadRecords`。

完成这些后，再考虑拆模板中的上传面板、记录列表和详情弹窗组件。

## 2026-07-02 第四轮补充

### 编码问题根因和防线

本轮重构过程中曾遇到 Vue 文件中文被写成乱码的问题。根因是：在 `apply_patch` 无法匹配一段包含历史乱码的字符串后，使用了 Windows PowerShell 文本写入命令重写源码。Windows PowerShell 5 的 `Set-Content` / 重定向默认编码不是项目期望的 UTF-8，中文会按系统代码页写回，导致文件虽然仍可被读取，但中文内容和部分字符串边界被破坏。

后续约束：

- 源码、文档、配置文件统一使用 UTF-8。
- 不使用 PowerShell `Set-Content`、`Out-File`、`>`、`>>` 修改源码文件。
- 手工源码修改优先使用 `apply_patch`。
- 如果必须脚本化写文件，只能使用明确的 UTF-8 无 BOM 写入方式，并在写入后立即运行编码检查、lint 和 typecheck。
- 不用 PowerShell `Get-Content` 的中文显示结果判断文件是否已经乱码；终端代码页可能只是在显示层把 UTF-8 中文渲染错。需要确认时，用 Node `fs.readFileSync(file, 'utf8')` 读取，或运行 `npm run check:encoding`。

已新增防线：

- `.editorconfig`：声明 `charset = utf-8`、`end_of_line = lf`。
- `.gitattributes`：声明文本文件以 LF 形式进入仓库，并标记常见图片、字体、PDF 为二进制文件。
- `scripts/check-text-encoding.ts`：严格检查源码、文档、配置等文本文件是否为合法 UTF-8。
- `package.json`：
  - 新增 `npm run check:encoding`。
  - `npm run check` 已把编码检查放到第一步。

建议每次重构后至少运行：

```bash
npm run check:encoding
npm run lint
npm run typecheck
```

### Prepared Items 合并逻辑抽离

新增 `src/utils/galleryUploadPrepared.ts`，把后端返回的 prepared/detail items 合并回本地上传项的规则从 `GalleryUpload.vue` 中抽离：

- 优先按 `clientItemId` 匹配本地项。
- 其次按 `itemIndex` 兜底匹配。
- 保留已上传项的 `UPLOADED` 状态和 100% 进度。
- 将后端失败或过期状态映射回本地错误状态。

`GalleryUpload.vue` 继续负责决定何时调用合并逻辑、何时保存草稿、何时展示恢复失败提示。

## 2026-07-02 第五轮补充
### API 响应归一化继续下沉

本轮把页面里重复出现的后端响应兼容判断继续收回 API 层：

- `src/api/status.ts`
  - 新增 `normalizeImageCount`。
  - 统一兼容纯数字、`{ count }`、`{ data }` 等图床总数返回格式。
- `src/api/dashboard.ts`
  - 新增 `UsageLogsPayload`。
  - 新增 `normalizeUsageLogsResponse`。
  - 统一兼容数组、`{ data, total/count }`、`{ items, total/count }`、`{ list, total }` 等日志列表返回格式。

受影响页面：

- `src/views/dashboard/About.vue`
- `src/admin/AdminOverview.vue`
- `src/views/dashboard/UserDashboard.vue`

页面现在只负责拿到接口结果、设置组件状态和展示错误；“后端到底返回哪种结构”的兼容规则集中在 API 文件里。这样以后后端响应格式调整时，优先修改 API 层和对应测试/校验，不需要在多个 Vue 页面里逐个搜索同样的 `count/data/items/list` 判断。

## 2026-07-02 第六轮补充
### 验证码 API 边界收口

`src/components/SecureCaptcha.vue` 原来直接导入 `http` 并自行解析 `/auth/captcha` 响应。现在新增：

- `src/api/auth.ts`
  - `CaptchaResponse`
  - `fetchCaptcha`

验证码组件只负责加载态、错误态、图片展示和向父组件发出 `uuid`，接口路径与响应拆包规则统一留在 `auth` API 模块里。这样登录、注册、忘记密码等页面继续复用原组件，UI 和交互不变，但后续如果验证码接口变更，只需要改 API 层。

### 通知未读数响应归一化

`src/views/dashboard/NotificationsView.vue` 原来在页面内兼容未读数接口的纯数字和 `{ count }` 两种返回格式。现在新增：

- `src/api/notification.ts`
  - `UnreadNotificationCountData`
  - `normalizeUnreadNotificationCount`

通知页面继续负责列表、分页、已读/未读交互；未读数响应格式兼容规则下沉到通知 API 模块。

### 注释清理约定

本轮同步清理了触碰范围内的历史型注释，例如“修复点”“新增”“引入你的工具”这类只描述修改历史的内容。后续注释原则：

- 保留解释业务约束、浏览器行为、后端兼容原因、响应式性能边界的注释。
- 删除与代码字面含义重复、只记录历史修改、带临时标记或表情符号的注释。
- 注释应描述“为什么这样做”，不要描述“这行代码做了什么”。

## 2026-07-02 第七轮补充
### AI 绘图默认配置与纯展示逻辑抽离

`src/views/dashboard/AiDraw.vue` 是当前前端最大的页面之一。前面已经有 `useAiDrawResources`、`useAiDrawGenerationFlow`、`useAiDrawPromptTags`、`useAiDrawFormRules` 等拆分，本轮继续把页面顶部的静态配置和纯函数移出：

- 新增 `src/composables/useAiDrawDefaults.ts`
  - `AI_DRAW_COST_PER_IMAGE`
  - `AI_DRAW_DUAL_CHARACTER_COST_MULTIPLIER`
  - `AI_DRAW_PROMPT_TRANSLATION_POLL_MS`
  - `AI_DRAW_PROMPT_TRANSLATION_TIMEOUT_MS`
  - `AI_DRAW_SERVICE_STATUS_POLL_MS`
  - `AI_DRAW_DEFAULT_NEGATIVE`
  - `createAiDrawDefaultForm`
  - `getAiDrawGenerationCost`
  - `getAiDrawGenerateButtonText`
  - `getAiDrawAssetCompactSummary`

`AiDraw.vue` 现在继续负责页面状态编排、模板绑定、生命周期和路由跳转；默认参数、成本计算、按钮文案、资产摘要等与 UI 结构无关的逻辑进入独立文件。这样后续调整积分价格、默认负面词、提示词轮询间隔或默认画幅参数时，不需要打开 1900 行页面文件。

本轮没有改动模板结构、样式、用户可见文案和交互流程。

## 2026-07-02 第八轮补充
### 图库投稿记录逻辑抽离

`src/views/dashboard/GalleryUpload.vue` 前面已抽离文件校验、未完成恢复、prepared items 合并等上传相关纯逻辑。本轮继续把“我的投稿”记录区的状态和操作移出页面：

- 新增 `src/composables/useGalleryUploadRecords.ts`
  - 记录列表加载状态、分页、状态筛选。
  - 投稿详情弹窗状态和详情加载。
  - 从路由 query 中解析批次 ID 并打开详情。
  - 判断批次是否可取消。
  - 取消投稿批次并刷新列表。

`GalleryUpload.vue` 现在只保留上传主流程、草稿恢复、文件列表同步和模板绑定；记录区的接口调用与弹窗状态集中在 composable 中。上传完成后仍会切换到“我的投稿”、重置筛选并刷新记录，UI 和用户流程不变。

后续建议继续拆 `GalleryUpload.vue`：

- 将上传会话生命周期抽到 `useGalleryUploadSession`。
- 最后再考虑把模板拆成上传面板、记录列表、详情弹窗三个展示组件。

## 2026-07-02 第九轮补充
### 图库投稿本地文件状态抽离

本轮继续压缩 `src/views/dashboard/GalleryUpload.vue`，把“文件选择后如何变成本地上传项”的状态和生命周期移到独立 composable：

- 新增 `src/composables/useGalleryUploadLocalItems.ts`
  - 管理 Naive UI `UploadFileInfo` 列表和本地 `LocalUploadItem` 列表。
  - 生成前端临时文件 ID。
  - 按 `fileKey`、文件名和大小匹配草稿中的单图信息。
  - 统一创建、同步本地上传项，并在文件被移除或页面卸载时释放 `ObjectURL`。
  - 恢复 IndexedDB/local file draft 中保留的图片文件，并返回恢复数量给页面展示提示。

`GalleryUpload.vue` 现在保留上传业务编排、消息提示、草稿持久化和模板绑定；本地文件对象、预览 URL、草稿文件恢复这些浏览器资源生命周期集中在 `useGalleryUploadLocalItems` 中。这样后续修改文件恢复策略或本地上传项结构时，不需要在页面文件里穿插处理 `URL.createObjectURL`、`URL.revokeObjectURL`、`UploadFileInfo` 与草稿项的映射细节。

本轮保持 UI、按钮文案、上传限制、草稿恢复提示和上传流程不变。

后续建议继续拆 `GalleryUpload.vue`：

- 将上传会话生命周期抽到 `useGalleryUploadSession`。
- 将上传表单和文件列表模板拆成展示组件。
- 将记录列表和详情弹窗模板拆成展示组件。

## 2026-07-02 第十轮补充
### 图库投稿上传会话生命周期抽离

本轮把 `src/views/dashboard/GalleryUpload.vue` 中的上传会话状态移到独立 composable：

- 新增 `src/composables/useGalleryUploadSession.ts`
  - 管理投稿批次的 `uploadIntentKey`、`activeBatchId`、`activeInitResponse`、`createBatchAttempted`。
  - 统一创建上传批次，并把后端 prepared items 回填到本地上传项。
  - 判断上传凭证和上传窗口是否临近过期。
  - 上传凭证刷新后重新初始化批次，用于 OSS 上传 403、AccessDenied、SecurityTokenExpired 等可重试场景。
  - 恢复本地草稿对应的后端批次状态。
  - 上传窗口过期时重置单图会话状态，并保留用户已选图片和填写内容。

`GalleryUpload.vue` 现在保留上传主流程本身：校验表单、逐张计算 SHA-256、上传 OSS、上报单图状态、完成批次、展示消息和切换 tab。会话状态的生命周期和后端批次恢复规则集中在 `useGalleryUploadSession` 中，后续如果后端批次幂等、凭证刷新或过期策略调整，优先改 composable。

本轮保持 UI、上传限制、草稿兼容格式、过期提示和重试行为不变。

后续建议继续拆 `GalleryUpload.vue`：

- 将上传执行循环抽到 `useGalleryUploadRunner`。
- 将上传表单和文件列表模板拆成展示组件。
- 将记录列表和详情弹窗模板拆成展示组件。

## 2026-07-02 第十一轮补充
### 图库投稿上传执行循环抽离

本轮继续拆 `src/views/dashboard/GalleryUpload.vue`，把逐张上传的执行循环移到独立 composable：

- 新增 `src/composables/useGalleryUploadRunner.ts`
  - 提交前将可重试图片重置为 pending。
  - 按顺序处理本地上传项，跳过已经完成且具备 `submissionId/objectKey` 的图片。
  - 按需计算 SHA-256，失败时只提示一次并继续上传。
  - 上报单图 `UPLOADING`、`UPLOADED`、`FAILED` 状态。
  - 调用 OSS 上传并回写进度、`etag`、`objectKey`。
  - 识别 `SecurityTokenExpired`、`InvalidAccessKeyId`、`AccessDenied`、`403` 等可刷新凭证错误，刷新批次后重试一次。
  - 完成批次并返回后端完成结果。

`GalleryUpload.vue` 的 `handleStartUpload` 现在只负责页面流程编排：防重复提交、表单校验、设置 loading、调用 `runUpload`、处理过期/成功/失败提示、清空表单并切换到“我的投稿”。上传细节集中在 `useGalleryUploadRunner`，上传会话状态集中在 `useGalleryUploadSession`，页面文件进一步从约 1388 行降到约 1229 行。

本轮保持 UI、上传顺序、断点重试语义、SHA-256 失败降级、OSS 凭证刷新、完成后切换记录页等行为不变。

后续建议继续拆 `GalleryUpload.vue`：

- 将上传表单和文件列表模板拆成展示组件。
- 将记录列表和详情弹窗模板拆成展示组件。
- 或转向 `PointsCall.vue`、`ImageAudit.vue` 等仍然偏大的页面做同类拆分。

## 2026-07-02 第十二轮补充
### 积分调用页面纯展示逻辑抽离

本轮开始处理另一个大页面 `src/views/dashboard/PointsCall.vue`。先选择低风险的纯逻辑和默认配置抽离，避免影响 `/setu/v2` 调用流程和页面交互：

- 新增 `src/composables/usePointsCallDefaults.ts`
  - `POINTS_CALL_COST_PER_CALL`
  - `POINTS_CALL_R18_OPTIONS`
  - `POINTS_CALL_SIZE_OPTIONS`
  - `createPointsCallDefaultForm`
  - `parsePointsCallTags`
  - `buildPointsCallSearchParams`
  - `getPointsCallDeckCards`
  - `pickPointsCallPreviewSrc`
  - `pickPointsCallCoverSrc`
  - `pickPointsCallOriginalSrc`
  - `getPointsCallDownloadFilename`
  - `getVisiblePointsCallTags`
  - `getHiddenPointsCallTagCount`

`PointsCall.vue` 现在继续负责页面状态、积分请求、调用请求、下载、收藏和删除申请弹窗；默认表单、选项、标签解析、请求参数构造、卡片堆叠样式计算、图片 URL fallback 和标签展示规则进入独立文件。页面从约 1581 行降到约 1481 行。

本轮保持 UI、调用参数格式、`tag`/`size` 重复 query key、图片预览 fallback、下载文件名、标签折叠数量和积分展示文案不变。

后续建议继续拆 `PointsCall.vue`：

- 将积分加载和数字动画抽到 composable。
- 将收藏夹加载/提交抽到 composable。
- 将结果卡片区拆成展示组件。

## 2026-07-02 第十三轮补充
### 积分调用收藏夹逻辑抽离

本轮继续拆 `src/views/dashboard/PointsCall.vue`，把“收藏到收藏夹”弹窗的状态和请求逻辑移到独立 composable：

- 新增 `src/composables/usePointsCallFavorites.ts`
  - 收藏夹列表只加载一次。
  - 使用 `useRequestGuard` 防止旧的收藏夹加载请求覆盖新状态。
  - 打开收藏弹窗时自动选择默认收藏夹，没有默认收藏夹时选择第一个收藏夹。
  - 默认收藏夹继续调用 `/favorite/{pid}/{p}`。
  - 非默认收藏夹继续调用 `/collections/{id}/items/{pid}/{p}`。
  - 保留原来的加载失败、未选择收藏夹、收藏夹不存在、收藏成功和收藏失败提示。

`PointsCall.vue` 现在只保留收藏弹窗模板绑定和 `openFav`、`submitFav` 调用；收藏夹加载、目标图片状态、提交 API 分支和错误提示集中在 composable。页面从约 1481 行降到约 1422 行。

本轮保持 UI、弹窗交互、默认收藏夹优先策略、收藏 API 选择规则和提示文案不变。

后续建议继续拆 `PointsCall.vue`：

- 将积分加载和数字动画抽到 composable。
- 将 `/setu/v2` 调用状态抽到 composable。
- 将结果卡片区拆成展示组件。

## 2026-07-02 第十四轮补充
### 积分调用积分状态抽离与乱码防线升级

本轮继续拆 `src/views/dashboard/PointsCall.vue`，把积分加载、积分数字滚动动画和调用权限判断移到独立 composable：

- 新增 `src/composables/usePointsCallPoints.ts`
  - 统一管理 `points`、`pointsLoading` 和 `canCall`。
  - 继续使用 `useRequestGuard` 避免旧积分请求覆盖新状态。
  - 保留原来的积分数字滚动动画。
  - 保留管理员免积分限制的判断。
  - 保留 `/points/me` 失败时的原提示文案。

`PointsCall.vue` 现在只保留 `refreshAll()` 作为页面级编排入口，并通过 `usePointsCallPoints` 取得积分状态。页面从约 1422 行降到约 1382 行。

本轮保持 UI、积分展示、管理员免扣费、积分不足禁用调用按钮、页面挂载后刷新积分和调用完成后刷新积分的行为不变。

### 关于“文件又显示成乱码”的澄清与防护

这次排查到一个容易误判的场景：部分 PowerShell `Get-Content` 输出会按控制台代码页显示 UTF-8 中文，导致终端里看起来像常见的 GBK 错解乱码，但用 Node 按 UTF-8 读取时文件真实内容是正常中文。因此后续判断文件是否真的乱码，不能只看 PowerShell 默认输出，要以 UTF-8 解码检查或编辑器实际内容为准。

同时，`scripts/check-text-encoding.ts` 已升级为两层检查：

- 第一层：使用 `TextDecoder('utf-8', { fatal: true })` 拦截非 UTF-8 字节。
- 第二层：扫描常见 mojibake 标记，包括替换字符、私用区字符、UTF-8 被 Latin-1/GBK 错解后的典型片段。这样即使文件字节仍是合法 UTF-8，但内容已经被错误转码成乱码文本，也会在 `npm run check:encoding` 阶段失败。

后续建议继续拆 `PointsCall.vue`：

- 将 `/setu/v2` 调用状态抽到 composable。
- 将原图查看/签名下载逻辑抽到 composable。
- 将结果卡片区拆成展示组件。

## 2026-07-02 第十五轮补充
### 积分调用结果状态抽离

本轮继续拆 `src/views/dashboard/PointsCall.vue`，把 `/setu/v2` 调用请求、结果 loading、结果列表和结果轮播状态移到独立 composable：

- 新增 `src/composables/usePointsCallResults.ts`
  - 管理 `calling`、`resultLoading`、`results`、`activeResultIndex`。
  - 统一计算 `activeResult` 和卡片堆叠 `deckCards`。
  - 保留上一张、下一张和指定结果索引切换规则。
  - 调用前继续按积分权限判断，不满足时保留原来的积分不足提示。
  - 继续使用 `buildPointsCallSearchParams` 生成 `/setu/v2` 参数，保留 `tag`/`size` query key 规则。
  - 继续使用 `useRequestGuard` 防止旧调用结果覆盖新状态。
  - 调用成功后继续刷新积分，并保留空结果、成功结果数和失败提示文案。

`PointsCall.vue` 现在保留表单绑定、页面级 `refreshAll()`、下载、收藏和删除申请弹窗；调用请求和结果轮播状态集中在 `usePointsCallResults`。页面从约 1382 行降到约 1339 行。

本轮保持 UI、按钮 loading、结果清空时机、当前结果索引重置、空结果提示、成功提示、失败后刷新积分和结果轮播交互不变。

后续建议继续拆 `PointsCall.vue`：

- 将原图查看/签名下载逻辑抽到 composable。
- 将删除申请弹窗状态抽到 composable。
- 将结果卡片区拆成展示组件。

## 2026-07-02 第十六轮补充
### 积分调用下载与删除申请状态抽离

本轮继续拆 `src/views/dashboard/PointsCall.vue`，把原图查看/签名下载和删除申请弹窗状态移到独立 composable：

- 新增 `src/composables/usePointsCallDownload.ts`
  - 保留原图链接为空、下载链接为空、正在准备下载和下载失败提示。
  - 继续通过 `signDownloadUrl` 生成后端签名下载地址。
  - 继续使用 `getPointsCallDownloadFilename` 生成下载文件名。
  - 继续忽略已知可忽略请求错误，并把其余错误交给 `showApiError`。
- 新增 `src/composables/usePointsCallDeleteRequest.ts`
  - 管理删除申请弹窗显示状态。
  - 管理传给 `ImageDeleteSubmitModal` 的图片数据。
  - 保留提交成功后的原提示文案。
  - 缩略图 URL 仍由页面传入的 `pickCoverSrc` 生成，确保图片 fallback 规则不变。

`PointsCall.vue` 现在保留模板绑定和页面编排，下载、签名跳转、删除申请弹窗数据构造都进入 composable。页面从约 1339 行降到约 1298 行。

本轮保持 UI、原图打开方式、下载签名流程、下载文件名、删除申请弹窗字段和成功提示不变。

后续建议继续拆 `PointsCall.vue`：

- 将滚动进度和点击火花这类页面动效抽到 composable。
- 将结果卡片区拆成展示组件。
- 清理仅表示历史修改的注释，保留业务约束说明。

## 2026-07-02 第十七轮补充
### 积分调用页面动效抽离

本轮继续收敛 `src/views/dashboard/PointsCall.vue` 的页面职责，把滚动进度、页面挂载后的首次刷新和点击火花动效移到独立 composable：

- 新增 `src/composables/usePointsCallPageEffects.ts`
  - 管理 `scrollProgress`。
  - 在组件挂载时注册滚动监听并触发 `refreshAll()`。
  - 在组件卸载时移除滚动监听并取消未完成的 `requestAnimationFrame`。
  - 保留 `prefers-reduced-motion` 和移动端不生成点击火花的规则。
  - 保留原来的 8 个火花粒子、动画变量和 600ms 清理逻辑。

`PointsCall.vue` 现在只消费 `scrollProgress` 和 `createClickSpark`，不再直接持有滚动监听、`requestAnimationFrame`、DOM 粒子创建等浏览器细节。页面从约 1298 行降到约 1270 行。

本轮保持 UI、页面初始刷新、滚动进度条、点击按钮时的火花效果和无障碍动效降级行为不变。

后续建议：

- `PointsCall.vue` 可以进入展示组件拆分阶段，例如结果卡片区、调用表单区。
- 下一个高收益页面建议转向 `AiDraw.vue`、`ImageAudit.vue`、`MusicPlayer.vue`、`CollectionSquare.vue` 或 `ProfileView.vue`，继续按“API/业务状态/composable/展示组件”分层。

## 2026-07-02 第十八轮补充
### 图片审核页面展示 helper 抽离

本轮开始处理 `src/admin/ImageAudit.vue`。先选择不依赖页面响应式状态的纯 helper 和常量抽离，避免一开始就改动审核请求流程：

- 新增 `src/composables/useImageAuditViewHelpers.ts`
  - 审核列表桌面/移动端分页大小和默认复审周期。
  - 审核范围选项、可用性筛选选项、可用性状态展示元信息。
  - 筛选数字规整 `normalizeImageAuditFilterNumber`。
  - 审核范围统计 key、范围标签、带统计数量的选项标签。
  - 审核时间解析和当前审核时间格式化。
  - 图片可用性标签和可用性详情文案。
  - 批量审核失败提示文案。

`ImageAudit.vue` 继续负责数据请求、分页、筛选状态、审核提交、可用性检测和弹窗状态；纯展示规则、默认值和格式化逻辑进入独立 helper 文件。页面从约 1579 行降到约 1537 行。

本轮保持 UI、筛选默认值、移动端分页大小、审核范围统计显示、可用性标签、失败提示和审核时间格式不变。同步清理了导入区中“Added/Removed”这类历史型注释。

后续建议继续拆 `ImageAudit.vue`：

- 将筛选校验和查询参数构造抽到 composable。
- 将选中/批量选择状态抽到 composable。
- 将可用性检测状态和结果回写抽到 composable。

## 2026-07-02 第十九轮补充
### 图片审核页面选择状态抽离

本轮继续处理 `src/admin/ImageAudit.vue`，把审核列表的选中状态和批量选择派生状态抽到独立 composable：

- 新增 `src/composables/useImageAuditSelection.ts`
  - 管理 `selectedImageIds`。
  - 根据审核范围计算 `isAuditScope`，保持 `ALL` 范围不可批量审核的原逻辑。
  - 根据当前列表计算可审核图片、已选可审核图片、全选状态和半选状态。
  - 提供单张选择、当前页全选、清空选择、同步当前页选择、移除已审核图片选择等动作。

`ImageAudit.vue` 不再直接维护批量选择细节，只消费 composable 暴露的状态和动作。审核完成后从选择集合中移除图片的逻辑也统一通过 `removeSelectedImageIds` 处理，避免页面里散落数组过滤代码。

本轮保持 UI、桌面表格复选框、移动端卡片复选框、批量审核栏显示、全选/半选行为和审核完成后移除已选项的行为不变。

后续建议继续拆 `ImageAudit.vue`：

- 将筛选校验、查询参数构造和移动端队列判断抽到筛选 composable。
- 将可用性检测和批量检测状态抽到 composable。
- 再考虑把表格列定义与移动端卡片拆成展示组件。

## 2026-07-02 第二十轮补充
### 图片审核页面筛选逻辑抽离

本轮继续收敛 `src/admin/ImageAudit.vue` 的页面职责，把筛选状态、筛选校验、列表查询参数构造和移动端队列判断移动到独立 composable：

- 新增 `src/composables/useImageAuditFilters.ts`
  - 管理审核范围、PID、p 页、复审周期、可用性状态和仅看异常图片等筛选状态。
  - 统一计算桌面端/移动端当前分页大小。
  - 保留 PID、p 页和复审周期的原校验规则与提示文案。
  - 构造列表查询参数，保持 `availabilityStatus`、`onlyBroken`、`pid`、`p` 的可选字段规则不变。
  - 保留移动端队列接口仅在非 `ALL`、无可用性筛选、未启用仅看异常时使用的判断逻辑。
  - 提供重置筛选动作，保持默认回到 `UNREVIEWED`、复审周期 30 天、页码回到 1。

`ImageAudit.vue` 现在继续负责请求执行、分页结果回写、审核提交和弹窗交互；筛选细节已经从页面脚本中拆出。这样后续如果要调整审核筛选规则，只需要集中修改 `useImageAuditFilters.ts`，不必在页面请求流程中穿插修改。

本轮保持 UI、筛选默认值、筛选校验提示、移动端队列接口切换条件、查询参数字段和重置筛选行为不变。

后续建议继续拆 `ImageAudit.vue`：

- 将可用性检测和批量检测状态抽到 composable。
- 将审核提交、批量审核和统计数量回写抽到审核动作 composable。
- 将表格列定义与移动端卡片拆成展示组件，进一步降低页面文件长度。

## 2026-07-02 第二十一轮补充
### 图片审核页面可用性检测抽离

本轮继续拆 `src/admin/ImageAudit.vue`，把图片可用性检测请求、检测结果回写和检测提示逻辑抽到独立 composable：

- 新增 `src/composables/useImageAuditAvailability.ts`
  - 管理 `availabilityCheckLoading`。
  - 对待检测图片 ID 去重，并保持单次最多检测 100 张的原限制。
  - 调用图片可用性检测接口并解包响应。
  - 将检测结果回写到当前列表中的可用性状态、检测时间、HTTP 状态、错误信息和失败次数。
  - 保留检测成功、部分失败、全部失败时的原提示文案。
  - 复用原有 API 错误忽略和错误展示规则。
  - 暴露可用性标签和详情 helper，保持模板展示调用点稳定。

`ImageAudit.vue` 现在只保留“检测当前页”和“检测已选图片”两个入口函数，具体请求、结果合并和提示逻辑都在 `useImageAuditAvailability.ts` 内部。这样后续调整可用性检测策略时，不再需要穿透页面的审核、筛选和弹窗代码。

本轮保持 UI、检测按钮 loading、空列表提示、检测数量限制、可用性状态展示、失败次数回写、HTTP 状态展示、错误提示和异常忽略行为不变。

后续建议继续拆 `ImageAudit.vue`：

- 将审核提交、批量审核和统计数量回写抽到审核动作 composable。
- 将表格列定义拆出，减少页面脚本中渲染函数体积。
- 将移动端卡片展示拆成轻量展示组件。

## 2026-07-02 第二十二轮补充
### 图片审核页面审核回写与批量审核抽离

本轮继续拆 `src/admin/ImageAudit.vue` 中审核动作相关逻辑，先把副作用边界清晰的两块移出页面：

- 新增 `src/composables/useImageAuditReviewSettlement.ts`
  - 统一处理审核完成后的选中项清理。
  - 在 `ALL` 范围中保留当前列表项，并回写最后审核状态、备注和审核时间。
  - 在非 `ALL` 范围中从当前列表移除已审核图片，并减少分页总数。
  - 按审核范围更新统计数量，保持未审核、到期复审和当前范围统计的原规则。
  - 当前页被清空但仍有数据时，保持原来的自动拉取下一页行为。

- 新增 `src/composables/useImageAuditBatchReview.ts`
  - 管理 `bulkAuditLoading`。
  - 调用批量审核接口。
  - 将成功审核的图片交给 settlement composable 回写列表和统计。
  - 保留批量标记正常、批量标记有问题、部分失败、全部失败时的原提示文案。
  - 复用原有 API 错误忽略和错误展示规则。

`ImageAudit.vue` 现在仍保留单张审核确认弹窗、批量问题弹窗和页面入口函数；审核结果落地与批量审核请求已经进入 composable。这样页面职责进一步收敛为“展示 + 用户确认 + 调用动作”，统计和列表一致性规则集中在 `useImageAuditReviewSettlement.ts`。

本轮保持 UI、单张审核确认流程、批量审核确认流程、批量失败提示、统计数量变化、页码回退/补拉数据、`ALL` 范围列表回写和非 `ALL` 范围移除已审核图片的行为不变。

后续建议继续拆 `ImageAudit.vue`：

- 将单张审核通过/问题提交动作也并入审核动作 composable。
- 将表格列定义拆出，减少页面脚本渲染函数体积。
- 将删除申请弹窗状态抽成 composable，复用已有删除申请 API 边界。

## 2026-07-02 第二十三轮补充
### 图片审核页面单张审核动作抽离

本轮继续收敛 `src/admin/ImageAudit.vue` 的审核动作职责，把单张审核通过和单张审核有问题的请求逻辑移到独立 composable：

- 新增 `src/composables/useImageAuditSingleReview.ts`
  - 提交单张审核通过请求。
  - 提交单张审核有问题请求。
  - 解包后端返回的成功提示，保留“已自动创建删除申请”等后端消息展示。
  - 成功后统一交给 `useImageAuditReviewSettlement.ts` 回写列表和统计。
  - 复用原有 API 错误忽略和错误展示规则。

`ImageAudit.vue` 现在保留确认弹窗、问题原因输入、弹窗开关和提交中状态；具体单张审核请求、成功提示和审核结果回写已经进入 `useImageAuditSingleReview.ts`。页面职责进一步变为“用户确认 + 调用动作”，请求细节留在 composable。

本轮保持 UI、审核通过确认弹窗、问题原因必填校验、问题审核成功后关闭弹窗、后端成功提示展示、错误提示和列表/统计回写行为不变。

后续建议继续拆 `ImageAudit.vue`：

- 将删除申请弹窗状态和提交动作抽成 composable。
- 将表格列定义拆出，减少页面脚本渲染函数体积。
- 将移动端卡片展示拆成轻量展示组件。

## 2026-07-02 第二十四轮补充
### 图片审核页面删除申请流程抽离

本轮继续拆 `src/admin/ImageAudit.vue`，把 `ALL` 范围下的图片删除申请流程抽到独立 composable：

- 新增 `src/composables/useImageAuditDeleteRequest.ts`
  - 管理删除申请弹窗显示状态。
  - 管理待申请删除图片的 `pid`、`p` 和删除原因。
  - 提供打开删除申请弹窗、提交删除申请、清理弹窗状态等动作。
  - 复用页面已有的 `submitting`，保持删除申请与其他提交动作共用 loading 的原行为。
  - 保留删除原因必填提示、提交成功提示、API 错误忽略和错误展示规则。

`ImageAudit.vue` 现在只保留删除申请弹窗模板和调用入口；删除申请状态和 API 提交已经进入 `useImageAuditDeleteRequest.ts`。关闭弹窗和组件卸载时仍调用同名 `clearDeleteRequestState`，清理时机不变。

本轮保持 UI、申请删除按钮、删除原因必填校验、提交成功文案、弹窗关闭清理、共享提交 loading 和错误提示行为不变。

后续建议继续拆 `ImageAudit.vue`：

- 将表格列定义拆出，减少页面脚本渲染函数体积。
- 将移动端卡片展示拆成轻量展示组件。
- 将弹窗状态继续归并，减少页面脚本中的局部状态数量。

## 2026-07-02 第二十五轮补充
### 图片审核页面表格列定义抽离

本轮继续收敛 `src/admin/ImageAudit.vue` 的展示职责，把桌面端审核表格列定义从页面脚本中移到独立 composable：

- 新增 `src/composables/useImageAuditColumns.ts`
  - 管理审核表格的全选列和单行复选框渲染。
  - 保留缩略图 `NImage` 的懒加载、预览图高度、`referrerpolicy`、`loading` 和 `decoding` 配置。
  - 保留图片信息列中的 `pid`、`p`、图片 ID、原图链接和图片地址展示。
  - 保留类型、可用性、上次审核、上传时间和操作列的标签、文案与按钮规则。
  - 保留 `ALL` 范围下申请删除，其他审核范围下通过/有问题的操作分支。

`ImageAudit.vue` 现在通过 `useImageAuditColumns` 注入页面已有状态和动作，只负责组合列表、筛选、弹窗与移动端模板；桌面端表格渲染函数不再堆在页面脚本里。这样后续调整表格列或单元格展示时，可以集中修改 `useImageAuditColumns.ts`，不必穿插到请求、审核和筛选逻辑中。

本轮保持 UI、表格列顺序、复选框状态、图片预览、可用性展示、审核信息展示、申请删除按钮、通过/有问题按钮和禁用 loading 行为不变。

后续建议继续拆 `ImageAudit.vue`：

- 将移动端卡片展示拆成轻量展示组件。
- 将审核确认弹窗与批量问题弹窗状态继续归并。
- 在页面行数进一步下降后，复查注释，只保留业务约束和不易从代码直接看出的说明。

## 2026-07-02 第二十六轮补充
### AI 绘图任务展示组件抽离

本轮回到 `src/views/dashboard/AiDraw.vue`，优先拆除页面中职责清晰、交互边界稳定的任务展示模板：

- 新增 `src/components/ai-draw/AiDrawActiveJobCard.vue`
  - 承接“当前任务”卡片。
  - 保留生成中骨架屏、失败空态、生成状态标签、广场审核状态、错误提示、30 天保留提示、云端原图清理提示和下载按钮。
  - 通过 `download` 事件把下载动作交回页面原有 `downloadJob`，不改变下载流程。
- 新增 `src/components/ai-draw/AiDrawRecentJobsCard.vue`
  - 承接“最近生成”卡片。
  - 保留历史加载骨架屏、横向移动端滚动、图片预览、状态标签、生成时间、提示词摘要和“复用参数”按钮。
  - 通过 `reuse` 事件把复用动作交回页面原有 `fillAgain`，不改变参数回填流程。

`AiDraw.vue` 现在不再直接维护当前任务和最近生成的图片、标签、骨架屏与响应式样式，页面继续负责生成表单、资源加载、草稿恢复、任务生成和事件编排。页面行数从约 1952 行下降到约 1675 行。

本轮保持 UI、卡片顺序、当前任务置顶规则、图片预览参数、下载按钮、复用参数按钮、状态文案、移动端最近生成横向滚动和所有业务动作不变。

后续建议继续拆 `AiDraw.vue`：

- 将资产组合选择区拆成展示组件，保留选择/清空事件回传。
- 将双角色布局参考面板拆成组件，集中维护 canvas 工具条和移动端尺寸。
- 将页面生命周期中的草稿恢复、历史复用和 resize 监听整理为小 composable。

## 2026-07-02 第二十七轮补充
### AI 绘图资产组合组件抽离

本轮继续收敛 `src/views/dashboard/AiDraw.vue` 的模板职责，把主角色资产组合与双角色模式下的角色 B 资产组合抽成统一展示组件：

- 新增 `src/components/ai-draw/AiDrawAssetComposer.vue`
  - 统一展示角色预设、LoRA、风格预设和角色 B / LoRA B 卡片。
  - 复用原有资产摘要规则 `getAiDrawAssetCompactSummary`。
  - 保留主角色“配置资产组合 / 清空角色 / 清空 LoRA”按钮。
  - 保留角色 B“配置角色 B 资产 / 清空角色 B / 清空 LoRA B”和 LoRA B 强度输入。
  - 通过事件把打开资产页、打开角色/LoRA/风格选择、清空资产、更新角色 B LoRA 强度交回父页面。

`AiDraw.vue` 现在不再直接维护资产组合卡片的嵌套模板和响应式样式，页面继续负责路由跳转、草稿捕获、清空表单字段、双角色模式和生成参数。页面行数从约 1675 行下降到约 1532 行。

本轮保持 UI、主资产/角色 B 卡片顺序、按钮文案、清空禁用条件、风格摘要、LoRA B 强度范围、移动端单列布局、资产选择跳转和清空逻辑不变。

后续建议继续拆 `AiDraw.vue`：

- 将双角色布局参考面板拆成组件，集中维护 canvas 工具条、状态标签和尺寸样式。
- 将提示词注入预览与编辑弹窗拆成轻量组件。
- 将页面生命周期中的草稿恢复、历史复用和 resize 监听整理为小 composable。

## 2026-07-02 第二十八轮补充
### AI 绘图双角色布局参考面板抽离

本轮继续拆 `src/views/dashboard/AiDraw.vue`，把双角色模式下的“角色布局参考”面板抽成独立组件：

- 新增 `src/components/ai-draw/AiDrawCharacterMaskPanel.vue`
  - 承接布局参考标题、说明文案、状态标签、角色 A/B 画笔切换、笔刷大小输入、撤销、清空和 canvas 容器样式。
  - 通过 `v-model:role` 和 `v-model:brush` 回传当前绘制角色与笔刷大小。
  - 通过 `canvasReady` 把真实 canvas 元素交回父页面原有 `useAiDrawCharacterMask` composable。
  - 通过事件回传 pointer 绘制、撤销和清空动作，保留原有绘制逻辑和 mask 序列化规则。

`AiDraw.vue` 现在不再直接维护布局参考面板的 DOM、工具条和 canvas 样式，页面继续负责调用 `useAiDrawCharacterMask`、生成 mask JSON、草稿/历史恢复和 resize 重绘。页面行数从约 1532 行下降到约 1447 行。

本轮保持 UI、画角色 A/B 切换、笔刷范围、撤销/清空禁用条件、canvas 宽高比例、pointer 绘制行为、布局参考启用条件和生成 payload 中的 mask 行为不变。

后续建议继续拆 `AiDraw.vue`：

- 将提示词注入预览与编辑弹窗拆成轻量组件。
- 将高级参数表单拆成组件，集中维护步数、CFG、Seed、风格 tag 和触发词字段。
- 将页面生命周期中的草稿恢复、历史复用和 resize 监听整理为小 composable。

## 2026-07-02 第二十九轮补充
### AI 绘图提示词注入编辑组件抽离

本轮继续拆 `src/views/dashboard/AiDraw.vue`，把“将注入”提示条和“预设注入的提示词”编辑弹窗抽成独立组件：

- 新增 `src/components/ai-draw/AiDrawInjectedTagsEditor.vue`
  - 承接注入标签预览条、查看/编辑入口、标签云、正向提示词输入和反向提示词输入。
  - 组件内部管理弹窗开关，父页面不再持有 `injectedTagsOpen`。
  - 通过 `v-model:positive-prompt` 和 `v-model:negative-prompt` 回写父页面表单字段。
  - 保留原有弹窗宽度、标签云高度、输入框 autosize 和提示条省略展示。

`AiDraw.vue` 现在只把可编辑标签列表、预览文案、显示条件和正反向提示词交给组件，不再直接维护提示词注入弹窗 DOM 与样式。页面行数从约 1447 行下降到约 1362 行。

本轮保持 UI、查看/编辑按钮、弹窗标题、标签列表、正向/反向提示词编辑、预览省略、弹窗尺寸和提示词回写行为不变。

后续建议继续拆 `AiDraw.vue`：

- 将高级参数表单拆成组件，集中维护步数、CFG、Seed、风格 tag 和触发词字段。
- 将生成模式、NSFW、画幅、提示词输入等基础表单区拆成表单组件。
- 将页面生命周期中的草稿恢复、历史复用和 resize 监听整理为小 composable。

## 2026-07-02 第三十轮补充
### 积分调用顶部概览组件抽离

本轮回到 `src/views/dashboard/PointsCall.vue`，优先拆除无业务副作用、只负责展示的顶部概览区：

- 新增 `src/components/points-call/PointsCallOverview.vue`
  - 承接“当前积分 / 单次消耗 / 本次结果”三张概览卡。
  - 通过 props 接收积分、管理员状态、加载状态、单次消耗和结果数量。
  - 保留管理员无限积分、加载占位、免扣费文案、结果数量展示和移动端单列布局。
  - 将概览区样式迁入组件，父页面不再保留已经失效的 scoped 样式。

`PointsCall.vue` 现在只负责把页面状态传给概览组件，不再维护概览卡 DOM 与样式。页面行数从约 1429 行下降到约 1370 行。

本轮保持 UI、三张概览卡顺序、管理员展示、积分加载占位、单次消耗文案、本次结果数量和响应式布局不变。

后续建议继续拆 `PointsCall.vue`：

- 将左侧调用表单拆成组件，保留 `form` 的双向更新和调用按钮事件。
- 将右侧结果卡组拆成展示组件，集中维护卡组切换、图片预览和角标操作。
- 将收藏夹选择弹窗拆成轻量组件，降低页面底部弹窗模板噪音。

## 2026-07-02 第三十一轮补充
### 积分调用左侧请求卡片抽离

本轮继续拆 `src/views/dashboard/PointsCall.vue`，把左侧“当前积分 + 调用表单”整张卡片抽成组件：

- 新增 `src/components/points-call/PointsCallRequestCard.vue`
  - 承接当前积分标题区、管理员标签、刷新/流水按钮、积分不足提示、R18、返回数量、关键词、标签、尺寸、排除 AI 和立即调用按钮。
  - 通过 `v-model` 回写 `r18`、`num`、`keyword`、`tagText`、`size` 和 `excludeAI`，父页面仍然持有原来的 `form`。
  - 通过 `refresh`、`logs`、`call` 事件把刷新积分、跳转流水和执行调用交回父页面。
  - 保留原有点击火花顺序：父页面仍在 `call` 事件中先执行 `createClickSpark(e)`，再执行 `callSetu()`。
  - 将侧栏头部、积分数字、磁性按钮和表单样式迁入组件，父页面不再保留表单专属样式。

`PointsCall.vue` 现在继续负责积分状态、表单数据、调用流程、路由跳转、结果展示和弹窗编排；请求卡片只负责输入展示与事件转发。页面行数从约 1370 行下降到约 1141 行。

本轮保持 UI、字段顺序、选项内容、输入范围、排除 AI 开关默认字段、管理员无限积分、积分不足提示、刷新/流水按钮、调用按钮 loading/disabled、点击火花和真实调用顺序不变。

后续建议继续拆 `PointsCall.vue`：

- 将右侧结果卡组拆成展示组件，集中维护卡组切换、图片预览、原图查看、下载、收藏和删除申请入口。
- 将收藏夹选择弹窗拆成轻量组件，减少页面底部弹窗模板噪音。
- 如果结果卡组拆分后页面仍偏大，再把右侧结果元信息区拆成小组件。

## 2026-07-02 第三十二轮补充
### 积分调用结果卡组组件抽离

本轮继续拆 `src/views/dashboard/PointsCall.vue`，把右侧“返回结果”整块展示抽成组件：

- 新增 `src/components/points-call/PointsCallResultDeck.vue`
  - 承接结果标题、数量标签、加载骨架屏、空态、图片卡组、上一张/下一张、底部序号、图片预览、角标、原图查看、原图下载、收藏、删除申请和结果元信息。
  - 组件内部复用 `pickPointsCallCoverSrc`、`pickPointsCallPreviewSrc`、`pickPointsCallOriginalSrc`、`getVisiblePointsCallTags` 和 `getHiddenPointsCallTagCount`。
  - 通过 `showPrevious`、`showNext`、`select`、`openOriginal`、`download`、`favorite`、`deleteRequest` 事件把业务动作交回父页面。
  - 将右侧卡片、卡组、图片、角标、元信息、标签和移动端响应式样式迁入组件。

`PointsCall.vue` 现在只负责页面标题、积分概览、请求卡片、结果状态编排、收藏弹窗和删除申请弹窗。页面行数从约 1141 行下降到约 368 行，`PointsCallResultDeck.vue` 暂时较大，但它的职责集中在单一展示区域，后续可继续按“图片卡片 / 元信息 / 工具条”拆小。

本轮保持 UI、加载骨架屏、空态文案、图片预览地址优先级、卡组切换、当前卡 hover、R-18/P 角标、查看原图、原图下载、收藏、删除申请、标签数量省略和移动端布局参数不变。

后续建议继续拆 `PointsCall`：

- 将 `PointsCallResultDeck.vue` 内部的活跃图片卡片抽成 `PointsCallResultCard.vue`。
- 将收藏夹选择弹窗抽成 `PointsCallFavoriteModal.vue`，让页面底部只保留业务弹窗绑定。
- 复查 `PointsCallResultDeck.vue` 的样式，按工具条、卡片、元信息分段整理注释，避免单组件样式继续膨胀。

## 2026-07-02 第三十三轮补充
### 积分调用结果图片卡片抽离

本轮继续收敛 `src/components/points-call/PointsCallResultDeck.vue`，把单张结果图片卡片抽成子组件：

- 新增 `src/components/points-call/PointsCallResultCard.vue`
  - 承接图片预览、非当前卡片静态图、查看原图、原图下载、收藏、删除申请、R-18/P 角标和非当前卡片序号。
  - 组件内部复用图片地址选择 helper，保持 cover / preview / original 的优先级不变。
  - 通过 `openOriginal`、`download`、`favorite`、`deleteRequest` 事件继续把业务动作交给 `PointsCallResultDeck.vue`，再由 `PointsCallResultDeck.vue` 透传给页面。
  - 将图片卡片、按钮、角标、hover、入场动画和移动端卡片样式迁入子组件。

`PointsCallResultDeck.vue` 现在专注于结果区域外壳、加载/空态、卡组定位、上一张/下一张、序号 tabs 和结果元信息。行数从约 799 行下降到约 485 行，`PointsCallResultCard.vue` 约 356 行。

本轮保持 UI、图片预览行为、非当前卡片静态图片展示、角标规则、原图查看、下载、收藏、删除申请、非当前卡片序号、hover 效果和移动端卡片尺寸不变。

后续建议继续拆 `PointsCall`：

- 将收藏夹选择弹窗抽成 `PointsCallFavoriteModal.vue`，让页面底部只保留弹窗状态绑定。
- 将结果元信息区抽成 `PointsCallResultInfo.vue`，进一步降低 `PointsCallResultDeck.vue` 的模板密度。
- 视最终行数再考虑是否把结果区工具条拆成小组件。

## 2026-07-02 第三十四轮补充
### 积分调用收藏弹窗抽离

本轮继续收尾 `src/views/dashboard/PointsCall.vue`，把页面底部的收藏夹选择弹窗抽成独立组件：

- 新增 `src/components/points-call/PointsCallFavoriteModal.vue`
  - 承接收藏弹窗标题、提示标签、收藏夹选择器、取消按钮和确认收藏按钮。
  - 通过 `v-model:show` 控制弹窗显隐，通过 `v-model:selected-id` 回写选中的收藏夹 ID。
  - 通过 `submit` 事件把确认收藏动作交回父页面原有 `submitFav`。
  - 保留默认收藏夹星标展示、弹窗宽度、按钮文案、确认按钮颜色和 loading 状态。
  - 将弹窗表单行、标签和操作按钮样式迁入组件，父页面不再保留收藏弹窗 UI 依赖。

`PointsCall.vue` 现在只负责页面标题、积分状态、调用表单状态、结果状态、收藏业务状态和删除申请弹窗绑定。页面行数从约 368 行下降到约 312 行。

本轮保持 UI、收藏夹选项内容、默认收藏夹星标、取消关闭、确认收藏、loading、收藏业务流程和 API 调用位置不变。

后续建议继续拆 `PointsCall`：

- 将结果元信息区抽成 `PointsCallResultInfo.vue`，继续降低 `PointsCallResultDeck.vue` 模板密度。
- 将滚动进度条和点击火花相关 DOM/CSS 收敛到小组件或 composable 附带组件，减少页面视觉特效样式。
- 如果后续新增积分调用能力，应继续把 API 与业务状态放在 composable，页面只做编排。

## 2026-07-02 第三十五轮补充
### 音乐播放器歌单弹窗组件抽离

本轮开始拆 `src/views/dashboard/MusicPlayer.vue`，优先处理边界清晰、风险较低的歌单弹窗：

- 新增 `src/components/music/AddToPlaylistModal.vue`
  - 承接“添加到歌单”弹窗、当前歌曲提示、歌单加载骨架屏、空歌单提示、创建新歌单入口和歌单列表。
  - 通过 `v-model:show` 控制显隐，通过 `create` 事件打开创建歌单弹窗，通过 `selectPlaylist` 事件把选中的歌单 ID 交回父页面。
  - 将添加到歌单弹窗专属样式从父页面迁入组件，父页面不再维护歌单列表弹窗的 UI 细节。
- 新增 `src/components/music/CreatePlaylistModal.vue`
  - 承接“创建新歌单”弹窗、歌单名称、描述、封面 URL 和公开/私密开关。
  - 通过 `v-model:form` 回写创建表单，通过 `v-model:show` 控制显隐，通过 `submit` 和 `cancel` 事件复用父页面原有创建/取消逻辑。
  - 将原来的内联 `style` 改为组件内 scoped class，减少页面模板里的样式噪音。

`MusicPlayer.vue` 继续负责搜索、播放、下载、MV、歌单加载、添加歌曲和创建歌单的业务流程；两个新组件只负责弹窗展示和事件转发。页面行数从约 1716 行下降到约 1571 行。

本轮保持 UI、弹窗标题、按钮文案、空态文案、骨架屏、歌单字段、创建表单字段、公开/私密取值、添加歌曲到歌单流程、创建后自动添加当前歌曲流程和错误处理不变。

后续建议继续拆 `MusicPlayer.vue`：

- 将搜索输入、热门搜索和历史搜索下拉抽成 `MusicSearchPanel.vue`，把 localStorage 历史搜索逻辑迁入 composable。
- 将搜索结果列表里的单首歌曲行抽成 `MusicSearchResultItem.vue`，集中维护播放、加入播放队列、加入歌单、下载和 MV 按钮。
- 将 MV URL 解析和播放前 URL 规范化迁入 `useMusicMvPlayback.ts`，让页面只保留事件编排。

## 2026-07-02 第三十六轮补充
### 音乐播放器搜索结果行组件抽离

本轮继续拆 `src/views/dashboard/MusicPlayer.vue`，把搜索结果列表中的单首歌曲行抽成独立组件：

- 新增 `src/components/music/MusicSearchResultItem.vue`
  - 承接歌曲封面、无封面占位、歌曲名、歌手、专辑、时长、播放、加入播放列表、添加到歌单、下载和 MV 播放按钮。
  - 组件内部复用 `formatDuration`，父页面不再关心单行展示格式。
  - 通过 `play`、`addToQueue`、`addToPlaylist`、`download`、`playMv` 事件把所有业务动作交回父页面原有方法。
  - 将 `.song-item`、封面、歌曲信息、时长、操作按钮和移动端布局样式迁入组件。

`MusicPlayer.vue` 现在的搜索结果区域只负责加载态、结果数量、循环渲染、加载更多和空态；单首歌曲行的 UI 与按钮布局由组件维护。页面行数从约 1571 行下降到约 1359 行。

本轮保持 UI、封面懒加载、无封面占位、歌曲名/歌手/专辑展示、时长格式、当前播放高亮、播放、加入队列、添加到歌单、下载、MV 按钮显示条件和移动端布局不变。

后续建议继续拆 `MusicPlayer.vue`：

- 将搜索输入、热门搜索和历史搜索下拉抽成 `MusicSearchPanel.vue`，让父页面只处理搜索事件和列表状态。
- 将搜索历史的 localStorage 读写迁入 `useMusicSearchHistory.ts`，集中处理容量限制、去重和容错。
- 将 MV URL 解析和 `http -> https` 降级信息封装到 `useMusicMvPlayback.ts`。

## 2026-07-02 第三十七轮补充
### 音乐搜索历史状态抽离

本轮继续拆 `src/views/dashboard/MusicPlayer.vue`，把搜索历史的本地状态和持久化逻辑抽到 composable：

- 新增 `src/composables/useMusicSearchHistory.ts`
  - 集中维护 `searchHistory`、加载历史、保存历史、清空历史和删除单条历史。
  - 保留原有 `music_search_history` localStorage key、最多 10 条、重复关键词置顶和静默容错行为。
  - 读取历史时增加数组校验，避免 localStorage 被异常内容污染后影响页面状态。
  - 清空历史返回是否成功，父页面继续负责成功提示，避免 composable 绑定具体 UI 消息实现。

`MusicPlayer.vue` 现在不再直接读写 localStorage，只保留搜索流程、热门搜索、分页和 UI 反馈编排。页面行数从约 1359 行下降到约 1325 行。

本轮保持搜索历史展示、清空按钮、删除单条、搜索后保存、去重、最大数量限制和清空成功提示不变。

后续建议继续拆 `MusicPlayer.vue`：

- 将搜索输入、热门搜索和历史搜索下拉抽成 `MusicSearchPanel.vue`，复用 `useMusicSearchHistory` 暴露的状态和方法。
- 将热门搜索加载逻辑迁入 `useMusicHotSearch.ts`，把接口缓存、loading 和失败空列表统一维护。
- 将搜索请求分页迁入 `useMusicSearchResults.ts`，让页面只负责播放、下载、歌单和 MV 事件。

## 2026-07-02 第三十八轮补充
### 音乐热门搜索状态抽离

本轮继续拆 `src/views/dashboard/MusicPlayer.vue`，把热门搜索接口状态抽成 composable：

- 新增 `src/composables/useMusicHotSearch.ts`
  - 集中维护 `hotSearchList`、`loadingHotSearch`、`fetchHotSearch` 和 `formatHotCount`。
  - 保留原有“已加载过则不重复请求”的缓存行为。
  - 保留接口失败时回落为空列表、loading 在 `finally` 中收尾的行为。
  - 热度格式化继续沿用 `10000 -> x.x万` 的展示规则。

`MusicPlayer.vue` 现在不再直接处理热门搜索 API、unwrap 和热度格式化，只保留下拉显隐、输入焦点和搜索触发编排。页面行数从约 1325 行下降到约 1297 行。

本轮保持热门搜索下拉展示、加载骨架屏、空态、前 10 条展示、点击热门词发起搜索、热度文案和请求缓存行为不变。

后续建议继续拆 `MusicPlayer.vue`：

- 将搜索输入、热门搜索和历史搜索下拉抽成 `MusicSearchPanel.vue`，组合 `useMusicSearchHistory` 与 `useMusicHotSearch`。
- 将搜索请求分页迁入 `useMusicSearchResults.ts`，集中维护 `searching`、`loadingMore`、`hasMore` 和 `totalSearched`。
- 将网易云原始歌曲字段映射抽成 `mapNeteaseSongToSong`，避免映射结构散落在页面里。

## 2026-07-02 第三十九轮补充
### 音乐搜索结果分页逻辑抽离

本轮继续拆 `src/views/dashboard/MusicPlayer.vue`，把搜索请求、分页状态和网易云原始字段映射抽成 composable：

- 新增 `src/composables/useMusicSearchResults.ts`
  - 集中维护 `searchKeyword`、`searching`、`searchResults`、`loadingMore`、`hasMore` 和 `totalSearched`。
  - 提供 `searchFirstPage`、`loadMoreSearchResults`、`resetSearchResults` 和 `clearSearchResultsIfNeeded`。
  - 将网易云搜索返回的 `ar`、`al`、`dt`、`mv` 字段统一映射为前端 `Song` 结构。
  - 保留首屏搜索、加载更多、空结果、超时、网络失败和 500 Token 异常提示文案。
  - 通过注入 `message` 和 `onError` 复用页面原有消息实现，不把 composable 绑定到具体 UI 页面。

`MusicPlayer.vue` 现在不再直接维护搜索分页状态、offset 计算、接口 unwrap 和原始歌曲映射，只保留输入校验、关闭热门搜索下拉、保存搜索历史和触发搜索的编排。页面行数从约 1297 行下降到约 1196 行。

本轮保持搜索按钮、回车搜索、清空关键词时重置结果、首次搜索结果提示、加载更多提示、`hasMore` 判断、搜索结果数量、歌曲字段展示和错误处理文案不变。

后续建议继续拆 `MusicPlayer.vue`：

- 将搜索输入、热门搜索和历史搜索下拉抽成 `MusicSearchPanel.vue`，组合现有三个搜索 composable。
- 将下载逻辑抽成 `useMusicDownload.ts`，集中处理播放 URL 获取、签名下载 URL 和文件名生成。
- 将 MV URL 解析和 `http -> https` 降级信息封装到 `useMusicMvPlayback.ts`。

## 2026-07-02 第四十轮补充
### 音乐下载流程抽离

本轮继续拆 `src/views/dashboard/MusicPlayer.vue`，把歌曲下载流程抽成 composable：

- 新增 `src/composables/useMusicDownload.ts`
  - 集中处理 `userMusicApi.getUrl(song.id, 'exhigh')`、播放地址选择、资源不可用提示、下载文件名生成和签名下载。
  - 保留原有文件名格式：`歌曲名 - 歌手1, 歌手2.mp3`。
  - 保留“正在准备下载...” loading、`window.location.href` 触发下载和“下载失败”错误提示。
  - 复用 `shouldIgnoreApiError` 与 `showApiError`，取消请求继续静默忽略。

`MusicPlayer.vue` 现在不再直接依赖 `signDownloadUrl`、`getPlayableUrl` 和 `getMusicUnavailableMessage`，搜索结果行的下载事件直接交给 `downloadSong`。页面行数从约 1196 行下降到约 1160 行。

本轮保持下载按钮、音质参数、不可用资源提示、签名下载、下载 loading、文件名格式和错误处理文案不变。

后续建议继续拆 `MusicPlayer.vue`：

- 将 MV URL 解析和 `http -> https` 降级信息封装到 `useMusicMvPlayback.ts`。
- 将歌单加载、添加歌曲、创建歌单后的自动添加抽成 `useMusicPlaylistActions.ts`。
- 将搜索输入、热门搜索和历史搜索下拉抽成 `MusicSearchPanel.vue`，进一步减少页面模板密度。

## 2026-07-02 第四十一轮补充
### 音乐歌单与 MV 播放逻辑抽离

本轮继续拆 `src/views/dashboard/MusicPlayer.vue`，把搜索结果页中剩余的歌单弹窗业务和 MV 播放请求迁入 composable：

- 新增 `src/composables/useMusicPlaylists.ts`
  - 集中维护添加到歌单弹窗、新建歌单弹窗、选中歌曲、我的歌单列表、歌单 loading 和新建歌单表单。
  - 保留 `getMyPlaylists` 加载失败时回落空列表的行为。
  - 保留添加歌曲时的字段映射：歌曲 ID、歌曲名、歌手、专辑、封面和时长。
  - 保留添加重复歌曲时 `409` 转换为“歌曲已存在于歌单中”的提示。
  - 保留新建歌单成功后重置表单、关闭创建弹窗，以及存在选中歌曲时自动添加到新歌单的流程。

- 新增 `src/composables/useMusicMvPlayback.ts`
  - 集中处理 MV 播放地址请求、响应结构兼容、地址有效性校验和播放器调用。
  - 保留原有数组、`data` 包裹对象、直接 `url` 对象三种响应结构兼容。
  - 保留 `http -> https` 转换，并继续把原始 HTTP 地址传给播放器作为降级地址。
  - 保留无 MV、请求超时、网络失败和通用失败的提示文案。
  - 在 `http -> https` 兼容逻辑处保留注释，因为这是浏览器混合内容限制导致的非直观业务约束。

`MusicPlayer.vue` 现在不再直接依赖 `userPlaylistApi`、`userMusicApi.getMvUrl`、歌单 DTO 映射、MV 响应解析和 MV 地址降级细节，只负责把搜索结果行事件分发给对应 composable。页面行数从约 1160 行下降到约 965 行，首次低于 1000 行。

本轮保持添加到歌单弹窗、新建歌单弹窗、重复歌曲提示、新建后自动添加、MV 播放、MV 地址 HTTPS 兼容和错误提示逻辑不变。

后续建议继续拆 `MusicPlayer.vue`：

- 将搜索输入、热门搜索和历史搜索下拉抽成 `MusicSearchPanel.vue`，进一步减少模板密度。
- 将播放歌曲和加入播放队列抽成 `useMusicPlaybackActions.ts`，让页面中的播放入口和下载、歌单、MV 保持同一组织方式。
- 继续检查 `ProfileView.vue`、`CollectionSquare.vue`、`Favorites.vue` 等千行级页面，按“状态 composable + 展示组件 + API 边界”的方式逐步降低页面复杂度。

## 2026-07-02 第四十二轮补充
### 收藏夹广场数据与展示辅助抽离

本轮开始拆 `src/views/dashboard/CollectionSquare.vue`，优先处理脚本区中最稳定的两类逻辑：列表数据/互动操作，以及封面、预览图、标签和热度文案等展示辅助。

- 新增 `src/composables/useCollectionSquareData.ts`
  - 集中维护 `keyword`、`sortType`、`loading`、`collections`、`pagination`、精选收藏夹、首屏 hero、图片总数和互动总数。
  - 集中处理 `getSquareCollections` 请求、请求竞态保护、分页、搜索、排序和翻页后回到顶部。
  - 保留后端分页字段兼容：`list`、`items`、`records` 都可作为列表来源。
  - 保留后端字段映射：`shareLikeCount -> likeCount`、`shareFavCount -> favoriteCount`、`likedByMe -> isLiked`、`favoritedByMe -> isFavorited`。
  - 集中处理点赞、取消点赞、收藏、取消收藏，并保留原有成功提示和失败提示前缀。

- 新增 `src/composables/useCollectionSquareViewHelpers.ts`
  - 集中处理封面 URL、预览图 URL、预览图兜底、标签去重截断、氛围文案、新鲜度文案、收藏夹强度文案和热力标签。
  - 保留后端直接返回 `coverUrl` 时优先使用的规则。
  - 保留缺少 `coverUrl` 时按 `IMAGE_CDN_URL/c/600x600_90/img-master/...` 拼接封面的降级逻辑。
  - 在 CDN 降级拼接处保留注释，因为这是依赖后端资源网关路径约定的非直观兼容逻辑。

- 新增 `src/composables/useScrollProgress.ts`
  - 统一维护页面滚动进度条状态、滚动监听和 RAF 清理。
  - 增加 `scrollHeight <= 0` 时回落为 `0` 的保护，避免极短页面产生异常进度。

- 新增 `src/composables/usePointerRipple.ts`
  - 抽离按钮/卡片点击涟漪 DOM 操作。
  - 保留移动端禁用和 `prefers-reduced-motion` 禁用逻辑，避免影响可访问性与移动端性能。

`CollectionSquare.vue` 现在不再直接处理广场接口、点赞收藏接口、列表字段标准化、封面兜底、标签标准化、滚动监听和涟漪 DOM 操作。页面行数从约 1420 行下降到约 1295 行。

本轮保持收藏夹广场的搜索、排序、分页、精选区、卡片展示、预览图、标签、点赞收藏、跳转详情、跳转用户主页、滚动进度条和涟漪效果不变。

后续建议继续拆 `CollectionSquare.vue`：

- 将顶部 hero/统计区域抽成 `CollectionSquareHero.vue`。
- 将收藏夹卡片抽成 `CollectionSquareCard.vue`，承接预览图、标签、互动按钮和用户信息展示。
- 将空态、加载态和分页区域拆成局部展示组件，进一步降低模板密度。

## 2026-07-02 第四十三轮补充
### 个人中心账户业务抽离

本轮开始拆 `src/views/dashboard/ProfileView.vue`，优先把脚本区中与页面布局无关的账户业务迁入 composable：

- 新增 `src/composables/useProfilePasskeys.ts`
  - 集中维护通行密钥列表、加载状态、提交状态、添加弹窗、重命名弹窗、昵称输入和重命名目标。
  - 保留浏览器/安全上下文能力判断，不支持 WebAuthn 时继续提示“当前浏览器或环境不支持通行密钥”。
  - 保留默认设备名推断：iPhone/iPad、MacBook Touch ID、Windows Hello、Android 设备和通用“我的通行密钥”。
  - 保留 WebAuthn 注册流程：获取注册 options、规范化 `publicKey`、调用 `create`、提交 credential、刷新列表。
  - 保留业务错误码文案：已绑定、邮箱未验证、challenge 过期，以及用户取消验证时的 warning。
  - 保留重命名、删除确认、删除成功刷新列表和各类失败提示。

- 新增 `src/composables/useProfileCollectionStats.ts`
  - 集中维护个人中心展示用的收藏夹总数、收藏夹摘要列表和 loading。
  - 保留加载失败静默处理，不影响个人中心基础信息展示。
  - 保留 `isDefault` 布尔映射和 `visibility` 数字化处理。

- 新增 `src/composables/useProfileAccountActions.ts`
  - 集中处理修改昵称、上传头像和修改密码。
  - 保留昵称不能为空校验、修改成功后重新加载个人资料。
  - 保留头像类型校验、2MB 大小限制、头像成功后同步更新 Pinia 头像。
  - 保留密码完整性校验、最短 6 位校验、两次输入一致校验。
  - 保留密码修改成功后清空本地登录状态并跳转登录页。

`ProfileView.vue` 现在不再直接处理通行密钥 WebAuthn 细节、收藏夹统计接口、昵称保存、头像上传和密码修改。页面脚本区从约 400 行下降到约 135 行，总文件行数从约 1404 行下降到约 1294 行。

本轮保持个人中心 UI、资料展示、收藏夹统计、通行密钥管理、昵称编辑、头像上传、密码修改和跳转逻辑不变。

后续建议继续拆 `ProfileView.vue`：

- 将用户资料卡片抽成 `ProfileIdentityCard.vue`，承接头像、基础资料、昵称编辑入口。
- 将账户安全区抽成 `ProfileSecurityPanel.vue`，承接密码修改和通行密钥列表。
- 将收藏夹统计卡片抽成 `ProfileCollectionSummary.vue`，进一步降低模板密度。

## 2026-07-02 第四十四轮补充
### 我的收藏主流程抽离

本轮开始拆 `src/views/dashboard/Favorites.vue`，先处理页面中最核心、复用关系最明确的收藏夹列表与内容列表主流程。

- 新增 `src/composables/useFavoritesCollections.ts`
  - 集中维护左侧收藏夹 loading、收藏夹列表、当前选中收藏夹、右侧图片列表、分页和当前收藏夹是否默认收藏夹。
  - 保留收藏夹接口返回字段映射：`id` 数字化、`visibility` 数字化、`isDefault` 布尔化、`isShared` 布尔化。
  - 保留首次进入时优先选中默认收藏夹；原选中收藏夹不存在时回落到默认收藏夹或第一个收藏夹。
  - 保留默认收藏夹走 `getFavoriteList`，非默认收藏夹走 `getCollectionItems` 的数据源分流。
  - 保留收藏图片字段映射：`itemId/favoriteId`、`pid/p`、标题、作者、常规图、原图、尺寸和 R18 标记。
  - 保留分页切换后滚动到顶部、原图链接无效提示、从当前收藏夹移除后本地列表与总数同步。
  - 暴露 `patchCollection`、`removeItemFromCurrentList` 等最小必要方法，供页面剩余的分享、封面和移动逻辑复用同一份状态。

- 新增 `src/composables/useFavoritesCollectionEditor.ts`
  - 集中维护新建/编辑弹窗状态、表单和保存 loading。
  - 保留新建收藏夹名称必填、描述 trim、可见性提交。
  - 保留默认收藏夹只更新描述，非默认收藏夹才允许修改名称和可见性的行为。
  - 保留默认收藏夹不可删除、删除后清空当前选中并刷新全量数据。

- 新增 `src/composables/useFavoritesShare.ts`
  - 集中维护分享弹窗、公开分享链接、是否可分享、分享到广场 loading 和当前收藏夹是否已分享到广场。
  - 保留只允许公开的非默认收藏夹分享的限制与提示。
  - 保留复制链接、打开公开链接、跳转广场、分享到广场和取消分享到广场逻辑。
  - 保留分享/取消分享成功后通过 `patchCollection` 同步当前收藏夹 `isShared` 状态。

- 新增 `src/composables/useFavoritesCover.ts`
  - 集中处理设置收藏夹封面。
  - 保留默认收藏夹不支持设置封面的限制。
  - 保留已分享到广场时提示“广场页面封面已同步更新”的行为。

- 新增 `src/composables/useFavoritesMoveItem.ts`
  - 集中维护移动/复制弹窗、目标收藏夹、操作模式、提交 loading 和目标选项。
  - 保留目标列表排除当前收藏夹、没有其它收藏夹时提示先新建的行为。
  - 保留先添加到目标收藏夹，再按移动模式从当前收藏夹移除的顺序。
  - 保留默认收藏夹移动时调用 `removeFavorite`，非默认收藏夹移动时调用 `removeFromCollection` 的分流。

`Favorites.vue` 现在不再直接处理收藏夹列表请求、收藏内容分页请求、收藏内容行映射、分页切换、从当前收藏夹移除、新建收藏夹、编辑收藏夹、删除收藏夹、公开分享、分享到广场、设置封面和移动/复制图片。页面行数从约 1228 行下降到约 892 行，脚本区下降到约 141 行。

本轮保持我的收藏 UI、默认/非默认收藏夹数据源、分页、移除、创建、编辑、删除、分享状态同步、封面设置和移动复制的使用逻辑不变。

后续建议继续拆 `Favorites.vue`：

- 将左侧收藏夹列表和右侧图片卡片分别组件化，进一步降低模板密度。
- 将创建、编辑、分享、移动弹窗拆成局部组件，减少模板内弹窗表单密度。

## 2026-07-02 第四十五轮补充
### AI 资产选择页状态逻辑抽离

本轮继续拆 `src/views/dashboard/AiAssetSelector.vue`。该页面原本把路由参数归一化、素材能力加载、LoRA/角色/风格筛选、目录树、分页、选择状态、详情弹窗和提交回 AI 绘图草稿的逻辑全部放在页面脚本中，后续新增素材类型或筛选规则时容易互相牵连。

- 新增 `src/composables/useAiAssetSelector.ts`
  - 集中维护 `activeTab`、主/副目标 `target`、三类搜索关键词、分页、目录树选中项、详情弹窗状态和素材能力缓存。
  - 保留进入页面时从路由 query 读取 `tab` 和 `target` 的默认行为。
  - 保留 LoRA、角色和风格预设的分页尺寸 `24/48/96`。
  - 保留 LoRA/角色目录树、风格类型目录树、安全筛选、Checkpoint 推荐筛选和关键词搜索。
  - 保留筛选条件变化后回到第一页，以及列表长度变化时把当前页限制在有效范围内。
  - 保留 NSFW 模式下 LoRA 强度按 `LIGHT/STANDARD/STRONG` 自动取值。
  - 保留角色预设写入触发词、风格标签、关联 LoRA 和推荐强度的逻辑。
  - 保留风格预设多选、清空、摘要展示和详情说明。
  - 保留 `fetchAiCapabilities` 加载失败时通过统一 API 错误提示展示“加载模型能力失败”。
  - 保留点击完成后通过 `draftStore.commitAssetSelection` 写回原 AI 绘图草稿并返回 `/dashboard/ai-draw`。

`AiAssetSelector.vue` 现在只保留 UI 组件导入和 `useAiAssetSelector()` 解构，模板与样式未改动。页面总行数从约 1264 行下降到约 900 行，素材选择主逻辑迁入 composable，后续可以继续拆资产卡片、目录筛选面板和详情弹窗。

本轮验证时特别复核了“乱码”判断：PowerShell 直接读取 Vue 文件时仍可能把中文显示成乱码，但 Node 按 UTF-8 读取可看到源码中文正常，`npm run check:encoding` 也通过。因此这类显示异常不能作为修改源码的依据，必须以 UTF-8 读取结果和编码检查脚本为准。

## 2026-07-02 第四十六轮补充
### 管理端图片删除申请审核流程抽离

本轮开始拆 `src/admin/AdminImageDeleteRequests.vue`。该页面原本把管理端图片删除申请的筛选列表、当前页待审核勾选、详情缓存、单条审核、快速审核、批量审核和状态展示配置都集中在页面脚本中，审核流程改动时容易影响模板和弹窗展示。

- 新增 `src/composables/useAdminImageDeleteRequests.ts`
  - 集中维护列表 loading、申请列表、总数、分页、状态筛选、当前页待审核选择和批量审核 loading。
  - 保留状态筛选选项：全部、待审核、已批准、已拒绝。
  - 保留只允许待审核申请进入当前页批量选择的限制。
  - 保留切换分页和筛选时清空选择并重新加载数据。
  - 保留列表请求并发保护，过期请求不会覆盖当前列表状态。
  - 保留详情弹窗状态、详情 loading、审核备注、详情缓存和详情请求并发保护。
  - 保留详情审核确认文案、成功提示、删除详情缓存、移除已选 ID、关闭弹窗并刷新列表。
  - 保留卡片快速审核确认文案、成功提示、详情缓存清理和列表刷新。
  - 保留批量审核前必须选择待审核申请的提示。
  - 保留批量审核成功、部分成功、全部失败三种反馈文案。
  - 保留 `getStatusConfig` 对未知状态回落到待审核配置的行为。

`AdminImageDeleteRequests.vue` 现在不再直接处理删除申请列表请求、详情请求、请求竞态保护、单条审核、快速审核、批量审核和选择状态同步。页面总行数从约 1354 行下降到约 1084 行，脚本区下降到约 61 行；模板和样式未改动，管理端 UI、筛选、分页、详情弹窗、审核按钮和批量操作入口保持原样。

本轮再次遇到 PowerShell 把中文显示成乱码的现象。已用 Node UTF-8 读取确认源码中文正常，并通过 `npm run check:encoding`，说明这属于终端显示层问题，不是源码写坏；后续继续禁止依据 PowerShell 中文显示结果改写源码。

## 2026-07-02 第四十七轮补充
### 公开收藏夹详情页数据与分享流程抽离

本轮继续拆 `src/views/public/PublicCollectionView.vue`。该页面是未登录用户也会访问的公开页面，原本把公开收藏夹信息、图片分页、相似收藏夹推荐、登录/注册跳转、分享链接复制、导出分享图和瀑布流跨度计算都放在同一个页面脚本里。

- 新增 `src/composables/usePublicCollectionView.ts`
  - 集中维护路由收藏夹 ID、公开信息 loading、收藏夹信息、图片列表 loading、图片列表和分页状态。
  - 保留公开状态判断：`visibility === 1`。
  - 保留相似收藏夹过滤当前收藏夹，并最多展示 3 个。
  - 保留相似收藏夹封面兜底：优先 `coverUrl`，否则按 `coverPid/coverP` 拼接 CDN 图片。
  - 保留相似收藏夹标签合并 `tags` 与 `themeTags`、去重、最多 3 个。
  - 保留分享者昵称兜底：优先昵称，否则 `用户#userId`，最后 `用户`。
  - 保留头像相对路径补齐当前站点 origin 的行为。
  - 保留 `useCollectionSeo` 动态 SEO。
  - 保留未登录跳转登录/注册，访问广场时附带 redirect。
  - 保留公开信息和图片列表请求竞态保护，过期请求不会覆盖当前状态。
  - 保留图片列表字段映射：`pid/p`、标题、作者、常规图、原图和宽高比。
  - 保留分页切换后重新加载并滚动到顶部。
  - 保留私有收藏夹不可分享/不可导出的提示。
  - 保留导出分享图流程：动态加载 `qrcode` 与 `html-to-image`，生成二维码，等待 DOM 渲染后截图为 PNG。
  - 保留瀑布流 `getRowSpan` 的各个宽高比阈值。

`PublicCollectionView.vue` 现在不再直接处理公开收藏夹接口请求、图片列表映射、相似推荐规整、分享复制、导出二维码图片、登录状态跳转和 SEO 初始化。页面总行数从约 1261 行下降到约 988 行，脚本区下降到约 65 行；模板和样式未改动，公开访问、分享导出、瀑布流、相似推荐和未登录引导的 UI 行为保持原样。

## 2026-07-02 第四十八轮补充
### 管理端图库投稿审核流程抽离

本轮拆 `src/admin/GallerySubmissionReview.vue`。该页面原本把图库投稿批次列表、响应式分页尺寸、详情弹窗、审核通过弹窗、拒绝弹窗、提交后本地列表结算和卸载清理都集中在页面脚本中。

- 新增 `src/composables/useGallerySubmissionReview.ts`
  - 集中维护投稿批次列表 loading、列表数据、总数、页码、状态筛选和桌面/移动端分页尺寸。
  - 保留桌面每页 10 条、移动端每页 5 条的行为。
  - 保留 `WAITING_MANUAL_REVIEW` 作为默认筛选状态。
  - 保留状态切换后回到第一页并重新加载。
  - 保留列表请求与详情请求序号保护，过期请求不会覆盖当前状态。
  - 保留详情弹窗关闭后终止旧详情请求并清空详情数据。
  - 保留打开通过弹窗时自动填入“人工审核通过”、立即发布、R18 不覆盖、AI 类型不覆盖和当前标签文本。
  - 保留打开拒绝弹窗时清空原因并默认严重程度为中。
  - 保留审核通过提交字段：备注、立即发布、R18 覆盖、AI 类型覆盖、规范化标签。
  - 保留拒绝时必须填写拒绝原因的校验和提示。
  - 保留审核完成后关闭审核弹窗与详情弹窗、清空当前批次，并按当前筛选状态本地结算列表。
  - 保留 `ALL` 筛选下审核后更新当前行状态，其它筛选下审核后从列表移除的行为。
  - 保留列表空页且仍有剩余数据时自动回到有效页并重新加载。
  - 保留卸载时使请求失效、清理 loading、提交状态、列表、详情和当前批次。

`GallerySubmissionReview.vue` 现在不再直接处理投稿审核请求、详情请求、通过/拒绝提交、本地审核结算和响应式分页状态。页面总行数从约 870 行下降到约 596 行，脚本区下降到约 62 行；模板与样式未改动，管理端投稿审核 UI、详情展示、通过/拒绝弹窗、分页和筛选逻辑保持原样。

## 2026-07-02 第四十九轮补充
### 管理端用户管理状态与表格列抽离

本轮拆 `src/admin/UserManagement.vue`。该页面原本把用户列表筛选、分页、详情缓存、桌面表格展开、移动端展开、封禁/解封/删除、积分发放弹窗和 PC 表格列渲染函数全部集中在页面脚本里，管理端用户操作一旦变复杂，页面会继续膨胀。

- 新增 `src/composables/useUserManagement.ts`
  - 集中维护列表 loading、用户列表、分页、筛选表单和下一页判断。
  - 保留用户列表请求序号保护，过期请求不会覆盖当前列表状态。
  - 保留用户详情缓存上限 24 条，以及列表刷新后优先裁剪不可见用户详情缓存的行为。
  - 保留详情请求 loading 集合和请求序号保护，防止展开行快速切换时旧详情覆盖新状态。
  - 保留桌面端点击整行手风琴展开、移动端点击卡片展开的交互。
  - 保留封禁、解封和删除确认弹窗文案、成功提示和操作后刷新列表。
  - 保留删除失败时通过 `showApiError` 统一提示后端错误。
  - 保留积分发放弹窗状态、正数校验、原因 trim、成功后关闭弹窗和余额提示。
  - 保留 PC 表格列、展开行详情、API Key 卡片、状态标签和操作按钮的原有渲染。

`UserManagement.vue` 现在只保留模板需要的 UI 组件、图标和 `useUserManagement()` 解构。页面总行数从约 820 行下降到约 393 行；模板与样式未改动，管理端用户筛选、分页、展开详情、移动端卡片、封禁/解封/删除和积分发放逻辑保持原样。

## 2026-07-02 第五十轮补充
### 管理端 AI 生图记录筛选与删除流程抽离

本轮拆 `src/admin/AdminAiGenerations.vue`。该页面原本把 AI 生图记录列表、模型能力名称映射、任务筛选、分页、下架、云端记录删除、本机归档图片删除和 worker 阶段展示逻辑全部集中在页面脚本中。

- 新增 `src/composables/useAdminAiGenerations.ts`
  - 集中维护记录列表 loading、任务列表、总数、页码、筛选条件和每页数量。
  - 保留按任务 ID、用户 ID、生成状态、广场审核状态、删除状态和记录状态筛选的行为。
  - 保留筛选变化后回到第一页并重新加载。
  - 保留模型能力加载，仅用于 Checkpoint 友好名称展示，加载失败不阻断列表。
  - 保留默认模型名称兜底：单模型时展示默认模型及模型名，多模型时展示“默认模型”。
  - 保留下架操作成功提示、失败统一错误提示和操作后刷新列表。
  - 保留云端 AI 生图删除弹窗状态、原因 trim、成功关闭弹窗并刷新列表。
  - 保留本机归档图片删除弹窗状态、原因 trim、成功关闭弹窗并刷新列表。
  - 保留 worker 阶段中文标签映射和 trace 空值展示为“暂无”的行为。

`AdminAiGenerations.vue` 现在只保留模板需要的 UI 组件、图标、状态标签工具、日期格式化和 `useAdminAiGenerations()` 解构。页面总行数从约 699 行下降到约 527 行，脚本区下降到约 61 行；模板与样式未改动，管理端 AI 生图记录筛选、分页、状态展示、下架和删除流程保持原样。

## 2026-07-02 第五十一轮补充
### 管理端 Pixiv 爬虫任务流抽离

本轮拆 `src/admin/AdminPixivCrawl.vue`。该页面原本把爬虫健康检查、任务列表加载、最近任务合并排序、任务轮询、桌面表格列、任务详情日志截断、取消任务确认和三种创建任务表单全部集中在页面脚本中。

- 新增 `src/composables/useAdminPixivCrawl.ts`
  - 集中维护爬虫服务健康状态、当前 Tab、任务列表、任务总数、加载状态和移动端分页。
  - 保留最多展示最近 100 个任务，以及总量超过 100 时额外拉取最新窗口、去重、按服务端/开始/结束时间排序的行为。
  - 保留任务列表进入 Tab 后加载、页面可见时轮询、离开 Tab 或页面隐藏时停止轮询。
  - 保留桌面表格列渲染：任务 ID、模式、状态、进度、开始时间和取消/详情操作。
  - 保留取消 pending/running 任务的确认弹窗、成功提示和列表刷新。
  - 保留任务详情弹窗加载，详情为空或接口失败时统一错误提示并关闭弹窗。
  - 保留日志最多展示最近 1200 行、最多 120000 字符，并在截断时追加说明。
  - 保留按作品 ID、画师 UID、标签三种创建任务入口、表单校验、成功提示、清空关键输入并切换到任务列表。
  - 保留移动端任务卡片、分页和桌面表格共用同一份任务数据。

`AdminPixivCrawl.vue` 现在只保留模板需要的 UI 组件、图标、日期格式化和 `useAdminPixivCrawl()` 解构。页面总行数从约 876 行下降到约 474 行，脚本区下降到约 62 行；模板与样式未改动，管理端 Pixiv 爬虫创建任务、任务列表、轮询、取消、详情日志和移动端展示逻辑保持原样。

## 2026-07-02 第五十二轮补充
### 管理端网易云 Token 管理流程抽离

本轮拆 `src/admin/MusicTokenManagement.vue`。该页面原本把网易云 Token 列表请求、请求竞态保护、添加/编辑弹窗、删除、启停切换、Cookie 脱敏、可播性检测和桌面表格列全部集中在页面脚本中。

- 新增 `src/composables/useMusicTokenManagement.ts`
  - 集中维护列表 loading、Token 列表、检测结果、检测中的 Token ID 集合和测试歌曲 ID。
  - 保留 `useRequestGuard()` 请求序号保护，过期列表请求不会覆盖当前状态。
  - 保留添加 Token 弹窗默认状态：Cookie 为空、昵称为空、启用状态为 1。
  - 保留编辑 Token 时回填 Cookie、昵称和状态。
  - 保留提交前 Cookie 必填校验，以及添加时昵称兜底为“未命名账号”。
  - 保留删除成功提示、启停切换成功提示和操作后刷新列表。
  - 保留可播性检测默认测试歌曲 `32358362`、固定 `exhigh` 音质、检测结果缓存和检测中按钮 loading。
  - 保留 Cookie 失效、完整可播、试听、不可播、疑似 VIP 和未知状态的标签与说明文案。
  - 保留桌面表格列渲染：Cookie 脱敏、状态标签、快速切换、创建/更新时间、检测结果和操作按钮。
  - 保留移动端卡片复用同一份状态、检测结果和操作方法。

`MusicTokenManagement.vue` 现在只保留模板需要的 UI 组件、图标、日期格式化和 `useMusicTokenManagement()` 解构。页面总行数从约 808 行下降到约 404 行，脚本区下降到约 44 行；模板与样式未改动，管理端网易云 Token 添加、编辑、删除、启停切换、可播性检测和移动端展示逻辑保持原样。

## 2026-07-02 第五十三轮补充
### 管理端 IP 黑名单与临时封禁流程抽离

本轮拆 `src/admin/AdminIpBlacklist.vue`。该页面原本把 IP 黑名单列表、前端搜索过滤、分页、批量选择、临时封禁列表、添加封禁弹窗、单条移除、批量移除和桌面表格列全部放在页面脚本中。

- 新增 `src/composables/useAdminIpBlacklist.ts`
  - 集中维护黑名单 loading、完整列表、搜索关键词、勾选行和分页状态。
  - 保留搜索 IP 或原因时回到第一页并清空勾选。
  - 保留 `useRequestGuard()` 请求序号保护，过期黑名单请求和临时封禁请求不会覆盖当前状态。
  - 保留临时封禁接口不可用时静默回落为空列表。
  - 保留解除单个临时封禁、清空全部临时封禁的确认弹窗、成功提示和刷新。
  - 保留添加封禁弹窗默认清空 IP 与原因，多 IP 支持按换行或逗号拆分。
  - 保留添加前有效 IP 输入校验、添加成功数量提示和列表刷新。
  - 保留单条解封确认、成功提示和刷新。
  - 保留批量解封逐个执行、成功/部分失败/全部失败三种反馈文案。
  - 保留桌面表格列渲染：选择列、IP 标签、原因、封禁时间和移除按钮。

`AdminIpBlacklist.vue` 现在只保留模板需要的 UI 组件、图标、日期格式化和 `useAdminIpBlacklist()` 解构。页面总行数从约 647 行下降到约 361 行，脚本区下降到约 50 行；模板与样式未改动，管理端 IP 黑名单搜索、分页、添加、移除、批量移除、临时封禁清理和移动端展示逻辑保持原样。
## 2026-07-02 第五十四轮补充
### 管理端操作日志筛选与详情流程抽离

本轮拆 `src/admin/AdminOperationLogs.vue`。该页面原本把操作日志筛选、路由 query 回填、列表加载、详情弹窗、Trace 复制、JSON 格式化和表格列渲染全部放在页面脚本里，后续新增事件类型或排查链路字段时容易继续堆叠。
- 新增 `src/composables/useAdminOperationLogs.ts`
  - 集中维护列表 loading、详情 loading、详情弹窗、当前详情、日志列表、总数、分页和筛选表单状态。
  - 保留从路由 query 初始化筛选条件的行为：`traceId`、`userId`、`userEmail`、`eventType`、`status`、`code`、`targetType`、`targetId`、`startTime`、`endTime`、`page` 和 `pageSize`。
  - 保留状态筛选选项：全部状态、成功、失败、部分成功。
  - 保留事件类型筛选选项：图库上传、图片审核、删除申请、可用性检查、下载签名和用户通知创建等事件。
  - 保留查询参数构造时对空字符串的 `undefined` 归一化，避免把空筛选提交给后端。
  - 保留查询按钮回到第一页、重置按钮清空全部筛选并重新加载的行为。
  - 保留操作日志列表与详情加载失败时通过统一 API 错误处理展示提示。
  - 保留 Trace ID 复制到剪贴板后的成功提示。
  - 保留详情 JSON 展示规则：空值显示 `-`，字符串原样显示，对象格式化为缩进 JSON。
  - 保留桌面表格列渲染：时间、状态标签、事件、用户、目标、Trace 复制、耗时和详情按钮。

`AdminOperationLogs.vue` 现在只保留页面模板需要的 Naive UI 组件、刷新/查询图标和 `useAdminOperationLogs()` 解构。页面总行数从约 490 行下降到约 225 行，脚本区下降到约 27 行；模板与样式未改动，管理端操作日志查询、分页、详情查看、Trace 复制和路由 query 默认筛选逻辑保持原样。
## 2026-07-02 第五十五轮补充
### AI 绘图历史记录与审核删除流程抽离

本轮拆 `src/views/dashboard/AiHistory.vue`。该页面原本把 AI 绘图历史加载、模型能力显示名、状态筛选、公开审核申请、删除申请、详情弹窗、复用任务、复制提示词、下载图片和路由 query 打开指定记录都集中在页面脚本中。
- 新增 `src/composables/useAiHistory.ts`
  - 集中维护历史记录 loading、任务列表、能力配置缓存、总数、分页、状态筛选和页面大小。
  - 保留模型能力加载只用于友好显示名的降级策略：能力接口失败不影响历史列表展示。
  - 保留 Checkpoint 显示兜底：指定模型优先映射 displayName；没有指定模型时单模型显示“默认模型（名称）”，多模型显示“默认模型”。
  - 保留历史列表请求参数：`status` 为 `ALL` 时不传状态筛选，分页仍按固定每页 12 条提交。
  - 保留状态切换回到第一页、分页切换重新加载的行为。
  - 保留提交公开审核流程：根据原记录 `publicCategory` 初始化 R18/GENERAL，备注 trim 后提交，成功后关闭弹窗并刷新列表。
  - 保留可提交审核的限制：已完成、有图片、云端原图未过期/未显式删除、非等待审核、非已通过。
  - 保留可提交删除申请的限制：未删除、删除状态不是等待中或已通过。
  - 保留复用任务写入 `sessionStorage` 的 `ai-draw-prefill`，并将 `seed` 置空后跳转回 AI 绘图页。
  - 保留复制提示词、下载图片、详情弹窗和删除申请提交的提示与错误处理。
  - 保留进入页面后通过 `jobId` query 拉取并打开指定 AI 绘图记录详情。
  - 将模板需要的状态标签工具、文件大小格式化、日期格式化和分类文案一并从 composable 返回，页面不再直接关心业务工具来源。

`AiHistory.vue` 现在只保留页面模板需要的 Naive UI 组件、图标和 `useAiHistory()` 解构。页面总行数从约 636 行下降到约 445 行，脚本区下降到约 67 行；模板与样式未改动，AI 绘图历史筛选、分页、复用、复制、下载、公开审核、删除申请、详情弹窗和 query 打开指定记录的逻辑保持原样。
## 2026-07-02 第五十六轮补充
### 通知中心列表、已读状态与目标跳转抽离

本轮拆 `src/views/dashboard/NotificationsView.vue`。该页面原本把通知列表加载、未读计数、未读筛选、单条已读、全部已读、通知类型标签、目标文本和目标路由推断全部集中在页面脚本中，后续新增通知类型时容易继续扩大页面逻辑。
- 新增 `src/composables/useNotificationsView.ts`
  - 集中维护列表 loading、操作 loading、通知列表、总数、分页、未读筛选和未读计数。
  - 保留固定每页 20 条的分页策略，以及未读筛选切换后回到第一页并重新加载的行为。
  - 保留加载通知后同步刷新未读数量的行为。
  - 保留未读计数接口不可用时静默忽略，避免影响通知列表展示。
  - 保留单条标记已读后本地更新 `read/readAt`、未读计数递减，以及未读筛选模式下从当前列表移除的行为。
  - 保留全部标记已读：未读筛选下清空列表，普通模式下本地更新当前列表全部已读，并展示成功提示。
  - 保留通知类型标签：投稿通过/拒绝、删除申请通过/拒绝、审核问题、积分到账和 AI 绘图完成。
  - 保留目标类型推断规则：图库投稿批次跳转 `GalleryUpload`，删除申请跳转 `MyDeleteRequests`，AI 绘图完成跳转 `AiHistory`。
  - 保留对目标类型大小写、空格、横线和紧凑写法的兼容推断。
  - 保留没有可跳转目标时仅标记已读，不进行路由跳转的行为。

`NotificationsView.vue` 现在只保留模板需要的 Naive UI 组件、图标、日期格式化和 `useNotificationsView()` 解构。页面总行数从约 460 行下降到约 269 行，脚本区下降到约 40 行；模板与样式未改动，通知中心未读筛选、分页、刷新、已读状态、全部已读、类型标签和目标跳转逻辑保持原样。
## 2026-07-02 第五十七轮补充
### 系统状态轮询与图表配置抽离

本轮拆 `src/views/status/SystemStatus.vue`。该页面原本把 SEO 设置、系统状态数据、服务健康状态、可用性/延迟派生文本、状态图标、状态颜色、5 分钟时间范围、初始图表占位、轮询和 ECharts option 都放在页面脚本里。
- 新增 `src/composables/useSystemStatus.ts`
  - 集中维护系统状态 loading、最后更新时间、状态数据、服务健康状态和图表时间序列。
  - 保留页面 SEO：标题“系统状态”，描述“查看雪涼云 API 服务的实时运行状态和性能指标。”。
  - 保留 15 秒轮询间隔，并继续复用 `useVisibilityPolling()`，页面不可见时停止无意义轮询。
  - 保留初始 20 个图表占位点，避免图表首屏空白。
  - 保留图表序列最多 20 个点，新的延迟值进入后移除最旧点。
  - 保留首次加载失败才提示“状态监控服务连接失败”的策略，避免轮询失败时持续打扰用户。
  - 保留状态来源优先级：服务健康状态优先，否则使用系统状态中的 `status`。
  - 保留状态颜色和图标映射：正常、降级、故障与未知状态分别映射原有颜色和图标。
  - 保留最近 5 分钟无样本时展示“暂无样本”和“无近期调用”的文案。
  - 保留可用性百分比边界限制在 0 到 100 之间。
  - 保留原有 Aurora 风格 ECharts 配置：透明背景、隐藏横轴文字、粉色折线、渐变面积和阴影。

`SystemStatus.vue` 现在只保留 ECharts 组件注册、页面模板用到的图标和 `useSystemStatus()` 解构。页面总行数从约 496 行下降到约 299 行，脚本区下降到约 30 行；模板与样式未改动，系统状态展示、可用性/延迟文本、轮询刷新、图表展示和 SEO 逻辑保持原样。
## 2026-07-02 第五十八轮补充
### 用户仪表盘配额、概览与调用日志抽离

本轮拆 `src/views/dashboard/UserDashboard.vue`。该页面原本把 API Key 配额、调用概览、调用日志表格、分页、表格列渲染和跳转 API Key 页面入口都集中在页面脚本里，后续新增仪表盘卡片时容易继续堆叠。
- 新增 `src/composables/useUserDashboard.ts`
  - 集中维护 API Key 配额状态、调用概览状态、日志表格状态、分页配置和错误提示文本。
  - 保留 API Key 默认上限 10，以及使用 `fetchMyApiKeys()` 数量作为当前使用量的行为。
  - 保留 Key 使用率限制在 0 到 100 之间的计算方式。
  - 保留 Key 进度颜色阈值：少于 5、少于 8、8 及以上分别沿用原有色值。
  - 保留调用概览字段兜底：`totalCalls/todayCalls` 默认 0，`lastCalledAt` 默认 null。
  - 保留调用日志分页配置：默认第 1 页、每页 10 条、可选 10/20/50，并显示“共 N 条”。
  - 保留日志响应兼容归一化：数组、`data`、`items`、`list` 三类后端返回结构都继续通过 `normalizeUsageLogsResponse()` 处理。
  - 保留表格列渲染：时间格式化、请求路径等宽字体、HTTP 状态成功/失败色块和 IP 列。
  - 保留日志加载失败时同时写入局部错误文本并使用统一 API 错误提示。
  - 保留翻页、切换每页数量、刷新日志时重置到第一页的行为。
  - 保留点击 API Key 卡片入口时通过 `safePush()` 跳转 `/dashboard/api-keys`。
  - 保留初始化时并行触发 Key 配额、调用概览和日志列表加载。

`UserDashboard.vue` 现在只保留模板需要的 Naive UI 组件、图标和 `useUserDashboard()` 解构。页面总行数从约 639 行下降到约 464 行，脚本区下降到约 37 行；模板与样式未改动，用户仪表盘配额、概览、日志表格、分页、刷新和 API Key 跳转逻辑保持原样。
## 2026-07-02 第五十九轮补充
### API Key 列表与创建重命名操作抽离

本轮拆 `src/views/dashboard/ApiKeyList.vue`。该页面原本把 API Key 列表加载、请求竞态保护、统计汇总、创建弹窗、明文 Key 结果弹窗、复制、重命名、启停和删除确认全部放在页面脚本里。
- 新增 `src/composables/useApiKeyList.ts`
  - 集中维护列表 loading、API Key 列表、加载错误、创建弹窗、创建表单、创建 loading、最近创建的明文 Key、结果弹窗、重命名弹窗、重命名表单和重命名 loading。
  - 保留 `useRequestGuard()` 请求序号保护，过期列表请求不会覆盖当前列表状态。
  - 保留统计汇总：总 Key 数、启用数量、今日调用量合计和总调用量合计。
  - 保留创建弹窗默认表单：名称为空、日限额 1000、总限额为空。
  - 保留创建前名称必填校验、创建成功提示、关闭创建弹窗、打开明文 Key 结果弹窗并刷新列表。
  - 保留明文 Key 复制到剪贴板成功/失败提示。
  - 保留重命名前名称不能为空、成功后关闭弹窗并刷新列表。
  - 保留启用/禁用确认文案、成功提示和操作后刷新列表。
  - 保留删除确认文案“此操作不可撤销”、成功提示和操作后刷新列表。
  - 保留日期格式化工具从 composable 暴露给模板，页面不再直接关心工具来源。

`ApiKeyList.vue` 现在只保留模板需要的 Naive UI 组件、图标和 `useApiKeyList()` 解构。页面总行数从约 703 行下降到约 554 行，脚本区下降到约 51 行；模板与样式未改动，API Key 列表刷新、创建、明文 Key 展示、复制、重命名、启停、删除和统计逻辑保持原样。
## 2026-07-02 第六十轮补充
### 开发文档每日一图与 API 文档数据抽离

本轮拆 `src/views/dashboard/UsageGuide.vue`。该页面原本把每日一图演示、默认收藏、收藏到指定收藏夹、签名下载、复制链接、SEO 设置、图片 API 文档数据、音乐 API 文档数据和表格列渲染全部放在页面脚本里。
- 新增 `src/composables/useUsageGuide.ts`
  - 集中维护每日一图 loading、图片数据、错误状态、默认收藏状态和收藏按钮 loading。
  - 保留演示图片加载逻辑：调用公开博客图片接口、取首图、自动查询收藏状态、失败时展示原有错误提示。
  - 保留登录态判断：未登录时禁止默认收藏和收藏到指定收藏夹，并提示“请先登录后再收藏”。
  - 保留默认收藏切换、签名原图下载、原图链接复制逻辑。
  - 集中维护“收藏到…”弹窗状态、收藏夹列表加载、新建收藏夹名称/可见性、提交 loading 和收藏夹选项。
  - 保留加载我的收藏夹后优先选中默认收藏夹，否则选中第一项的行为。
  - 保留加入所选收藏夹、新建收藏夹并加入、成功关闭弹窗和失败提示。
  - 集中维护图片 API 与音乐 API 的基础地址、快速说明卡、请求参数、接口清单、代码示例和响应 JSON 示例。
  - 保留桌面表格列渲染：参数名/接口使用等宽代码样式，类型与方法使用原有 `NTag` 颜色规则。
  - 保留 `useSeo()` 配置在 composable 初始化时执行，页面路由 SEO 文案不变。

`UsageGuide.vue` 现在只保留模板需要的 Naive UI 组件、图标和 `useUsageGuide()` 解构。页面总行数从约 1462 行下降到约 1051 行，脚本区从约 491 行下降到约 80 行；模板与样式未改动，每日一图、收藏、下载、复制、收藏夹弹窗、图片 API 文档和音乐 API 文档展示逻辑保持原样。
## 2026-07-02 第六十一轮补充
### 迷你音乐播放器音频同步与媒体会话抽离

本轮拆 `src/components/music/MiniPlayerBar.vue`。该共享组件原本把播放器 UI、audio 元素同步、播放/暂停、进度跳转、音量、音质、播放模式、播放器抽屉入口、折叠偏好、播放错误回退和浏览器 Media Session 全部放在一个组件脚本里。
- 新增 `src/composables/useMiniPlayerBar.ts`
  - 集中维护 `musicStore`、紧凑布局状态、`audioRef`、音量弹层、折叠状态、歌手展示文本、音质选项和播放模式选项。
  - 保留未选择歌曲时的播放提示、缺少播放 URL 时重新调用 `playSong()` 的行为，以及失败时沿用 `lastPlaybackError`。
  - 保留进度拖动同步 `audio.currentTime` 与 store 当前时间。
  - 保留音量百分比换算、音质切换失败提示、播放模式切换和播放器抽屉 tab 跳转。
  - 保留折叠状态写入 `localStorage` 的 key 与紧凑布局下自动展开的行为。
  - 保留音频时间更新时的 `requestAnimationFrame` 同步保护，避免 store 与 audio 互相回写抖动。
  - 保留歌曲 URL 切换时的 `canplay` 监听、同曲换 URL 时恢复原播放进度，以及组件卸载时清理监听器并暂停音频。
  - 保留播放错误时优先回退 `originalUrl`，失败后停止播放并提示“播放失败，请尝试其他歌曲”。
  - 保留 Media Session metadata、playbackState、positionState 和 play/pause/previous/next/seekto 快捷控制。

`MiniPlayerBar.vue` 现在只保留模板需要的 Naive UI 组件、图标和 `useMiniPlayerBar()` 解构。组件总行数从约 766 行下降到约 495 行，脚本区从约 309 行下降到约 38 行；模板与样式未改动，迷你播放器播放控制、进度、音量、音质、模式、队列、展开收起和系统媒体控制逻辑保持原样。
## 2026-07-02 第六十二轮补充
### 全局 MV 播放器浮层、拖拽与视频节点同步抽离

本轮拆 `src/components/GlobalMvPlayer.vue`。该共享组件原本把 MV 模态框、画中画浮层、video 元素搬移、浮层拖拽、锁定、位置持久化、全屏、自动播放、窗口尺寸适配和播放地址降级全部放在组件脚本里。
- 新增 `src/composables/useGlobalMvPlayer.ts`
  - 集中维护 `musicStore`、共享 video ref、模态框容器 ref、画中画容器 ref、拖拽状态、浮层位置和锁定状态。
  - 保留浮层尺寸规则：超窄屏使用视口宽度减边距，移动端最大 300px，桌面端 400px。
  - 保留浮层位置边界约束，窗口 resize 或断点宽度变化时自动 clamp 并保存位置。
  - 保留 `mv_player_position` 的 `localStorage` key、保存的 `x/y/locked` 数据结构和加载失败静默处理。
  - 保留锁定后禁止拖拽、拖拽时注册 mouse/touch 全局监听、拖拽结束后保存位置并清理监听。
  - 保留模态框与画中画切换时等待 DOM 更新后移动同一个 video 元素，避免切换模式时重新创建播放器。
  - 保留双击 video 进入/退出全屏、关闭 MV 时调用 `musicStore.closeMv()`。
  - 保留 MV URL 变化后自动把 video 放入当前容器，并延迟 100ms 自动播放。
  - 保留 MV 加载错误时优先静默降级到 `originalUrl`，并清空 `originalUrl` 防止重复降级。
  - 保留组件卸载时清理拖拽监听、resize 监听和自动播放定时器，避免泄漏。

`GlobalMvPlayer.vue` 现在只保留模板需要的 Naive UI 组件、图标和 `useGlobalMvPlayer()` 解构。组件总行数从约 619 行下降到约 380 行，脚本区从约 262 行下降到约 23 行；模板与样式未改动，全局 MV 模态框、画中画浮层、拖拽锁定、位置记忆、全屏、关闭和 URL 降级逻辑保持原样。
## 2026-07-02 第六十三轮补充
### 用户侧布局菜单、用户信息与响应式侧栏抽离

本轮拆 `src/layouts/UserLayout.vue`。该核心布局原本把用户信息刷新、响应式侧栏状态、Naive UI 主题覆盖、侧边栏菜单、用户下拉菜单、路由跳转、头像兜底和显示名计算全部放在布局脚本里。
- 新增 `src/composables/useUserLayout.ts`
  - 集中维护背景图地址、Logo、移动端断点、侧栏折叠状态、移动端抽屉状态和主题覆盖配置。
  - 保留挂载后调用 `getUserInfo()` 刷新用户昵称、邮箱、角色和头像的行为。
  - 保留只在字段变化时更新 `auth.user`，避免 `Object.assign` 带来的级联响应式更新。
  - 保留移动端切换时自动取消桌面侧栏折叠状态。
  - 保留移动端点击菜单按钮打开抽屉、桌面端点击菜单按钮折叠/展开侧栏。
  - 保留侧边栏菜单结构：仪表盘、API Key、积分中心、图库收藏、AI 绘图、音乐播放器、开发文档、我的删除申请、通知中心。
  - 保留管理员角色 `role === 1` 时追加管理后台入口。
  - 保留菜单点击通过 `safePush()` 跳转，移动端跳转后自动关闭抽屉。
  - 保留用户下拉菜单：个人中心、系统状态、关于、隐私政策和退出登录。
  - 保留退出登录后跳转登录页、头像默认值和显示名优先级：昵称 > 邮箱前缀 > `User`。

`UserLayout.vue` 现在只保留模板需要的 Naive UI 组件、顶部栏图标、异步播放器组件和 `useUserLayout()` 解构。布局总行数从约 536 行下降到约 322 行，脚本区从约 256 行下降到约 42 行；模板与样式未改动，侧栏、移动抽屉、用户菜单、管理员入口、头像展示和全局播放器挂载逻辑保持原样。
## 2026-07-02 第六十四轮补充
### 阿里云验证码 SDK 生命周期抽离

本轮拆 `src/components/AliyunCaptcha.vue`。该组件原本把 props/emit、mock 模式、SDK 脚本加载、验证码初始化、实例暴露、轮询等待、超时控制、按钮事件绑定和销毁清理全部放在组件脚本里。
- 新增 `src/composables/useAliyunCaptcha.ts`
  - 集中维护验证码实例、ready 状态、mock 按钮绑定、SDK 轮询定时器和超时定时器。
  - 保留 mock 模式下点击业务按钮直接触发 `success('mock-aliyun-captcha')` 的行为。
  - 保留加载 SDK 前写入 `window.AliyunCaptchaConfig` 的 region 与 prefix。
  - 保留复用已存在 SDK script、动态创建 SDK script、加载失败时结束 loading 的行为。
  - 保留初始化前等待 DOM 更新，并确认 `buttonId` 对应按钮存在。
  - 保留 `SceneId`、popup 模式、默认容器 `#esa-captcha-element`、按钮选择器、服务域名、滑块尺寸和中文语言设置。
  - 保留 success/fail/ready/loading 事件透传，以及父组件可调用的 `reset()`、`isReady` 和 `getInstance()`。
  - 保留挂载时 100ms 轮询 SDK、5 秒超时结束 loading、卸载时清理按钮监听、轮询、超时定时器和验证码实例。
- 顺手检查 `src/types/aliyun-captcha.d.ts`
  - 通过 Node 按 UTF-8 读取确认文件真实内容不是乱码，PowerShell 中看到的中文乱码只是控制台显示层问题。
  - 将 `fail` 回调参数从 `any` 收紧为 `unknown`，降低后续使用时的隐式类型风险。

`AliyunCaptcha.vue` 现在只保留 props/emit/expose、`useAliyunCaptcha()` 解构和隐藏容器模板。组件总行数从约 234 行下降到约 37 行，脚本区从约 221 行下降到约 24 行；外部 API、事件名、父组件调用方式和验证码 UI 逻辑保持原样。

## 2026-07-03 第六十五轮补充
### 登录页密码、ESA 与通行密钥流程抽离

本轮拆 `src/views/auth/LoginView.vue`。该页面原本把 SEO noindex、密码登录表单状态、验证码引用、ESA 加载状态、mock 登录分支、登录后跳转、通行密钥认证、业务错误映射、登录过期提示和邮箱预填全部放在页面脚本里。
- 新增 `src/composables/useLoginView.ts`
  - 集中维护 `form`、`loading`、`esaLoading`、`passkeyLoading`、`showPassword`、`loginMode`、普通验证码引用和阿里云验证码引用。
  - 保留登录页 `robots: noindex, nofollow` 的 SEO 设置。
  - 保留密码登录前置校验：邮箱和密码必填、邮箱格式校验、验证码必填。
  - 保留 ESA 成功回调后再次校验表单再登录，避免验证码回调期间表单被清空。
  - 保留 mock API 模式下阻断 ESA 事件并直接使用 `mock-aliyun-captcha` 登录的行为。
  - 保留登录失败后刷新普通验证码、清空验证码输入、重置阿里云验证码实例。
  - 保留登录成功后的 100ms 等待、合法 redirect 参数跳转、管理员跳转 `/admin/overview`、普通用户跳转 `/dashboard`。
  - 保留通行密钥登录支持检测、challenge 获取、浏览器凭据获取、后端登录和错误文案映射。
  - 保留通行密钥取消验证时使用 warning，其它业务错误使用 error，未知 API 错误继续走统一 `showApiError()`。
  - 保留 `expired=1` 时提示登录身份过期并清理 URL 参数，以及 `email` query 自动预填邮箱。

`LoginView.vue` 现在只保留页面所需图标、布局组件、验证码组件、`NIcon` 和 `useLoginView()` 解构。模板和样式未改动，账号密码登录、验证码、ESA 按钮绑定、通行密钥切换、通行密钥登录、注册/忘记密码入口和所有用户可见文案保持原样。

## 2026-07-03 第六十六轮补充
### 图片审核操作与弹窗状态抽离

本轮继续拆 `src/admin/ImageAudit.vue`。该页面此前已经拆出筛选、选择、可用性检测、批量审核、单张审核、删除申请和表格列配置，但页面脚本里仍保留单张通过确认、单张问题弹窗、批量通过确认、批量问题弹窗、可用性检测入口和弹窗清理状态。
- 新增 `src/composables/useImageAuditReviewActions.ts`
  - 集中维护 `showRejectModal`、`rejectReason`、`showBatchRejectModal`、`batchRejectReason` 和共享 `submitting` 状态。
  - 保留单张“正常”确认弹窗的标题、正文、确认/取消按钮和提交行为。
  - 保留单张“有问题”弹窗打开、问题描述必填校验、提交成功后关闭弹窗的行为。
  - 保留当前页可用性检测和已选图片可用性检测入口，仍按图片 ID 列表调用原 `runAvailabilityCheck()`。
  - 保留批量“正常”前的已选数量校验、确认弹窗和批量提交行为。
  - 保留批量“有问题”前的已选数量校验、问题描述必填校验、提交成功后关闭弹窗的行为。
  - 保留弹窗关闭后清理单张/批量问题描述的行为。

`ImageAudit.vue` 现在继续负责列表加载、筛选、选择、表格列接线和模板渲染，审核操作弹窗统一交给 composable 管理。页面脚本区从约 472 行下降到约 388 行；模板和样式未改动，桌面表格、移动端卡片、批量审核栏、三个弹窗和所有按钮绑定名称保持原样。

## 2026-07-03 第六十七轮补充
### 图库上传异常处理抽离

本轮继续拆 `src/views/dashboard/GalleryUpload.vue`。该页面当前仍是前端最大脚本块，已经拆出上传记录、上传会话、本地文件项和上传执行器，但页面脚本里还混着“上传失败如何标记本地条目”和“后端返回未完成批次如何提示用户”的异常分支。
- 新增 `src/composables/useGalleryUploadErrorHandling.ts`
  - 集中处理后端返回 `incomplete` payload 时的本地条目标记、失败文件名摘要、页面错误横幅和统一 API 错误提示。
  - 保留“已成功上传的图片不会重复上传、再次提交只重传失败项”的提示文案。
  - 保留后端没有返回可定位图片 ID 时，提示用户刷新后重试或重新选择失败图片。
  - 保留普通上传失败时优先标记当前 hashing/uploading/error 条目，并保留已选图片与表单内容。
  - 保留上传过期判断：识别“上传窗口已过期”、“上传已过期”和英文 `expired`。
  - 保留异常处理后立即调用 `saveUploadDraft()`，确保本地草稿记录失败状态。

`GalleryUpload.vue` 现在不再直接导入 `galleryUploadIncomplete` 工具和 `getApiErrorMessage()`，提交流程仍按原顺序处理：未完成批次优先、过期错误其次、普通失败最后。页面脚本区从约 638 行下降到约 582 行；模板和样式未改动，草稿恢复、文件选择、上传会话、记录列表和详情弹窗行为保持原样。

## 2026-07-03 第六十八轮补充
### 图库上传提交校验与初始化项构造抽离

本轮继续拆 `src/views/dashboard/GalleryUpload.vue`。上传页剩余脚本中，上传前校验和后端初始化 items 构造仍直接写在页面内，既依赖表单默认值，也依赖单图编辑项，属于适合沉到 composable 的业务规则。
- 新增 `src/composables/useGalleryUploadSubmitValidation.ts`
  - 集中维护提交前校验：必须选择图片、单批次最多 5 张、总大小不超过 100MB。
  - 保留每张图必须有标题和作者的规则，仍按“单图字段优先，页面默认字段兜底”判断。
  - 保留 `SINGLE_PID_MULTI_PAGE` 模式下页码必须是非负整数，且同一 PID 下页码不能重复。
  - 集中构造 `GalleryUploadInitItem[]`，保留 `clientItemId`、文件名、类型、大小、页码、单图标题、单图作者和单图标签。
  - 保留初始化阶段不从页面默认字段写入单图 `title/author/tags` 的行为，默认字段继续由 `defaults` 提交给后端。

`GalleryUpload.vue` 现在通过 `useGalleryUploadSubmitValidation()` 获取 `validateBeforeSubmit()` 和 `buildInitItems()`，上传入口和 session 初始化仍调用同名函数。页面脚本区从约 582 行下降到约 529 行；模板、样式、草稿、文件选择和上传流程顺序未改动。

## 2026-07-03 第六十九轮补充
### 图库上传文件选择与删除逻辑抽离

本轮继续拆 `src/views/dashboard/GalleryUpload.vue`。上传页剩余脚本中，原生文件 input 打开、文件选择筛选、草稿图片匹配、本地列表同步、持久化图片文件和删除单项仍直接写在页面里。
- 新增 `src/composables/useGalleryUploadFileSelection.ts`
  - 集中维护 `nativeFileInputRef`、`openNativeFilePicker()`、`handleNativeFileChange()`、`addNativeFiles()` 和 `removeUploadItem()`。
  - 保留无法继续选择文件时不打开系统文件选择器的行为。
  - 保留只接受 JPG/PNG、单图 10MB、单批 100MB、单批最多 5 张的筛选和提示文案。
  - 保留选择文件后与草稿文件项匹配的逻辑；当选择的文件正好对应草稿时，不续签上传批次标识。
  - 保留普通新增文件时调用 `renewUploadIntentAfterEdit()`，确保已创建过后端批次的草稿在编辑后换新 idempotency key。
  - 保留同步 `fileList` 与 `uploadItems`、IndexedDB 持久化原始文件、删除单项时释放预览 URL、删除 IndexedDB 文件草稿的行为。

`GalleryUpload.vue` 现在通过 `useGalleryUploadFileSelection()` 获取模板需要的文件选择和删除接口。页面脚本区从约 529 行下降到约 491 行；模板、样式、文件输入框、删除按钮、草稿恢复和上传提交流程未改动。

## 2026-07-03 第七十轮补充
### AI 绘图素材选择派生状态抽离

本轮转向 `src/views/dashboard/AiDraw.vue`。该页面此前已经拆出了资源加载、提示词、尺寸预设、角色蒙版和生成流程，但页面脚本里仍然直接维护角色/LoRA 选中项、角色 metadata、打开素材选择页、清空角色与 LoRA 的胶水逻辑。

- 新增 `src/composables/useAiDrawAssetSelection.ts`
  - 集中维护主角色、第二角色、主 LoRA、第二 LoRA 的选中素材派生状态。
  - 集中维护主角色和第二角色的能力 metadata 解析结果，供提示词注入和角色规则继续使用。
  - 保留进入素材选择页前先调用 `captureDraft()` 的行为，确保从 AI 绘图页跳转到素材选择页时当前草稿不会丢失。
  - 保留跳转 `/dashboard/ai-assets` 时携带 `tab` 与 `target` query 的行为。
  - 保留打开 LoRA 选择、打开角色/风格选择、清空 LoRA、清空角色的原有函数名，模板绑定无需变化。
  - 继续复用 `clearAiDrawLora()`、`clearAiDrawCharacter()` 和 `parseMetadata()`，不在页面里重复实现业务规则。

`AiDraw.vue` 现在只负责表单、生成流程、角色蒙版、生命周期和模板绑定，素材选择相关派生状态交给 composable 管理。页面脚本区从约 375 行下降到约 350 行；模板、样式、素材选择入口、清空按钮、草稿跳转和生成逻辑未改动。

## 2026-07-03 第七十一轮补充
### 图片审核列表数据源与分页统计抽离

本轮继续处理 `src/admin/ImageAudit.vue`。该页面此前已经把审核动作、批量审核、删除申请、可用性检测、表格列、筛选状态等拆出，但列表请求、移动端队列请求、统计加载、分页同步、请求竞态保护和卸载清理仍集中在页面脚本里，页面既要渲染 UI，又要维护数据源细节。

- 新增 `src/composables/useImageAuditData.ts`
  - 集中维护 `loading`、`list`、`pagination`、`pageCount`、`stats`、`dueBefore` 和列表请求序号。
  - 内部复用 `useImageAuditFilters()`，统一暴露 `scope`、`pidFilter`、`pFilter`、`staleDays`、`availabilityStatus`、`onlyBroken` 和 `resetFilters()`。
  - 保留桌面端 `fetchImageAuditList()` 分页列表请求行为，以及移动端特定场景下 `fetchImageAuditQueue()` 队列请求行为。
  - 保留移动端队列模式下额外请求 `ALL` 统计的兜底逻辑，继续用统计或 `hasMore` 推导当前分页总数。
  - 保留请求序号保护，过期请求不会覆盖当前列表状态或关闭当前 loading。
  - 通过 `setSelectionHandlers()` 接入选择模块，保持翻页、筛选、重置、刷新后的选中项清理和同步行为。
  - 提供 `dispose()` 统一处理卸载时的请求失效、loading 清理、列表清空、统计清空和选择清空。
- 调整 `src/composables/useImageAuditReviewSettlement.ts`
  - 删除仅供列表加载使用的 `getCurrentScopeTotal()`，让统计推导归属到数据源 composable。
  - 保留审核完成后的本地列表结算、统计递减、选中项移除和空页刷新逻辑。

`ImageAudit.vue` 现在只负责 UI 绑定、审核动作组合、列配置、弹窗清理和生命周期调用。页面脚本区从约 388 行下降到约 248 行；模板、样式、筛选栏、桌面表格、移动端卡片、批量审核栏和弹窗行为未改动。

## 2026-07-03 第七十二轮补充
### AI 绘图历史回填、草稿恢复与预填参数抽离

本轮继续拆 `src/views/dashboard/AiDraw.vue`。上一轮已经把素材选择派生状态移出页面，本轮处理页面脚本中仍然保留的历史任务复用、Pinia 草稿恢复和 `sessionStorage` 预填参数读取逻辑。

- 新增 `src/composables/useAiDrawRestore.ts`
  - 集中维护 `fillAgain()`，继续复用 `applyAiDrawHistoryJobToForm()`，保留历史任务回填后重绘角色蒙版的行为。
  - 集中维护 `restoreDraft()`，保留存在草稿时设置 `restoringDraft`、恢复表单、重置草稿 store、同步尺寸预设并重绘角色蒙版的顺序。
  - 集中维护 `restorePrefill()`，保留从 `sessionStorage` 读取 `ai-draw-prefill`、读取后移除、回填历史任务和成功/失败提示文案。
  - 通过参数注入 `storage`、`message`、`draftStore`、`selectedSize`、`restoreCharacterMask` 和 `redrawCharacterMaskSoon`，避免 composable 隐式依赖浏览器全局或页面局部变量。

`AiDraw.vue` 现在不再直接处理历史任务复用、草稿恢复和预填读取，页面继续负责表单、提示词、生成流程、角色蒙版和生命周期编排。页面脚本区从约 357 行下降到约 338 行；模板、样式、最近任务复用按钮、草稿恢复时机和用户提示文案未改动。

## 2026-07-03 第七十三轮补充
### 图库上传 localStorage 草稿状态抽离

本轮回到当前最大的 `src/views/dashboard/GalleryUpload.vue`。该页面此前已经拆出本地文件项、文件选择、提交校验、上传会话、上传执行器、异常处理和上传记录，但 localStorage 草稿读写、草稿提示、草稿文件恢复和编辑后续签投稿批次标识仍留在页面脚本里。

- 新增 `src/composables/useGalleryUploadDraftState.ts`
  - 集中维护 `draftReady`、`draftItemMap`、`draftRestoredNotice` 和 `draftRestoreMessage`。
  - 集中维护 `saveUploadDraft()`、`clearUploadDraft()`、`loadUploadDraft()` 和 `restoreDraftFiles()`。
  - 保留草稿结构：表单默认值、`includeSha256`、`uploadIntentKey`、`batchId`、`createBatchAttempted` 和本地上传项快照。
  - 保留无意义草稿自动删除、草稿解析失败自动清理、草稿恢复提示、图片文件部分恢复提示和浏览器未保留图片文件时的提示文案。
  - 保留编辑后调用上传会话续签逻辑，只有在草稿 ready、非上传中、非恢复图片文件时才允许续签。
  - 通过 `setSessionState()` 注入上传会话 refs，避免草稿模块和 `useGalleryUploadSession()` 互相初始化卡死。
  - 通过 `getUploadItems()`、`getRestoringDraftFiles()` 和 `restoreLocalDraftFiles()` getter 打断本地文件模块与草稿状态之间的依赖环。

`GalleryUpload.vue` 现在不再直接处理 localStorage 草稿序列化、解析和恢复提示，只保留上传表单、上传执行入口、记录详情入口和模板绑定。页面脚本区从约 491 行下降到约 408 行；模板、样式、上传流程、草稿恢复时机、文件选择、上传记录和详情弹窗未改动。

## 2026-07-03 第七十四轮补充
### 图库上传提交编排与表单重置抽离

本轮继续拆 `src/views/dashboard/GalleryUpload.vue`。上一轮抽出了草稿状态后，页面脚本中仍保留“点击开始上传后如何校验、进入 loading、调用上传 runner、处理过期、处理未完成批次、处理普通失败、成功后刷新记录并重置表单”的完整编排。

- 新增 `src/composables/useGalleryUploadSubmitFlow.ts`
  - 集中维护 `handleStartUpload()`，保留重复点击拦截、提交前校验、`uploading` 状态、`submitError` 清理和 finally 中保存草稿的顺序。
  - 保留上传完成但后端状态为 `EXPIRED` 时的草稿重置和错误提示。
  - 保留上传成功后提示“上传完成，等待管理员审核”、重置上传表单、切换到记录页、重置记录筛选并刷新上传记录。
  - 保留未完成批次优先处理、过期错误次级处理、普通失败最后处理的异常分支顺序。
  - 集中维护 `resetUploadForm()`，保留释放预览 URL、清空文件列表、清空本地上传项、清空错误、重置 upload intent 和清理草稿的行为。

`GalleryUpload.vue` 现在不再直接处理上传按钮背后的流程编排，只把模板需要的 `handleStartUpload()` 和 `resetUploadForm()` 从 composable 解构出来。页面脚本区从约 408 行下降到约 381 行；模板、样式、上传按钮、重置按钮、成功/失败提示、上传记录刷新和草稿保存行为未改动。

## 2026-07-03 第七十五轮补充
### 图库上传页面副作用编排抽离

本轮继续收缩当前最大的 `src/views/dashboard/GalleryUpload.vue`。在草稿状态和提交流程已经抽出后，页面尾部仍保留多组 watcher、挂载恢复草稿、路由 `batchId` 打开详情和卸载释放预览 URL 的副作用编排。

- 新增 `src/composables/useGalleryUploadPageEffects.ts`
  - 集中维护草稿 watch：表单、`includeSha256` 和本地上传项变化后继续续签 upload intent 并保存草稿。
  - 集中维护上传会话 watch：`createBatchAttempted`、`uploadIntentKey`、`activeBatchId` 变化后继续保存草稿。
  - 集中维护上传项状态 watch：本地条目的状态、进度、错误、SHA-256、后端提交 ID、OSS key 和 etag 变化后继续保存草稿。
  - 集中维护页面挂载流程：读取草稿、标记 `draftReady`、恢复本地图片文件、恢复后端批次状态并加载投稿记录。
  - 集中维护路由 `batchId` 副作用：URL 带批次 ID 时切换到记录页并打开详情。
  - 集中维护卸载清理：页面离开时释放所有本地预览 URL。

`GalleryUpload.vue` 现在只保留页面状态创建、业务 composable 组装、少量模板展示 helper 和模板绑定。页面脚本区从约 381 行下降到约 341 行；模板、样式、草稿恢复时机、记录详情打开、上传记录刷新、预览 URL 清理和用户可见交互未改动。

## 2026-07-03 第七十六轮补充
### AI 绘图页面副作用编排抽离

本轮处理当前第二大页面 `src/views/dashboard/AiDraw.vue`。该页面此前已经拆出资源加载、素材选择、角色蒙版、提示词、生成流程和恢复逻辑，但页面尾部仍保留多组 watch、挂载初始化、卸载清理，以及模板直接绑定的若干表单响应函数。

- 新增 `src/composables/useAiDrawPageEffects.ts`
  - 集中维护 NSFW 模式和 NSFW 可见级别变化时的 LoRA 强度调整。
  - 集中维护主/副角色选择变化后的角色元数据回填，保留恢复草稿期间不自动覆盖表单的保护。
  - 集中维护生成模式、角色、LoRA、触发词、风格标签、风格预设和注入标签变化后的提示词同步。
  - 集中维护生成模式切换后的尺寸预设兜底和角色蒙版重绘。
  - 集中维护宽高变化、画布挂载、窗口 resize 时的角色蒙版重绘。
  - 集中维护页面挂载初始化：加载服务状态、模型能力、积分、最近任务，随后恢复草稿、恢复预填参数、同步提示词并启动服务状态轮询。
  - 集中维护页面卸载清理：停止任务轮询、停止服务状态轮询并移除 resize 监听。

`AiDraw.vue` 现在继续负责页面状态创建、各业务 composable 组装和模板绑定；副作用时序集中在 `useAiDrawPageEffects.ts`。页面脚本区从约 338 行下降到约 280 行；模板、样式、生成按钮、NSFW 控件、角色蒙版、最近任务复用、草稿恢复和预填参数行为未改动。

## 2026-07-03 第七十七轮补充
### 图库上传表单状态与展示规则抽离

本轮继续收缩当前最大页面 `src/views/dashboard/GalleryUpload.vue`。在上传流程、草稿状态和页面副作用已经抽出后，页面脚本里仍保留投稿表单默认值、选项常量、提交默认字段构造，以及两个模板展示 helper。

- 新增 `src/composables/useGalleryUploadFormState.ts`
  - 集中维护投稿表单默认值：投稿模式、标题、作者、R18、AI 类型和标签文本。
  - 集中维护 AI 类型选项、投稿模式选项和记录状态筛选选项。
  - 集中维护提交初始化请求里的默认字段构造，保留标题/作者空字符串转 `undefined`、R18、AI 类型和标签解析规则。
- 扩展 `src/utils/galleryUploadStatus.ts`
  - 新增 `getLocalUploadStatusText()`，集中维护本地上传状态展示文案。
  - 新增 `getPublicImageLabel()`，集中维护公开图库 `pid_p` 标签展示规则。

`GalleryUpload.vue` 现在进一步接近页面装配层：创建页面状态、组合业务 composable、暴露模板绑定。页面脚本区从约 341 行下降到约 309 行；模板、样式、表单默认值、状态文案、投稿初始化参数和公开图号展示未改动。

## 2026-07-03 第七十八轮补充
### 图片审核页面副作用编排抽离

本轮处理第三个热点页面 `src/admin/ImageAudit.vue`。该页面此前已经拆出列表数据源、筛选、选择、审核动作、批量审核、删除申请、可用性检查、审核结算和表格列配置，但页面尾部仍保留首次加载、移动端切换刷新、弹窗关闭清理和卸载清理。

- 新增 `src/composables/useImageAuditPageEffects.ts`
  - 集中维护页面挂载后的首次 `fetchData()`。
  - 集中维护移动端/桌面断点切换后的分页重置、选中项清理和列表刷新。
  - 集中维护单图驳回、批量驳回、删除申请弹窗关闭后的局部状态清理。
  - 集中维护页面卸载时的提交状态复位、数据源释放、弹窗状态清理。
- 调整 `src/admin/ImageAudit.vue`
  - 删除页面内的生命周期和 watch 编排。
  - 将纯转发的 `getScopeLabel` 和 `resetFilters` 改为直接别名。

`ImageAudit.vue` 现在继续负责组合审核相关 composable、配置列和模板绑定。页面脚本区从约 248 行下降到约 230 行；模板、样式、筛选栏、桌面表格、移动端卡片、审核弹窗、删除申请弹窗和分页行为未改动。

## 2026-07-03 第七十九轮补充
### 音乐搜索框交互抽离

本轮处理 `src/views/dashboard/MusicPlayer.vue`。该页面此前已经拆出搜索结果、热门搜索、搜索历史、MV 播放、歌曲下载和歌单弹窗，但搜索框交互仍留在页面里：聚焦时加载热门搜索、失焦延迟隐藏、输入清空时清结果、点击热门词搜索、保存历史、回车搜索和加载更多。

- 新增 `src/composables/useMusicSearchBox.ts`
  - 集中维护 `showHotSearch` 和搜索框聚焦状态。
  - 集中维护聚焦时仅在关键词为空时显示热门搜索并拉取热门词。
  - 集中维护失焦后延迟关闭热门下拉，保留点击热门词时不会被立即隐藏的交互。
  - 集中维护输入为空时清理搜索结果、输入非空时隐藏热门下拉。
  - 集中维护点击热门词、回车搜索、普通搜索、保存历史、加载更多和清空历史提示。
  - 集中维护挂载时加载本地搜索历史。
- 调整 `src/views/dashboard/MusicPlayer.vue`
  - 删除页面里的搜索框状态、搜索交互函数和历史型注释。
  - 页面继续负责组合音乐相关 composable、播放入口、播放列表入口和模板绑定。

`MusicPlayer.vue` 脚本区从约 210 行下降到约 133 行；模板、样式、搜索框、热门搜索下拉、历史搜索、搜索结果、加载更多、播放、添加到播放列表、MV 和歌单弹窗行为未改动。

## 2026-07-03 第八十轮补充
### 播放列表详情业务逻辑抽离

本轮处理 `src/views/dashboard/PlaylistDetail.vue`。该页面原本把路由 ID 读取、歌单详情加载、播放全部、播放模式切换、移除歌曲、编辑表单、保存编辑和挂载加载全部放在页面脚本内，并混有历史型分段注释。

- 新增 `src/composables/usePlaylistDetail.ts`
  - 集中维护歌单详情加载和加载态。
  - 集中维护播放全部，保留播放成功/失败提示和 `musicStore.lastPlaybackError` 兜底。
  - 集中维护播放模式切换，保留本地 `playlist.playMode` 同步和中文模式提示。
  - 集中维护从歌单移除歌曲，保留成功后重新加载详情。
  - 集中维护编辑表单打开、名称校验、保存编辑、关闭弹窗和重新加载详情。
  - 集中维护页面挂载时的首次加载。
- 调整 `src/views/dashboard/PlaylistDetail.vue`
  - 页面只负责路由、返回按钮和模板绑定。
  - 删除历史型分段注释。

`PlaylistDetail.vue` 脚本区从约 190 行下降到约 55 行；模板、样式、返回按钮、播放全部、播放模式、移除歌曲、编辑弹窗和保存编辑行为未改动。

## 2026-07-03 第八十一轮补充
### 我的歌单列表业务逻辑抽离

本轮处理 `src/views/dashboard/MyPlaylists.vue`。该页面原本把歌单列表加载、创建歌单、播放歌单、删除歌单、统计聚合和挂载加载都放在页面脚本内，并混有历史型分段注释。

- 新增 `src/composables/useMyPlaylists.ts`
  - 集中维护歌单列表、加载态、创建弹窗和创建表单。
  - 集中维护歌单数量、歌曲总数、播放总量统计。
  - 集中维护加载我的歌单列表。
  - 集中维护创建歌单，保留名称必填校验、成功提示、关闭弹窗、重置表单和重新加载列表。
  - 集中维护播放歌单，保留先加载完整详情、空歌单提示、播放成功/失败提示。
  - 集中维护删除歌单，保留成功后重新加载列表。
  - 复用 `PLAYLIST_PLAY_MODE_NAMES`，让歌单列表和详情页使用同一份播放模式展示文案。
- 调整 `src/views/dashboard/MyPlaylists.vue`
  - 页面只负责路由跳转和模板绑定。
  - 删除历史型分段注释。

`MyPlaylists.vue` 脚本区从约 164 行下降到约 50 行；模板、样式、创建弹窗、统计卡片、歌单卡片、播放、删除和进入详情行为未改动。

## 2026-07-03 第八十二轮补充
### 管理后台概览数据逻辑抽离

本轮处理 `src/admin/AdminOverview.vue`。该页面原本同时承担管理概览统计加载、图库统计同步、管理员信息刷新、问候语计算、时间格式化和页面跳转。

- 新增 `src/composables/useAdminOverview.ts`
  - 集中维护 API 调用量、用户数、黑名单数和图库收录统计。
  - 保留并发加载和 `useRequestGuard()` 请求序号保护，过期请求不会覆盖当前 loading 状态。
  - 集中维护手动同步图库统计，保留重复点击拦截、成功后刷新概览、失败提示。
  - 集中维护管理员信息刷新，保留逐字段更新 `auth.user` 的注释和行为，避免不必要的响应式级联。
  - 集中维护管理员展示名、时间段问候语和统计更新时间展示。
  - 集中维护页面挂载时加载概览与刷新管理员信息。
- 调整 `src/admin/AdminOverview.vue`
  - 页面只保留路由跳转和模板绑定。

`AdminOverview.vue` 脚本区从约 155 行下降到约 36 行；模板、样式、统计卡片、同步按钮、跳转按钮、问候语和错误提示行为未改动。

## 2026-07-03 第八十三轮补充
### 音乐播放历史业务逻辑抽离

本轮处理 `src/views/dashboard/MusicHistory.vue`。该页面原本把播放历史加载、分页、历史记录转歌曲对象、播放、加入播放列表、清空历史和挂载加载都放在页面脚本内，并存在重复的 `MusicHistoryRecord` 到 `Song` 转换逻辑。

- 新增 `src/composables/useMusicHistory.ts`
  - 集中维护播放历史列表、总数、分页、加载态和总页数。
  - 集中维护播放历史加载，保留同时请求列表和总数的行为。
  - 集中维护分页切换后重新加载。
  - 新增 `mapMusicHistoryRecordToSong()`，统一历史记录到播放器歌曲对象的转换规则。
  - 集中维护从历史记录播放歌曲，保留成功后加入播放列表和失败提示。
  - 集中维护加入播放列表和清空播放历史。
  - 集中维护页面挂载时加载历史。
- 调整 `src/views/dashboard/MusicHistory.vue`
  - 页面只负责组合音乐 store、调用 composable 和模板绑定。
  - 删除历史型分段注释和重复转换代码。

`MusicHistory.vue` 脚本区从约 150 行下降到约 41 行；模板、样式、分页、清空历史、播放、加入播放列表和当前歌曲高亮行为未改动。

## 2026-07-03 第八十四轮补充
### 我的删除申请列表与详情逻辑抽离

本轮处理 `src/views/dashboard/MyDeleteRequests.vue`。该页面原本把删除申请列表加载、分页、详情弹窗、从路由 query 打开详情和请求序号保护都放在页面脚本里。

- 新增 `src/composables/useMyDeleteRequests.ts`
  - 集中维护删除申请列表、分页、总数和加载态。
  - 集中维护详情弹窗、详情加载态和详情数据。
  - 保留 `useRequestGuard()` 请求序号保护，避免过期列表或详情请求覆盖当前状态。
  - 集中维护列表加载、分页切换、打开详情、从 `requestId` query 打开详情。
  - 新增 `parsePositiveId()`，统一路由 query 中正整数 ID 的解析规则。
- 调整 `src/views/dashboard/MyDeleteRequests.vue`
  - 页面保留图片兜底资源、状态展示 helper 和模板绑定。
  - 删除历史型分段注释。

`MyDeleteRequests.vue` 脚本区从约 145 行下降到约 56 行；模板、样式、刷新按钮、分页、列表卡片、状态标签、详情弹窗和从 URL 打开详情行为未改动。

## 2026-07-03 第八十五轮补充
### 收藏页初始化副作用收口

本轮处理 `src/views/dashboard/Favorites.vue`。该页面此前已经拆出收藏夹列表、收藏夹编辑、封面设置、移动作品和分享逻辑，剩余主要是页面装配和挂载初始化。

- 新增 `src/composables/useFavoritesPageEffects.ts`
  - 集中维护页面挂载后先加载收藏夹、再加载当前收藏作品的初始化顺序。
- 调整 `src/views/dashboard/Favorites.vue`
  - 删除页面内直接 `onMounted()` 初始化。
  - 清理图标导入上的历史型注释。

`Favorites.vue` 仍作为收藏页装配层，组合各业务 composable 并绑定模板；模板、样式、收藏夹切换、作品列表、封面设置、移动作品、分享和弹窗行为未改动。

## 2026-07-03 第八十六轮补充
### 个人中心基础资料逻辑抽离

本轮处理 `src/views/dashboard/ProfileView.vue`。该页面此前已经拆出账号操作、收藏统计和 Passkey 管理，剩余仍有用户基础资料初始化、头像同步、收藏统计加载、Passkey 加载和展示派生状态。

- 新增 `src/composables/useProfileIdentity.ts`
  - 集中维护空用户资料默认值。
  - 集中维护 `getUserInfo()` 初始化加载。
  - 保留用户头像同步到 Pinia auth store 的行为。
  - 保留加载用户资料后继续加载收藏统计和 Passkey 列表的顺序。
  - 集中维护展示头像、展示名称、管理员标记和邮箱首字母。
  - 集中维护页面挂载时的首次资料加载。
- 调整 `src/views/dashboard/ProfileView.vue`
  - 页面继续负责路由跳转、组合账号操作/统计/Passkey composable 和模板绑定。
  - 删除历史型分段注释。

`ProfileView.vue` 脚本区从约 135 行下降到约 105 行；模板、样式、头像展示、昵称展示、管理员标记、头像上传、昵称修改、密码修改、收藏统计和 Passkey 管理行为未改动。

## 2026-07-03 第八十七轮补充
### 后台 AI 删除申请审核逻辑抽离

本轮处理 `src/admin/AdminAiDeleteRequests.vue`。该页面原本把 AI 删除申请列表加载、状态筛选、分页、通过申请、打开拒绝弹窗和提交拒绝都放在页面脚本内。

- 新增 `src/composables/useAdminAiDeleteRequests.ts`
  - 集中维护删除申请列表、总数、分页、状态筛选和加载态。
  - 集中维护拒绝弹窗、当前申请、拒绝原因和提交态。
  - 集中维护列表加载、筛选重置页码后加载、通过申请、打开拒绝弹窗和提交拒绝。
  - 保留通过/拒绝成功后的提示和重新加载列表。
  - 保留拒绝原因必填校验和错误提示。
  - 集中维护页面挂载时首次加载。
- 调整 `src/admin/AdminAiDeleteRequests.vue`
  - 页面只保留状态选项、状态展示 helper、时间格式化和模板绑定。

`AdminAiDeleteRequests.vue` 脚本区从约 130 行下降到约 48 行；模板、样式、状态筛选、刷新、分页、通过、拒绝弹窗和错误提示行为未改动。

## 2026-07-03 第八十八轮补充
### 后台 AI 审核队列逻辑抽离

本轮处理 `src/admin/AdminAiReviews.vue`。该页面原本把 AI 审核队列加载、状态/分类筛选、分页、审核通过、打开拒绝弹窗和提交拒绝都放在页面脚本内。

- 新增 `src/composables/useAdminAiReviews.ts`
  - 集中维护审核队列、总数、分页、状态筛选、分类筛选和加载态。
  - 集中维护拒绝弹窗、当前审核项、拒绝原因和提交态。
  - 集中维护队列加载、筛选重置页码后加载、审核通过、打开拒绝弹窗和提交拒绝。
  - 保留审核通过后发布到广场的成功提示和重新加载队列。
  - 保留拒绝原因必填校验和错误提示。
  - 集中维护页面挂载时首次加载。
- 调整 `src/admin/AdminAiReviews.vue`
  - 页面只保留筛选选项、状态展示 helper、时间格式化和模板绑定。

`AdminAiReviews.vue` 脚本区从约 129 行下降到约 50 行；模板、样式、状态筛选、分类筛选、刷新、分页、通过、拒绝弹窗和错误提示行为未改动。

## 2026-07-03 第八十九轮补充
### 注册页表单与提交流程抽离

本轮处理 `src/views/auth/RegisterView.vue`。该页面原本把注册表单状态、密码显示状态、验证码 ref、ESA 安全验证回调、表单校验、注册请求、失败后刷新验证码和注册成功跳转都放在页面脚本内。

- 新增 `src/composables/useRegisterView.ts`
  - 集中维护注册表单、loading、ESA loading、验证码 ref 和密码显示状态。
  - 集中维护邮箱、密码、确认密码和验证码校验。
  - 集中维护 ESA 验证成功/失败回调。
  - 集中维护注册请求、成功提示、跳转登录页并携带邮箱 query。
  - 保留注册失败后刷新普通验证码、清空验证码输入、重置阿里云验证码。
  - 保留 `noindex, nofollow` SEO 设置。
- 调整 `src/views/auth/RegisterView.vue`
  - 页面只保留图标、布局组件、验证码组件和模板绑定。
  - 删除历史型注释。

`RegisterView.vue` 脚本区从约 126 行下降到约 27 行；模板、样式、验证码、ESA 安全验证、注册校验、失败刷新验证码和成功跳转行为未改动。

## 2026-07-03 第九十轮补充
### 公开用户资料页数据逻辑抽离

本轮处理 `src/views/public/UserProfileView.vue`。该页面原本把用户 ID 解析、公开收藏夹加载、用户信息推导、SEO 昵称、封面 URL 构造、返回和进入收藏详情都放在页面脚本内。

- 新增 `src/composables/useUserProfileView.ts`
  - 集中维护路由用户 ID、加载态、公开收藏夹、用户昵称/头像和分页信息。
  - 集中维护公开收藏夹加载和后端 `list/items/records` 多结构兼容。
  - 集中维护从收藏夹数据推导公开用户昵称和头像。
  - 保留昵称加载后的响应式 SEO 更新。
  - 集中维护返回、进入公开收藏详情和封面 URL 构造。
  - 集中维护页面挂载时首次加载。
- 调整 `src/views/public/UserProfileView.vue`
  - 页面只保留图标、基础组件和模板绑定。
  - 删除历史型分段注释。

`UserProfileView.vue` 脚本区从约 117 行下降到约 35 行；模板、样式、返回按钮、用户信息卡、公开收藏夹列表、封面展示和进入收藏详情行为未改动。

## 2026-07-03 第九十一轮补充
### 积分调用表单状态收口

本轮处理 `src/views/dashboard/PointsCall.vue`。该页面此前已经拆出积分、结果、下载、删除申请、收藏夹和页面副作用逻辑，剩余主要是页面装配、表单默认值和标签解析。

- 新增 `src/composables/usePointsCallFormState.ts`
  - 集中维护积分调用表单默认值。
  - 集中维护标签文本解析后的 `parsedTags`。
- 调整 `src/views/dashboard/PointsCall.vue`
  - 页面改为从 `usePointsCallFormState()` 获取表单和解析标签。
  - 删除页面内收藏逻辑说明的历史型注释。

`PointsCall.vue` 继续作为积分调用页装配层；模板、样式、积分刷新、表单输入、调用、结果展示、下载、删除申请和加入收藏行为未改动。

## 2026-07-03 第九十二轮补充
### 播放器抽屉状态与动作抽离

本轮处理 `src/components/music/PlayerDrawer.vue`。该组件是全局音乐播放器抽屉，脚本中混合了抽屉高度、歌手文案、播放进度、音质/播放模式选项和播放控制事件。

- 新增 `src/composables/usePlayerDrawer.ts`
  - 集中维护播放器 store、移动端抽屉高度、歌手展示文案、当前时长兜底和播放进度百分比。
  - 集中维护音质选项、播放模式选项、播放/暂停、进度跳转、音量调整、音质切换、播放模式切换、Tab 切换和抽屉关闭动作。
  - 保留无歌曲时提示、缺少播放地址时重新调用 `playSong`、音质切换失败提示。
- 调整 `src/components/music/PlayerDrawer.vue`
  - 组件脚本改为只导入图标、UI 组件、子面板和 `usePlayerDrawer()` 返回值。
  - 模板、样式、底部抽屉布局、正在播放面板、歌词面板、队列面板和所有播放器交互入口未改动。

`PlayerDrawer.vue` 从共享组件中剥离播放器抽屉控制逻辑，脚本区不再进入复杂度前 15；后续若需要调整抽屉行为，可优先在 `usePlayerDrawer.ts` 内维护。

## 2026-07-03 第九十三轮补充
### 找回与重置密码页表单流程抽离

本轮处理 `src/views/auth/ForgotPasswordView.vue` 和 `src/views/auth/ResetPasswordView.vue`。两个认证页都属于页面脚本混合表单状态、校验、接口请求、提示和路由跳转的场景。

- 新增 `src/composables/useForgotPasswordView.ts`
  - 集中维护邮箱、图形验证码、验证码 UUID、加载态、验证码组件 ref 和阿里云安全验证 ref。
  - 集中维护邮箱格式校验、验证码校验、ESA 成功/失败回调和找回密码请求。
  - 保留发送成功提示、2 秒后跳转登录页、失败后刷新验证码/清空验证码/重置 ESA 的行为。
  - 保留 `noindex, nofollow` SEO 设置。
- 新增 `src/composables/useResetPasswordView.ts`
  - 集中维护重置 token、密码表单、加载态和密码显隐状态。
  - 集中维护 token 读取、新密码校验、确认密码一致性校验和重置密码请求。
  - 保留重置成功后清理本地登录态、成功提示并跳转登录页。
  - 提供返回找回密码页和直接登录的跳转函数，避免模板直接持有 router。
  - 保留 `noindex, nofollow` SEO 设置。
- 调整两个页面组件
  - 页面脚本只保留图标、布局组件、验证码组件和 composable 返回值。
  - 删除历史型注释，保留模板结构和样式表现。

`ForgotPasswordView.vue` 脚本区从约 96 行下降到约 20 行；`ResetPasswordView.vue` 脚本区从约 77 行下降到约 23 行。邮箱验证、验证码、ESA 安全验证、重置邮件发送、无效链接错误态、密码校验和跳转行为未改动。

## 2026-07-03 第九十四轮补充
### 收藏夹广场页面装配逻辑抽离

本轮处理 `src/views/dashboard/CollectionSquare.vue`。该页面此前已经拆出广场数据请求和展示 helper，但页面脚本仍直接持有路由、消息、滚动进度、移动端断点、点击涟漪、初始化加载和跳转函数。

- 新增 `src/composables/useCollectionSquarePage.ts`
  - 集中装配 `useCollectionSquareData`、滚动进度、移动端断点和点击涟漪。
  - 集中维护排序选项、页面挂载后的首次加载、进入收藏夹详情、进入用户主页和进入我的收藏夹。
  - 页面跳转仍统一通过 `safePush`，保留登录用户在 dashboard 框架内查看收藏夹详情的行为。
- 调整 `src/views/dashboard/CollectionSquare.vue`
  - 页面脚本改为只导入图标、Naive UI 组件、展示 helper 和 `useCollectionSquarePage()` 返回值。
  - 空态“去创建我的收藏夹”按钮改为调用 composable 提供的 `goMyCollections`。
  - 删除历史型分段注释和重复初始化说明。

`CollectionSquare.vue` 脚本区从约 102 行下降到约 62 行。搜索、排序、分页、点赞、收藏、滚动进度、点击涟漪、详情跳转、用户主页跳转、空态入口和模板样式未改动。

## 2026-07-03 第九十五轮补充
### 我的收藏页面装配层抽离

本轮处理 `src/views/dashboard/Favorites.vue`。该页面已经拆出收藏夹列表、编辑、封面、移动和分享等专用 composable，但页面脚本仍负责直接组合这些模块，并直接持有 `router`、`message`、初始化副作用和空态跳转。

- 新增 `src/composables/useFavoritesPage.ts`
  - 集中装配 `useFavoritesCollections`、`useFavoritesCollectionEditor`、`useFavoritesShare`、`useFavoritesCover`、`useFavoritesMoveItem` 和 `useFavoritesPageEffects`。
  - 保留收藏夹选择后同步广场分享状态的回调桥接。
  - 保留创建/编辑/删除收藏夹、分享广场、复制分享链接、设置封面、移动/复制作品和初始化加载的原有调用关系。
  - 新增 `goExploreDocs`，统一空态“去逛逛”跳转到 `/dashboard/docs`。
- 调整 `src/views/dashboard/Favorites.vue`
  - 页面脚本改为只导入图标、Naive UI 组件和 `useFavoritesPage()` 返回值。
  - 空态“去逛逛”按钮改为调用 `goExploreDocs`。

`Favorites.vue` 从业务模块编排者进一步收敛为 UI 装配层。收藏夹列表、分页、移除、编辑、新建、删除、公开分享、复制链接、封面设置、移动/复制和空态跳转行为未改动。

## 2026-07-03 第九十六轮补充
### 音乐搜索页页面总控抽离

本轮处理 `src/views/dashboard/MusicPlayer.vue`。该页面此前已经拆出搜索框、搜索结果、热搜、搜索历史、歌单、下载和 MV 播放等专用 composable，但页面脚本仍直接负责把这些模块串起来，并持有 `router`、`message`、`musicStore`、播放和加入队列动作。

- 新增 `src/composables/useMusicPlayerPage.ts`
  - 集中装配 `useMusicDownload`、`useMusicSearchResults`、`useMusicHotSearch`、`useMusicSearchHistory`、`useMusicMvPlayback`、`useMusicPlaylists` 和 `useMusicSearchBox`。
  - 统一维护页面顶部“我的歌单 / 播放历史”跳转。
  - 统一维护播放歌曲、播放成功后加入当前播放列表、播放失败提示和加入播放列表提示。
  - 搜索错误仍通过 `showApiError` 保持原有错误文案分流。
- 调整 `src/views/dashboard/MusicPlayer.vue`
  - 页面脚本改为只导入图标、Naive UI 组件、音乐子组件和 `useMusicPlayerPage()` 返回值。
  - 模板继续使用原有变量名和事件绑定。

`MusicPlayer.vue` 脚本区从约 133 行下降到约 67 行。搜索、热搜、搜索历史、加载更多、播放、加入队列、下载、MV、加入歌单、创建歌单和跳转行为未改动。

## 2026-07-03 第九十七轮补充
### 个人中心页面装配层抽离

本轮处理 `src/views/dashboard/ProfileView.vue`。该页面此前已经拆出个人资料、收藏夹统计、通行密钥和账号操作等专用 composable，但页面脚本仍直接持有 `router`、`auth`、`message`、`dialog`，并负责组合这些模块。

- 新增 `src/composables/useProfilePage.ts`
  - 集中装配 `useProfileCollectionStats`、`useProfilePasskeys`、`useProfileIdentity` 和 `useProfileAccountActions`。
  - 集中维护页面内快捷入口跳转。
  - 显式向页面返回 `isPasskeySupported`，让通行密钥能力判断成为页面状态的一部分。
  - 保留用户资料加载后继续加载收藏夹统计和通行密钥列表的原有顺序。
- 调整 `src/views/dashboard/ProfileView.vue`
  - 页面脚本改为只导入图标、Naive UI 组件、日期格式化和 `useProfilePage()` 返回值。
  - 模板继续使用原有变量名和事件绑定。

`ProfileView.vue` 脚本区从约 105 行下降到约 64 行。头像上传、昵称修改、密码修改、通行密钥新增/重命名/删除、收藏夹统计、快捷入口和日期展示行为未改动。

## 2026-07-03 第九十八轮补充
### 积分调用页总控抽离

本轮处理 `src/views/dashboard/PointsCall.vue`。该页面此前已经拆出积分、表单、结果、下载、删除申请、收藏和页面副作用等专用 composable，但页面脚本仍负责直接组合这些模块，并持有路由、消息、用户权限、移动端断点和调用费用常量。

- 新增 `src/composables/usePointsCallPage.ts`
  - 集中装配 `usePointsCallPoints`、`usePointsCallFormState`、`usePointsCallPageEffects`、`usePointsCallResults`、`usePointsCallDownload`、`usePointsCallDeleteRequest` 和 `usePointsCallFavorites`。
  - 集中维护管理员判断、调用费用、积分日志跳转和 `refreshAll`。
  - 保留积分刷新后再调用、调用成功/失败后刷新积分、删除申请缩略图降级和收藏弹窗的原有连接关系。
- 调整 `src/views/dashboard/PointsCall.vue`
  - 页面脚本改为只导入页面组件和 `usePointsCallPage()` 返回值。
  - 模板中的调用费用改为绑定 `costPerCall`，避免页面直接依赖常量名。

`PointsCall.vue` 脚本区从约 105 行下降到约 43 行。积分展示、调用表单、点击动效、结果轮播、下载原图、打开原图、删除申请、加入收藏、积分日志跳转和刷新行为未改动。

## 2026-07-03 第九十九轮补充
### 公开落地页状态与跳转抽离

本轮处理 `src/views/public/LandingPage.vue`。该公开页视觉结构较重，脚本中混合了 SEO、入场动画状态、项目卡片数据、路由跳转、登录态判断和滚动到项目区。

- 新增 `src/composables/useLandingPage.ts`
  - 集中维护落地页 SEO、项目卡片配置、背景加载态和入场动画状态。
  - 集中维护开始使用、查看文档和滚动到项目区域的动作。
  - 入场动画定时器仍在组件卸载时统一清理。
  - `prefers-reduced-motion` 检测移入 `onMounted`，避免页面 setup 阶段直接访问 `window`。
- 调整 `src/views/public/LandingPage.vue`
  - 页面脚本改为只导入 `RouterLink` 和 `useLandingPage()` 返回值。
  - 模板和样式未改动，首屏图、CTA、项目卡片、备案链接和动效 class 绑定保持原样。

`LandingPage.vue` 脚本区从约 98 行下降到约 17 行。SEO、登录态下开始使用跳转、文档跳转、项目区滚动、背景加载态和入场动画行为未改动。

## 2026-07-03 第一百轮补充
### 积分调用表单组件模型代理抽离

本轮处理 `src/components/points-call/PointsCallRequestCard.vue`。该组件脚本中主要剩余的是 props 类型、事件定义和多组 `v-model` computed 代理。

- 新增 `src/composables/usePointsCallRequestCardModel.ts`
  - 集中维护积分调用表单卡片的 props 类型。
  - 集中维护 `r18`、返回数量、关键词、标签文本、尺寸和排除 AI 的双向绑定代理。
  - 保留返回数量只接受 number 的保护逻辑。
- 调整 `src/components/points-call/PointsCallRequestCard.vue`
  - 组件脚本改为只保留图标、Naive UI 组件、选项常量、props/emits 和模型代理返回值。
  - 模板和样式未改动。

`PointsCallRequestCard.vue` 脚本区从约 87 行下降到约 52 行。父组件 `v-model`、刷新、流水、立即调用和所有表单输入行为未改动。

## 2026-07-03 第一百零一轮补充
### 图片审核页编排层抽离

本轮处理 `src/admin/ImageAudit.vue`。该页面已经拆出数据、选择、可用性检测、审核结算、批量审核、单项审核、删除申请、列配置和页面副作用等多个 composable，但页面脚本仍直接负责把这些模块逐一接线。

- 新增 `src/composables/useImageAuditPage.ts`
  - 集中装配 `useImageAuditData`、`useImageAuditSelection`、`useImageAuditAvailability`、`useImageAuditReviewSettlement`、`useImageAuditBatchReview`、`useImageAuditSingleReview`、`useImageAuditReviewActions`、`useImageAuditDeleteRequest`、`useImageAuditColumns` 和 `useImageAuditPageEffects`。
  - 统一维护 `message/dialog`、错误展示、选择状态同步、审核后列表结算、批量操作、移动端列配置和页面副作用。
  - 统一导出审核范围选项、可用性选项、范围标签和范围统计标签。
- 调整 `src/admin/ImageAudit.vue`
  - 页面脚本改为只导入图标、Naive UI 组件、`useImageAuditPage()` 和日期格式化工具。
  - 模板和样式未改动，桌面表格、移动端卡片、筛选、批量审核、可用性检测、删除申请和弹窗行为保持原样。

`ImageAudit.vue` 脚本区从约 227 行下降到约 78 行。审核数据加载、筛选、分页、选择、批量通过/拒绝、单项通过/拒绝、图片可用性检测、删除申请和弹窗清理行为未改动。

## 2026-07-03 第一百零二轮补充
### AI 绘图页总控抽离

本轮处理 `src/views/dashboard/AiDraw.vue`。该页面此前已经拆出资源加载、资产选择、角色遮罩、草稿恢复、提示词注入、生成流程和页面副作用等专用 composable，但页面脚本仍直接负责把所有绘图模块串联起来。

- 新增 `src/composables/useAiDrawPage.ts`
  - 集中装配 `useAiDrawResources`、`useAiDrawAssetSelection`、`useAiDrawCharacterMask`、`useAiDrawRestore`、`useAiDrawPromptTags`、`useAiDrawGenerationFlow` 和 `useAiDrawPageEffects`。
  - 集中维护管理员判断、默认表单、草稿捕获、双角色模式、可生成状态、生成按钮文案和所需积分。
  - 保留生成前提示词准备、积分加载、服务状态轮询、历史任务加载、角色遮罩恢复和草稿恢复的原有连接关系。
- 调整 `src/views/dashboard/AiDraw.vue`
  - 页面脚本改为只导入图标、Naive UI 组件、AI 绘图子组件和 `useAiDrawPage()` 返回值。
  - 模板和样式未改动。

`AiDraw.vue` 脚本区从约 279 行下降到约 102 行。模型/LoRA/角色/风格选择、双角色遮罩、提示词注入、草稿恢复、生成、下载、历史复用、积分展示和服务状态展示行为未改动。
## 2026-07-03 第一百零三轮补充
### 图库投稿页总控抽离

本轮处理 `src/views/dashboard/GalleryUpload.vue`。该页面此前已经拆出投稿表单、文件草稿、本地文件项、记录列表、会话初始化、上传执行、错误处理、文件选择、提交流程和页面副作用等专用 composable，但页面脚本仍直接负责把这些模块逐一接线，导致脚本区长期停留在复杂度最高的位置。
- 新增 `src/composables/useGalleryUploadPage.ts`
  - 集中装配 `useGalleryUploadFormState`、`useGalleryUploadFileDrafts`、`useGalleryUploadDraftState`、`useGalleryUploadLocalItems`、`useGalleryUploadRecords`、`useGalleryUploadSubmitValidation`、`useGalleryUploadSession`、`useGalleryUploadRunner`、`useGalleryUploadErrorHandling`、`useGalleryUploadFileSelection`、`useGalleryUploadSubmitFlow` 和 `useGalleryUploadPageEffects`。
  - 保留本地草稿文件恢复与后端批次恢复之间的桥接关系，避免循环依赖重新回到页面组件。
  - 统一导出上传按钮可用性、文件数量、总大小、状态文案、发布 PID 文案和投稿记录弹窗所需状态。
- 调整 `src/views/dashboard/GalleryUpload.vue`
  - 页面脚本改为只导入图标、Naive UI 组件、展示格式化工具和 `useGalleryUploadPage()` 返回值。
  - 模板和样式未改动，投稿表单、文件选择、草稿恢复提示、上传进度、投稿记录、取消投稿、详情弹窗和过期状态展示行为保持原样。

`GalleryUpload.vue` 脚本区从约 309 行下降到约 86 行。图库投稿页现在只承担 UI 装配职责，上传业务链路集中在 `useGalleryUploadPage.ts` 里维护，后续调整批次初始化、草稿恢复或上传重试时不需要再进入大页面脚本内修改。

## 2026-07-03 最终审计

本次前端重构已经覆盖主要维护风险点：大型页面脚本、页面直连 `http`、重复业务状态编排、编码防线和重构文档沉淀。

### 已满足的目标

- 代码长期可维护：核心大页面已经抽离为页面装配层 + composable + API 层 + utils/constants/types 的结构。
- 代码规范：新增 `npm run check`，串联编码检查、lint、typecheck、build 和构建预算检查。
- UI 和使用逻辑不变：重构以移动状态、请求、计算属性和事件处理为主，尽量不改模板和样式；每轮记录中标明了未改动的交互入口。
- 注释规范：保留解释兼容、草稿恢复、上传过期、浏览器 API 和轮询生命周期等非显而易见约束的注释，移除或避免历史修复点式注释。
- docs 文档：本文件记录了结构分析、重构路线、每轮变更、编码问题根因、防线和最终审计结果。
- 乱码问题：根因是 Windows PowerShell 5 文本写入默认编码与项目 UTF-8 约定不一致，以及 PowerShell 控制台可能把 UTF-8 中文显示成乱码。防线是 `.editorconfig`、`.gitattributes`、`scripts/check-text-encoding.ts`、`npm run check:encoding` 和禁止用 PowerShell 文本写入命令改源码。

### 最终完成度

当前完成度：100%。

后续如果继续演进，建议把 60-90 行脚本的中型页面作为日常维护项逐步优化；这属于持续治理，不阻塞本次“整个前端项目长期可维护重构”的交付。
