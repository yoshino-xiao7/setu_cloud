import type { UserQqBinding } from '@/api/user'
import { useMessage } from 'naive-ui'
import { computed, onMounted, ref } from 'vue'
import { unwrapApiData } from '@/api/response'
import { disableQqBinding, fetchQqBinding, saveQqBinding } from '@/api/user'
import { showApiError } from '@/composables/useApiError'

export function useQqBindingPage() {
  const message = useMessage()
  const binding = ref<UserQqBinding>({ enabled: false })
  const qqNumber = ref('')
  const loading = ref(false)
  const saving = ref(false)

  const isBound = computed(() => binding.value.enabled === true && !!binding.value.qqNumber)
  const statusText = computed(() => isBound.value ? `已绑定 QQ ${binding.value.qqNumber}` : '尚未绑定 QQ')

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

  async function saveBinding() {
    const normalized = qqNumber.value.trim()
    if (!/^[1-9]\d{4,19}$/.test(normalized)) {
      message.warning('请输入 5 到 20 位 QQ 号')
      return
    }
    saving.value = true
    try {
      binding.value = unwrapApiData(await saveQqBinding({ qqNumber: normalized }), {
        enabled: true,
        qqNumber: normalized,
      })
      qqNumber.value = binding.value.qqNumber || normalized
      message.success('QQ 绑定已保存')
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
    disableBinding,
    isBound,
    loadBinding,
    loading,
    qqNumber,
    saveBinding,
    saving,
    statusText,
  }
}
