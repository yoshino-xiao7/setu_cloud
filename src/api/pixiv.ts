// src/api/pixiv.ts
import http from '@/api/http'

// ==========================================
// Type Definitions
// ==========================================

export interface PixivHealthResponse {
    status: string
    environment: string
    database: string
}

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

export interface CrawlerTaskProgress {
    total: number
    done: number
    new: number
    skipped: number
    failed: number
}

export interface CrawlerTask {
    task_id: string
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
    mode: string
    message?: string
    progress?: CrawlerTaskProgress
    logs?: string[]
    server_timestamp?: string
    started_at?: string
    finished_at?: string
}

export interface TaskListResponse {
    total: number
    tasks: CrawlerTask[]
}

export interface FetchCrawlerTasksParams {
    limit?: number
    offset?: number
}

// ==========================================
// API Methods
// ==========================================

/**
 * 2.1 健康检查
 */
export const checkCrawlerHealth = () => {
    return http.get<PixivHealthResponse>('/admin/pixiv/health')
}

/**
 * 2.2 按作品 ID 抓取
 */
export const crawlByIds = (data: CrawlByIdsRequest) => {
    return http.post<{ task_id: string; status: string; message: string }>('/admin/pixiv/crawl/illust', data)
}

/**
 * 2.3 按作者抓取
 */
export const crawlByUser = (userId: string | number, skipExisting: boolean = true) => {
    return http.post<{ task_id: string; status: string; message: string }>(`/admin/pixiv/crawl/user/${userId}`, null, {
        params: { skipExisting }
    })
}

/**
 * 2.4 按标签抓取
 */
export const crawlByTag = (data: CrawlByTagRequest) => {
    return http.post<{ task_id: string; status: string; message: string }>('/admin/pixiv/crawl/tag', data)
}

/**
 * 2.5 获取任务列表
 */
export const fetchCrawlerTasks = (params?: FetchCrawlerTasksParams) => {
    return http.get<TaskListResponse>('/admin/pixiv/tasks', { params })
}

/**
 * 2.6 查询任务详情
 */
export const fetchCrawlerTask = (taskId: string) => {
    return http.get<CrawlerTask>(`/admin/pixiv/tasks/${taskId}`)
}

/**
 * 2.7 取消任务
 */
export const cancelCrawlerTask = (taskId: string) => {
    return http.delete<{ message: string }>(`/admin/pixiv/tasks/${taskId}`)
}
