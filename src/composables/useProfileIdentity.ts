import type { MessageApi } from 'naive-ui'
import type { UserProfile } from '@/api/user'
import { computed, onMounted, ref } from 'vue'
import { getUserInfo } from '@/api/user'

interface AuthStoreLike {
  avatarUrl?: string
  updateAvatar: (avatarUrl: string) => void
}

export interface UseProfileIdentityOptions {
  auth: AuthStoreLike
  fetchCollectionStats: () => Promise<void>
  fetchPasskeyList: () => Promise<void>
  message: MessageApi
}

export function createEmptyUserProfile(): UserProfile {
  return {
    id: 0,
    email: '',
    nickname: '',
    avatarUrl: '',
    role: 0,
    createdAt: '',
    lastLoginIp: '',
  }
}

export function useProfileIdentity(options: UseProfileIdentityOptions) {
  const profile = ref<UserProfile>(createEmptyUserProfile())

  async function initData() {
    try {
      const res = await getUserInfo()
      profile.value = res
      if (res.avatarUrl)
        options.auth.updateAvatar(res.avatarUrl)

      await options.fetchCollectionStats()
      await options.fetchPasskeyList()
    }
    catch {
      options.message.error('获取用户信息失败')
    }
  }

  const displayAvatar = computed(() => profile.value.avatarUrl || options.auth.avatarUrl)
  const displayName = computed(() => profile.value.nickname || profile.value.email?.split('@')[0] || 'User')
  const isAdmin = computed(() => profile.value.role === 1)
  const emailFirstLetter = computed(() => profile.value.email?.charAt(0).toUpperCase() || 'U')

  onMounted(() => {
    void initData()
  })

  return {
    displayAvatar,
    displayName,
    emailFirstLetter,
    initData,
    isAdmin,
    profile,
  }
}
