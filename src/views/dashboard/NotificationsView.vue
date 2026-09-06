<script setup lang="ts">
import {
  CheckmarkDoneOutline,
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
} from 'naive-ui'
import { UiBoard, UiRecordBoard, UiRecordCard } from '@/components/ui'
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
  <UiBoard class="notifications-page">
    <div class="board-page-header">
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
        <UiRecordBoard v-if="list.length > 0" :items="list" :item-key="item => item.id">
          <template #default="{ item }">
            <UiRecordCard :headline="item.title" :supporting="item.content" :status="{ tone: item.read ? 'muted' : 'brand', text: item.read ? '已读' : '未读' }" :fields="[{ name: '时间', value: formatDate(item.createdAt), numeric: false }, { name: '通知类型', value: getTypeMeta(item.type).label, numeric: false }, { name: '关联内容', value: getTargetText(item), numeric: false }]" :on-activate="() => handleNotificationClick(item)" />
          </template>
        </UiRecordBoard>
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
  </UiBoard>
</template>

<style scoped>
.notifications-page {
  max-width: 980px;
  margin: 0 auto;
}

.board-page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.board-page-header h1 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 6px;
  color: var(--board-text);
  font-size: 24px;
}

.board-page-header p {
  margin: 0;
  color: var(--board-text-muted);
}

.toolbar-card,
.list-card {
  border-radius: 8px;
  background: var(--board-surface);
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
  .board-page-header,
  .toolbar {
    align-items: stretch;
    flex-direction: column;
  }
}

.board-page-header { background: var(--board-surface); color: var(--board-text); flex-wrap: wrap; }

.list-card, .toolbar-card, .header { background: var(--board-surface); color: var(--board-text); }
</style>
