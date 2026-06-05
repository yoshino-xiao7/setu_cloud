import type {
  AxiosAdapter,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig
} from 'axios'

type MockHandler = (config: InternalAxiosRequestConfig) => unknown

const now = new Date()

const mockKeys = [
  {
    id: 1,
    name: '博客展示',
    status: 1,
    dailyQuota: 1000,
    totalQuota: null,
    callsToday: 126,
    totalCalls: 9852,
    createdAt: '2026-05-20 10:30:00'
  },
  {
    id: 2,
    name: '机器人测试',
    status: 0,
    dailyQuota: 300,
    totalQuota: 5000,
    callsToday: 0,
    totalCalls: 1420,
    createdAt: '2026-05-24 16:12:00'
  }
]

const usageLogs = Array.from({ length: 32 }, (_, index) => {
  const date = new Date(now)
  date.setMinutes(now.getMinutes() - index * 13)

  return {
    id: index + 1,
    timestamp: date.toISOString().replace('T', ' ').slice(0, 19),
    endpoint: index % 3 === 0 ? '/blog/setu?tag=cat' : '/api/setu/random',
    status: index % 9 === 0 ? 429 : 200,
    ip: `127.0.0.${(index % 8) + 1}`
  }
})

const pixivTasks = Array.from({ length: 128 }, (_, index) => {
  const date = new Date(now)
  date.setMinutes(now.getMinutes() - index * 9)
  const status = index % 11 === 0
    ? 'failed'
    : index % 7 === 0
      ? 'running'
      : 'completed'

  return {
    task_id: `mock-task-${String(index + 1).padStart(4, '0')}`,
    status,
    mode: index % 3 === 0 ? 'by_tag' : index % 3 === 1 ? 'by_user' : 'by_ids',
    progress: {
      total: 120,
      done: status === 'running' ? 64 : 120,
      new: 82,
      skipped: 28,
      failed: status === 'failed' ? 10 : 0
    },
    started_at: date.toISOString(),
    server_timestamp: date.toISOString(),
    logs: Array.from({ length: index === 0 ? 1600 : 24 }, (_, logIndex) => (
      `[${date.toISOString()}] mock task ${index + 1} log line ${logIndex + 1}`
    ))
  }
})

const captchaSvg = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40" viewBox="0 0 120 40">
  <rect width="120" height="40" rx="8" fill="#fff7fb"/>
  <path d="M0 33 C30 8 64 48 120 13" stroke="#f586a9" stroke-width="2" fill="none" opacity=".35"/>
  <text x="20" y="27" fill="#202635" font-family="monospace" font-size="20" font-weight="700">7K2P9</text>
</svg>`)

function normalizePath(config: AxiosRequestConfig) {
  const base = config.baseURL || window.location.origin
  return new URL(config.url || '', base).pathname
}

function ok<T>(config: InternalAxiosRequestConfig, data: T, status = 200): AxiosResponse<T> {
  return {
    data,
    status,
    statusText: 'OK',
    headers: {},
    config
  }
}

function pageFromConfig(config: InternalAxiosRequestConfig) {
  const params = config.params || {}
  const page = Number(params.page || 1)
  const limit = Number(params.limit || params.size || 10)
  const start = Math.max(0, (page - 1) * limit)
  return { page, limit, start }
}

const handlers: Record<string, MockHandler> = {
  'GET /auth/captcha': () => ({
    uuid: 'mock-captcha-uuid',
    img: `data:image/svg+xml;charset=UTF-8,${captchaSvg}`
  }),
  'POST /auth/login': () => ({
    token: 'mock-token',
    userId: 1,
    role: 1,
    expireAt: Date.now() + 86_400_000,
    avatarUrl: '',
    lastLoginIp: '127.0.0.1',
    signSecret: 'mock-sign-secret'
  }),
  'POST /auth/register': () => '注册成功',
  'GET /user/info': () => ({
    id: 1,
    email: 'mock@example.com',
    role: 1,
    nickname: 'Mock Admin',
    avatarUrl: ''
  }),
  'GET /api-key/list': () => mockKeys,
  'POST /api-key/create': () => 'sk_mock_created_key_keep_it_secret',
  'POST /api-key/1/enable': () => '启用成功',
  'POST /api-key/1/disable': () => '禁用成功',
  'POST /api-key/2/enable': () => '启用成功',
  'POST /api-key/2/disable': () => '禁用成功',
  'POST /api-key/1/rename': () => '修改成功',
  'POST /api-key/2/rename': () => '修改成功',
  'DELETE /api-key/1': () => '删除成功',
  'DELETE /api-key/2': () => '删除成功',
  'GET /usage/overview': () => ({
    totalCalls: 11272,
    todayCalls: 126,
    lastCalledAt: usageLogs[0]?.timestamp || null
  }),
  'GET /usage/logs': (config) => {
    const { page, limit, start } = pageFromConfig(config)
    return {
      page,
      size: limit,
      total: usageLogs.length,
      data: usageLogs.slice(start, start + limit)
    }
  },
  'GET /admin/pixiv/health': () => ({
    status: 'ok',
    environment: 'mock',
    database: 'connected'
  }),
  'GET /admin/pixiv/tasks': (config) => {
    const limit = Number(config.params?.limit || 100)
    const offset = Number(config.params?.offset || 0)
    return {
      total: pixivTasks.length,
      tasks: pixivTasks.slice(offset, offset + limit)
    }
  },
  'GET /admin/pixiv/tasks/mock-task-0001': () => pixivTasks[0],
  'GET /admin/pixiv/tasks/mock-task-0012': () => pixivTasks[11],
  'DELETE /admin/pixiv/tasks/mock-task-0008': () => ({
    message: '任务已取消'
  })
}

export function createMockAdapter(defaultAdapter: AxiosAdapter): AxiosAdapter {
  return async (config) => {
    const key = `${(config.method || 'GET').toUpperCase()} ${normalizePath(config)}`
    const handler = handlers[key]

    if (!handler) return defaultAdapter(config)

    await new Promise(resolve => window.setTimeout(resolve, 140))
    return ok(config, handler(config))
  }
}
