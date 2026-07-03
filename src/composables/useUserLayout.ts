import type { GlobalThemeOverrides, MenuOption } from 'naive-ui'
import type { Component } from 'vue'
import {
  ChatbubbleEllipsesOutline,
  InformationCircleOutline,
  LogOutOutline,
  NotificationsOutline,
  PersonCircleOutline,
  PulseOutline,
  ShieldCheckmarkOutline,
} from '@vicons/ionicons5'
import { NIcon } from 'naive-ui'
import { computed, h, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { BG_IMAGE_URL, DEFAULT_AVATAR_URL } from '@/api/env'
import { getUserInfo } from '@/api/user'
import logoSrc from '@/assets/logo-setu.webp'
import SidebarStickerIcon from '@/components/SidebarStickerIcon.vue'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { useAuthStore } from '@/stores/auth'
import { safePush } from '@/utils/navigation'

const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#f586a9',
    primaryColorHover: '#f8a2be',
    primaryColorPressed: '#f26d99',
  },
  Menu: {
    itemColorActive: 'rgba(245, 134, 169, 0.15)',
    itemColorActiveHover: 'rgba(245, 134, 169, 0.25)',
    itemTextColorActive: '#f26d99',
    itemIconColorActive: '#f26d99',
    itemIconColorHover: '#f586a9',
    itemTextColorHover: '#f586a9',
    borderRadius: '12px',
  },
  Drawer: { bodyPadding: '0' },
}

const renderIcon = (icon: Component) => () => h(NIcon, null, { default: () => h(icon) })
const renderStickerIcon = (name: string) => () => h(SidebarStickerIcon, { name })

const iconDashboard = renderStickerIcon('mascots')
const iconKey = renderStickerIcon('key')
const iconCash = renderStickerIcon('coin')
const iconPoints = renderStickerIcon('wish')
const iconPointsLogs = renderStickerIcon('receipt')
const iconHeart = renderStickerIcon('heartFolder')
const iconCollections = renderStickerIcon('folder')
const iconSquare = renderStickerIcon('grid')
const iconAiDraw = renderStickerIcon('imageSearch')
const iconAiHistory = renderStickerIcon('history')
const iconAiSquare = renderStickerIcon('store')
const iconMusic = renderStickerIcon('music')
const iconMusicSearch = renderStickerIcon('searchNote')
const iconPlaylists = renderStickerIcon('playlist')
const iconHistory = renderStickerIcon('history')
const iconBook = renderStickerIcon('book')
const iconTrash = renderStickerIcon('delete')
const iconSettings = renderStickerIcon('admin')
const iconNotifications = renderIcon(NotificationsOutline)
const iconQqBinding = renderIcon(ChatbubbleEllipsesOutline)

export function useUserLayout() {
  const router = useRouter()
  const route = useRoute()
  const auth = useAuthStore()
  const { isCompact: isMobile } = useBreakpoint()

  const collapsed = ref(false)
  const showMobileMenu = ref(false)

  async function initUserInfo() {
    try {
      const res = await getUserInfo()
      if (auth.user) {
        if (res.nickname !== undefined && res.nickname !== auth.user.nickname)
          auth.user.nickname = res.nickname
        if (res.email !== undefined && res.email !== auth.user.email)
          auth.user.email = res.email
        if (res.role !== undefined && res.role !== auth.user.role)
          auth.user.role = res.role
      }
      if (res.avatarUrl) {
        auth.updateAvatar(res.avatarUrl)
      }
    }
    catch {}
  }

  onMounted(() => {
    void initUserInfo()
  })

  watch(isMobile, (mobile) => {
    if (mobile)
      collapsed.value = false
  })

  function handleToggle() {
    if (isMobile.value) {
      showMobileMenu.value = true
    }
    else {
      collapsed.value = !collapsed.value
    }
  }

  const menuOptions = computed<MenuOption[]>(() => {
    const items: MenuOption[] = [
      { label: '仪表盘', key: '/dashboard', icon: iconDashboard },
      { label: 'API Key', key: '/dashboard/api-keys', icon: iconKey },

      { type: 'divider' },

      {
        label: '积分中心',
        key: 'points-group',
        icon: iconCash,
        children: [
          { label: '积分抽卡', key: '/dashboard/points', icon: iconPoints },
          { label: '积分流水', key: '/dashboard/points-logs', icon: iconPointsLogs },
        ],
      },

      {
        label: '图库收藏',
        key: 'collection-group',
        icon: iconHeart,
        children: [
          { label: '我的收藏夹', key: '/dashboard/collections', icon: iconCollections },
          { label: '收藏夹广场', key: '/dashboard/square', icon: iconSquare },
          { label: '图库投稿', key: '/dashboard/gallery-upload', icon: iconPoints },
        ],
      },

      {
        label: 'AI 绘图',
        key: 'ai-draw-group',
        icon: iconAiDraw,
        children: [
          { label: '开始绘图', key: '/dashboard/ai-draw', icon: iconAiDraw },
          { label: '我的历史', key: '/dashboard/ai-history', icon: iconAiHistory },
          { label: 'AI 广场', key: '/dashboard/ai-square', icon: iconAiSquare },
        ],
      },

      {
        label: '音乐播放器',
        key: 'music-group',
        icon: iconMusic,
        children: [
          { label: '音乐搜索', key: '/dashboard/music', icon: iconMusicSearch },
          { label: '我的歌单', key: '/dashboard/my-playlists', icon: iconPlaylists },
          { label: '播放历史', key: '/dashboard/music-history', icon: iconHistory },
        ],
      },

      { type: 'divider' },

      { label: '开发文档', key: '/dashboard/docs', icon: iconBook },
      { label: '我的删除申请', key: '/dashboard/my-delete-requests', icon: iconTrash },
      { label: 'QQ 绑定', key: '/dashboard/qq-binding', icon: iconQqBinding },
      { label: '通知中心', key: '/dashboard/notifications', icon: iconNotifications },
    ]

    if (auth.user?.role === 1) {
      items.push(
        { type: 'divider' },
        { label: '管理后台', key: '/admin/overview', icon: iconSettings },
      )
    }
    return items
  })

  const activeKey = computed(() => route.path)

  function handleMenuSelect(key: string) {
    void safePush(router, key)
    if (isMobile.value)
      showMobileMenu.value = false
  }

  const userMenu = computed(() => [
    { label: '个人中心', key: 'profile', icon: renderIcon(PersonCircleOutline) },
    { label: 'QQ 绑定', key: 'qq-binding', icon: iconQqBinding },
    { type: 'divider' },
    { label: '系统状态', key: 'status', icon: renderIcon(PulseOutline) },
    { label: '关于', key: 'about', icon: renderIcon(InformationCircleOutline) },
    { label: '隐私政策', key: 'privacy', icon: renderIcon(ShieldCheckmarkOutline) },
    { type: 'divider' },
    { label: '退出登录', key: 'logout', icon: renderIcon(LogOutOutline) },
  ])

  function handleUserMenuSelect(key: string) {
    if (key === 'profile') {
      void safePush(router, '/dashboard/profile')
    }
    else if (key === 'qq-binding') {
      void safePush(router, '/dashboard/qq-binding')
    }
    else if (key === 'status') {
      void safePush(router, '/dashboard/status')
    }
    else if (key === 'about') {
      void safePush(router, '/dashboard/about')
    }
    else if (key === 'privacy') {
      void safePush(router, '/dashboard/privacy')
    }
    else if (key === 'logout') {
      auth.logout().then(() => {
        return safePush(router, { name: 'login' })
      })
    }
  }

  const avatarUrl = computed(() => auth.avatarUrl || DEFAULT_AVATAR_URL)

  const displayName = computed(() => {
    if (auth.user?.nickname)
      return auth.user.nickname
    if (auth.user?.email)
      return auth.user.email.split('@')[0]
    return 'User'
  })

  return {
    BG_IMAGE_URL,
    logoSrc,
    isMobile,
    collapsed,
    showMobileMenu,
    themeOverrides,
    menuOptions,
    activeKey,
    handleToggle,
    handleMenuSelect,
    userMenu,
    handleUserMenuSelect,
    avatarUrl,
    displayName,
  }
}
