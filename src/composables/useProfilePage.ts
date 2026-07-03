import { useDialog, useMessage } from 'naive-ui'
import { useRouter } from 'vue-router'
import { isPasskeySupported } from '@/api/passkey'
import { useProfileAccountActions } from '@/composables/useProfileAccountActions'
import { useProfileCollectionStats } from '@/composables/useProfileCollectionStats'
import { useProfileIdentity } from '@/composables/useProfileIdentity'
import { useProfilePasskeys } from '@/composables/useProfilePasskeys'
import { useAuthStore } from '@/stores/auth'
import { safePush } from '@/utils/navigation'

export function useProfilePage() {
  const router = useRouter()
  const auth = useAuthStore()
  const message = useMessage()
  const dialog = useDialog()

  const collectionStatsState = useProfileCollectionStats({
    canLoad: () => !!auth.user,
  })
  const passkeyState = useProfilePasskeys({
    canLoad: () => !!auth.user,
    dialog,
    message,
  })
  const identityState = useProfileIdentity({
    auth,
    fetchCollectionStats: collectionStatsState.fetchCollectionStats,
    fetchPasskeyList: passkeyState.fetchPasskeyList,
    message,
  })
  const accountActionsState = useProfileAccountActions({
    message,
    profile: identityState.profile,
    reloadProfile: identityState.initData,
  })

  function goTo(path: string) {
    void safePush(router, path)
  }

  return {
    ...collectionStatsState,
    ...passkeyState,
    ...identityState,
    ...accountActionsState,
    goTo,
    isPasskeySupported,
  }
}
