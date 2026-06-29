<script setup lang="ts">
import type { GlobalThemeOverrides, MenuOption } from 'naive-ui'
import type { Component } from 'vue'
// 图标引入
import {
  ChevronDown,
  CloseOutline,
  InformationCircleOutline,
  LogOutOutline,
  MenuOutline,
  NotificationsOutline,
  PersonCircleOutline,
  PulseOutline, // ✅ 系统状态图标
  ShieldCheckmarkOutline, // ✅ 新增：隐私政策图标
} from '@vicons/ionicons5'
import {

  NAvatar,
  NConfigProvider,
  NDrawer,
  NDrawerContent,
  NDropdown,
  NIcon,
  NLayout,
  NLayoutContent,
  NLayoutHeader,
  NLayoutSider,
  NMenu,
} from 'naive-ui'
import { computed, defineAsyncComponent, h, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { BG_IMAGE_URL, DEFAULT_AVATAR_URL } from '@/api/env'
import { getUserInfo } from '@/api/user'
import logoSrc from '@/assets/logo-setu.webp'
import SidebarStickerIcon from '@/components/SidebarStickerIcon.vue'
import { useBreakpoint } from '@/composables/useBreakpoint'

import { useAuthStore } from '@/stores/auth'
import { safePush } from '@/utils/navigation'

const MiniPlayerBar = defineAsyncComponent(() => import('@/components/music/MiniPlayerBar.vue'))
const PlayerDrawer = defineAsyncComponent(() => import('@/components/music/PlayerDrawer.vue'))

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const { isCompact: isMobile } = useBreakpoint()

// --- 响应式状态 ---
const collapsed = ref(false)
const showMobileMenu = ref(false)

// ✅ 初始化数据：同步最新头像和昵称
async function initUserInfo() {
  try {
    const res = await getUserInfo()
    if (auth.user) {
      // ✅ 只更新有变化的字段，避免 Object.assign 触发级联响应式更新
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
  initUserInfo() // 挂载时拉取
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

// --- 菜单配置 ---
const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#f586a9', // ✅ 主色：粉色
    primaryColorHover: '#f8a2be', // ✅ 悬停色：浅粉
    primaryColorPressed: '#f26d99', // ✅ 按下色：深粉
  },
  Menu: {
    itemColorActive: 'rgba(245, 134, 169, 0.15)', // ✅ 选中背景
    itemColorActiveHover: 'rgba(245, 134, 169, 0.25)', // ✅ 选中悬停背景
    itemTextColorActive: '#f26d99', // ✅ 选中文字颜色
    itemIconColorActive: '#f26d99', // ✅ 选中图标颜色
    itemIconColorHover: '#f586a9', // ✅ 悬停图标颜色
    itemTextColorHover: '#f586a9', // ✅ 悬停文字颜色
    borderRadius: '12px',
  },
  Drawer: { bodyPadding: '0' },
}

const renderIcon = (icon: Component) => () => h(NIcon, null, { default: () => h(icon) })
const renderStickerIcon = (name: string) => () => h(SidebarStickerIcon, { name })

// ✅ 预创建 icon render 函数，避免每次 computed 重算时创建新闭包
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

// ✅ 优化后的菜单选项：使用分组折叠
const menuOptions = computed<MenuOption[]>(() => {
  const items: MenuOption[] = [
    // ✅ 核心功能
    { label: '仪表盘', key: '/dashboard', icon: iconDashboard },
    { label: 'API Key', key: '/dashboard/api-keys', icon: iconKey },

    { type: 'divider' },

    // ✅ 积分中心（折叠分组）
    {
      label: '积分中心',
      key: 'points-group',
      icon: iconCash,
      children: [
        { label: '积分抽卡', key: '/dashboard/points', icon: iconPoints },
        { label: '积分流水', key: '/dashboard/points-logs', icon: iconPointsLogs },
      ],
    },

    // ✅ 图库收藏（折叠分组）
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

    // ✅ 音乐播放器（折叠分组）
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

    // ✅ 其他功能
    { label: '开发文档', key: '/dashboard/docs', icon: iconBook },

    // ✅ 新增：我的删除申请
    { label: '我的删除申请', key: '/dashboard/my-delete-requests', icon: iconTrash },
    { label: '通知中心', key: '/dashboard/notifications', icon: iconNotifications },
  ]

  // 管理员入口
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
</script>

<template>
  <NConfigProvider :theme-overrides="themeOverrides" abstract>
    <div class="layout-root">
      <img :src="BG_IMAGE_URL" class="global-bg" alt="" aria-hidden="true" loading="lazy" decoding="async">
      <div class="global-overlay" />

      <NLayout :has-sider="!isMobile" class="main-layout">
        <NLayoutSider
          v-if="!isMobile"
          v-model:collapsed="collapsed"
          collapse-mode="width"
          :collapsed-width="64"
          :width="240"
          class="glass-sider"
          :native-scrollbar="false"
          content-style="display: flex; flex-direction: column; padding-bottom: 120px;"
        >
          <div class="logo-area" :class="{ collapsed }">
            <div class="logo-box">
              <img :src="logoSrc" class="logo-img" alt="雪涼云" decoding="async">
            </div>
            <transition name="fade">
              <span v-show="!collapsed" class="logo-text">雪涼云</span>
            </transition>
          </div>

          <NMenu
            :value="activeKey"
            :collapsed="collapsed"
            :collapsed-width="64"
            :collapsed-icon-size="22"
            :options="menuOptions"
            :indent="24"
            class="glass-menu"
            @update:value="handleMenuSelect"
          />
        </NLayoutSider>

        <NDrawer v-model:show="showMobileMenu" placement="left" :width="260">
          <NDrawerContent body-content-style="padding: 0;" class="mobile-drawer-glass">
            <div class="logo-area">
              <div class="logo-box">
                <img :src="logoSrc" class="logo-img" alt="雪涼云" decoding="async">
              </div>
              <span class="logo-text">雪涼云</span>
            </div>
            <NMenu
              :value="activeKey"
              :options="menuOptions"
              :indent="24"
              @update:value="handleMenuSelect"
            />
          </NDrawerContent>
        </NDrawer>

        <NLayout class="content-layout">
          <NLayoutHeader class="glass-header">
            <div class="header-left">
              <button class="collapse-btn" :aria-label="collapsed ? '展开侧边栏' : '收起侧边栏'" @click="handleToggle">
                <NIcon size="24">
                  <MenuOutline v-if="isMobile || collapsed" />
                  <CloseOutline v-else />
                </NIcon>
              </button>
              <span class="page-title">控制台</span>
            </div>

            <div class="header-right">
              <NDropdown :options="userMenu" trigger="click" @select="handleUserMenuSelect">
                <div class="user-trigger">
                  <NAvatar round :size="isMobile ? 32 : 36" :src="avatarUrl" class="user-avatar" />
                  <div v-if="!isMobile" class="user-info">
                    <span class="username">{{ displayName }}</span>
                    <NIcon size="14">
                      <ChevronDown />
                    </NIcon>
                  </div>
                </div>
              </NDropdown>
            </div>
          </NLayoutHeader>

          <NLayoutContent class="glass-content" :native-scrollbar="false">
            <div class="router-view-wrapper">
              <router-view v-slot="{ Component: RouteComponent }">
                <transition name="fade-slide">
                  <component :is="RouteComponent" :key="$route.path" />
                </transition>
              </router-view>
            </div>
          </NLayoutContent>
        </NLayout>
      </NLayout>

      <MiniPlayerBar />
      <PlayerDrawer />
    </div>
  </NConfigProvider>
</template>

<style scoped>
/* 你的原有样式完全保留 */
.layout-root {
  height: 100vh;
  height: 100dvh;
  position: relative;
  overflow: hidden;
  overscroll-behavior: none;
  --n-color: transparent !important;
  background:
    radial-gradient(circle at 18% 8%, rgba(106, 168, 255, 0.2), transparent 34%),
    radial-gradient(circle at 88% 18%, rgba(245, 134, 169, 0.24), transparent 30%),
    linear-gradient(135deg, #f8fbff 0%, #fff7fb 55%, #f6fbff 100%);
}

.global-bg {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  object-fit: cover; z-index: 0;
  opacity: 0.22;
  filter: saturate(0.95) brightness(1.08);
}

.global-overlay {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.86) 0%, rgba(255, 255, 255, 0.68) 45%, rgba(255, 247, 251, 0.78) 100%);
  z-index: 1;
}

.main-layout, .content-layout {
  background: transparent !important;
  z-index: 2;
  height: 100%;
  min-height: 0;
}

.glass-sider {
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.78) 0%,
    rgba(255, 247, 251, 0.62) 56%,
    rgba(244, 250, 255, 0.72) 100%
  ) !important;
  backdrop-filter: blur(20px) saturate(150%);
  -webkit-backdrop-filter: blur(20px) saturate(150%);
  border-right: 1px solid rgba(255, 255, 255, 0.78);
  box-shadow:
    10px 0 32px rgba(31, 41, 55, 0.06),
    inset -1px 0 0 rgba(255, 255, 255, 0.66);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform: translateZ(0);
}

:deep(.mobile-drawer-glass) {
  background: linear-gradient(
    145deg,
    rgba(255, 255, 255, 0.4) 0%,
    rgba(255, 240, 245, 0.2) 100%
  ) !important;
  backdrop-filter: saturate(180%) brightness(1.1);
  -webkit-backdrop-filter: saturate(180%) brightness(1.1);
  border-right: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: inset -1px 0 2px rgba(255, 255, 255, 0.4);
}

.logo-area {
  height: 70px; display: flex; align-items: center; padding: 0 24px; gap: 12px;
  transition: all 0.3s ease; overflow: hidden;
}
.logo-area.collapsed { padding: 0; justify-content: center; }

.logo-box {
  width: 38px; height: 38px; border-radius: 12px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.9);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 10px 24px rgba(245, 134, 169, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.85);
  flex-shrink: 0;
}
.logo-img { width: 24px; height: 24px; object-fit: contain; }

.logo-text {
  font-size: 18px; font-weight: 700; color: #f586a9;
  background: linear-gradient(135deg, #f586a9, #fca5c8);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; white-space: nowrap;
}

.glass-header {
  height: 64px; display: flex; align-items: center; justify-content: space-between;
  padding: 0 24px;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.82) 0%,
    rgba(255, 255, 255, 0.62) 100%
  ) !important;
  backdrop-filter: blur(18px) saturate(145%);
  -webkit-backdrop-filter: blur(18px) saturate(145%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.78);
  box-shadow: 0 10px 28px rgba(31, 41, 55, 0.04);
  transition: padding 0.3s;
  transform: translateZ(0);
}

.header-left { display: flex; align-items: center; gap: 16px; }
.collapse-btn {
  display: flex; align-items: center; justify-content: center;
  width: 36px; height: 36px; border-radius: 10px; cursor: pointer; color: #4b5563; transition: all 0.2s;
  background: none; border: none; padding: 0; font: inherit;
}
.collapse-btn:hover { background: rgba(245, 134, 169, 0.12); color: #f26d99; }
.collapse-btn:active { transform: scale(0.95); }

.page-title { font-size: 16px; font-weight: 600; color: #374151; }

.user-trigger {
  display: flex; align-items: center; gap: 10px;
  padding: 4px 8px 4px 4px; border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.88);
  box-shadow: 0 8px 22px rgba(31, 41, 55, 0.06);
  cursor: pointer; transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.user-trigger:hover {
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 10px 26px rgba(245, 134, 169, 0.14);
  border-color: rgba(255, 255, 255, 0.8);
  transform: translateY(-1px);
}

.user-avatar { border: 2px solid #fff; }
.user-info { display: flex; align-items: center; gap: 6px; }
.username { font-size: 14px; color: #4b5563; font-weight: 500; }

.glass-content {
  background: transparent !important;
  min-height: 0;
  overscroll-behavior-y: contain;
  -webkit-overflow-scrolling: touch;
}

:deep(.glass-content > .n-layout-scroll-container),
:deep(.glass-content .n-scrollbar-container),
:deep(.glass-content .n-scrollbar-content) {
  overscroll-behavior-y: contain;
  -webkit-overflow-scrolling: touch;
}

.router-view-wrapper {
  padding: 28px 32px calc(96px + env(safe-area-inset-bottom, 0px)) 32px;
  min-height: 100%;
  transition: padding 0.3s;
}

@media (max-width: 768px) {
  .global-bg {
    display: none;
  }

  .global-overlay {
    background:
      radial-gradient(circle at 16% 10%, rgba(106, 168, 255, 0.12), transparent 32%),
      radial-gradient(circle at 88% 12%, rgba(245, 134, 169, 0.14), transparent 34%),
      linear-gradient(135deg, #f8fbff 0%, #fff7fb 100%);
  }

  .glass-header { padding: 0 16px; height: 56px; }
  .header-left { gap: 12px; }
  .router-view-wrapper { padding: 16px 14px calc(80px + env(safe-area-inset-bottom, 0px)); }
  .user-trigger { padding: 2px; border: none; background: transparent; }
  .page-title { font-size: 15px; }
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.fade-slide-enter-active, .fade-slide-leave-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.fade-slide-enter-from { opacity: 0; transform: translateY(10px); }
.fade-slide-leave-to { opacity: 0; transform: translateY(-10px); }

:deep(.n-menu-item-content) {
  margin: 4px 10px !important;
  border-radius: 10px !important;
}

:deep(.n-menu-item-content.n-menu-item-content--selected) {
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

:deep(.n-menu-item-content:hover .sidebar-sticker),
:deep(.n-menu-item-content.n-menu-item-content--selected .sidebar-sticker) {
  filter: saturate(1.08);
  transform: translateY(-1px) rotate(-3deg);
}
</style>
