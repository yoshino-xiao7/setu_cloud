import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { useSeo } from '@/composables/useSeo'
import { useAuthStore } from '@/stores/auth'
import { safePush } from '@/utils/navigation'

const PROJECTS = [
  {
    title: '图片 API',
    desc: '随机图、标签筛选、R18 过滤与多种返回格式，适合 bot、站点与小工具。',
    link: '/docs',
    tone: 'blue',
    mark: 'IMG',
  },
  {
    title: '网易云音乐 API',
    desc: '歌曲搜索、详情、歌词、音乐 URL 与推荐能力，快速接入音乐玩法。',
    link: '/docs',
    tone: 'pink',
    mark: 'MUS',
  },
  {
    title: '开发文档',
    desc: '接口说明、请求示例、参数解释和实践指南，减少接入时的猜测。',
    link: '/docs',
    tone: 'violet',
    mark: 'DOC',
  },
  {
    title: '收藏夹广场',
    desc: '沉淀喜欢的作品，浏览公开收藏，给灵感和数据都留一个入口。',
    link: '/dashboard/square',
    tone: 'mint',
    mark: 'COL',
  },
]

export function useLandingPage() {
  const router = useRouter()
  const auth = useAuthStore()
  const isLoaded = ref(false)
  const bgLoaded = ref(false)
  const showNav = ref(false)
  const showTitle = ref(false)
  const showSubtitle = ref(false)
  const showButton = ref(false)
  const { isCompact } = useBreakpoint()
  const animationTimers: ReturnType<typeof setTimeout>[] = []

  useSeo({
    title: '亦可 YK - 图片、AI 创作与音乐',
    description: '亦可 YK 是集图片浏览、AI 绘画、音乐播放与收藏分享于一体的个人内容与创作空间，也提供图片和音乐 API。',
    keywords: '亦可, YK, AI绘画, 亦可API, 图片API, 随机图片API, 网易云音乐API',
  })

  onMounted(() => {
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false
    if (prefersReducedMotion || isCompact.value) {
      showLandingContentImmediately()
      return
    }

    animationTimers.push(setTimeout(() => isLoaded.value = true, 50))
    animationTimers.push(setTimeout(() => showNav.value = true, 150))
    animationTimers.push(setTimeout(() => showTitle.value = true, 300))
    animationTimers.push(setTimeout(() => showSubtitle.value = true, 480))
    animationTimers.push(setTimeout(() => showButton.value = true, 650))
  })

  onUnmounted(() => {
    animationTimers.forEach(clearTimeout)
    animationTimers.length = 0
  })

  function showLandingContentImmediately() {
    isLoaded.value = true
    showNav.value = true
    showTitle.value = true
    showSubtitle.value = true
    showButton.value = true
  }

  function scrollToProjects() {
    document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' })
  }

  function goStart() {
    void safePush(router, auth.user ? '/dashboard' : '/register')
  }

  function goDocs() {
    void safePush(router, '/docs')
  }

  return {
    bgLoaded,
    goDocs,
    goStart,
    isLoaded,
    projects: PROJECTS,
    scrollToProjects,
    showButton,
    showNav,
    showSubtitle,
    showTitle,
  }
}
