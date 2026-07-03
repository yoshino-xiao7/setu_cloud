import type { CollectionInfoDTO } from '@/api/collections'
import type { SetuImageItem } from '@/api/setu'
import { NTag, useMessage } from 'naive-ui'
import { computed, h, reactive, ref } from 'vue'
import { fetchPublicBlogSetu } from '@/api/blogPublic'
import { addToCollection, createCollection, listMyCollections } from '@/api/collections'
import { signDownloadUrl } from '@/api/download'
import { API_BASE_URL, SITE_URL } from '@/api/env'
import { addFavorite, checkFavoriteExists, removeFavorite } from '@/api/favorite'
import { unwrapApiData } from '@/api/response'
import { getApiErrorMessage, shouldIgnoreApiError, showApiError } from '@/composables/useApiError'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { useSeo } from '@/composables/useSeo'
import { useAuthStore } from '@/stores/auth'
import { formatDateOnly, formatTodayDisplay } from '@/utils/dateFormat'

interface ParamRow {
  name: string
  type: string
  required: boolean
  desc: string
}

interface EndpointRow {
  method: string
  endpoint: string
  auth: string
  desc: string
}

interface MusicParamRow {
  group: string
  name: string
  type: string
  required: boolean
  desc: string
}

export function useUsageGuide() {
  const message = useMessage()
  const authStore = useAuthStore()
  const { isMobile } = useBreakpoint()

  useSeo({
    title: '雪涼云开发文档 - 图片 API 与音乐 API 接入指南',
    description: '雪涼云（雪凉云 / Xueliang Cloud）开发文档提供图片 API 与音乐 API 的接入说明，覆盖请求基础地址、认证方式、常用参数、代码示例、响应结构和错误排查。',
    keywords: '雪涼云, 雪凉云, Xueliang Cloud, Setu Cloud, 雪涼云API, 图片API文档, 随机图片API, setu api, 网易云音乐API, API接入文档',
    url: `${SITE_URL}/docs`,
  })

  const dailyLoading = ref(false)
  const dailyData = ref<SetuImageItem | null>(null)
  const dailyError = ref(false)

  const isFavorited = ref(false)
  const favLoading = ref(false)

  async function checkFavStatus(pid: number, p: number) {
    if (!authStore.user)
      return

    try {
      const res = await checkFavoriteExists(pid, p)
      const v = unwrapApiData<boolean>(res)
      isFavorited.value = typeof v === 'boolean' ? v : false
    }
    catch {
      isFavorited.value = false
    }
  }

  async function fetchDailyImage() {
    dailyLoading.value = true
    dailyError.value = false
    dailyData.value = null
    isFavorited.value = false

    try {
      const images = await fetchPublicBlogSetu()
      if (images.length > 0) {
        dailyData.value = images[0]
        const currentP = dailyData.value.p || 0
        checkFavStatus(dailyData.value.pid, currentP)
      }
      else {
        throw new Error('No data')
      }
    }
    catch (error) {
      dailyError.value = true
      message.error(getApiErrorMessage(error, '演示图片加载失败'))
    }
    finally {
      setTimeout(() => {
        dailyLoading.value = false
      }, 500)
    }
  }

  async function handleToggleFavorite() {
    if (!dailyData.value)
      return
    if (!authStore.user) {
      message.warning('请先登录后再收藏')
      return
    }

    favLoading.value = true
    const pid = dailyData.value.pid
    const p = dailyData.value.p || 0

    try {
      if (isFavorited.value) {
        await removeFavorite(pid, p)
        isFavorited.value = false
        message.success('已取消收藏')
      }
      else {
        await addFavorite(pid, p)
        isFavorited.value = true
        message.success('已加入默认收藏夹 ❤️')
      }
    }
    catch {
      message.error('操作失败')
    }
    finally {
      favLoading.value = false
    }
  }

  const dailyDisplayUrl = computed(() => dailyData.value?.urls?.regular || dailyData.value?.urls?.original)
  const todayDate = computed(() => formatTodayDisplay())

  async function startSignedDownload(url: string, filename: string) {
    const loading = message.loading('正在准备下载...', { duration: 0 })
    try {
      const downloadUrl = await signDownloadUrl({ url, filename })
      loading.destroy()
      window.location.href = downloadUrl
    }
    catch (e) {
      loading.destroy()
      throw e
    }
  }

  async function handleDownload() {
    const url = dailyData.value?.urls?.original
    if (!url) {
      message.warning('原图链接为空')
      return
    }

    const filename = `${dailyData.value?.pid || 'image'}_${dailyData.value?.p || 0}.jpg`

    try {
      await startSignedDownload(url, filename)
    }
    catch (e) {
      if (shouldIgnoreApiError(e))
        return
      showApiError(message, e, '下载失败')
    }
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(dailyData.value?.urls?.original).then(() => message.success('链接已复制'))
  }

  const pickModal = ref(false)
  const collectionsLoading = ref(false)
  const collections = ref<CollectionInfoDTO[]>([])
  const selectedCollectionId = ref<number | null>(null)

  const newColName = ref('')
  const newColVisibility = ref<0 | 1>(0)
  const pickSubmitting = ref(false)

  const collectionOptions = computed(() =>
    collections.value.map((c: CollectionInfoDTO) => ({
      label: c.isDefault ? `${c.name}（默认）` : c.name,
      value: c.id,
    })),
  )

  async function openPickModal() {
    if (!dailyData.value)
      return
    if (!authStore.user) {
      message.warning('请先登录后再收藏')
      return
    }

    pickModal.value = true
    collectionsLoading.value = true

    try {
      const res = await listMyCollections()
      const list = unwrapApiData<CollectionInfoDTO[]>(res, [])
      collections.value = Array.isArray(list) ? list : []

      const def = collections.value.find((x: CollectionInfoDTO) => x.isDefault)
      selectedCollectionId.value = def?.id ?? (collections.value[0]?.id ?? null)
    }
    catch {
      message.error('加载收藏夹失败')
    }
    finally {
      collectionsLoading.value = false
    }
  }

  async function handleAddToSelected() {
    if (!dailyData.value)
      return
    if (!selectedCollectionId.value) {
      message.warning('请选择一个收藏夹')
      return
    }

    pickSubmitting.value = true
    try {
      const pid = dailyData.value.pid
      const p = dailyData.value.p || 0
      await addToCollection(selectedCollectionId.value, pid, p)
      message.success('已加入所选收藏夹')
      pickModal.value = false
    }
    catch {
      message.error('加入失败')
    }
    finally {
      pickSubmitting.value = false
    }
  }

  async function handleCreateAndAdd() {
    if (!dailyData.value)
      return
    const name = newColName.value.trim()
    if (!name) {
      message.warning('请输入收藏夹名称')
      return
    }

    pickSubmitting.value = true
    try {
      const createRes = await createCollection({
        name,
        description: '',
        visibility: newColVisibility.value,
      })
      const newId = unwrapApiData<number>(createRes)
      if (!newId)
        throw new Error('create failed')

      const pid = dailyData.value.pid
      const p = dailyData.value.p || 0
      await addToCollection(newId, pid, p)

      message.success('已创建并加入收藏夹')
      newColName.value = ''
      pickModal.value = false
    }
    catch {
      message.error('创建或加入失败')
    }
    finally {
      pickSubmitting.value = false
    }
  }

  const baseUrl = API_BASE_URL
  const demoToken = 'YOUR_API_KEY'
  const imageBaseEndpoint = `${baseUrl}/setu/v2`
  const musicBaseEndpoint = `${baseUrl}/user/music/**`

  const integrationQuickCards = [
    {
      eyebrow: 'BASE URL',
      title: '请求基础地址',
      desc: '图片与音乐接口都从同一个 API 域名发起，示例代码会自动使用当前环境配置。',
      code: baseUrl,
    },
    {
      eyebrow: 'AUTH',
      title: '认证方式',
      desc: '图片 API 可携带 API Key 获取更高配额；控制台音乐接口依赖登录态 Cookie。',
      code: 'Authorization: Bearer YOUR_API_KEY',
    },
    {
      eyebrow: 'ERROR',
      title: '错误排查',
      desc: '业务失败优先查看 code 与 message；联调问题保留 traceId 方便后端定位。',
      code: 'code / message / traceId',
    },
  ]

  const musicUsageNotes = [
    {
      title: '登录态接口',
      desc: '控制台音乐能力走 /user/music/**，浏览器请求需要带 credentials: "include"。',
    },
    {
      title: '可播状态',
      desc: '播放前先判断 playability、fullPlayable 和 url，TRIAL 不进入正常播放队列。',
    },
    {
      title: '音质参数',
      desc: 'level 支持 standard / higher / exhigh / lossless / hires，最终可用性以后端返回为准。',
    },
  ]

  const docJsonString = `{
  "error": "",
  "data": [
    {
      "pid": 138119385,
      "p": 0,
      "title": "【ネタバレ込】11月分",
      "author": "長月然",
      "r18": false,
      "width": 1061,
      "height": 1488,
      "tags": ["魔法少女", "插画"],
      "urls": {
        "original": "https://i.yukiryou.top/.../img.png",
        "regular": "https://i.yukiryou.top/.../img_master1200.jpg"
      }
    }
  ]
}`

  const codeExamples = reactive({
    curl: `curl -X GET "${baseUrl}/setu/v2?r18=0&num=1&excludeAI=true" \\
  -H "Authorization: Bearer ${demoToken}"`,
    js: `fetch("${baseUrl}/setu/v2?r18=0&num=1&excludeAI=true")
  .then(res => res.json())
  .then(data => console.log(data))`,
    python: `import requests
params = {
    "r18": 0,
    "excludeAI": True,
    "aspectRatio": "16:9"
}
res = requests.get("${baseUrl}/setu/v2", params=params)
print(res.json())`,
  })

  const paramColumns = [
    { title: '参数名', key: 'name', width: 90, render: (row: ParamRow) => h('code', { class: 'param-code' }, row.name) },
    { title: '类型', key: 'type', width: 90, render: (row: ParamRow) => h(NTag, { size: 'small', bordered: false, type: row.type.includes('[]') ? 'warning' : 'info', class: 'type-tag' }, { default: () => row.type }) },
    { title: '必填', key: 'required', width: 60, render: (row: ParamRow) => row.required ? h('span', { class: 'text-red' }, '是') : '否' },
    { title: '说明', key: 'desc' },
  ]

  const paramData = [
    { name: 'num', type: 'int', required: false, desc: '返回数量，默认 1，最大 20' },
    { name: 'r18', type: 'int', required: false, desc: '0=非R18，1=R18，2=混合；默认为 0' },
    { name: 'uid', type: 'int[]', required: false, desc: '指定作者 UID 列表' },
    { name: 'pid', type: 'long', required: false, desc: '指定作品 PID 精确查询' },
    { name: 'keyword', type: 'string', required: false, desc: '标题 / 标签关键字模糊搜索' },
    { name: 'tag', type: 'string[]', required: false, desc: '按标签过滤（支持多个）' },
    { name: 'size', type: 'string[]', required: false, desc: 'original / regular / small / thumb / mini' },
    { name: 'proxy', type: 'string', required: false, desc: '图片域名代理，不传则使用服务端默认' },
    { name: 'dateAfter', type: 'long', required: false, desc: '上传时间戳下限（毫秒）' },
    { name: 'dateBefore', type: 'long', required: false, desc: '上传时间戳上限（毫秒）' },
    { name: 'excludeAI', type: 'bool', required: false, desc: '是否排除 AI 作品' },
    { name: 'aspectRatio', type: 'string', required: false, desc: '长宽比过滤（如 "16:9"）' },
  ]

  const musicEndpointColumns = [
    {
      title: '方法',
      key: 'method',
      width: 78,
      render: (row: EndpointRow) => h(NTag, {
        size: 'small',
        bordered: false,
        type: row.method === 'GET' ? 'success' : row.method === 'POST' ? 'info' : 'warning',
      }, { default: () => row.method }),
    },
    { title: '接口', key: 'endpoint', minWidth: 230, render: (row: EndpointRow) => h('code', { class: 'endpoint-code' }, row.endpoint) },
    { title: '认证', key: 'auth', width: 110 },
    { title: '说明', key: 'desc' },
  ]

  const musicEndpointData: EndpointRow[] = [
    { method: 'GET', endpoint: '/user/music/search', auth: '登录态', desc: '按关键词搜索歌曲，支持分页' },
    { method: 'GET', endpoint: '/user/music/search/hot', auth: '登录态', desc: '获取热门搜索词' },
    { method: 'GET', endpoint: '/user/music/url', auth: '登录态', desc: '获取歌曲播放地址和完整可播状态' },
    { method: 'GET', endpoint: '/user/music/lyric', auth: '登录态', desc: '获取歌词和翻译歌词' },
    { method: 'GET', endpoint: '/user/music/mv/url', auth: '登录态', desc: '获取 MV 播放地址' },
    { method: 'GET', endpoint: '/user/playlists', auth: '登录态', desc: '获取我的歌单' },
    { method: 'POST', endpoint: '/user/playlists', auth: '登录态', desc: '创建用户歌单' },
  ]

  const musicParamData: MusicParamRow[] = [
    { group: '搜索', name: 'keywords', type: 'string', required: true, desc: '搜索关键词，例如歌曲名、歌手名' },
    { group: '搜索', name: 'limit', type: 'int', required: false, desc: '返回数量，默认 10' },
    { group: '搜索', name: 'offset', type: 'int', required: false, desc: '分页偏移量，默认 0' },
    { group: '播放地址', name: 'id', type: 'number', required: true, desc: '网易云歌曲 ID' },
    { group: '播放地址', name: 'level', type: 'string', required: false, desc: 'standard / higher / exhigh / lossless / hires' },
    { group: 'MV', name: 'r', type: 'number', required: false, desc: 'MV 清晰度，例如 720 / 1080' },
  ]

  const musicCodeExamples = reactive({
    search: `const res = await fetch("${baseUrl}/user/music/search?keywords=夜に駆ける&limit=10&offset=0", {
  credentials: "include"
});
const data = await res.json();
console.log(data.result.songs);`,
    playUrl: `const res = await fetch("${baseUrl}/user/music/url?id=33894312&level=exhigh", {
  credentials: "include"
});
const data = await res.json();
const item = data.data?.[0];

if (item?.playability === "FULL" && item.fullPlayable && item.url) {
  audio.src = item.url;
}
else {
  console.warn(item?.playabilityReason || "该歌曲暂不可播放");
}`,
  })

  const musicJsonString = `{
  "code": 200,
  "data": [
    {
      "id": 33894312,
      "url": "https://m8.music.126.net/.../song.mp3",
      "level": "exhigh",
      "size": 9123456,
      "playability": "FULL",
      "fullPlayable": true,
      "trial": false,
      "playabilityReason": "完整播放地址可用"
    }
  ]
}`

  const handleCopyCode = (text: string) => navigator.clipboard.writeText(text).then(() => message.success('代码已复制'))

  return {
    isMobile,
    dailyLoading,
    dailyData,
    dailyError,
    isFavorited,
    favLoading,
    fetchDailyImage,
    handleToggleFavorite,
    dailyDisplayUrl,
    todayDate,
    handleDownload,
    handleCopyLink,
    pickModal,
    collectionsLoading,
    selectedCollectionId,
    newColName,
    newColVisibility,
    pickSubmitting,
    collectionOptions,
    openPickModal,
    handleAddToSelected,
    handleCreateAndAdd,
    imageBaseEndpoint,
    musicBaseEndpoint,
    integrationQuickCards,
    musicUsageNotes,
    docJsonString,
    codeExamples,
    paramColumns,
    paramData,
    musicEndpointColumns,
    musicEndpointData,
    musicParamData,
    musicCodeExamples,
    musicJsonString,
    handleCopyCode,
    formatDateOnly,
  }
}
