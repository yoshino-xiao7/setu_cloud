import type {
  AxiosAdapter,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios'
import { AxiosError } from 'axios'

type MockHandler = (config: InternalAxiosRequestConfig) => unknown

interface MockHttpResponse<T = unknown> {
  mockStatus: number
  mockData: T
  mockStatusText?: string
}

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
    createdAt: '2026-05-20T10:30:00',
  },
  {
    id: 2,
    name: '机器人测试',
    status: 0,
    dailyQuota: 300,
    totalQuota: 5000,
    callsToday: 0,
    totalCalls: 1420,
    createdAt: '2026-05-24T16:12:00',
  },
]

const usageLogs = Array.from({ length: 32 }, (_, index) => {
  const date = new Date(now)
  date.setMinutes(now.getMinutes() - index * 13)

  return {
    id: index + 1,
    timestamp: date.toISOString().slice(0, 19),
    endpoint: index % 3 === 0 ? '/blog/setu?tag=cat' : '/api/setu/random',
    status: index % 9 === 0 ? 429 : 200,
    ip: `127.0.0.${(index % 8) + 1}`,
  }
})

const mockAdminUsers = Array.from({ length: 36 }, (_, index) => {
  const id = index + 1
  const date = new Date(now)
  date.setDate(now.getDate() - index)

  return {
    id,
    email: `user${String(id).padStart(2, '0')}@mock.local`,
    nickname: index % 5 === 0 ? null : `测试用户 ${id}`,
    status: index % 9 === 0 ? 0 : 1,
    role: index === 0 ? 1 : 0,
    emailVerified: index % 4 !== 0,
    registerIp: `10.0.0.${(index % 240) + 1}`,
    lastLoginIp: `172.16.0.${(index % 200) + 1}`,
    createdAt: date.toISOString().slice(0, 19),
  }
})

const mockAuditImages = Array.from({ length: 54 }, (_, index) => {
  const uploadDate = new Date(now)
  uploadDate.setHours(now.getHours() - index * 3)
  const pid = 880000 + index
  const p = index % 3
  const accent = index % 2 === 0 ? '#f586a9' : '#8ab7ff'
  const imageSvg = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320" viewBox="0 0 480 320">
  <rect width="480" height="320" rx="18" fill="#fff7fb"/>
  <path d="M0 230 C90 140 180 310 300 160 C370 70 430 110 480 58 L480 320 L0 320 Z" fill="${accent}" opacity=".28"/>
  <circle cx="378" cy="92" r="54" fill="${accent}" opacity=".22"/>
  <text x="32" y="58" fill="#293042" font-family="Arial, sans-serif" font-size="24" font-weight="700">Mock Image</text>
  <text x="32" y="96" fill="#697386" font-family="Arial, sans-serif" font-size="18">PID ${pid}_p${p}</text>
</svg>`)

  return {
    id: index + 1,
    pid,
    p,
    uid: 10000 + index,
    title: `Mock 审核图片 ${index + 1}`,
    author: `画师 ${index + 1}`,
    r18: index % 8 === 0 ? 1 : 0,
    width: 1200 + index * 3,
    height: 900 + index * 2,
    ext: index % 4 === 0 ? 'png' : 'jpg',
    aiType: index % 6 === 0 ? 2 : 1,
    uploadDate: uploadDate.getTime(),
    urlOriginal: `data:image/svg+xml;charset=UTF-8,${imageSvg}`,
    lastAuditStatus: index % 5 === 0 ? 2 : index % 3 === 0 ? 1 : null,
    lastAuditRemark: index % 5 === 0 ? 'Mock：疑似低质量图片' : null,
    lastAuditTime: index % 3 === 0
      ? uploadDate.toISOString().slice(0, 19)
      : null,
    lastAuditAdminEmail: index % 3 === 0 ? 'admin@mock.local' : null,
    availabilityStatus: index % 13 === 0 ? 'BROKEN' : index % 7 === 0 ? 'SUSPECTED_BROKEN' : index % 4 === 0 ? 'UNKNOWN' : 'OK',
    lastAvailabilityCheckAt: index % 4 === 0 ? null : uploadDate.toISOString().slice(0, 19),
    lastAvailabilityHttpStatus: index % 13 === 0 ? 404 : index % 7 === 0 ? 500 : index % 4 === 0 ? null : 200,
    lastAvailabilityError: index % 13 === 0 ? 'Mock：源站返回 404' : index % 7 === 0 ? 'Mock：源站超时' : null,
    availabilityFailCount: index % 13 === 0 ? 3 : index % 7 === 0 ? 1 : 0,
    tags: ['mock', 'sample', index % 2 === 0 ? 'pink' : 'blue'],
  }
})

const mockCollectionImages = Array.from({ length: 48 }, (_, index) => {
  const pid = 990000 + index
  const p = index % 3
  const accent = index % 2 === 0 ? '#f586a9' : '#8ab7ff'
  const imageSvg = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="720" height="960" viewBox="0 0 720 960">
  <rect width="720" height="960" rx="28" fill="#fff7fb"/>
  <path d="M0 688 C135 420 260 918 450 520 C560 292 640 348 720 176 L720 960 L0 960 Z" fill="${accent}" opacity=".28"/>
  <circle cx="535" cy="214" r="112" fill="${accent}" opacity=".22"/>
  <text x="54" y="92" fill="#293042" font-family="Arial, sans-serif" font-size="40" font-weight="700">Mock Artwork</text>
  <text x="54" y="148" fill="#697386" font-family="Arial, sans-serif" font-size="28">PID ${pid}_p${p}</text>
</svg>`)
  const url = `data:image/svg+xml;charset=UTF-8,${imageSvg}`

  return {
    id: index + 1,
    pid,
    p,
    uid: 7000 + index,
    title: `Mock 收藏作品 ${index + 1}`,
    author: `Mock 画师 ${index + 1}`,
    r18: index % 9 === 0 ? 1 : 0,
    width: 720,
    height: 960,
    ext: 'jpg',
    aiType: index % 6 === 0 ? 2 : 1,
    uploadDate: Date.now() - index * 86_400_000,
    tags: ['mock', index % 2 === 0 ? 'pink' : 'blue', 'responsive'],
    urlOriginal: url,
    urlRegular: url,
    urlSmall: url,
  }
})

const mockCollections = [
  {
    id: 1,
    userId: 1,
    name: '默认收藏夹',
    description: 'Mock 默认收藏',
    visibility: 0,
    isDefault: true,
    isShared: false,
    itemCount: 24,
    ownerNickname: 'Mock Admin',
    ownerAvatarUrl: '',
  },
  {
    id: 2,
    userId: 1,
    name: '粉色玻璃精选',
    description: '用于本地验收的公开收藏夹',
    visibility: 1,
    isDefault: false,
    isShared: true,
    coverPid: mockCollectionImages[2]?.pid,
    coverP: mockCollectionImages[2]?.p,
    coverUrl: mockCollectionImages[2]?.urlSmall,
    itemCount: 18,
    shareViewCount: 128,
    shareLikeCount: 36,
    shareFavCount: 14,
    likedByMe: false,
    favoritedByMe: true,
    ownerNickname: 'Mock Admin',
    ownerAvatarUrl: '',
    createdAt: '2026-06-01T10:00:00',
    updatedAt: '2026-06-06T10:00:00',
    shareCreatedAt: '2026-06-03T12:30:00',
  },
  {
    id: 3,
    userId: 2,
    name: '蓝色夜行图集',
    description: '移动端两列和公开页瀑布流验收数据',
    visibility: 1,
    isDefault: false,
    isShared: true,
    coverPid: mockCollectionImages[5]?.pid,
    coverP: mockCollectionImages[5]?.p,
    coverUrl: mockCollectionImages[5]?.urlSmall,
    itemCount: 16,
    shareViewCount: 84,
    shareLikeCount: 22,
    shareFavCount: 9,
    likedByMe: true,
    favoritedByMe: false,
    ownerNickname: 'Mock 用户',
    ownerAvatarUrl: '',
    createdAt: '2026-05-28T09:20:00',
    updatedAt: '2026-06-05T18:10:00',
    shareCreatedAt: '2026-06-04T08:00:00',
  },
]

const mockBlacklistIps = Array.from({ length: 28 }, (_, index) => ({
  id: index + 1,
  ip: `203.0.113.${index + 8}`,
  reason: index % 3 === 0 ? '频繁请求' : index % 3 === 1 ? '异常扫描' : 'Mock 手动封禁',
  createdAt: new Date(Date.now() - index * 3_600_000).toISOString().slice(0, 19),
}))

const mockTempBlocks = Array.from({ length: 6 }, (_, index) => ({
  ip: `198.51.100.${index + 20}`,
  blockedAt: new Date(Date.now() - index * 600_000).toISOString().slice(0, 19),
  expiresAt: new Date(Date.now() + (index + 1) * 1_800_000).toISOString().slice(0, 19),
  reason: '请求速率过高',
}))

const mockDeleteRequests = Array.from({ length: 18 }, (_, index) => {
  const image = mockCollectionImages[index % mockCollectionImages.length]!
  const status = index % 5 === 0
    ? 1
    : index % 4 === 0
      ? 2
      : 0

  return {
    id: index + 1,
    userId: 100 + index,
    userEmail: `reporter${index + 1}@mock.local`,
    userNickname: `申请用户 ${index + 1}`,
    pid: image.pid,
    p: image.p,
    reason: index % 2 === 0 ? '图片信息疑似错误' : '希望移除重复图片',
    status,
    statusText: status === 1 ? '已批准' : status === 2 ? '已拒绝' : '待审核',
    createdAt: new Date(Date.now() - index * 7_200_000).toISOString().slice(0, 19),
    imageTitle: image.title,
    imageAuthor: image.author,
    thumbnailUrl: image.urlSmall,
    title: image.title,
    author: image.author,
    uid: image.uid,
    r18: image.r18,
    width: image.width,
    height: image.height,
    ext: image.ext,
    aiType: image.aiType,
    uploadDate: image.uploadDate,
    urlOriginal: image.urlOriginal,
    tags: image.tags,
    adminId: status === 0 ? null : 1,
    adminEmail: status === 0 ? null : 'admin@mock.local',
    adminRemark: status === 2 ? 'Mock：证据不足' : '',
    reviewedAt: status === 0 ? null : new Date(Date.now() - index * 3_600_000).toISOString().slice(0, 19),
  }
})

const mockNeteaseTokens = [
  {
    id: 1,
    cookie: 'MUSIC_U=mock_primary_cookie_value; __csrf=primary;',
    nickname: '主账号',
    status: 1,
    createdAt: '2026-06-01T10:00:00',
    updatedAt: '2026-06-06T09:00:00',
  },
  {
    id: 2,
    cookie: 'MUSIC_U=mock_backup_cookie_value; __csrf=backup;',
    nickname: '备用账号',
    status: 0,
    createdAt: '2026-06-02T12:00:00',
    updatedAt: '2026-06-05T18:30:00',
  },
]

const mockOperationLogs = Array.from({ length: 72 }, (_, index) => {
  const date = new Date(now)
  date.setMinutes(now.getMinutes() - index * 11)
  const eventTypes = [
    'GALLERY_UPLOAD_BATCH_CREATE',
    'GALLERY_UPLOAD_COMPLETE',
    'IMAGE_AUDIT_SUBMIT',
    'IMAGE_AUDIT_BATCH_SUBMIT',
    'IMAGE_DELETE_BATCH_REVIEW',
    'IMAGE_AVAILABILITY_CHECK',
    'DOWNLOAD_SIGN',
    'USER_NOTIFICATION_CREATE',
  ]
  const status = index % 11 === 0 ? 'FAILED' : index % 6 === 0 ? 'PARTIAL' : 'SUCCESS'

  return {
    id: index + 1,
    traceId: `trace-mock-${String(index + 1).padStart(4, '0')}`,
    requestId: `req-mock-${String(index + 1).padStart(4, '0')}`,
    userId: index % 4 === 0 ? null : (index % 8) + 1,
    userEmail: index % 4 === 0 ? null : `user${(index % 8) + 1}@mock.local`,
    eventType: eventTypes[index % eventTypes.length],
    status,
    code: status === 'SUCCESS' ? null : 'MOCK_OPERATION_WARNING',
    message: status === 'SUCCESS' ? '操作成功' : 'Mock：部分项目处理失败',
    targetType: index % 2 === 0 ? 'IMAGE' : 'BATCH',
    targetId: String(880000 + index),
    method: index % 3 === 0 ? 'POST' : 'GET',
    path: index % 3 === 0 ? '/admin/image-audit/batch-submit' : '/admin/operation-logs',
    ip: `192.0.2.${index + 10}`,
    userAgent: 'Mock Browser',
    createdAt: date.toISOString().slice(0, 19),
    durationMs: 40 + index * 3,
    requestBody: { mock: true, index },
    responseBody: { success: status !== 'FAILED' },
    extra: { source: 'mock' },
  }
})

const mockNotifications = Array.from({ length: 18 }, (_, index) => {
  const date = new Date(now)
  date.setHours(now.getHours() - index * 2)
  const types = [
    'GALLERY_SUBMISSION_APPROVED',
    'GALLERY_SUBMISSION_REJECTED',
    'IMAGE_DELETE_REQUEST_APPROVED',
    'IMAGE_DELETE_REQUEST_REJECTED',
    'IMAGE_AUDIT_PROBLEM_CREATED_DELETE_REQUEST',
  ]
  const type = types[index % types.length]
  const read = index % 3 === 0

  return {
    id: index + 1,
    type,
    title: type === 'GALLERY_SUBMISSION_APPROVED'
      ? '投稿已通过'
      : type === 'GALLERY_SUBMISSION_REJECTED'
        ? '投稿未通过'
        : type === 'IMAGE_DELETE_REQUEST_APPROVED'
          ? '删除申请已通过'
          : type === 'IMAGE_DELETE_REQUEST_REJECTED'
            ? '删除申请已拒绝'
            : '图片审核创建了删除申请',
    content: `Mock 通知内容 ${index + 1}，用于本地验收通知中心。`,
    targetType: index % 2 === 0 ? 'BATCH' : 'IMAGE_DELETE_REQUEST',
    targetId: 1000 + index,
    read,
    readAt: read ? date.toISOString().slice(0, 19) : null,
    createdAt: date.toISOString().slice(0, 19),
  }
})

let mockPasskeyId = 1
const mockPasskeys = [
  {
    id: mockPasskeyId,
    nickname: 'Mock MacBook Touch ID',
    credentialId: 'mock-credential-id',
    createdAt: '2026-06-22T10:00:00',
    lastUsedAt: null,
    transports: ['internal'],
  },
]

type MockGalleryItemUploadStatus = 'PENDING' | 'UPLOADING' | 'UPLOADED' | 'FAILED'

interface MockGalleryItem {
  submissionId: number
  itemIndex: number
  clientItemId: string
  filename: string
  pageIndex?: number | null
  objectKey: string
  status: string
  uploadStatus: MockGalleryItemUploadStatus
  errorCode?: string | null
  errorMessage?: string | null
  title?: string | null
  author?: string | null
  r18?: boolean | null
  aiType?: number | null
  tags?: string[] | null
  sizeBytes?: number | null
  contentType?: string | null
  sha256?: string | null
  previewUrl?: string | null
  previewExpiresAt?: string | null
}

interface MockGalleryBatch {
  batchId: number
  clientRequestId?: string
  userId: number
  pidMode: string
  status: string
  title?: string | null
  author?: string | null
  r18?: boolean | null
  aiType?: number | null
  tags?: string[] | null
  itemCount: number
  uploadedCount: number
  approvedCount: number
  rejectedCount: number
  publishedCount: number
  createdAt: string
  reviewedAt?: string | null
  publishedAt?: string | null
  items: MockGalleryItem[]
}

let mockGalleryBatchId = 3000
let mockGallerySubmissionId = 9000
const mockGalleryBatches: MockGalleryBatch[] = []

function collectionItems(collectionId: number) {
  const offset = collectionId === 1 ? 0 : collectionId === 2 ? 6 : 18
  const count = collectionId === 1 ? 24 : collectionId === 2 ? 18 : 16
  return mockCollectionImages.slice(offset, offset + count).map((image, index) => ({
    itemId: collectionId * 1000 + index,
    favoriteId: collectionId * 1000 + index,
    pid: image.pid,
    p: image.p,
    addedAt: '2026-06-06T10:00:00',
    image,
  }))
}

function squareCollectionTags(collectionId: number) {
  if (collectionId === 2)
    return ['粉色', '玻璃感', '插画', '柔光']
  if (collectionId === 3)
    return ['蓝色', '夜景', '氛围', '横图']
  return ['精选', '公开收藏']
}

function decorateSquareCollection(collection: typeof mockCollections[number]) {
  const previewImages = collectionItems(collection.id).slice(0, 5).map(item => ({
    pid: item.pid,
    p: item.p,
    title: item.image.title,
    author: item.image.author,
    url: item.image.urlSmall,
    urlSmall: item.image.urlSmall,
    urlRegular: item.image.urlRegular,
    urlOriginal: item.image.urlOriginal,
    width: item.image.width,
    height: item.image.height,
    r18: item.image.r18,
    tags: item.image.tags,
  }))
  const tags = squareCollectionTags(collection.id)

  return {
    ...collection,
    previewImages,
    tags,
    themeTags: tags.slice(0, 3),
    curatorNote: collection.id === 2
      ? '粉色、玻璃质感和柔光插画放在一起，适合从第一屏慢慢翻。'
      : '偏冷色的夜行氛围图集，适合想找安静背景图的时候逛一圈。',
    scoreReason: collection.id === 2
      ? '近期收藏和点赞都比较活跃'
      : '浏览稳定增长，内容风格统一',
    recentItemCount: collection.id === 2 ? 6 : 3,
    ownerCollectionCount: collection.userId === 1 ? 2 : 1,
  }
}

const mockSongs = Array.from({ length: 24 }, (_, index) => {
  const id = 910000 + index
  const accent = index % 2 === 0 ? '#f586a9' : '#8ab7ff'
  const coverSvg = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
  <rect width="240" height="240" rx="24" fill="#fff7fb"/>
  <circle cx="168" cy="78" r="54" fill="${accent}" opacity=".24"/>
  <path d="M42 172 C78 116 114 204 164 128 C190 88 210 106 240 78 L240 240 L42 240 Z" fill="${accent}" opacity=".3"/>
  <text x="28" y="44" fill="#293042" font-family="Arial, sans-serif" font-size="20" font-weight="700">Mock Music</text>
  <text x="28" y="76" fill="#697386" font-family="Arial, sans-serif" font-size="15">Track ${index + 1}</text>
</svg>`)

  return {
    id,
    name: `Mock Song ${index + 1}`,
    ar: [{ id: 1000 + index, name: `Mock Artist ${index + 1}` }],
    al: {
      id: 2000 + index,
      name: `Mock Album ${index + 1}`,
      picUrl: `data:image/svg+xml;charset=UTF-8,${coverSvg}`,
    },
    dt: 188000 + index * 3000,
    mv: index % 5 === 0 ? 700000 + index : 0,
  }
})

const mockUserPlaylists = [
  {
    id: 1,
    userId: 1,
    name: 'Mock 喜欢的音乐',
    description: '本地验收歌单',
    coverUrl: mockSongs[0]?.al.picUrl,
    isPublic: 0,
    playMode: 'sequence',
    songCount: 2,
    playCount: 12,
    createdAt: '2026-06-01T10:00:00',
    updatedAt: '2026-06-06T10:00:00',
    songs: mockSongs.slice(0, 2).map((song, index) => ({
      id: index + 1,
      songId: song.id,
      songName: song.name,
      artistName: song.ar.map(artist => artist.name).join('/'),
      albumName: song.al.name,
      coverUrl: song.al.picUrl,
      duration: song.dt,
      sortOrder: index,
      createdAt: '2026-06-01T10:00:00',
    })),
  },
]

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
      failed: status === 'failed' ? 10 : 0,
    },
    started_at: date.toISOString(),
    server_timestamp: date.toISOString(),
    logs: Array.from({ length: index === 0 ? 1600 : 24 }, (_, logIndex) => (
      `[${date.toISOString()}] mock task ${index + 1} log line ${logIndex + 1}`
    )),
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

function ok<T>(config: InternalAxiosRequestConfig, data: T, status = 200, statusText = 'OK'): AxiosResponse<T> {
  return {
    data,
    status,
    statusText,
    headers: { 'x-trace-id': `mock-trace-${Date.now()}` },
    config,
  }
}

function mockResponse<T>(status: number, data: T, statusText?: string): MockHttpResponse<T> {
  return {
    mockStatus: status,
    mockData: data,
    mockStatusText: statusText,
  }
}

function isMockHttpResponse(value: unknown): value is MockHttpResponse {
  return !!value
    && typeof value === 'object'
    && 'mockStatus' in value
    && 'mockData' in value
}

function requestData<T>(config: InternalAxiosRequestConfig): T {
  if (!config.data)
    return {} as T

  if (typeof config.data === 'string') {
    try {
      return JSON.parse(config.data) as T
    }
    catch {
      return {} as T
    }
  }

  return config.data as T
}

function pageFromConfig(config: InternalAxiosRequestConfig) {
  const params = config.params || {}
  const page = Number(params.page || 1)
  const limit = Number(params.limit || params.pageSize || params.size || 10)
  const start = Math.max(0, (page - 1) * limit)
  return { page, limit, start }
}

function getMockPasskeyRpId() {
  return window.location.hostname || 'localhost'
}

function getMockPasskeyChallenge() {
  return 'bW9jay1wYXNza2V5LWNoYWxsZW5nZQ'
}

function adminUserDetail(userId: number) {
  const user = mockAdminUsers.find(item => item.id === userId) ?? mockAdminUsers[0]!
  return {
    ...user,
    updatedAt: now.toISOString().slice(0, 19),
    apiKeys: Array.from({ length: userId % 4 }, (_, index) => ({
      id: userId * 10 + index,
      name: `Mock Key ${index + 1}`,
      status: index % 2 === 0 ? 1 : 0,
      createdAt: user.createdAt,
      totalCalls: 500 + userId * 20 + index * 31,
      callsToday: 10 + index * 3,
      dailyQuota: 1000,
      totalQuota: 100000,
    })),
  }
}

function dynamicHandler(key: string): MockHandler | undefined {
  const deleteRequestDetail = key.match(/^GET \/admin\/image-delete\/(\d+)$/)
  if (deleteRequestDetail) {
    return () => mockDeleteRequests.find(item => item.id === Number(deleteRequestDetail[1])) || mockDeleteRequests[0]
  }

  const neteaseTokenUpdate = key.match(/^PUT \/admin\/netease\/tokens\/(\d+)$/)
  if (neteaseTokenUpdate) {
    return () => `已更新 Token ${neteaseTokenUpdate[1]}`
  }

  const neteaseTokenDelete = key.match(/^DELETE \/admin\/netease\/tokens\/(\d+)$/)
  if (neteaseTokenDelete) {
    return () => `已删除 Token ${neteaseTokenDelete[1]}`
  }

  const neteaseTokenCheck = key.match(/^GET \/admin\/netease\/tokens\/(\d+)\/check$/)
  if (neteaseTokenCheck) {
    return (config) => {
      const tokenId = Number(neteaseTokenCheck[1])
      const token = mockNeteaseTokens.find(item => item.id === tokenId) || mockNeteaseTokens[0]
      const playability = token?.status === 1 ? 'FULL' : 'TRIAL'
      const fullPlayable = playability === 'FULL'
      return {
        tokenId,
        nickname: token?.nickname || `Token #${tokenId}`,
        status: token?.status ?? 0,
        cookieValid: true,
        account: {
          code: 200,
          userId: 100000 + tokenId,
          nickname: token?.nickname || 'Mock 网易云账号',
          profileVipType: fullPlayable ? 11 : 0,
          accountId: 100000 + tokenId,
          accountVipType: fullPlayable ? 11 : 0,
        },
        vip: fullPlayable,
        vipType: fullPlayable ? 11 : 0,
        accountVipType: fullPlayable ? 11 : 0,
        profileVipType: fullPlayable ? 11 : 0,
        playbackProbe: {
          skipped: !config.params?.probeSongId,
          songId: String(config.params?.probeSongId || 'mock-vip-song'),
          level: config.params?.level || 'exhigh',
          playability,
          fullPlayable,
          trial: !fullPlayable,
          reason: fullPlayable ? '完整播放地址可用' : '当前网易云 Cookie 仅返回试听链接，已阻止作为完整歌曲播放',
          neteaseCode: 200,
          fee: 1,
          payed: fullPlayable ? 1 : 0,
          requestedLevel: config.params?.level || 'exhigh',
          effectiveLevel: config.params?.level || 'exhigh',
          urlAvailable: fullPlayable,
          trialUrlAvailable: !fullPlayable,
        },
      }
    }
  }

  const collectionInfo = key.match(/^GET \/collections\/(\d+)$/)
  if (collectionInfo) {
    return () => {
      const id = Number(collectionInfo[1])
      const collection = mockCollections.find(item => item.id === id) || mockCollections[1]
      const similarCollections = mockCollections
        .filter(item => item.id !== id && !item.isDefault && item.visibility === 1)
        .map(decorateSquareCollection)
        .slice(0, 3)
      return {
        ...collection,
        tags: squareCollectionTags(collection.id),
        themeTags: squareCollectionTags(collection.id).slice(0, 3),
        curatorNote: collection.id === 2
          ? '粉色、玻璃质感和柔光插画放在一起，适合从第一屏慢慢翻。'
          : '偏冷色的夜行氛围图集，适合想找安静背景图的时候逛一圈。',
        similarCollections,
      }
    }
  }

  const collectionItemsMatch = key.match(/^GET \/collections\/(\d+)\/items$/)
  if (collectionItemsMatch) {
    return (config) => {
      const { page, limit, start } = pageFromConfig(config)
      const items = collectionItems(Number(collectionItemsMatch[1]))
      return {
        page,
        size: limit,
        total: items.length,
        items: items.slice(start, start + limit),
      }
    }
  }

  const collectionItemAction = key.match(/^(POST|DELETE) \/collections\/(\d+)\/items\/(\d+)\/(\d+)$/)
  if (collectionItemAction) {
    return () => collectionItemAction[1] === 'POST' ? '添加成功' : '移除成功'
  }

  const collectionShare = key.match(/^(POST|DELETE) \/collections\/(\d+)\/share$/)
  if (collectionShare) {
    return () => collectionShare[1] === 'POST' ? '分享成功' : '取消分享成功'
  }

  const collectionCover = key.match(/^PUT \/collections\/(\d+)\/cover$/)
  if (collectionCover) {
    return () => `已设置收藏夹 ${collectionCover[1]} 封面`
  }

  const updateCollection = key.match(/^PUT \/collections\/(\d+)$/)
  if (updateCollection) {
    return () => `已更新收藏夹 ${updateCollection[1]}`
  }

  const deleteCollection = key.match(/^DELETE \/collections\/(\d+)$/)
  if (deleteCollection) {
    return () => `已删除收藏夹 ${deleteCollection[1]}`
  }

  const favoriteAction = key.match(/^(POST|DELETE) \/favorite\/(\d+)\/(\d+)$/)
  if (favoriteAction) {
    return () => favoriteAction[1] === 'POST' ? '收藏成功' : '取消收藏成功'
  }

  const squareReaction = key.match(/^(POST|DELETE) \/square\/collections\/(\d+)\/(like|favorite)$/)
  if (squareReaction) {
    return () => squareReaction[1] === 'POST' ? '操作成功' : '取消成功'
  }

  const userDetail = key.match(/^GET \/admin\/users\/(\d+)$/)
  if (userDetail) {
    return () => adminUserDetail(Number(userDetail[1]))
  }

  const deleteUser = key.match(/^DELETE \/admin\/user\/(\d+)$/)
  if (deleteUser) {
    return () => `已删除用户 ${deleteUser[1]}`
  }

  const updatePasskey = key.match(/^PATCH \/user\/passkeys\/(\d+)$/)
  if (updatePasskey) {
    return (config) => {
      const data = requestData<{ nickname?: string }>(config)
      const item = mockPasskeys.find(passkey => passkey.id === Number(updatePasskey[1]))
      if (item && data.nickname)
        item.nickname = data.nickname
      return item || null
    }
  }

  const removePasskey = key.match(/^DELETE \/user\/passkeys\/(\d+)$/)
  if (removePasskey) {
    return () => {
      const index = mockPasskeys.findIndex(passkey => passkey.id === Number(removePasskey[1]))
      if (index >= 0)
        mockPasskeys.splice(index, 1)
      return '已删除'
    }
  }

  const operationLogDetail = key.match(/^GET \/admin\/operation-logs\/(\d+)$/)
  if (operationLogDetail) {
    return () => mockOperationLogs.find(item => item.id === Number(operationLogDetail[1])) || mockOperationLogs[0]
  }

  const notificationRead = key.match(/^POST \/notifications\/(\d+)\/read$/)
  if (notificationRead) {
    return () => {
      const item = mockNotifications.find(notification => notification.id === Number(notificationRead[1]))
      if (item) {
        item.read = true
        item.readAt = new Date().toISOString().slice(0, 19)
      }
      return '已读'
    }
  }

  const galleryBatchDetail = key.match(/^GET \/gallery\/uploads\/batches\/(\d+)$/)
  if (galleryBatchDetail) {
    return () => {
      const batch = mockGalleryBatches.find(item => item.batchId === Number(galleryBatchDetail[1]))
      return batch || mockGalleryBatches[0] || null
    }
  }

  const galleryBatchCancel = key.match(/^POST \/gallery\/uploads\/batches\/(\d+)\/cancel$/)
  if (galleryBatchCancel) {
    return () => {
      const batch = mockGalleryBatches.find(item => item.batchId === Number(galleryBatchCancel[1]))
      if (batch)
        batch.status = 'CANCELED'
      return '已取消'
    }
  }

  const galleryBatchComplete = key.match(/^POST \/gallery\/uploads\/batches\/(\d+)\/complete$/)
  if (galleryBatchComplete) {
    return (config) => {
      const data = requestData<{ items?: Array<{ submissionId?: number, objectKey?: string, etag?: string, sha256?: string }> }>(config)
      const batch = mockGalleryBatches.find(item => item.batchId === Number(galleryBatchComplete[1]))
      if (!batch)
        return null

      for (const completedItem of data.items || []) {
        const item = batch.items.find(entry => entry.submissionId === Number(completedItem.submissionId))
        if (item) {
          item.uploadStatus = 'UPLOADED'
          item.sha256 = completedItem.sha256 || item.sha256
        }
      }
      batch.uploadedCount = batch.items.filter(item => item.uploadStatus === 'UPLOADED').length
      const incompleteItems = batch.items.filter(item => item.uploadStatus !== 'UPLOADED')
      if (incompleteItems.length > 0) {
        batch.status = 'UPLOADING'
        return mockResponse(409, {
          timestamp: new Date().toISOString(),
          status: 409,
          error: 'Conflict',
          code: 'GALLERY_UPLOAD_INCOMPLETE',
          message: `仍有 ${incompleteItems.length} 张图片未上传完成`,
          traceId: `mock-trace-${Date.now()}`,
          path: `/gallery/uploads/batches/${batch.batchId}/complete`,
          items: incompleteItems.map(item => ({
            submissionId: item.submissionId,
            clientItemId: item.clientItemId,
            filename: item.filename,
            status: item.uploadStatus,
            message: item.errorMessage || 'Mock：图片尚未上传完成',
          })),
        }, 'Conflict')
      }

      batch.status = 'WAITING_MANUAL_REVIEW'
      return {
        ...batch,
        message: 'Mock：上传完成，等待管理员审核',
      }
    }
  }

  const galleryItemStatus = key.match(/^POST \/gallery\/uploads\/batches\/(\d+)\/items\/(.+)\/status$/)
  if (galleryItemStatus) {
    return (config) => {
      const data = requestData<{ uploadStatus?: MockGalleryItemUploadStatus, errorCode?: string, errorMessage?: string }>(config)
      const batch = mockGalleryBatches.find(item => item.batchId === Number(galleryItemStatus[1]))
      const clientItemId = decodeURIComponent(galleryItemStatus[2] || '')
      const item = batch?.items.find(entry => entry.clientItemId === clientItemId)
      if (item) {
        item.uploadStatus = data.uploadStatus || item.uploadStatus
        item.errorCode = data.errorCode || null
        item.errorMessage = data.errorMessage || null
        if (batch)
          batch.uploadedCount = batch.items.filter(entry => entry.uploadStatus === 'UPLOADED').length
      }
      return item || null
    }
  }

  return undefined
}

const handlers: Record<string, MockHandler> = {
  'GET /auth/captcha': () => ({
    uuid: 'mock-captcha-uuid',
    img: `data:image/svg+xml;charset=UTF-8,${captchaSvg}`,
  }),
  'POST /auth/login': () => ({
    token: 'mock-token',
    userId: 1,
    role: 1,
    expireAt: Date.now() + 86_400_000,
    avatarUrl: '',
    lastLoginIp: '127.0.0.1',
    signSecret: 'mock-sign-secret',
  }),
  'POST /auth/passkeys/authentication/options': () => ({
    challengeId: 'mock-passkey-authentication-challenge',
    publicKey: {
      publicKey: {
        challenge: getMockPasskeyChallenge(),
        rpId: getMockPasskeyRpId(),
        userVerification: 'preferred',
        timeout: 60_000,
      },
    },
  }),
  'POST /auth/passkeys/authentication/finish': () => {
    const nowText = new Date().toISOString().slice(0, 19)
    if (mockPasskeys[0])
      mockPasskeys[0].lastUsedAt = nowText

    return {
      token: 'mock-token',
      userId: 1,
      role: 1,
      expireAt: Date.now() + 86_400_000,
      avatarUrl: '',
      lastLoginIp: '127.0.0.1',
      signSecret: 'mock-sign-secret',
    }
  },
  'POST /auth/register': () => '注册成功',
  'GET /user/info': () => ({
    id: 1,
    email: 'mock@example.com',
    role: 1,
    nickname: 'Mock Admin',
    avatarUrl: '',
  }),
  'GET /user/passkeys': () => mockPasskeys,
  'POST /user/passkeys/registration/options': () => {
    return {
      challengeId: 'mock-passkey-registration-challenge',
      publicKey: {
        publicKey: {
          rp: {
            id: getMockPasskeyRpId(),
            name: 'Setu API',
          },
          user: {
            id: 'bW9jay11c2VyLTE',
            name: 'mock@example.com',
            displayName: 'Mock Admin',
          },
          challenge: getMockPasskeyChallenge(),
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 },
            { type: 'public-key', alg: -257 },
          ],
          timeout: 60_000,
          authenticatorSelection: {
            residentKey: 'preferred',
            userVerification: 'preferred',
          },
          attestation: 'none',
          excludeCredentials: mockPasskeys.map(passkey => ({
            id: passkey.credentialId || `mock-credential-${passkey.id}`,
            type: 'public-key',
          })),
        },
      },
    }
  },
  'POST /user/passkeys/registration/finish': (config) => {
    const data = requestData<{ nickname?: string }>(config)
    const item = {
      id: mockPasskeyId += 1,
      nickname: data.nickname || '我的通行密钥',
      credentialId: `mock-credential-${mockPasskeyId}`,
      createdAt: new Date().toISOString().slice(0, 19),
      lastUsedAt: null,
      transports: ['internal'],
    }
    mockPasskeys.push(item)
    return item
  },
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
    lastCalledAt: usageLogs[0]?.timestamp || null,
  }),
  'GET /usage/logs': (config) => {
    const { page, limit, start } = pageFromConfig(config)
    return {
      page,
      size: limit,
      total: usageLogs.length,
      data: usageLogs.slice(start, start + limit),
    }
  },
  'GET /points/me': () => ({
    points: 1280,
  }),
  'GET /setu/v2': (config) => {
    const num = Math.min(Number(config.params?.get?.('num') || config.params?.num || 4), 10)
    return {
      error: '',
      data: mockCollectionImages.slice(0, num).map(image => ({
        pid: image.pid,
        p: image.p,
        uid: image.uid,
        title: image.title,
        author: image.author,
        r18: image.r18 === 1,
        width: image.width,
        height: image.height,
        tags: image.tags,
        urls: {
          original: image.urlOriginal,
          regular: image.urlRegular,
          small: image.urlSmall,
        },
      })),
    }
  },
  'GET /favorite/list': (config) => {
    const { page, limit, start } = pageFromConfig(config)
    const items = collectionItems(1)
    return {
      page,
      size: limit,
      total: items.length,
      items: items.slice(start, start + limit),
    }
  },
  'GET /collections/mine': () => mockCollections.slice(0, 2),
  'POST /collections': () => 4,
  'GET /square/collections': (config) => {
    const { page, limit, start } = pageFromConfig(config)
    const params = config.params || {}
    const keyword = String(params.keyword || '').trim().toLowerCase()
    const filtered = mockCollections
      .filter(item => !item.isDefault && item.visibility === 1)
      .filter(item => !keyword
        || item.name.toLowerCase().includes(keyword)
        || String(item.description || '').toLowerCase().includes(keyword),
      )

    return {
      page,
      size: limit,
      total: filtered.length,
      list: filtered.slice(start, start + limit).map(decorateSquareCollection),
    }
  },
  'GET /admin/blog/stats': () => ({
    id: 1,
    totalCalls: 128456,
    updatedAt: new Date().toISOString().slice(0, 19),
  }),
  'GET /admin/blacklist/ip': () => mockBlacklistIps,
  'POST /admin/blacklist/ip/add': () => '添加成功',
  'POST /admin/blacklist/ip/remove': () => '移除成功',
  'GET /admin/tempblock/list': () => mockTempBlocks,
  'POST /admin/tempblock/clear-all': () => '已清空',
  'POST /admin/tempblock/clear': () => '已解除',
  'GET /status/image-count': () => ({
    count: mockCollectionImages.length + mockAuditImages.length,
  }),
  'GET /status': () => ({
    status: '正常',
    availability: 0.996,
    avgLatencyMs: 86,
    callsToday: 1248,
  }),
  'GET /gallery/uploads/batches': (config) => {
    const { page, limit, start } = pageFromConfig(config)
    const status = config.params?.status && config.params.status !== 'ALL'
      ? String(config.params.status)
      : ''
    const filtered = status
      ? mockGalleryBatches.filter(batch => batch.status === status)
      : mockGalleryBatches
    return {
      total: filtered.length,
      page,
      pageSize: limit,
      list: filtered.slice(start, start + limit).map(batch => ({
        ...batch,
        items: undefined,
      })),
    }
  },
  'POST /gallery/uploads/batches': (config) => {
    const data = requestData<{
      clientRequestId?: string
      pidMode?: string
      defaults?: { title?: string, author?: string, r18?: boolean, aiType?: number, tags?: string[] }
      items?: Array<{
        clientItemId?: string
        filename?: string
        contentType?: string
        sizeBytes?: number
        sha256?: string
        pageIndex?: number
        title?: string
        author?: string
        tags?: string[]
      }>
    }>(config)
    const headerKey = config.headers?.['Idempotency-Key'] || config.headers?.['idempotency-key']
    const clientRequestId = String(Array.isArray(headerKey) ? headerKey[0] : headerKey || data.clientRequestId || '')
    const existingBatch = clientRequestId
      ? mockGalleryBatches.find(batch => batch.clientRequestId === clientRequestId)
      : null

    if (existingBatch) {
      return {
        ...existingBatch,
        clientRequestId,
        uploadPolicy: {
          provider: 'mock',
          region: 'local',
          bucket: 'mock-gallery',
          endpoint: 'https://mock.local',
          prefix: `gallery/${existingBatch.batchId}/`,
          expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
          maxSizeBytes: 10 * 1024 * 1024,
          allowedContentTypes: ['image/jpeg', 'image/png'],
        },
        credentials: {
          accessKeyId: 'mock',
          accessKeySecret: 'mock',
          securityToken: 'mock',
          expiration: new Date(Date.now() + 3_600_000).toISOString(),
        },
      }
    }

    const batchId = mockGalleryBatchId += 1
    const createdAt = new Date().toISOString().slice(0, 19)
    const items = (data.items || []).map((item, index): MockGalleryItem => {
      const filename = item.filename || `mock-${index + 1}.jpg`
      return {
        submissionId: mockGallerySubmissionId += 1,
        itemIndex: index,
        clientItemId: item.clientItemId || `mock-client-item-${batchId}-${index}`,
        filename,
        pageIndex: item.pageIndex ?? null,
        objectKey: `gallery/${batchId}/${filename}`,
        status: 'UPLOADING',
        uploadStatus: 'PENDING',
        title: item.title || data.defaults?.title || null,
        author: item.author || data.defaults?.author || null,
        r18: data.defaults?.r18 ?? null,
        aiType: data.defaults?.aiType ?? null,
        tags: item.tags || data.defaults?.tags || null,
        sizeBytes: item.sizeBytes || null,
        contentType: item.contentType || null,
        sha256: item.sha256 || null,
      }
    })

    const batch: MockGalleryBatch = {
      batchId,
      clientRequestId,
      userId: 1,
      pidMode: data.pidMode || 'MULTI_PID_P0',
      status: 'UPLOADING',
      title: data.defaults?.title || null,
      author: data.defaults?.author || null,
      r18: data.defaults?.r18 ?? null,
      aiType: data.defaults?.aiType ?? null,
      tags: data.defaults?.tags || null,
      itemCount: items.length,
      uploadedCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
      publishedCount: 0,
      createdAt,
      reviewedAt: null,
      publishedAt: null,
      items,
    }
    mockGalleryBatches.unshift(batch)

    return {
      ...batch,
      uploadPolicy: {
        provider: 'mock',
        region: 'local',
        bucket: 'mock-gallery',
        endpoint: 'https://mock.local',
        prefix: `gallery/${batchId}/`,
        expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
        maxSizeBytes: 10 * 1024 * 1024,
        allowedContentTypes: ['image/jpeg', 'image/png'],
      },
      credentials: {
        accessKeyId: 'mock',
        accessKeySecret: 'mock',
        securityToken: 'mock',
        expiration: new Date(Date.now() + 3_600_000).toISOString(),
      },
    }
  },
  'POST /admin/sync/image-count': () => '同步成功',
  'GET /admin/operation-logs': (config) => {
    const { page, limit, start } = pageFromConfig(config)
    const params = config.params || {}
    const filtered = mockOperationLogs.filter((log) => {
      if (params.traceId && !String(log.traceId || '').includes(String(params.traceId)))
        return false
      if (params.userId && log.userId !== Number(params.userId))
        return false
      if (params.userEmail && !String(log.userEmail || '').toLowerCase().includes(String(params.userEmail).toLowerCase()))
        return false
      if (params.eventType && log.eventType !== params.eventType)
        return false
      if (params.status && log.status !== params.status)
        return false
      if (params.code && !String(log.code || '').includes(String(params.code)))
        return false
      if (params.targetType && log.targetType !== params.targetType)
        return false
      if (params.targetId && log.targetId !== String(params.targetId))
        return false
      return true
    })

    return {
      total: filtered.length,
      page,
      pageSize: limit,
      list: filtered.slice(start, start + limit).map(log => ({
        ...log,
        requestBody: undefined,
        responseBody: undefined,
        extra: undefined,
      })),
    }
  },
  'GET /notifications': (config) => {
    const { page, limit, start } = pageFromConfig(config)
    const unreadOnly = config.params?.unreadOnly === true || config.params?.unreadOnly === 'true'
    const filtered = unreadOnly
      ? mockNotifications.filter(item => !item.read)
      : mockNotifications

    return {
      total: filtered.length,
      page,
      pageSize: limit,
      list: filtered.slice(start, start + limit),
    }
  },
  'GET /notifications/unread-count': () => ({
    count: mockNotifications.filter(item => !item.read).length,
  }),
  'POST /notifications/read-all': () => {
    const readAt = new Date().toISOString().slice(0, 19)
    mockNotifications.forEach((item) => {
      item.read = true
      item.readAt = item.readAt || readAt
    })
    return '已全部标记为已读'
  },
  'GET /admin/image-delete/list': (config) => {
    const { page, limit, start } = pageFromConfig(config)
    const status = config.params?.status === undefined || config.params?.status === null || config.params?.status === ''
      ? undefined
      : Number(config.params.status)
    const filtered = status === undefined
      ? mockDeleteRequests
      : mockDeleteRequests.filter(item => item.status === status)
    return {
      total: filtered.length,
      page,
      pageSize: limit,
      list: filtered.slice(start, start + limit),
    }
  },
  'GET /admin/image-delete/pending': (config) => {
    const { page, limit, start } = pageFromConfig(config)
    const filtered = mockDeleteRequests.filter(item => item.status === 0)
    return {
      total: filtered.length,
      page,
      pageSize: limit,
      list: filtered.slice(start, start + limit),
    }
  },
  'POST /admin/image-delete/review': (config) => {
    const data = requestData<{ requestId?: number, approve?: boolean, remark?: string }>(config)
    const item = mockDeleteRequests.find(request => request.id === Number(data.requestId))
    if (item) {
      const approved = Boolean(data.approve)
      item.status = approved ? 1 : 2
      item.statusText = approved ? '已批准' : '已拒绝'
      Object.assign(item, {
        adminEmail: 'admin@mock.local',
        adminRemark: data.remark || '',
        reviewedAt: new Date().toISOString().slice(0, 19),
      })
    }
    return '审核成功'
  },
  'POST /admin/image-delete/batch-review': (config) => {
    const data = requestData<{ requestIds?: number[], approve?: boolean, remark?: string }>(config)
    const requestIds = Array.from(new Set(data.requestIds || [])).slice(0, 100)
    const approved = Boolean(data.approve)
    const results = requestIds.map((requestId) => {
      const item = mockDeleteRequests.find(request => request.id === Number(requestId))
      if (!item) {
        return {
          requestId,
          success: false,
          code: 'DELETE_REQUEST_NOT_FOUND',
          message: '删除申请不存在',
        }
      }
      if (item.status !== 0) {
        return {
          requestId,
          success: false,
          code: 'NOT_PENDING',
          message: '删除申请已处理',
        }
      }

      item.status = approved ? 1 : 2
      item.statusText = approved ? '已批准' : '已拒绝'
      Object.assign(item, {
        adminEmail: 'admin@mock.local',
        adminRemark: data.remark || '',
        reviewedAt: new Date().toISOString().slice(0, 19),
      })
      return {
        requestId,
        success: true,
        status: item.status,
      }
    })

    return {
      total: requestIds.length,
      successCount: results.filter(item => item.success).length,
      failureCount: results.filter(item => !item.success).length,
      results,
    }
  },
  'GET /admin/netease/tokens': () => mockNeteaseTokens,
  'POST /admin/netease/tokens': () => 3,
  'GET /admin/users': (config) => {
    const { page, limit, start } = pageFromConfig(config)
    const params = config.params || {}
    const keyword = String(params.email || params.nickname || '').trim().toLowerCase()
    const role = params.role === undefined || params.role === null || params.role === ''
      ? null
      : Number(params.role)
    const status = params.status === undefined || params.status === null || params.status === ''
      ? null
      : Number(params.status)
    const filtered = mockAdminUsers.filter((user) => {
      const matchesKeyword = !keyword
        || user.email.toLowerCase().includes(keyword)
        || (user.nickname || '').toLowerCase().includes(keyword)
      const matchesRole = role === null || user.role === role
      const matchesStatus = status === null || user.status === status
      return matchesKeyword && matchesRole && matchesStatus
    })

    return {
      total: filtered.length,
      page,
      pageSize: limit,
      list: filtered.slice(start, start + limit),
    }
  },
  'POST /admin/user/ban': () => '封禁成功',
  'POST /admin/user/unban': () => '解封成功',
  'GET /admin/image-audit/list': (config) => {
    const { page, limit, start } = pageFromConfig(config)
    const params = config.params || {}
    const requestedScope = String(params.scope || 'UNREVIEWED')
    const scope = requestedScope === 'DUE_REVIEW' || requestedScope === 'ALL' ? requestedScope : 'UNREVIEWED'
    const requestedStaleDays = Number(params.staleDays || 30)
    const staleDays = Number.isFinite(requestedStaleDays)
      ? Math.min(365, Math.max(1, Math.trunc(requestedStaleDays)))
      : 30
    const dueBeforeDate = new Date(now.getTime())
    dueBeforeDate.setDate(dueBeforeDate.getDate() - staleDays)
    const dueBefore = dueBeforeDate.toISOString().slice(0, 19).replace('T', ' ')
    const dueBeforeTime = dueBeforeDate.getTime()
    const pid = params.pid !== undefined && params.pid !== null && params.pid !== ''
      ? Number(params.pid)
      : null
    const p = params.p !== undefined && params.p !== null && params.p !== ''
      ? Number(params.p)
      : null
    const availabilityStatus = params.availabilityStatus
      ? String(params.availabilityStatus)
      : ''
    const onlyBroken = params.onlyBroken === true || params.onlyBroken === 'true'

    const pidFiltered = mockAuditImages.filter((image) => {
      if (pid !== null && image.pid !== pid)
        return false
      if (pid !== null && p !== null && image.p !== p)
        return false
      if (availabilityStatus && image.availabilityStatus !== availabilityStatus)
        return false
      if (onlyBroken && image.availabilityStatus !== 'BROKEN' && image.availabilityStatus !== 'SUSPECTED_BROKEN')
        return false
      return true
    })
    const isDueReview = (image: (typeof mockAuditImages)[number]) => {
      if (!image.lastAuditTime)
        return false
      return Date.parse(image.lastAuditTime) <= dueBeforeTime
    }
    const stats = {
      unreviewed: pidFiltered.filter(image => !image.lastAuditTime).length,
      dueReview: pidFiltered.filter(isDueReview).length,
      all: pidFiltered.length,
    }
    const filtered = pidFiltered
      .filter((image) => {
        if (scope === 'UNREVIEWED')
          return !image.lastAuditTime
        if (scope === 'DUE_REVIEW')
          return isDueReview(image)
        return true
      })
      .sort((a, b) => {
        if (scope === 'ALL')
          return b.uploadDate - a.uploadDate || b.id - a.id
        if (scope === 'DUE_REVIEW')
          return Date.parse(a.lastAuditTime || '') - Date.parse(b.lastAuditTime || '') || a.id - b.id
        return a.uploadDate - b.uploadDate || a.id - b.id
      })

    return {
      total: filtered.length,
      page,
      pageSize: limit,
      list: filtered.slice(start, start + limit),
      stats,
      dueBefore,
    }
  },
  'GET /admin/image-audit/queue': (config) => {
    const params = config.params || {}
    const limit = Math.min(Number(params.pageSize || 5), 20)
    const page = Math.max(1, Number(params.cursor || 1))
    const start = (page - 1) * limit
    const requestedScope = String(params.scope || 'UNREVIEWED')
    const scope = requestedScope === 'DUE_REVIEW' ? 'DUE_REVIEW' : 'UNREVIEWED'
    const requestedStaleDays = Number(params.staleDays || 30)
    const staleDays = Number.isFinite(requestedStaleDays)
      ? Math.min(365, Math.max(1, Math.trunc(requestedStaleDays)))
      : 30
    const dueBeforeDate = new Date(now.getTime())
    dueBeforeDate.setDate(dueBeforeDate.getDate() - staleDays)
    const dueBefore = dueBeforeDate.toISOString().slice(0, 19).replace('T', ' ')
    const dueBeforeTime = dueBeforeDate.getTime()
    const pid = params.pid !== undefined && params.pid !== null && params.pid !== ''
      ? Number(params.pid)
      : null
    const p = params.p !== undefined && params.p !== null && params.p !== ''
      ? Number(params.p)
      : null
    const pidFiltered = mockAuditImages.filter((image) => {
      if (pid !== null && image.pid !== pid)
        return false
      if (pid !== null && p !== null && image.p !== p)
        return false
      return true
    })
    const isDueReview = (image: (typeof mockAuditImages)[number]) => {
      if (!image.lastAuditTime)
        return false
      return Date.parse(image.lastAuditTime) <= dueBeforeTime
    }
    const stats = {
      unreviewed: pidFiltered.filter(image => !image.lastAuditTime).length,
      dueReview: pidFiltered.filter(isDueReview).length,
      all: pidFiltered.length,
    }
    const filtered = pidFiltered
      .filter(image => scope === 'UNREVIEWED' ? !image.lastAuditTime : isDueReview(image))
      .sort((a, b) => scope === 'UNREVIEWED'
        ? a.uploadDate - b.uploadDate || a.id - b.id
        : Date.parse(a.lastAuditTime || '') - Date.parse(b.lastAuditTime || '') || a.id - b.id)
    const list = filtered.slice(start, start + limit)

    return {
      nextCursor: start + limit < filtered.length ? String(page + 1) : null,
      hasMore: start + limit < filtered.length,
      list,
      stats,
      dueBefore,
    }
  },
  'POST /admin/image-audit/submit': (config) => {
    const data = requestData<{ imageId?: number, status?: number, remark?: string }>(config)
    const image = mockAuditImages.find(item => item.id === Number(data.imageId))
    if (image) {
      image.lastAuditStatus = data.status === 2 ? 2 : 1
      image.lastAuditRemark = data.remark || null
      image.lastAuditTime = new Date().toISOString().slice(0, 19)
      image.lastAuditAdminEmail = 'admin@mock.local'
    }
    return data.status === 2 ? '审核结果已保存，已自动创建删除申请' : '审核结果已保存'
  },
  'POST /admin/image-audit/availability-check': (config) => {
    const data = requestData<{ imageIds?: number[] }>(config)
    const imageIds = Array.from(new Set(data.imageIds || [])).slice(0, 100)
    const checkedAt = new Date().toISOString().slice(0, 19)
    const results = imageIds.map((imageId) => {
      const image = mockAuditImages.find(item => item.id === Number(imageId))
      if (!image) {
        return {
          imageId,
          success: false,
          code: 'IMAGE_NOT_FOUND',
          message: '图片不存在',
        }
      }

      const broken = image.id % 13 === 0
      const suspected = !broken && image.id % 7 === 0
      image.availabilityStatus = broken ? 'BROKEN' : suspected ? 'SUSPECTED_BROKEN' : 'OK'
      image.lastAvailabilityCheckAt = checkedAt
      image.lastAvailabilityHttpStatus = broken ? 404 : suspected ? 500 : 200
      image.lastAvailabilityError = broken ? 'Mock：源站返回 404' : suspected ? 'Mock：源站超时' : null
      image.availabilityFailCount = image.availabilityStatus === 'OK' ? 0 : (image.availabilityFailCount || 0) + 1

      return {
        imageId,
        success: true,
        status: image.availabilityStatus,
        httpStatus: image.lastAvailabilityHttpStatus,
        message: image.lastAvailabilityError || undefined,
      }
    })

    return {
      total: imageIds.length,
      successCount: results.filter(item => item.success).length,
      failureCount: results.filter(item => !item.success).length,
      results,
    }
  },
  'POST /admin/image-audit/batch-submit': (config) => {
    const data = requestData<{ imageIds?: number[], status?: number, remark?: string }>(config)
    const imageIds = Array.from(new Set(data.imageIds || [])).slice(0, 100)
    const auditStatus = data.status === 2 ? 2 : 1
    const reviewedAt = new Date().toISOString().slice(0, 19)
    const results = imageIds.map((imageId) => {
      const image = mockAuditImages.find(item => item.id === Number(imageId))
      if (!image) {
        return {
          imageId,
          success: false,
          code: 'IMAGE_NOT_FOUND',
          message: '图片不存在',
        }
      }

      image.lastAuditStatus = auditStatus
      image.lastAuditRemark = data.remark || null
      image.lastAuditTime = reviewedAt
      image.lastAuditAdminEmail = 'admin@mock.local'

      if (auditStatus !== 2) {
        return {
          imageId,
          success: true,
          auditStatus,
        }
      }

      let deleteRequest = mockDeleteRequests.find(request =>
        request.pid === image.pid && request.p === image.p && request.status === 0)
      const deleteRequestCreated = !deleteRequest
      if (!deleteRequest) {
        const nextId = Math.max(0, ...mockDeleteRequests.map(request => request.id)) + 1
        deleteRequest = {
          id: nextId,
          userId: 1,
          userEmail: 'admin@mock.local',
          userNickname: '管理员',
          pid: image.pid,
          p: image.p,
          reason: data.remark ? `图片审核有问题：${data.remark}` : '图片审核有问题',
          status: 0,
          statusText: '待审核',
          createdAt: reviewedAt,
          imageTitle: image.title,
          imageAuthor: image.author,
          thumbnailUrl: image.urlOriginal,
          title: image.title,
          author: image.author,
          uid: image.uid,
          r18: image.r18,
          width: image.width,
          height: image.height,
          ext: image.ext,
          aiType: image.aiType,
          uploadDate: image.uploadDate,
          urlOriginal: image.urlOriginal,
          tags: image.tags,
        }
        mockDeleteRequests.push(deleteRequest)
      }

      return {
        imageId,
        success: true,
        auditStatus,
        deleteRequestCreated,
        deleteRequestId: deleteRequest.id,
        message: deleteRequestCreated ? undefined : '已存在待处理删除申请',
      }
    })

    return {
      total: imageIds.length,
      successCount: results.filter(item => item.success).length,
      failureCount: results.filter(item => !item.success).length,
      results,
    }
  },
  'GET /admin/image/info': (config) => {
    const pid = Number(config.params?.pid)
    const p = Number(config.params?.p || 0)
    return mockAuditImages.find(image => image.pid === pid && image.p === p) || mockAuditImages[0]
  },
  'POST /image-delete/submit': () => '删除申请已提交',
  'GET /user/music/search/hot': () => ({
    code: 200,
    result: {
      hots: ['雪涼', 'Lo-Fi', 'Night Drive', 'Pixel Love', 'Sakura'].map((first, index) => ({
        first,
        second: 56000 - index * 4200,
        third: null,
        iconType: index < 2 ? 1 : 0,
      })),
    },
  }),
  'GET /user/music/search': (config) => {
    const limit = Number(config.params?.limit || 10)
    const offset = Number(config.params?.offset || 0)
    return {
      result: {
        songs: mockSongs.slice(offset, offset + limit),
        songCount: mockSongs.length,
      },
    }
  },
  'GET /user/music/url': config => ({
    data: [{
      id: Number(config.params?.id || mockSongs[0]?.id || 0),
      url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3',
      level: config.params?.level || 'standard',
      size: 120000,
      playability: 'FULL',
      fullPlayable: true,
      trial: false,
      playabilityReason: '完整播放地址可用',
    }],
  }),
  'GET /user/music/lyric': () => ({
    lrc: {
      lyric: [
        '[00:00.00]Mock Song',
        '[00:03.00]雪涼云本地验收歌词',
        '[00:07.00]播放器现在只在音乐页显示复杂面板',
        '[00:12.00]全局保留轻量迷你条',
      ].join('\n'),
    },
  }),
  'GET /user/music/mv/url': config => ({
    code: 200,
    data: {
      id: Number(config.params?.id || 0),
      url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
      r: 720,
      size: 300000,
      br: 720,
    },
  }),
  'GET /user/playlists': () => mockUserPlaylists,
  'GET /user/playlists/1': () => mockUserPlaylists[0],
  'POST /user/playlists': () => ({
    ...mockUserPlaylists[0],
    id: 2,
    name: 'Mock 新歌单',
    songCount: 0,
    songs: [],
  }),
  'POST /user/playlists/1/songs': () => '添加成功',
  'POST /user/playlists/2/songs': () => '添加成功',
  'POST /user/music/history': () => '记录成功',
  'GET /admin/pixiv/health': () => ({
    status: 'ok',
    environment: 'mock',
    database: 'connected',
  }),
  'GET /admin/pixiv/tasks': (config) => {
    const limit = Number(config.params?.limit || 100)
    const offset = Number(config.params?.offset || 0)
    return {
      total: pixivTasks.length,
      tasks: pixivTasks.slice(offset, offset + limit),
    }
  },
  'GET /admin/pixiv/tasks/mock-task-0001': () => pixivTasks[0],
  'GET /admin/pixiv/tasks/mock-task-0012': () => pixivTasks[11],
  'DELETE /admin/pixiv/tasks/mock-task-0008': () => ({
    message: '任务已取消',
  }),
}

export function createMockAdapter(defaultAdapter: AxiosAdapter): AxiosAdapter {
  return async (config) => {
    const key = `${(config.method || 'GET').toUpperCase()} ${normalizePath(config)}`
    const handler = handlers[key] || dynamicHandler(key)

    if (!handler)
      return defaultAdapter(config)

    await new Promise(resolve => window.setTimeout(resolve, 140))
    const result = handler(config)
    const response = isMockHttpResponse(result)
      ? ok(config, result.mockData, result.mockStatus, result.mockStatusText)
      : ok(config, result)
    const validateStatus = config.validateStatus || (status => status >= 200 && status < 300)

    if (!validateStatus || validateStatus(response.status))
      return response

    throw new AxiosError(
      `Request failed with status code ${response.status}`,
      response.status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST,
      config,
      undefined,
      response,
    )
  }
}
