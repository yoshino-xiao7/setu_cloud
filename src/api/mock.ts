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
    createdAt: '2026-05-20T10:30:00'
  },
  {
    id: 2,
    name: '机器人测试',
    status: 0,
    dailyQuota: 300,
    totalQuota: 5000,
    callsToday: 0,
    totalCalls: 1420,
    createdAt: '2026-05-24T16:12:00'
  }
]

const usageLogs = Array.from({ length: 32 }, (_, index) => {
  const date = new Date(now)
  date.setMinutes(now.getMinutes() - index * 13)

  return {
    id: index + 1,
    timestamp: date.toISOString().slice(0, 19),
    endpoint: index % 3 === 0 ? '/blog/setu?tag=cat' : '/api/setu/random',
    status: index % 9 === 0 ? 429 : 200,
    ip: `127.0.0.${(index % 8) + 1}`
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
    createdAt: date.toISOString().slice(0, 19)
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
    tags: ['mock', 'sample', index % 2 === 0 ? 'pink' : 'blue']
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
    urlSmall: url
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
    ownerAvatarUrl: ''
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
    shareCreatedAt: '2026-06-03T12:30:00'
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
    shareCreatedAt: '2026-06-04T08:00:00'
  }
]

const mockBlacklistIps = Array.from({ length: 28 }, (_, index) => ({
  id: index + 1,
  ip: `203.0.113.${index + 8}`,
  reason: index % 3 === 0 ? '频繁请求' : index % 3 === 1 ? '异常扫描' : 'Mock 手动封禁',
  createdAt: new Date(Date.now() - index * 3_600_000).toISOString().slice(0, 19)
}))

const mockTempBlocks = Array.from({ length: 6 }, (_, index) => ({
  ip: `198.51.100.${index + 20}`,
  blockedAt: new Date(Date.now() - index * 600_000).toISOString().slice(0, 19),
  expiresAt: new Date(Date.now() + (index + 1) * 1_800_000).toISOString().slice(0, 19),
  reason: '请求速率过高'
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
    reviewedAt: status === 0 ? null : new Date(Date.now() - index * 3_600_000).toISOString().slice(0, 19)
  }
})

const mockNeteaseTokens = [
  {
    id: 1,
    cookie: 'MUSIC_U=mock_primary_cookie_value; __csrf=primary;',
    nickname: '主账号',
    status: 1,
    createdAt: '2026-06-01T10:00:00',
    updatedAt: '2026-06-06T09:00:00'
  },
  {
    id: 2,
    cookie: 'MUSIC_U=mock_backup_cookie_value; __csrf=backup;',
    nickname: '备用账号',
    status: 0,
    createdAt: '2026-06-02T12:00:00',
    updatedAt: '2026-06-05T18:30:00'
  }
]

function collectionItems(collectionId: number) {
  const offset = collectionId === 1 ? 0 : collectionId === 2 ? 6 : 18
  const count = collectionId === 1 ? 24 : collectionId === 2 ? 18 : 16
  return mockCollectionImages.slice(offset, offset + count).map((image, index) => ({
    itemId: collectionId * 1000 + index,
    favoriteId: collectionId * 1000 + index,
    pid: image.pid,
    p: image.p,
    addedAt: '2026-06-06T10:00:00',
    image
  }))
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
      picUrl: `data:image/svg+xml;charset=UTF-8,${coverSvg}`
    },
    dt: 188000 + index * 3000,
    mv: index % 5 === 0 ? 700000 + index : 0
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
      createdAt: '2026-06-01T10:00:00'
    }))
  }
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
  const limit = Number(params.limit || params.pageSize || params.size || 10)
  const start = Math.max(0, (page - 1) * limit)
  return { page, limit, start }
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
      totalQuota: 100000
    }))
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

  const collectionInfo = key.match(/^GET \/collections\/(\d+)$/)
  if (collectionInfo) {
    return () => {
      const id = Number(collectionInfo[1])
      return mockCollections.find(item => item.id === id) || mockCollections[1]
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
        items: items.slice(start, start + limit)
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

  return undefined
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
  'GET /points/me': () => ({
    points: 1280
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
          small: image.urlSmall
        }
      }))
    }
  },
  'GET /favorite/list': (config) => {
    const { page, limit, start } = pageFromConfig(config)
    const items = collectionItems(1)
    return {
      page,
      size: limit,
      total: items.length,
      items: items.slice(start, start + limit)
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
        || String(item.description || '').toLowerCase().includes(keyword)
      )

    return {
      page,
      size: limit,
      total: filtered.length,
      list: filtered.slice(start, start + limit)
    }
  },
  'GET /admin/blog/stats': () => ({
    id: 1,
    totalCalls: 128456,
    updatedAt: new Date().toISOString().slice(0, 19)
  }),
  'GET /admin/blacklist/ip': () => mockBlacklistIps,
  'POST /admin/blacklist/ip/add': () => '添加成功',
  'POST /admin/blacklist/ip/remove': () => '移除成功',
  'GET /admin/tempblock/list': () => mockTempBlocks,
  'POST /admin/tempblock/clear-all': () => '已清空',
  'POST /admin/tempblock/clear': () => '已解除',
  'GET /status/image-count': () => ({
    count: mockCollectionImages.length + mockAuditImages.length
  }),
  'GET /status': () => ({
    status: '正常',
    availability: 0.996,
    avgLatencyMs: 86,
    callsToday: 1248
  }),
  'POST /admin/sync/image-count': () => '同步成功',
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
      list: filtered.slice(start, start + limit)
    }
  },
  'GET /admin/image-delete/pending': (config) => {
    const { page, limit, start } = pageFromConfig(config)
    const filtered = mockDeleteRequests.filter(item => item.status === 0)
    return {
      total: filtered.length,
      page,
      pageSize: limit,
      list: filtered.slice(start, start + limit)
    }
  },
  'POST /admin/image-delete/review': () => '审核成功',
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
      list: filtered.slice(start, start + limit)
    }
  },
  'POST /admin/user/ban': () => '封禁成功',
  'POST /admin/user/unban': () => '解封成功',
  'GET /admin/image-audit/list': (config) => {
    const { page, limit, start } = pageFromConfig(config)
    return {
      total: mockAuditImages.length,
      page,
      pageSize: limit,
      list: mockAuditImages.slice(start, start + limit)
    }
  },
  'POST /admin/image-audit/submit': () => '审核结果已保存',
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
        iconType: index < 2 ? 1 : 0
      }))
    }
  }),
  'GET /user/music/search': (config) => {
    const limit = Number(config.params?.limit || 10)
    const offset = Number(config.params?.offset || 0)
    return {
      result: {
        songs: mockSongs.slice(offset, offset + limit),
        songCount: mockSongs.length
      }
    }
  },
  'GET /user/music/url': config => ({
    data: [{
      id: Number(config.params?.id || mockSongs[0]?.id || 0),
      url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3',
      level: config.params?.level || 'standard',
      size: 120000
    }]
  }),
  'GET /user/music/lyric': () => ({
    lrc: {
      lyric: [
        '[00:00.00]Mock Song',
        '[00:03.00]雪涼云本地验收歌词',
        '[00:07.00]播放器现在只在音乐页显示复杂面板',
        '[00:12.00]全局保留轻量迷你条'
      ].join('\n')
    }
  }),
  'GET /user/music/mv/url': config => ({
    code: 200,
    data: {
      id: Number(config.params?.id || 0),
      url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
      r: 720,
      size: 300000,
      br: 720
    }
  }),
  'GET /user/playlists': () => mockUserPlaylists,
  'GET /user/playlists/1': () => mockUserPlaylists[0],
  'POST /user/playlists': () => ({
    ...mockUserPlaylists[0],
    id: 2,
    name: 'Mock 新歌单',
    songCount: 0,
    songs: []
  }),
  'POST /user/playlists/1/songs': () => '添加成功',
  'POST /user/playlists/2/songs': () => '添加成功',
  'POST /user/music/history': () => '记录成功',
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
    const handler = handlers[key] || dynamicHandler(key)

    if (!handler)
      return defaultAdapter(config)

    await new Promise(resolve => window.setTimeout(resolve, 140))
    return ok(config, handler(config))
  }
}
