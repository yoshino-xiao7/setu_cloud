import { createHead } from '@vueuse/head'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSSRApp, h, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import http from '@/api/http'
import SchemaOrg from '@/components/seo/SchemaOrg.vue'
import ApiKeyList from '@/views/dashboard/ApiKeyList.vue'
import PublicCollectionView from '@/views/public/PublicCollectionView.vue'

vi.mock('@/api/http', () => ({ default: { get: vi.fn() } }))
vi.mock('naive-ui', async () => ({ ...await vi.importActual<typeof import('naive-ui')>('naive-ui'), useMessage: () => ({ error: vi.fn(), warning: vi.fn(), success: vi.fn() }), useDialog: () => ({ warning: vi.fn() }), useOsTheme: () => ref(null) }))
vi.mock('vue-router', async () => ({ ...await vi.importActual<typeof import('vue-router')>('vue-router'), useRoute: () => ({ params: { id: '42' }, path: '/c/42', fullPath: '/c/42', meta: { public: true } }), useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ user: null }) }))
vi.mock('@/stores/publicShare', () => ({ usePublicShareStore: () => ({ collections: {}, userProfiles: {} }) }))

beforeEach(() => vi.clearAllMocks())

describe('public board server rendering', () => {
  it('awaits original prefetch and retains title, canonical, OpenGraph and structured data', async () => {
    vi.mocked(http.get).mockImplementation(async url => ({ data: url === '/collections/42'
      ? { id: 42, name: '春日收藏', visibility: 1, itemCount: 1, ownerNickname: '收藏者' }
      : { total: 1, items: [{ pid: 100, p: 0, image: { title: '春日花园', width: 640, height: 960, urlRegular: '/image.png' } }] } }) as never)
    const head = createHead()
    const app = createSSRApp({ render: () => [h(SchemaOrg), h(PublicCollectionView)] })
    app.use(head)
    const html = await renderToString(app)
    const tags = await head.resolveTags()
    expect(html).toContain('春日花园')
    expect(html).toContain('mosaic__item')
    expect(http.get).toHaveBeenCalledTimes(2)
    expect(http.get).toHaveBeenCalledWith('/collections/42/items', { params: { page: 1, size: 24 } })
    expect(tags.find(tag => tag.tag === 'title')?.textContent).toBe('春日收藏 - 公开收藏夹 | 雪涼云')
    expect(tags.find(tag => tag.props.name === 'description')?.props.content).toBe('查看 春日收藏 收藏夹，包含 1 张精选图片。')
    expect(tags.find(tag => tag.props.rel === 'canonical')?.props.href).toMatch(/\/c\/42$/)
    expect(tags.find(tag => tag.props.property === 'og:type')?.props.content).toBe('article')
    expect(tags.some(tag => tag.tag === 'script' && tag.props.type === 'application/ld+json')).toBe(true)
  })

  it('renders API key controls without the former missing clipboard helper setup error', async () => {
    const html = await renderToString(createSSRApp({ render: () => h(ApiKeyList) }))
    expect(html).toContain('API 凭证')
    expect(html).toContain('新建 Key')
    expect(html).toContain('暂无 API Key')
    expect(html).toContain('bento__tile')
  })
})
