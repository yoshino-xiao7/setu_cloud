<script setup lang="ts">
import {
  CheckmarkDoneOutline,
  MailOpenOutline,
  NotificationsOutline,
  RefreshOutline,
} from '@vicons/ionicons5'
import {
  NBadge,
  NButton,
  NCard,
  NEmpty,
  NIcon,
  NPagination,
  NSpace,
  NSpin,
  NSwitch,
  NTag,
} from 'naive-ui'
import { useNotificationsView } from '@/composables/useNotificationsView'
import { formatDate } from '@/utils/dateFormat'

const {
  actionLoading,
  getTargetText,
  getTypeMeta,
  handleNotificationClick,
  handleUnreadSwitch,
  list,
  loadNotifications,
  loading,
  markAllRead,
  page,
  pageCount,
  pageSize,
  total,
  unreadCount,
  unreadOnly,
} = useNotificationsView()
</script>

<template>
  <div class="notifications-page">
    <div class="page-header">
      <div>
        <h1>
          <NIcon size="28" color="#f586a9">
            <NotificationsOutline />
          </NIcon>
          通知中心
          <NBadge v-if="unreadCount > 0" :value="unreadCount" type="warning" />
        </h1>
        <p>查看投稿审核、删除申请和图片审核相关通知</p>
      </div>
      <NButton secondary :loading="loading" @click="loadNotifications">
        <template #icon>
          <NIcon><RefreshOutline /></NIcon>
        </template>
        刷新
      </NButton>
    </div>

    <NCard :bordered="false" class="toolbar-card">
      <div class="toolbar">
        <NSpace align="center">
          <span>只看未读</span>
          <NSwitch v-model:value="unreadOnly" @update:value="handleUnreadSwitch" />
        </NSpace>
        <NButton
          type="primary"
          secondary
          :loading="actionLoading"
          :disabled="unreadCount === 0"
          @click="markAllRead"
        >
          <template #icon>
            <NIcon><CheckmarkDoneOutline /></NIcon>
          </template>
          全部已读
        </NButton>
      </div>
    </NCard>

    <NCard :bordered="false" class="list-card">
      <NSpin :show="loading">
        <div v-if="list.length > 0" class="notification-list">
          <button
            v-for="item in list"
            :key="item.id"
            class="notification-item"
            :class="{ unread: !item.read }"
            type="button"
            @click="handleNotificationClick(item)"
          >
            <div class="notification-icon">
              <NIcon size="22">
                <MailOpenOutline />
              </NIcon>
            </div>
            <div class="notification-body">
              <div class="notification-head">
                <div class="notification-title">
                  {{ item.title }}
                </div>
                <NTag :type="getTypeMeta(item.type).type" size="small" bordered>
                  {{ getTypeMeta(item.type).label }}
                </NTag>
              </div>
              <p>{{ item.content }}</p>
              <div class="notification-meta">
                <span>{{ formatDate(item.createdAt) }}</span>
                <span v-if="getTargetText(item)">{{ getTargetText(item) }}</span>
                <span>{{ item.read ? '已读' : '未读' }}</span>
              </div>
            </div>
          </button>
        </div>
        <div v-else class="empty-box">
          <NEmpty description="暂无通知" />
        </div>
      </NSpin>

      <div v-if="total > pageSize" class="pagination-wrap">
        <NPagination
          v-model:page="page"
          :page-count="pageCount"
          @update:page="loadNotifications"
        />
      </div>
    </NCard>
  </div>
</template>

<style scoped>
.notifications-page {
  max-width: 980px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.page-header h1 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 6px;
  color: #263247;
  font-size: 24px;
}

.page-header p {
  margin: 0;
  color: #64748b;
}

.toolbar-card,
.list-card {
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.72);
}

.toolbar-card {
  margin-bottom: 14px;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.notification-list {
  display: grid;
  gap: 10px;
}

.notification-item {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 12px;
  width: 100%;
  padding: 14px;
  text-align: left;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.72);
  cursor: pointer;
}

.notification-item.unread {
  border-color: rgba(245, 134, 169, 0.36);
  background: rgba(255, 247, 251, 0.86);
}

.notification-icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 8px;
  color: var(--ui-primary-hover);
  background: var(--ui-primary-soft);
}

.notification-body {
  min-width: 0;
}

.notification-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.notification-title {
  min-width: 0;
  font-weight: 700;
  color: #263247;
  overflow-wrap: anywhere;
}

.notification-body p {
  margin: 8px 0;
  color: #475569;
  line-height: 1.6;
}

.notification-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  color: #94a3b8;
  font-size: 12px;
}

.empty-box {
  display: grid;
  min-height: 260px;
  place-items: center;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

@media (max-width: 640px) {
  .page-header,
  .toolbar,
  .notification-head {
    align-items: stretch;
    flex-direction: column;
  }

  .notification-item {
    grid-template-columns: 1fr;
  }
}
</style>
