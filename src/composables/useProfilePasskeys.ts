import type { DialogApi, MessageApi } from 'naive-ui'
import type { PasskeyItem } from '@/api/passkey'
import { create } from '@github/webauthn-json'
import { ref } from 'vue'
import {
  beginPasskeyRegistration,
  deletePasskey,
  fetchPasskeys,
  finishPasskeyRegistration,
  isPasskeyCancelError,
  isPasskeySupported,
  normalizePasskeyCreationOptions,
  renamePasskey,
} from '@/api/passkey'
import { unwrapApiData } from '@/api/response'
import { getApiErrorMessage, shouldIgnoreApiError, showApiError } from '@/composables/useApiError'

interface ProfilePasskeysOptions {
  canLoad: () => boolean
  dialog: DialogApi
  message: MessageApi
}

interface PasskeyBusinessError {
  response?: { data?: { code?: string } }
}

export function useProfilePasskeys(options: ProfilePasskeysOptions) {
  const passkeys = ref<PasskeyItem[]>([])
  const passkeysLoading = ref(false)
  const passkeySubmitting = ref(false)
  const showAddPasskey = ref(false)
  const showRenamePasskey = ref(false)
  const passkeyNickname = ref('')
  const renamePasskeyId = ref<number | null>(null)

  async function fetchPasskeyList() {
    if (!options.canLoad())
      return

    passkeysLoading.value = true
    try {
      passkeys.value = await fetchPasskeys()
    }
    catch (error: unknown) {
      if (!shouldIgnoreApiError(error))
        showApiError(options.message, error, '加载通行密钥失败')
    }
    finally {
      passkeysLoading.value = false
    }
  }

  function openAddPasskey() {
    if (!isPasskeySupported()) {
      options.message.warning('当前浏览器或环境不支持通行密钥')
      return
    }

    passkeyNickname.value = getDefaultPasskeyNickname()
    showAddPasskey.value = true
  }

  async function handleAddPasskey() {
    const nickname = passkeyNickname.value.trim()
    if (!nickname) {
      options.message.warning('请填写通行密钥名称')
      return
    }

    passkeySubmitting.value = true
    try {
      const optionsRes = await beginPasskeyRegistration(nickname)
      const registrationOptions = unwrapApiData(optionsRes)
      const credential = await create(normalizePasskeyCreationOptions(registrationOptions.publicKey))
      await finishPasskeyRegistration({
        challengeId: registrationOptions.challengeId,
        nickname,
        credential,
      })
      options.message.success('通行密钥已开通')
      showAddPasskey.value = false
      await fetchPasskeyList()
    }
    catch (error: unknown) {
      if (shouldIgnoreApiError(error))
        return

      const text = getPasskeyManageError(error, '开通通行密钥失败')
      if (isPasskeyCancelError(error))
        options.message.warning(text)
      else if (getPasskeyBusinessCode(error))
        options.message.error(text)
      else
        showApiError(options.message, error, '开通通行密钥失败')
    }
    finally {
      passkeySubmitting.value = false
    }
  }

  function openRenamePasskey(item: PasskeyItem) {
    renamePasskeyId.value = item.id
    passkeyNickname.value = item.nickname || ''
    showRenamePasskey.value = true
  }

  async function handleRenamePasskey() {
    const id = renamePasskeyId.value
    const nickname = passkeyNickname.value.trim()
    if (!id || !nickname) {
      options.message.warning('请填写通行密钥名称')
      return
    }

    passkeySubmitting.value = true
    try {
      await renamePasskey(id, nickname)
      options.message.success('通行密钥已重命名')
      showRenamePasskey.value = false
      await fetchPasskeyList()
    }
    catch (error: unknown) {
      if (!shouldIgnoreApiError(error))
        showApiError(options.message, error, '重命名失败')
    }
    finally {
      passkeySubmitting.value = false
    }
  }

  function confirmDeletePasskey(item: PasskeyItem) {
    options.dialog.warning({
      title: '删除通行密钥',
      content: `确认删除「${item.nickname || `#${item.id}`}」吗？`,
      positiveText: '删除',
      negativeText: '取消',
      onPositiveClick: async () => {
        try {
          await deletePasskey(item.id)
          options.message.success('通行密钥已删除')
          await fetchPasskeyList()
        }
        catch (error: unknown) {
          if (!shouldIgnoreApiError(error))
            showApiError(options.message, error, '删除失败')
        }
      },
    })
  }

  return {
    confirmDeletePasskey,
    fetchPasskeyList,
    handleAddPasskey,
    handleRenamePasskey,
    openAddPasskey,
    openRenamePasskey,
    passkeyNickname,
    passkeySubmitting,
    passkeys,
    passkeysLoading,
    renamePasskeyId,
    showAddPasskey,
    showRenamePasskey,
  }
}

function getDefaultPasskeyNickname() {
  const platform = navigator.platform || ''
  if (/iPhone|iPad|iPod/i.test(platform))
    return 'iPhone / iPad'
  if (/Mac/i.test(platform))
    return 'MacBook Touch ID'
  if (/Win/i.test(platform))
    return 'Windows Hello'
  if (/Android/i.test(platform))
    return 'Android 设备'
  return '我的通行密钥'
}

function getPasskeyBusinessCode(error: unknown) {
  if (!error || typeof error !== 'object')
    return ''
  return (error as PasskeyBusinessError).response?.data?.code || ''
}

function getPasskeyManageError(error: unknown, fallback: string) {
  if (isPasskeyCancelError(error))
    return '已取消通行密钥验证'

  const code = getPasskeyBusinessCode(error)
  if (code === 'PASSKEY_CREDENTIAL_EXISTS')
    return '该通行密钥已绑定过'
  if (code === 'PASSKEY_EMAIL_NOT_VERIFIED')
    return '请先完成邮箱验证后再开通通行密钥'
  if (code === 'PASSKEY_CHALLENGE_EXPIRED')
    return '验证已过期，请重新添加通行密钥'

  return getApiErrorMessage(error, fallback)
}
