<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  NButton, NIcon, NTag, NEmpty, NSkeleton, NPagination, useMessage, NImage, NAvatar
} from 'naive-ui'
import {
  ShareSocialOutline,
  EyeOutline,
  ImageOutline,
  LockClosedOutline,
  GlobeOutline,
  PersonOutline
} from '@vicons/ionicons5'
import type { CollectionInfoDTO } from '@/api/collections'
import { getCollectionInfo, getCollectionItems, buildPublicCollectionUrl } from '@/api/collections'

const route = useRoute()
const message = useMessage()

const id = computed(() => Number(route.params.id))

// 兼容你的 http.ts 解包
const unwrap = (res: any) => {
  if (res && res.data && res.data.data !== undefined) return res.data.data
  if (res && res.data !== undefined) return res.data
  return res
}

const loadingInfo = ref(true)
const info = ref<CollectionInfoDTO | null>(null)

const loading = ref(true)
const list = ref<any[]>([])
const pagination = reactive({ page: 1, size: 24, total: 0 })

const isPublic = computed(() => Number(info.value?.visibility ?? 0) === 1)

// ✅ 昵称兜底：优先 ownerNickname，没有就显示 用户#userId
const ownerName = computed(() => {
  const nick = info.value?.ownerNickname?.trim()
  if (nick) return nick
  const uid = info.value?.userId
  return uid ? `用户#${uid}` : '用户'
})

// ✅ 头像兜底：如果是相对路径，拼上域名
const ownerAvatar = computed(() => {
  const url = info.value?.ownerAvatarUrl
  if (!url) return ''
  if (url.startsWith('http')) return url
  return `${location.origin}${url}`
})

const fetchInfo = async () => {
  loadingInfo.value = true
  try {
    const res: any = await getCollectionInfo(id.value)
    const data = unwrap(res)
    info.value = data || null
    // 你可以临时打开看看后端到底回了啥
    // console.log('[collection info]=', data)
  } catch (e: any) {
    info.value = null
    message.error('收藏夹不可访问（可能是私有或不存在）')
  } finally {
    loadingInfo.value = false
  }
}

const fetchItems = async () => {
  loading.value = true
  try {
    const res: any = await getCollectionItems(id.value, {
      page: pagination.page,
      size: pagination.size
    })
    const data = unwrap(res) || {}
    const items = data.items || []
    pagination.total = data.total || 0

    list.value = items.map((it: any) => {
      const img = it.image || {}
      return {
        pid: it.pid ?? img.pid,
        p: it.p ?? img.p ?? 0,
        title: img.title || '无标题',
        author: img.author || '未知画师',
        url: img.urlRegular || img.urlSmall || img.urlOriginal || '',
        originalUrl: img.urlOriginal || ''
      }
    })
  } catch (e) {
    list.value = []
    pagination.total = 0
    message.error('加载收藏夹内容失败（可能是私有）')
  } finally {
    loading.value = false
  }
}

const handlePageChange = async (page: number) => {
  pagination.page = page
  await fetchItems()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const handleCopyShare = async () => {
  if (!info.value) return
  if (!isPublic.value) return message.warning('私有收藏夹无法分享，请先设置公开')
  const shareUrl = buildPublicCollectionUrl(id.value)
  await navigator.clipboard.writeText(shareUrl)
  message.success('分享链接已复制')
}

const handleViewOriginal = (url: string) => {
  if (url) window.open(url, '_blank')
  else message.warning('原图链接无效')
}

const reload = async () => {
  pagination.page = 1
  await fetchInfo()
  if (info.value) await fetchItems()
}

onMounted(reload)
watch(id, reload)
</script>

<template>
  <div class="page">
    <div class="header">
      <div class="title-row">
        <h2 class="title">
          <span v-if="loadingInfo">加载中…</span>
          <span v-else>{{ info?.name || '公开收藏夹' }}</span>
        </h2>

        <n-tag
          v-if="!loadingInfo && info"
          size="small"
          round
          :bordered="false"
          :type="isPublic ? 'success' : 'warning'"
        >
          <template #icon>
            <n-icon :size="14">
              <GlobeOutline v-if="isPublic" />
              <LockClosedOutline v-else />
            </n-icon>
          </template>
          {{ isPublic ? '公开' : '私有' }}
        </n-tag>
      </div>

      <!-- ✅ 分享者信息（一定显示：头像有就用头像，没有就用 icon） -->
      <div v-if="!loadingInfo && info" class="owner-row">
        <n-avatar v-if="ownerAvatar" :src="ownerAvatar" round :size="32" />
        <div v-else class="owner-fallback">
          <n-icon size="18"><PersonOutline /></n-icon>
        </div>

        <div class="owner-text">
          <div class="owner-name">{{ ownerName }}</div>
          <div class="owner-sub">分享了一个收藏夹</div>
        </div>
      </div>

      <div class="sub-row" v-if="!loadingInfo && info">
        <span class="sub">共 {{ info?.itemCount ?? pagination.total }} 张</span>
        <span class="dot">·</span>
        <span class="sub">ID: {{ id }}</span>

        <div class="actions">
          <n-button v-if="isPublic" secondary size="small" @click="handleCopyShare">
            <template #icon><n-icon><ShareSocialOutline /></n-icon></template>
            分享
          </n-button>
        </div>
      </div>
    </div>

    <div v-if="!loadingInfo && !info" class="empty">
      <n-empty description="收藏夹不可访问（可能是私有或不存在）" size="large">
        <template #icon><n-icon><ImageOutline /></n-icon></template>
      </n-empty>
    </div>

    <div v-else class="content">
      <div v-if="loading && list.length === 0" class="loading-grid">
        <div v-for="n in 12" :key="n" class="skeleton-card">
          <n-skeleton height="100%" width="100%" :sharp="false" style="border-radius: 16px;" />
        </div>
      </div>

      <div v-else-if="!loading && list.length === 0" class="empty">
        <n-empty description="这个收藏夹是空的" size="large">
          <template #icon><n-icon><ImageOutline /></n-icon></template>
        </n-empty>
      </div>

      <div v-else class="grid">
        <div v-for="item in list" :key="`${item.pid}-${item.p}`" class="card">
          <div class="img-box">
            <n-image
              lazy
              :src="item.url"
              object-fit="cover"
              :preview-disabled="true"
              :img-props="{ referrerpolicy: 'no-referrer' }"
            />
            <div class="overlay">
              <n-button circle color="#fff" class="action-btn" @click="handleViewOriginal(item.originalUrl)">
                <template #icon><n-icon color="#333"><EyeOutline /></n-icon></template>
              </n-button>
            </div>
          </div>
          <div class="info">
            <div class="t" :title="item.title">{{ item.title }}</div>
            <div class="m">PID: {{ item.pid }} · P{{ item.p }}</div>
          </div>
        </div>
      </div>

      <div class="pager" v-if="pagination.total > 0">
        <n-pagination
          v-model:page="pagination.page"
          :item-count="pagination.total"
          :page-size="pagination.size"
          :on-update:page="handlePageChange"
          size="large"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.page{ padding:32px 14px 70px; max-width:1200px; margin:0 auto; }
.header{ text-align:center; margin-bottom:18px; }
.title-row{ display:flex; justify-content:center; align-items:center; gap:10px; flex-wrap:wrap; }
.title{ margin:0; font-size:26px; font-weight:900; color:#1f2937; }

.owner-row{
  margin-top: 14px;
  display:flex;
  justify-content:center;
  align-items:center;
  gap:10px;
}
.owner-fallback{
  width:32px; height:32px; border-radius:50%;
  display:flex; align-items:center; justify-content:center;
  background: rgba(0,0,0,0.06);
  color:#6b7280;
}
.owner-text{ text-align:left; }
.owner-name{ font-weight:800; color:#374151; font-size:14px; line-height:1.1; }
.owner-sub{ margin-top:2px; font-size:12px; color:#9ca3af; }

.sub-row{ margin-top:10px; display:flex; justify-content:center; align-items:center; gap:10px; flex-wrap:wrap; }
.sub{ color:#6b7280; font-size:13px; }
.dot{ opacity:.5; }
.actions{ margin-left: 6px; }

.loading-grid, .grid{
  display:grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap:14px;
}
.skeleton-card{ aspect-ratio: 2/3; overflow:hidden; border-radius:16px; }

.card{ border-radius:16px; overflow:hidden; border:1px solid rgba(0,0,0,0.06); background: rgba(255,255,255,0.65); backdrop-filter: blur(12px); }
.img-box{ position:relative; aspect-ratio:2/3; background:#f3f4f6; }
:deep(.n-image img){ width:100%; height:100%; object-fit:cover; }
.overlay{
  position:absolute; inset:0;
  display:flex; align-items:center; justify-content:center;
  background: rgba(0,0,0,0.18);
  opacity:0; transition: opacity .2s;
}
.card:hover .overlay{ opacity:1; }
.action-btn{ box-shadow:0 8px 18px rgba(0,0,0,0.18); }

.info{ padding:10px 12px 12px; text-align:left; }
.t{ font-weight:800; color:#374151; font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.m{ margin-top:6px; font-size:12px; color:#6b7280; }

.pager{ margin-top:18px; display:flex; justify-content:center; }
.empty{ min-height: 360px; display:flex; align-items:center; justify-content:center; }
</style>
