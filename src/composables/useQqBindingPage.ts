import type { QqBindingVerificationResponse, UserQqBinding } from '@/api/user'
import { useMessage } from 'naive-ui'
import { computed, onMounted, ref } from 'vue'
import { unwrapApiData } from '@/api/response'
import {
  disableQqBinding,
  fetchQqBinding,
  saveQqBinding,
  sendQqBindingVerificationCode,
} from '@/api/user'
import { showApiError } from '@/composables/useApiError'

const QQ_NUMBER_PATTERN = /^[1-9]\d{4,19}$/
const VERIFICATION_CODE_PATTERN = /^\d{6}$/

export function useQqBindingPage() {
  const message = useMessage()
  const binding = ref<UserQqBinding>({ enabled: false })
  const qqNumber = ref('')
  const verificationCode = ref('')
  const loading = ref(false)
  const sendingCode = ref(false)
  const saving = ref(false)
  const verification = ref<QqBindingVerificationResponse>({})

  const isBound = computed(() => binding.value.enabled === true && !!binding.value.qqNumber)
  const statusText = computed(() => isBound.value ? `已绑定 QQ ${binding.value.qqNumber}` : '尚未绑定 QQ')
  const qqEmail = computed(() => verification.value.qqEmail || (QQ_NUMBER_PATTERN.test(qqNumber.value.trim()) ? `${qqNumber.value.trim()}@qq.com` : ''))
  const canSendCode = computed(() => QQ_NUMBER_PATTERN.test(qqNumber.value.trim()) && !loading.value && !sendingCode.value)
  const canSaveBinding = computed(() => {
    return QQ_NUMBER_PATTERN.test(qqNumber.value.trim())
      && VERIFICATION_CODE_PATTERN.test(verificationCode.value.trim())
      && !loading.value
      && !saving.value
  })

  async function loadBinding() {
    loading.value = true
    try {
      const data = unwrapApiData(await fetchQqBinding(), { enabled: false })
      binding.value = data || { enabled: false }
      qqNumber.value = data?.qqNumber || ''
    }
    catch (error) {
      showApiError(message, error, '加载 QQ 绑定失败')
    }
    finally {
      loading.value = false
    }
  }

  async function sendVerificationCode() {
    const normalized = qqNumber.value.trim()
    if (!QQ_NUMBER_PATTERN.test(normalized)) {
      message.warning('请输入 5 到 20 位 QQ 号')
      return
    }
    sendingCode.value = true
    try {
      verification.value = unwrapApiData(await sendQqBindingVerificationCode({ qqNumber: normalized }), {
        qqEmail: `${normalized}@qq.com`,
        expiresInSeconds: 600,
      })
      verificationCode.value = ''
      message.success(`验证码已发送至 ${verification.value.qqEmail || `${normalized}@qq.com`}`)
    }
    catch (error) {
      showApiError(message, error, '发送 QQ 邮箱验证码失败')
    }
    finally {
      sendingCode.value = false
    }
  }

  async function saveBinding() {
    const normalized = qqNumber.value.trim()
    const code = verificationCode.value.trim()
    if (!QQ_NUMBER_PATTERN.test(normalized)) {
      message.warning('请输入 5 到 20 位 QQ 号')
      return
    }
    if (!VERIFICATION_CODE_PATTERN.test(code)) {
      message.warning('请输入 6 位邮箱验证码')
      return
    }
    saving.value = true
    try {
      binding.value = unwrapApiData(await saveQqBinding({ qqNumber: normalized, verificationCode: code }), {
        enabled: true,
        qqNumber: normalized,
      })
      qqNumber.value = binding.value.qqNumber || normalized
      verificationCode.value = ''
      verification.value = {}
      message.success('QQ 绑定已验证并保存')
    }
    catch (error) {
      showApiError(message, error, '保存 QQ 绑定失败')
    }
    finally {
      saving.value = false
    }
  }

  async function disableBinding() {
    saving.value = true
    try {
      binding.value = unwrapApiData(await disableQqBinding(), {
        enabled: false,
        qqNumber: qqNumber.value,
      })
      verificationCode.value = ''
      verification.value = {}
      message.success('已取消 QQ 绑定')
    }
    catch (error) {
      showApiError(message, error, '取消 QQ 绑定失败')
    }
    finally {
      saving.value = false
    }
  }

  onMounted(loadBinding)

  return {
    binding,
    canSaveBinding,
    canSendCode,
    disableBinding,
    isBound,
    loadBinding,
    loading,
    qqEmail,
    qqNumber,
    saveBinding,
    saving,
    sendVerificationCode,
    sendingCode,
    statusText,
    verificationCode,
  }
}
