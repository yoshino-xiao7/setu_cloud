<script setup lang="ts">
import { computed, ref, h } from 'vue'
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
  type MenuOption,
  type GlobalThemeOverrides
} from 'naive-ui'
import { useAuthStore } from '@/stores/auth'
import logoSrc from '@/assets/logo-setu.png'

// 图标
import {
  SpeedometerOutline,
  KeyOutline,
  PersonCircleOutline,
  InformationCircleOutline,
  LogOutOutline,
  ChevronDown,
  MenuOutline,
  CloseOutline,
  SettingsOutline // ✅ 1. 新增：设置图标，用于后台入口
} from '@vicons/ionicons5'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const collapsed = ref(false)

const toggleCollapse = () => {
  collapsed.value = !collapsed.value
}

// 主题配置 (保持不变)
const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#8b5cf6',
    primaryColorHover: '#a78bfa',
    primaryColorPressed: '#7c3aed'
  },
  Menu: {
    itemColorActive: 'rgba(139, 92, 246, 0.15)',
    itemColorActiveHover: 'rgba(139, 92, 246, 0.25)',
    itemTextColorActive: '#7c3aed',
    itemIconColorActive: '#7c3aed',
    itemIconColorHover: '#8b5cf6',
    itemTextColorHover: '#8b5cf6',
    borderRadius: '12px'
  }
}

const renderIcon = (icon: any) => {
  return () => h(NIcon, null, { default: () => h(icon) })
}

// ✅ 2. 核心修改：动态菜单配置
const menuOptions = computed<MenuOption[]>(() => {
  // 基础菜单 (所有人可见)
  const items: MenuOption[] = [
    { label: '仪表盘', key: '/dashboard', icon: renderIcon(SpeedometerOutline) },
    { label: 'API Key 管理', key: '/dashboard/api-keys', icon: renderIcon(KeyOutline) },
    { label: '个人中心', key: '/dashboard/profile', icon: renderIcon(PersonCircleOutline) },
    { label: '关于', key: '/dashboard/about', icon: renderIcon(InformationCircleOutline) }
  ]

  // 🕵️‍♂️ 权限判断：如果是管理员，追加后台入口
  // 注意：后端通常 role 1 代表管理员
  if (auth.user?.role === 1) {
    items.push(
      { type: 'divider' }, // 加一条分割线，区分开来
      {
        label: '进入管理后台',
        key: '/admin/overview', // 跳转到 Admin 路由
        icon: renderIcon(SettingsOutline)
      }
    )
  }

  return items
})

const activeKey = computed(() => route.path)

function handleMenuSelect(key: string) {
  router.push(key)
}

const userMenu = computed(() => [
  { label: '个人资料', key: 'profile', icon: renderIcon(PersonCircleOutline) },
  { type: 'divider' },
  { label: '退出登录', key: 'logout', icon: renderIcon(LogOutOutline) }
])

function handleUserMenuSelect(key: string) {
  if (key === 'profile') router.push('/dashboard/profile')
  else if (key === 'logout') {
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

      <n-layout has-sider class="main-layout">
        <n-layout-sider
          v-model:collapsed="collapsed"
          collapse-mode="width"
          :collapsed-width="64"
          :width="240"
          class="glass-sider"
          :native-scrollbar="false"
        >
          <div class="logo-area" :class="{ 'collapsed': collapsed }">
            <div class="logo-box">
              <img :src="logoSrc" class="logo-img" />
            </div>
            <transition name="fade">
              <span v-show="!collapsed" class="logo-text">Setu Cloud</span>
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

        <n-layout class="content-layout">
          <n-layout-header class="glass-header">
            <div class="header-left">
              <div class="collapse-btn" @click="toggleCollapse">
                <n-icon size="24">
                  <MenuOutline v-if="collapsed" />
                  <CloseOutline v-else />
                </n-icon>
              </div>

              <span class="page-title">控制台</span>
            </div>

            <div class="header-right">
              <n-dropdown :options="userMenu" @select="handleUserMenuSelect" trigger="click">
                <div class="user-trigger">
                  <n-avatar round :size="36" :src="avatarUrl" class="user-avatar" />
                  <div class="user-info">
                    <span class="username">{{ auth.user?.email?.split('@')[0] || 'User' }}</span>
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
/* 样式保持不变，复用你现有的即可 */
.layout-root {
  height: 100vh;
  position: relative;
  overflow: hidden;
  --n-color: transparent !important;
}

.global-bg {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  object-fit: cover; z-index: 0;
}

.global-overlay {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  z-index: 1;
}

.main-layout, .content-layout {
  background: transparent !important;
  z-index: 2;
  height: 100%;
}

.glass-sider {
  background: rgba(255, 255, 255, 0.65) !important;
  backdrop-filter: blur(20px);
  border-right: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.02);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.logo-area {
  height: 70px;
  display: flex;
  align-items: center;
  padding: 0 24px;
  gap: 12px;
  transition: all 0.3s ease;
  overflow: hidden;
}

.logo-area.collapsed {
  padding: 0;
  justify-content: center;
}

.logo-box {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
}

.logo-img { width: 24px; height: 24px; object-fit: contain; }

.logo-text {
  font-size: 18px;
  font-weight: 700;
  color: #4c1d95;
  background: linear-gradient(135deg, #6d28d9, #ec4899);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  white-space: nowrap;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

:deep(.n-menu-item-content) {
  margin: 4px 8px !important;
}

.glass-header {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background: rgba(255, 255, 255, 0.4) !important;
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.collapse-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  cursor: pointer;
  color: #4b5563;
  transition: all 0.2s;
}
.collapse-btn:hover {
  background: rgba(255, 255, 255, 0.5);
  color: #8b5cf6;
}
.collapse-btn:active {
  transform: scale(0.95);
}

.page-title {
  font-size: 16px;
  font-weight: 600;
  color: #374151;
}

.user-trigger {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 8px 4px 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: all 0.2s;
}

.user-trigger:hover {
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.user-avatar { border: 2px solid #fff; }
.username { font-size: 14px; color: #4b5563; font-weight: 500; }

.glass-content {
  background: transparent !important;
}

.router-view-wrapper {
  padding: 24px 32px;
  min-height: 100%;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>