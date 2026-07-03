import type { MessageApi } from 'naive-ui'
import type { SetuImageItem } from '@/api/setu'
import { ref } from 'vue'

export interface PointsCallDeleteRequestImageData {
  pid: number
  p: number
  title?: string
  author?: string
  thumbnailUrl?: string
}

export interface UsePointsCallDeleteRequestOptions {
  getThumbnailUrl: (item: SetuImageItem) => string
  message: MessageApi
}

export function usePointsCallDeleteRequest(options: UsePointsCallDeleteRequestOptions) {
  const deleteRequestModalVisible = ref(false)
  const deleteRequestImageData = ref<PointsCallDeleteRequestImageData | null>(null)

  function openDeleteRequest(item: SetuImageItem) {
    deleteRequestImageData.value = {
      pid: item.pid,
      p: item.p ?? 0,
      title: item.title,
      author: item.author,
      thumbnailUrl: options.getThumbnailUrl(item),
    }
    deleteRequestModalVisible.value = true
  }

  function onDeleteRequestSuccess() {
    options.message.success('申请已提交，请在"我的删除申请"中查看进度')
  }

  return {
    deleteRequestImageData,
    deleteRequestModalVisible,
    onDeleteRequestSuccess,
    openDeleteRequest,
  }
}
