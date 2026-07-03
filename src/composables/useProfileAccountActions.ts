import type { MessageApi, UploadCustomRequestOptions } from 'naive-ui'
import type { Ref } from 'vue'
import type { UserProfile } from '@/api/user'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  changePassword,
  updateNickname,
  uploadAvatarFile,
} from '@/api/user'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'
import { useAuthStore } from '@/stores/auth'
import { safePush } from '@/utils/navigation'

interface ProfileAccountActionsOptions {
  message: MessageApi
  profile: Ref<UserProfile>
  reloadProfile: () => Promise<void>
}

export function useProfileAccountActions(options: ProfileAccountActionsOptions) {
  const router = useRouter()
  const auth = useAuthStore()

  const showEditName = ref(false)
  const nameForm = ref('')
  const savingName = ref(false)

  const showChangePwd = ref(false)
  const pwdForm = ref({ old: '', new: '', confirm: '' })
  const changingPwd = ref(false)

  function openEditName() {
    nameForm.value = options.profile.value.nickname || ''
    showEditName.value = true
  }

  async function handleSaveNickname() {
    if (!nameForm.value.trim())
      return options.message.warning('昵称不能为空')

    savingName.value = true
    try {
      await updateNickname(nameForm.value.trim())
      options.message.success('昵称修改成功')
      showEditName.value = false
      await options.reloadProfile()
    }
    catch (error: unknown) {
      if (shouldIgnoreApiError(error))
        return
      showApiError(options.message, error, '修改失败')
    }
    finally {
      savingName.value = false
    }
  }

  async function customRequest({ file }: UploadCustomRequestOptions) {
    const rawFile = file.file
    if (!rawFile)
      return

    if (!rawFile.type.startsWith('image/'))
      return options.message.error('请上传图片')
    if (rawFile.size > 2 * 1024 * 1024)
      return options.message.error('图片不能超过 2MB')

    try {
      const resp = await uploadAvatarFile(rawFile)
      options.profile.value.avatarUrl = resp.avatarUrl
      auth.updateAvatar(resp.avatarUrl)
      options.message.success('头像更新成功')
    }
    catch {
      options.message.error('上传失败，请重试')
    }
  }

  function openChangePwd() {
    pwdForm.value = { old: '', new: '', confirm: '' }
    showChangePwd.value = true
  }

  async function handleChangePassword() {
    const { old, new: newPwd, confirm } = pwdForm.value
    if (!old || !newPwd || !confirm)
      return options.message.warning('请填写完整')
    if (newPwd.length < 6)
      return options.message.warning('新密码至少6位')
    if (newPwd !== confirm)
      return options.message.error('两次密码不一致')

    try {
      changingPwd.value = true
      await changePassword(old, newPwd)
      showChangePwd.value = false
      auth.clearLocalState()
      options.message.success('密码修改成功，请重新登录')
      await safePush(router, { name: 'login' })
    }
    catch (error: unknown) {
      if (shouldIgnoreApiError(error))
        return
      showApiError(options.message, error, '修改失败')
    }
    finally {
      changingPwd.value = false
    }
  }

  return {
    changingPwd,
    customRequest,
    handleChangePassword,
    handleSaveNickname,
    nameForm,
    openChangePwd,
    openEditName,
    pwdForm,
    savingName,
    showChangePwd,
    showEditName,
  }
}
