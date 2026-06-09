# 管理员后台 - Pixiv 爬虫模块 API 文档

本文档仅供前端 AI 参考开发使用。所有接口位于 `/admin/pixiv` 路径下，需管理员权限。

## 1. 基础信息

- **Base URL**: `/admin/pixiv`
- **鉴权方式**: 依赖现有管理员登录态
- **数据格式**: JSON

---

## 2. API 接口列表

### 2.1 健康检查 (Health Check)
检测爬虫服务是否在线。

- **URL**: `GET /admin/pixiv/health`
- **响应示例**:
```json
{
  "status": "healthy",
  "environment": "production",
  "database": "connected"
}
```

---

### 2.2 按作品 ID 抓取 (Crawl by IDs)
提交一组 PID 进行抓取。

- **URL**: `POST /admin/pixiv/crawl/illust`
- **请求体 (JSON)**:
```json
{
  "illustIds": [122532765, 122532766],
  "skipExisting": true
}
```
| 参数 | 类型 | 必选 | 说明 |
|------|------|------|------|
| illustIds | `number[]` | 是 | 作品 ID 列表 |
| skipExisting | `boolean` | 否 | 是否跳过库中已存在的图片 (默认 true) |

- **响应示例**:
```json
{
  "task_id": "5123e33f6eb1",
  "status": "pending",
  "message": "Task created"
}
```

---

### 2.3 按作者抓取 (Crawl by User)
抓取指定画师的所有作品。

- **URL**: `POST /admin/pixiv/crawl/user/{userId}`
- **查询参数**:
  - `skipExisting` (boolean, 可选, 默认 true): 是否跳过已存在图片

- **示例**: `POST /admin/pixiv/crawl/user/66326626?skipExisting=true`

- **响应示例**: 同上

---

### 2.4 按标签抓取 (Crawl by Tag)
抓取指定标签的热门或最新作品。

- **URL**: `POST /admin/pixiv/crawl/tag`
- **请求体 (JSON)**:
```json
{
  "tag": "原神",
  "mode": "popular", // 或 "latest"
  "pageFrom": 1,
  "pageTo": 5,
  "skipExisting": true
}
```
| 参数 | 类型 | 必选 | 说明 |
|------|------|------|------|
| tag | `string` | 是 | 搜索关键词/标签 |
| mode | `string` | 否 | `popular` (热门, 默认) 或 `latest` (最新) |
| pageFrom | `number` | 否 | 起始页码 (默认 1) |
| pageTo | `number` | 否 | 结束页码 (默认 5) |
| skipExisting | `boolean` | 否 | 默认 true |

- **响应示例**: 同上

---

### 2.5 获取任务列表 (Get All Tasks)
获取当前所有抓取任务的历史记录。

- **URL**: `GET /admin/pixiv/tasks`
- **响应示例**:
```json
{
  "total": 5,
  "tasks": [
    {
      "task_id": "5123e33f6eb1",
      "status": "completed",
      "mode": "by_ids",
      "server_timestamp": "2026-01-17T08:00:00.000000"
    }
    // ...
  ]
}
```

---

### 2.6 查询任务详情 (Get Task Status)
轮询任务进度日志。

- **URL**: `GET /admin/pixiv/tasks/{taskId}`
- **响应示例**:
```json
{
  "task_id": "5123e33f6eb1",
  "status": "completed", // pending, running, completed, failed
  "mode": "by_ids",
  "progress": {
    "total": 10,
    "done": 5,
    "new": 5,
    "skipped": 0,
    "failed": 0
  },
  "logs": [
    "[INFO] 开始抓取...",
    "[INFO] 成功保存图片 12345"
  ]
}
```

---

### 2.7 取消任务 (Cancel Task)

- **URL**: `DELETE /admin/pixiv/tasks/{taskId}`
- **响应**: `{ "message": "Task cancelled" }`

---

## 3. TypeScript 定义参考

```typescript
// 请求接口
export interface CrawlByIdsRequest {
  illustIds: number[]
  skipExisting?: boolean
}

export interface CrawlByTagRequest {
  tag: string
  mode?: 'popular' | 'latest'
  pageFrom?: number
  pageTo?: number
  skipExisting?: boolean
}

// 响应接口
export interface CrawlerTask {
  task_id: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  mode: string
  message?: string
  progress?: {
    total: number
    done: number
    new: number
    skipped: number
    failed: number
  }
  logs?: string[]
  started_at?: string
  finished_at?: string
}

export interface TaskListResponse {
  total: number
  tasks: CrawlerTask[]
}
```
