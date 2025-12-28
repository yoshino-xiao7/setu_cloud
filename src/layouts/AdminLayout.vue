<script setup lang="ts">
import { computed, ref, h, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  NLayout,
  NLayoutSider,
  NLayoutHeader,
  NLayoutContent,
  NMenu,
  NDropdown,
  NAvatar,
  NIcon,
  NConfigProvider,
  NDrawer,
  NDrawerContent,
  type MenuOption,
  type GlobalThemeOverrides
} from 'naive-ui'
import { useAuthStore } from '@/stores/auth'
import logoSrc from '@/assets/logo-setu.png'

// 图标引入
import {
  GridOutline,
  PeopleOutline,
  ShieldCheckmarkOutline,
  LogOutOutline,
  ChevronDown,
  MenuOutline,
  CloseOutline,
  StorefrontOutline,
  PulseOutline, // ✅ 1. 确认已引入脉搏图标
  MusicalNotesOutline // ✅ 新增：音乐图标
} from '@vicons/ionicons5'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

// --- 响应式状态 ---
const collapsed = ref(false)
const isMobile = ref(false)
const showMobileMenu = ref(false)

// 检测屏幕宽度
const checkMobile = () => {
  const isMobileNow = window.innerWidth <= 768
  isMobile.value = isMobileNow
  if (isMobileNow) {
    collapsed.value = false
  }
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

const handleToggle = () => {
  if (isMobile.value) {
    showMobileMenu.value = true
  } else {
    collapsed.value = !collapsed.value
  }
}

// --- Admin 主题配置 (粉色系) ---
const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#f586a9',
    primaryColorHover: '#f8a2be',
    primaryColorPressed: '#f26d99'
  },
  Menu: {
    itemColorActive: 'rgba(245, 134, 169, 0.15)',
    itemColorActiveHover: 'rgba(245, 134, 169, 0.25)',
    itemTextColorActive: '#f26d99',
    itemIconColorActive: '#f26d99',
    itemIconColorHover: '#f586a9',
    itemTextColorHover: '#f586a9',
    borderRadius: '12px'
  },
  Drawer: {
    bodyPadding: '0'
  }
}

const renderIcon = (icon: any) => {
  return () => h(NIcon, null, { default: () => h(icon) })
}

// ✅ 2. 更新菜单配置
const menuOptions = computed<MenuOption[]>(() => [
  { label: '后台概览', key: '/admin/overview', icon: renderIcon(GridOutline) },
  { label: '用户管理', key: '/admin/users', icon: renderIcon(PeopleOutline) },
  { label: '安全拦截', key: '/admin/blacklist', icon: renderIcon(ShieldCheckmarkOutline) },
  
  // ✅ 新增：网易云Token管理
  { label: '音乐Token', key: '/admin/music-tokens', icon: renderIcon(MusicalNotesOutline) },

  // ✅ 新增入口：指向管理端的路由 /admin/status
  { label: '系统状态', key: '/admin/status', icon: renderIcon(PulseOutline) },

  { type: 'divider' },
  { label: '返回用户端', key: '/dashboard', icon: renderIcon(StorefrontOutline) }
])

const activeKey = computed(() => route.path)

function handleMenuSelect(key: string) {
  router.push(key)
  if (isMobile.value) showMobileMenu.value = false
}

const userMenu = computed(() => [
  { label: '退出登录', key: 'logout', icon: renderIcon(LogOutOutline) }
])

function handleUserMenuSelect(key: string) {
  if (key === 'logout') {
    auth.logout()
    router.push({ name: 'login' })
  }
}

const avatarUrl = computed(() => auth.avatarUrl || 'https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg')
</script>

<template>
  <n-config-provider :theme-overrides="themeOverrides" abstract>
    <div class="layout-root">

      <img src="https://img.yukiryou.icu/pic?img=ua" class="global-bg" alt="bg" />
      <div class="global-overlay"></div>

      <n-layout :has-sider="!isMobile" class="main-layout">

        <n-layout-sider
          v-if="!isMobile"
          v-model:collapsed="collapsed"
          collapse-mode="width"
          :collapsed-width="64"
          :width="240"
          class="glass-sider"
          :native-scrollbar="false"
        >
          <div class="logo-area" :class="{ 'collapsed': collapsed }">
            <div class="logo-box admin-logo-box">
              <img :src="logoSrc" class="logo-img" alt="logo" />
            </div>
            <transition name="fade">
              <span v-show="!collapsed" class="logo-text">Setu Admin</span>
            </transition>
          </div>

          <n-menu
            :value="activeKey"
            :collapsed="collapsed"
            :collapsed-width="64"
            :collapsed-icon-size="22"
            :options="menuOptions"
            :indent="24"
            @update:value="handleMenuSelect"
            class="glass-menu"
          />
        </n-layout-sider>

        <n-drawer v-model:show="showMobileMenu" placement="left" :width="260">
          <n-drawer-content class="mobile-drawer-glass" body-content-style="padding: 0;">
            <div class="mobile-logo-area">
              <div class="logo-box admin-logo-box">
                <img :src="logoSrc" class="logo-img" alt="logo" />
              </div>
              <span class="logo-text">Setu Admin</span>
            </div>

            <n-menu
              :value="activeKey"
              :options="menuOptions"
              :indent="24"
              @update:value="handleMenuSelect"
            />
          </n-drawer-content>
        </n-drawer>

        <n-layout class="content-layout">
          <n-layout-header class="glass-header">
            <div class="header-left">
              <div class="collapse-btn" @click="handleToggle">
                <n-icon size="24">
                  <MenuOutline v-if="isMobile || collapsed" />
                  <CloseOutline v-else />
                </n-icon>
              </div>
              <span class="page-title">系统管理后台</span>
            </div>

            <div class="header-right">
              <n-dropdown :options="userMenu" @select="handleUserMenuSelect" trigger="click">
                <div class="user-trigger">
                  <n-avatar round :size="isMobile ? 32 : 36" :src="avatarUrl" class="user-avatar" />
                  <div v-if="!isMobile" class="user-info">
                    <span class="username">管理员</span>
                    <n-icon size="14"><ChevronDown /></n-icon>
                  </div>
                </div>
              </n-dropdown>
            </div>
          </n-layout-header>

          <n-layout-content class="glass-content" :native-scrollbar="false">
            <div class="router-view-wrapper">
              <router-view v-slot="{ Component }">
                <transition name="fade-slide" mode="out-in">
                  <component :is="Component" />
                </transition>
              </router-view>
            </div>
          </n-layout-content>
        </n-layout>
      </n-layout>
    </div>
  </n-config-provider>
</template>

<style scoped>
/* ================= 基础布局 ================= */
.layout-root {
  height: 100vh; position: relative; overflow: hidden;
  --n-color: transparent !important;
}

.global-bg {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  object-fit: cover; z-index: 0;
}

.global-overlay {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px); z-index: 1;
}

.main-layout, .content-layout {
  background: transparent !important; z-index: 2; height: 100%;
}

/* ================= 侧边栏与抽屉 ================= */
.glass-sider {
  background: rgba(255, 255, 255, 0.7) !important;
  backdrop-filter: blur(20px);
  border-right: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.02);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

:deep(.mobile-drawer-glass) {
  background: rgba(255, 255, 255, 0.85) !important;
  backdrop-filter: blur(20px);
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
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
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
  background: rgba(255, 255, 255, 0.45) !important;
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  transition: padding 0.3s;
}
.header-left { display: flex; align-items: center; gap: 16px; }

.collapse-btn {
  display: flex; align-items: center; justify-content: center;
  width: 36px; height: 36px; border-radius: 8px; cursor: pointer;
  color: #4b5563; transition: all 0.2s;
}
.collapse-btn:hover { background: rgba(255, 255, 255, 0.5); color: #f586a9; }

.page-title { font-size: 16px; font-weight: 600; color: #374151; }

.user-trigger {
  display: flex; align-items: center; gap: 10px;
  padding: 4px 8px 4px 4px; border-radius: 999px;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.6);
  cursor: pointer; transition: all 0.2s;
}
.user-trigger:hover { background: rgba(255, 255, 255, 0.9); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); }
.user-avatar { border: 2px solid #fff; }
.username { font-size: 14px; color: #4b5563; font-weight: 500; }

/* ================= Content ================= */
.glass-content { background: transparent !important; }
.router-view-wrapper { padding: 24px 32px; min-height: 100%; transition: padding 0.3s; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.fade-slide-enter-active, .fade-slide-leave-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.fade-slide-enter-from { opacity: 0; transform: translateY(10px); }
.fade-slide-leave-to { opacity: 0; transform: translateY(-10px); }
:deep(.n-menu-item-content) { margin: 4px 8px !important; }

@media (max-width: 768px) {
  .glass-header { padding: 0 16px; height: 56px; }
  .header-left { gap: 12px; }
  .router-view-wrapper { padding: 16px; }
  .user-trigger { padding: 2px; border: none; background: transparent; }
  .page-title { font-size: 15px; }
}
</style>