<script setup lang="ts">
import type { GlobalThemeOverrides, MenuOption } from 'naive-ui'
import type { Component } from 'vue'
// 图标引入
import {
  ChevronDown,
  CloseOutline,
  LogOutOutline,
  MenuOutline,
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
import { computed, h, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { BG_IMAGE_URL, DEFAULT_AVATAR_URL } from '@/api/env'
import logoSrc from '@/assets/logo-setu.webp'
import SidebarStickerIcon from '@/components/SidebarStickerIcon.vue'
import { useBreakpoint } from '@/composables/useBreakpoint'

import { useAuthStore } from '@/stores/auth'
import { safePush } from '@/utils/navigation'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const { isCompact: isMobile } = useBreakpoint()

// --- 响应式状态 ---
const collapsed = ref(false)
const showMobileMenu = ref(false)

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

// --- Admin 主题配置 (粉色系) ---
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
  Drawer: {
    bodyPadding: '0',
  },
}

function renderIcon(icon: Component) {
  return () => h(NIcon, null, { default: () => h(icon) })
}

const renderStickerIcon = (name: string) => () => h(SidebarStickerIcon, { name })

// ✅ 预创建 icon render 函数，避免每次重渲染时创建新闭包
const iconGrid = renderStickerIcon('mascots')
const iconPeople = renderStickerIcon('users')
const iconShield = renderStickerIcon('shield')
const iconMusicNotes = renderStickerIcon('musicKey')
const iconTrash = renderStickerIcon('delete')
const iconCloudDownload = renderStickerIcon('cloud')
const iconImage = renderStickerIcon('imageSearch')
const iconPulse = renderStickerIcon('pulse')
const iconStorefront = renderStickerIcon('store')
const iconLogOut = renderIcon(LogOutOutline)

// ✅ 2. 更新菜单配置（无响应式依赖，使用普通常量）
const menuOptions: MenuOption[] = [
  { label: '后台概览', key: '/admin/overview', icon: iconGrid },
  { label: '用户管理', key: '/admin/users', icon: iconPeople },
  { label: '安全拦截', key: '/admin/blacklist', icon: iconShield },

  // ✅ 新增：网易云Token管理
  { label: '音乐Token', key: '/admin/music-tokens', icon: iconMusicNotes },

  // ✅ 新增：图片删除申请管理
  { label: '图片删除申请', key: '/admin/image-delete-requests', icon: iconTrash },

  // ✅ 新增：Pixiv 爬虫管理
  { label: '新增图片', key: '/admin/pixiv-crawl', icon: iconCloudDownload },

  // ✅ 图片库管理 (原图片审核+图片管理整合)
  { label: '图片库管理', key: '/admin/image-audit', icon: iconImage },

  // ✅ 新增入口：指向管理端的路由 /admin/status
  { label: '系统状态', key: '/admin/status', icon: iconPulse },

  { type: 'divider' },
  { label: '返回用户端', key: '/dashboard', icon: iconStorefront },
]

const activeKey = computed(() => route.path)

function handleMenuSelect(key: string) {
  void safePush(router, key)
  if (isMobile.value)
    showMobileMenu.value = false
}

const userMenu = [
  { label: '退出登录', key: 'logout', icon: iconLogOut },
]

function handleUserMenuSelect(key: string) {
  if (key === 'logout') {
    auth.logout().then(() => {
      return safePush(router, { name: 'login' })
    })
  }
}

const avatarUrl = computed(() => auth.avatarUrl || DEFAULT_AVATAR_URL)
</script>

<template>
  <NConfigProvider :theme-overrides="themeOverrides" abstract>
    <div class="layout-root">
      <img :src="BG_IMAGE_URL" class="global-bg" alt="" aria-hidden="true">
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
        >
          <div class="logo-area" :class="{ collapsed }">
            <div class="logo-box admin-logo-box">
              <img :src="logoSrc" class="logo-img" alt="雪涼云">
            </div>
            <transition name="fade">
              <span v-show="!collapsed" class="logo-text">雪涼云 Admin</span>
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
          <NDrawerContent class="mobile-drawer-glass" body-content-style="padding: 0;">
            <div class="mobile-logo-area">
              <div class="logo-box admin-logo-box">
                <img :src="logoSrc" class="logo-img" alt="雪涼云">
              </div>
              <span class="logo-text">雪涼云 Admin</span>
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
              <button class="collapse-btn" type="button" :aria-label="collapsed ? '展开侧栏' : '收起侧栏'" @click="handleToggle">
                <NIcon size="24">
                  <MenuOutline v-if="isMobile || collapsed" />
                  <CloseOutline v-else />
                </NIcon>
              </button>
              <span class="page-title">系统管理后台</span>
            </div>

            <div class="header-right">
              <NDropdown :options="userMenu" trigger="click" @select="handleUserMenuSelect">
                <div class="user-trigger">
                  <NAvatar round :size="isMobile ? 32 : 36" :src="avatarUrl" class="user-avatar" />
                  <div v-if="!isMobile" class="user-info">
                    <span class="username">管理员</span>
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
    </div>
  </NConfigProvider>
</template>

<style scoped>
/* ================= 基础布局 ================= */
.layout-root {
  height: 100vh; position: relative; overflow: hidden;
  --n-color: transparent !important;
  background:
    radial-gradient(circle at 16% 10%, rgba(245, 134, 169, 0.12), transparent 30%),
    linear-gradient(135deg, #fff7fa 0%, #f8fbff 48%, #ffffff 100%);
}

.global-bg {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  object-fit: cover; z-index: 0;
  opacity: 0.1;
}

.global-overlay {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(255, 255, 255, 0.78);
  z-index: 1;
}

.main-layout, .content-layout {
  background: transparent !important; z-index: 2; height: 100%;
}

/* ================= 侧边栏与抽屉 ================= */
.glass-sider {
  background: rgba(255, 255, 255, 0.96) !important;
  border-right: 1px solid rgba(245, 134, 169, 0.14);
  box-shadow: 4px 0 24px rgba(15, 23, 42, 0.04);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform: translateZ(0);
}

:deep(.mobile-drawer-glass) {
  background: #fff !important;
  border-right: 1px solid rgba(245, 134, 169, 0.14);
}

/* ================= Logo 区域 ================= */
.logo-area {
  height: 70px;
  display: flex; align-items: center; padding: 0 24px; gap: 12px;
  transition: all 0.3s ease; overflow: hidden;
}
.logo-area.collapsed { padding: 0; justify-content: center; }

.mobile-logo-area {
  height: 70px;
  display: flex; align-items: center; padding: 0 20px; gap: 12px;
  border-bottom: 1px solid rgba(245, 134, 169, 0.1);
  margin-bottom: 4px;
}

.logo-box {
  width: 36px; height: 36px; min-width: 36px; min-height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0.1) 100%);
  border: 1px solid rgba(255, 255, 255, 0.6);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8);
  flex-shrink: 0;
}

.admin-logo-box {
  background: rgba(245, 134, 169, 0.1);
  border: 1px solid rgba(245, 134, 169, 0.2);
}

.logo-img {
  width: 24px !important; height: 24px !important;
  object-fit: contain; display: block;
}

.logo-text {
  font-size: 18px; font-weight: 700; color: #5b21b6; white-space: nowrap;
}

/* ================= Header ================= */
.glass-header {
  height: 64px; display: flex; align-items: center; justify-content: space-between;
  padding: 0 24px;
  background: rgba(255, 255, 255, 0.96) !important;
  border-bottom: 1px solid rgba(245, 134, 169, 0.12);
  box-shadow: 0 6px 20px rgba(15, 23, 42, 0.03);
  transition: padding 0.3s;
  transform: translateZ(0); /* 开启硬件加速 */
}
.header-left { display: flex; align-items: center; gap: 16px; }

.collapse-btn {
  display: flex; align-items: center; justify-content: center;
  width: 36px; height: 36px; border-radius: 8px; cursor: pointer;
  color: #4b5563; transition: all 0.2s;
  background: none; border: none; padding: 0; font: inherit;
}
.collapse-btn:hover { background: rgba(255, 255, 255, 0.5); color: #f586a9; }
.collapse-btn:focus-visible { outline: 2px solid #f586a9; outline-offset: 2px; }

.page-title { font-size: 16px; font-weight: 600; color: #374151; }

.user-trigger {
  display: flex; align-items: center; gap: 10px;
  padding: 4px 8px 4px 4px; border-radius: 999px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.1));
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.3);
  cursor: pointer; transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.user-trigger:hover {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0.2));
  box-shadow: 0 4px 12px rgba(245, 134, 169, 0.15), inset 0 1px 2px rgba(255, 255, 255, 0.6);
  border-color: rgba(255, 255, 255, 0.8);
  transform: translateY(-1px);
}
.user-avatar { border: 2px solid #fff; }
.username { font-size: 14px; color: #4b5563; font-weight: 500; }

/* ================= Content ================= */
.glass-content { background: transparent !important; }
.router-view-wrapper {
  padding: 24px 32px calc(96px + env(safe-area-inset-bottom, 0px));
  min-height: 100%;
  transition: padding 0.3s;
}

:deep(.admin-page),
:deep(.page-container) {
  color: #1f2937;
}

:deep(.glass-card) {
  background: #fff !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  border: 1px solid rgba(229, 231, 235, 0.92) !important;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06) !important;
}

:deep(.page-header),
:deep(.header-section) {
  background:
    radial-gradient(circle at 92% 10%, rgba(96, 165, 250, 0.12), transparent 34%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(255, 247, 250, 0.96));
  border: 1px solid rgba(229, 231, 235, 0.92);
  border-radius: 18px;
  padding: 22px 24px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.04);
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.fade-slide-enter-active, .fade-slide-leave-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.fade-slide-enter-from { opacity: 0; transform: translateY(10px); }
.fade-slide-leave-to { opacity: 0; transform: translateY(-10px); }
:deep(.n-menu-item-content) { margin: 4px 8px !important; }

:deep(.n-menu-item-content:hover .sidebar-sticker),
:deep(.n-menu-item-content.n-menu-item-content--selected .sidebar-sticker) {
  filter: saturate(1.08);
  transform: translateY(-1px) rotate(-3deg);
}

@media (max-width: 768px) {
  .global-bg {
    display: none;
  }

  .global-overlay {
    background:
      radial-gradient(circle at 16% 10%, rgba(245, 134, 169, 0.1), transparent 32%),
      linear-gradient(135deg, #fff7fa 0%, #f8fbff 48%, #ffffff 100%);
  }

  .glass-header { padding: 0 16px; height: 56px; }
  .header-left { gap: 12px; }
  .router-view-wrapper { padding: 16px 14px calc(96px + env(safe-area-inset-bottom, 0px)); }
  .user-trigger { padding: 2px; border: none; background: transparent; }
  .page-title { font-size: 15px; }
}
</style>
