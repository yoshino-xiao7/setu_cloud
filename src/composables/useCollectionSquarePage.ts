import type { SquareCollectionDTO } from '@/api/collections'
import { useMessage } from 'naive-ui'
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { useCollectionSquareData } from '@/composables/useCollectionSquareData'
import { usePointerRipple } from '@/composables/usePointerRipple'
import { useScrollProgress } from '@/composables/useScrollProgress'
import { safePush } from '@/utils/navigation'

const SORT_OPTIONS = [
  { label: '热门', value: 'hot' },
  { label: '最新', value: 'new' },
  { label: '点赞', value: 'like' },
]

export function useCollectionSquarePage() {
  const router = useRouter()
  const message = useMessage()
  const { isMobile } = useBreakpoint()
  const { scrollProgress } = useScrollProgress()
  const { createRipple } = usePointerRipple({ disabled: isMobile })
  const squareData = useCollectionSquareData({ message })

  onMounted(() => {
    squareData.fetchCollections()
  })

  function viewDetail(item: SquareCollectionDTO) {
    void safePush(router, `/dashboard/collection/${item.id}`)
  }

  function goToUserProfile(userId: number) {
    if (!userId)
      return
    void safePush(router, `/user/${userId}`)
  }

  function goMyCollections() {
    void safePush(router, '/dashboard/collections')
  }

  return {
    ...squareData,
    createRipple,
    goMyCollections,
    goToUserProfile,
    scrollProgress,
    sortOptions: SORT_OPTIONS,
    viewDetail,
  }
}
