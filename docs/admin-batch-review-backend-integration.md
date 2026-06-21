# 管理端批量审核后端接口联调文档

更新时间：2026-06-21

## 1. 背景

管理端需要支持两个批量操作：

- 图片删除申请管理：批量同意、批量拒绝删除申请。
- 图片库管理：批量审核图片为正常、批量标记图片有问题。

当前前端可以用单条接口循环兜底，但正式方案建议后端提供批量接口，避免大量重复请求、重复提交、部分失败不可控和前端难以准确展示处理结果。

认证方式沿用现有 `/admin/**`：需要管理员登录态和前端请求签名。

## 2. 通用要求

批量接口建议统一采用“单项处理、整体返回结果”的模式：

- 不建议因为一条失败导致整批全部回滚。
- 每个对象独立处理，并返回每条的成功/失败原因。
- 前端根据成功项更新列表，根据失败项展示提示。
- `ids` 数组不能为空。
- 建议单批最大 `100` 条，超过返回 `400`。
- 重复 ID 后端应去重或返回参数错误，推荐去重处理。
- 已经处理过的对象不要重复执行副作用，应在结果里返回 `success=false` 和业务 `code`。

通用响应结构建议：

```json
{
  "total": 3,
  "successCount": 2,
  "failureCount": 1,
  "results": [
    {
      "id": 1,
      "success": true
    },
    {
      "id": 2,
      "success": false,
      "code": "NOT_PENDING",
      "message": "该记录已处理"
    }
  ]
}
```

通用错误响应建议继续使用业务 `code + message`：

```json
{
  "code": "BATCH_REVIEW_INVALID_REQUEST",
  "message": "ids 不能为空"
}
```

## 3. 图片删除申请批量审核

### 3.1 接口

```http
POST /admin/image-delete/batch-review
```

### 3.2 请求体

```json
{
  "requestIds": [101, 102, 103],
  "approve": true,
  "remark": "批量审核通过"
}
```

字段说明：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `requestIds` | number[] | 是 | 删除申请 ID 列表。 |
| `approve` | boolean | 是 | `true` 表示同意删除，`false` 表示拒绝申请。 |
| `remark` | string | 否 | 管理员审核备注。 |

### 3.3 后端处理规则

`approve=true`：

- 只允许处理状态为待审核的删除申请。
- 按现有单条同意逻辑执行：删除正式图库图片及相关数据，更新申请状态为已批准，写入审核人、审核时间、备注。
- 如果图片已经不存在，应返回该项失败，不影响其他项。
- 如果申请已经不是待审核，应返回该项失败，不重复删除。

`approve=false`：

- 只允许处理状态为待审核的删除申请。
- 更新申请状态为已拒绝，写入审核人、审核时间、备注。
- 不删除图片。
- 如果申请已经不是待审核，应返回该项失败。

### 3.4 响应示例

```json
{
  "total": 3,
  "successCount": 2,
  "failureCount": 1,
  "results": [
    {
      "requestId": 101,
      "success": true,
      "status": 1
    },
    {
      "requestId": 102,
      "success": true,
      "status": 1
    },
    {
      "requestId": 103,
      "success": false,
      "code": "NOT_PENDING",
      "message": "删除申请已处理"
    }
  ]
}
```

`status` 建议沿用现有删除申请状态：

- `0`：待审核
- `1`：已批准
- `2`：已拒绝

### 3.5 建议业务 code

| code | 场景 |
| --- | --- |
| `BATCH_REVIEW_INVALID_REQUEST` | 请求参数非法。 |
| `BATCH_REVIEW_TOO_MANY_ITEMS` | 单批数量超过上限。 |
| `DELETE_REQUEST_NOT_FOUND` | 删除申请不存在。 |
| `NOT_PENDING` | 删除申请已处理，不可重复审核。 |
| `IMAGE_NOT_FOUND` | 同意删除时，图片不存在。 |
| `IMAGE_DELETE_FAILED` | 删除图片或关联数据失败。 |

## 4. 图片库批量审核

### 4.1 接口

```http
POST /admin/image-audit/batch-submit
```

该接口用于正式图库抽查审核，不用于投稿批次审核。

### 4.2 请求体

批量标记正常：

```json
{
  "imageIds": [201, 202, 203],
  "status": 1,
  "remark": "批量复审正常"
}
```

批量标记有问题：

```json
{
  "imageIds": [201, 202, 203],
  "status": 2,
  "remark": "图片失效或内容不符"
}
```

字段说明：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `imageIds` | number[] | 是 | 正式图库图片 ID 列表，对应 `/admin/image-audit/list` 返回的 `id`。 |
| `status` | number | 是 | `1=正常`，`2=有问题`。 |
| `remark` | string | 否 | 审核备注。`status=2` 时建议必填。 |

### 4.3 后端处理规则

`status=1`：

- 按现有单条图片审核“正常”逻辑处理。
- 写入或更新审核记录。
- 更新图片最近审核状态、审核时间、审核人、备注。
- 不创建删除申请。

`status=2`：

- 按现有单条图片审核“有问题”逻辑处理。
- 写入或更新审核记录。
- 更新图片最近审核状态、审核时间、审核人、备注。
- 必须自动创建图片删除申请。
- 该逻辑必须和单条“有问题”保持一致，前端批量操作不应绕过删除申请流程。

删除申请创建要求：

- 删除申请应关联对应图片的 `pid` 和 `p`。
- 申请原因建议使用审核备注，例如 `图片审核有问题：{remark}`。
- 如果该图片已经存在待处理删除申请，不要重复创建；建议返回已有删除申请 ID。
- 如果历史删除申请已批准或已拒绝，可以按现有业务规则决定是否允许重新创建，返回结果需要明确说明。

### 4.4 响应示例

批量正常：

```json
{
  "total": 3,
  "successCount": 3,
  "failureCount": 0,
  "results": [
    {
      "imageId": 201,
      "success": true,
      "auditStatus": 1
    },
    {
      "imageId": 202,
      "success": true,
      "auditStatus": 1
    },
    {
      "imageId": 203,
      "success": true,
      "auditStatus": 1
    }
  ]
}
```

批量有问题：

```json
{
  "total": 3,
  "successCount": 2,
  "failureCount": 1,
  "results": [
    {
      "imageId": 201,
      "success": true,
      "auditStatus": 2,
      "deleteRequestCreated": true,
      "deleteRequestId": 9001
    },
    {
      "imageId": 202,
      "success": true,
      "auditStatus": 2,
      "deleteRequestCreated": false,
      "deleteRequestId": 9002,
      "message": "已存在待处理删除申请"
    },
    {
      "imageId": 203,
      "success": false,
      "code": "IMAGE_NOT_FOUND",
      "message": "图片不存在"
    }
  ]
}
```

### 4.5 建议业务 code

| code | 场景 |
| --- | --- |
| `BATCH_AUDIT_INVALID_REQUEST` | 请求参数非法。 |
| `BATCH_AUDIT_TOO_MANY_ITEMS` | 单批数量超过上限。 |
| `INVALID_AUDIT_STATUS` | `status` 不是 `1` 或 `2`。 |
| `IMAGE_NOT_FOUND` | 图片不存在。 |
| `IMAGE_AUDIT_FAILED` | 写入审核记录失败。 |
| `DELETE_REQUEST_CREATE_FAILED` | `status=2` 时自动创建删除申请失败。 |
| `DELETE_REQUEST_EXISTS` | 已存在待处理删除申请。可作为成功项 message，也可作为失败 code，推荐成功项复用已有申请。 |

## 5. 前端对接预期

图片删除申请管理：

- 前端只允许勾选待审核申请。
- 批量同意调用 `/admin/image-delete/batch-review`，`approve=true`。
- 批量拒绝调用 `/admin/image-delete/batch-review`，`approve=false`。
- 成功项从当前列表移除或刷新后不再出现在待审核列表。
- 失败项保留，并展示后端返回的 `message`。

图片库管理：

- `UNREVIEWED` 和 `DUE_REVIEW` 范围支持勾选图片后批量审核。
- 批量正常调用 `/admin/image-audit/batch-submit`，`status=1`。
- 批量问题调用 `/admin/image-audit/batch-submit`，`status=2`，必须传 `remark`。
- `status=2` 成功后，前端提示“已标记有问题，并自动创建删除申请”。
- `ALL` 全部图库模式主要用于定位和删除申请，不建议展示批量审核按钮。

## 6. 兼容性要求

现有单条接口继续保留：

```http
POST /admin/image-delete/review
POST /admin/image-audit/submit
```

前端可以在后端批量接口上线前使用单条接口循环兜底；批量接口上线后切换到新接口。

## 7. 幂等与重复提交建议

批量接口建议天然防重复：

- 同一个待审核对象第一次处理成功后，状态变为已处理。
- 后续重复提交同一 ID 时，不重复删除、不重复创建删除申请。
- 对已处理项返回 `NOT_PENDING` 或等价业务 code。
- `status=2` 自动创建删除申请时，应避免同一图片生成多个待处理删除申请。
