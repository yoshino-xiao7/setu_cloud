import type { CollectionPreviewImageDTO, SquareCollectionDTO, SquarePageResult } from '@/api/collections'
import { onMounted, ref, shallowRef } from 'vue'
import { getSquareCollections } from '@/api/collections'
import { unwrapApiData } from '@/api/response'
import { getPreviewUrl } from '@/composables/useCollectionSquareViewHelpers'

/** 未登录首屏的一块作品瓦片。 */
export interface ShowcaseTile {
  key: string
  url: string
  title: string
  author: string
  /** 宽高比，用于瀑布流占位，避免图片加载时的跳版。 */
  ratio: number
  portrait: boolean
  collectionId: number
  collectionName: string
}

/** 首屏最多铺多少张，超过反而拖慢首屏。 */
const TILE_LIMIT = 12
/** 一次请求就能覆盖首屏，避免额外往返。 */
const COLLECTION_PAGE_SIZE = 12

/**
 * 只放行图片可安全加载的协议，挡掉 javascript: 之类的注入。
 * data:image/ 是本地 mock 夹具用的，生产数据一律来自图片 CDN 的 http(s)。
 */
function isSafeImageUrl(value: string) {
  if (value.startsWith('data:image/'))
    return true
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol)
  }
  catch {
    return false
  }
}

/**
 * 只保留全年龄作品：预览图 SQL 不过滤 r18，未登录首屏必须在前端拦掉。
 * r18 缺失时按「不安全」处理，宁可少展示也不误放。
 */
function isAllAges(image: CollectionPreviewImageDTO) {
  return Number(image.r18 ?? 1) === 0
}

function toTile(image: CollectionPreviewImageDTO, collection: SquareCollectionDTO): ShowcaseTile | null {
  const url = getPreviewUrl(image)
  if (!url || !isSafeImageUrl(url) || !isAllAges(image))
    return null

  const width = Number(image.width) > 0 ? Number(image.width) : 0
  const height = Number(image.height) > 0 ? Number(image.height) : 0
  // 后端偶尔缺尺寸，退回 3:4 竖版，与图库主流构图一致。
  const ratio = width && height ? width / height : 0.75

  return {
    key: `${collection.id}-${image.pid}-${image.p ?? 0}`,
    url,
    title: String(image.title || '').trim() || '未命名作品',
    author: String(image.author || '').trim(),
    ratio,
    portrait: ratio < 1,
    collectionId: collection.id,
    collectionName: collection.name,
  }
}

/**
 * 轮转交错：先取每个收藏夹的第 1 张，再取第 2 张……
 * 避免只有少数几个收藏夹时首屏被同一个人的作品刷屏。
 */
export function selectShowcaseTiles(collections: SquareCollectionDTO[], limit = TILE_LIMIT): ShowcaseTile[] {
  const buckets = collections.map(collection => (
    (Array.isArray(collection.previewImages) ? collection.previewImages : [])
      .map(image => toTile(image, collection))
      .filter((tile): tile is ShowcaseTile => tile !== null)
  ))

  const tiles: ShowcaseTile[] = []
  const seen = new Set<string>()
  const depth = Math.max(0, ...buckets.map(bucket => bucket.length))

  for (let index = 0; index < depth && tiles.length < limit; index++) {
    for (const bucket of buckets) {
      const tile = bucket[index]
      if (!tile || seen.has(tile.key))
        continue
      seen.add(tile.key)
      tiles.push(tile)
      if (tiles.length >= limit)
        break
    }
  }

  return tiles
}

/**
 * 未登录首屏的作品数据源。
 *
 * 走匿名可读的 /square/collections：一次请求即可拿到多个收藏夹各自的预览图，
 * 而 /blog/setu 每次只返回 1 张且同 IP 每分钟仅 10 次，铺不出内容墙。
 */
export function useLandingShowcase() {
  const tiles = shallowRef<ShowcaseTile[]>([])
  const loading = ref(true)
  const failed = ref(false)

  async function load() {
    loading.value = true
    failed.value = false
    try {
      const res = await getSquareCollections({ page: 1, size: COLLECTION_PAGE_SIZE, sort: 'hot' })
      const data = unwrapApiData<SquarePageResult>(res, { page: 1, size: COLLECTION_PAGE_SIZE, total: 0, items: [] })
      const list = data.list || data.items || data.records || []
      tiles.value = selectShowcaseTiles(list)
      // 广场为空或全部为 R18 时没有可展示内容，走空态而不是错误态。
      failed.value = false
    }
    catch {
      // 首屏是营销面，拿不到作品就安静降级成纯文字版，不弹全局报错。
      tiles.value = []
      failed.value = true
    }
    finally {
      loading.value = false
    }
  }

  onMounted(load)

  return { tiles, loading, failed, reload: load }
}
