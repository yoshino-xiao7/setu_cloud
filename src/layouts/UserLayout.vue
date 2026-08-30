<script setup lang="ts">
import {
  ChevronDown,
  CloseOutline,
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
import { defineAsyncComponent } from 'vue'
import { useUserLayout } from '@/composables/useUserLayout'

const MiniPlayerBar = defineAsyncComponent(() => import('@/components/music/MiniPlayerBar.vue'))
const PlayerDrawer = defineAsyncComponent(() => import('@/components/music/PlayerDrawer.vue'))

const {
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
} = useUserLayout()
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
  position: relative;
  overflow: hidden;
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
  font-size: 18px; font-weight: 700; color: var(--ui-primary);
  background: linear-gradient(135deg, var(--ui-primary), #fca5c8);
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
.collapse-btn:hover { background: rgba(245, 134, 169, 0.12); color: var(--ui-primary-hover); }
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
  box-shadow: 0 10px 26px var(--ui-primary-soft);
  border-color: rgba(255, 255, 255, 0.8);
  transform: translateY(-1px);
}

.user-avatar { border: 2px solid #fff; }
.user-info { display: flex; align-items: center; gap: 6px; }
.username { font-size: 14px; color: #4b5563; font-weight: 500; }

.glass-content { background: transparent !important; }

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
      radial-gradient(circle at 88% 12%, var(--ui-primary-soft), transparent 34%),
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
