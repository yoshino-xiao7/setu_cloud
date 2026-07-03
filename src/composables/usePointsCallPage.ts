import { useMessage } from 'naive-ui'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useBreakpoint } from '@/composables/useBreakpoint'
import {
  pickPointsCallCoverSrc,
  POINTS_CALL_COST_PER_CALL,
} from '@/composables/usePointsCallDefaults'
import { usePointsCallDeleteRequest } from '@/composables/usePointsCallDeleteRequest'
import { usePointsCallDownload } from '@/composables/usePointsCallDownload'
import { usePointsCallFavorites } from '@/composables/usePointsCallFavorites'
import { usePointsCallFormState } from '@/composables/usePointsCallFormState'
import { usePointsCallPageEffects } from '@/composables/usePointsCallPageEffects'
import { usePointsCallPoints } from '@/composables/usePointsCallPoints'
import { usePointsCallResults } from '@/composables/usePointsCallResults'
import { useAuthStore } from '@/stores/auth'
import { safePush } from '@/utils/navigation'

export function usePointsCallPage() {
  const router = useRouter()
  const message = useMessage()
  const auth = useAuthStore()
  const { isMobile } = useBreakpoint()
  const isAdmin = computed(() => auth.user?.role === 1)
  const costPerCall = POINTS_CALL_COST_PER_CALL

  function goToPointsLogs() {
    void safePush(router, '/dashboard/points-logs')
  }

  const pointsState = usePointsCallPoints({
    costPerCall,
    isAdmin,
    message,
  })
  const formState = usePointsCallFormState()

  async function refreshAll() {
    await pointsState.refreshPoints()
  }

  const pageEffectsState = usePointsCallPageEffects({
    isMobile,
    refreshAll,
  })
  const resultsState = usePointsCallResults({
    canCall: pointsState.canCall,
    costPerCall,
    form: formState.form,
    isMobile,
    message,
    parsedTags: formState.parsedTags,
    refreshAll,
  })
  const downloadState = usePointsCallDownload({ message })
  const deleteRequestState = usePointsCallDeleteRequest({
    getThumbnailUrl: pickPointsCallCoverSrc,
    message,
  })
  const favoritesState = usePointsCallFavorites({ message })

  return {
    ...pointsState,
    ...formState,
    ...pageEffectsState,
    ...resultsState,
    ...downloadState,
    ...deleteRequestState,
    ...favoritesState,
    costPerCall,
    goToPointsLogs,
    isAdmin,
    refreshAll,
  }
}
