<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { fetchCaptcha } from '@/api/auth'

const emit = defineEmits(['update:uuid'])

const imgUrl = ref('')
const loading = ref(false)
const hasError = ref(false)

async function refresh() {
  loading.value = true
  hasError.value = false
  try {
    const data = await fetchCaptcha()

    if (data && data.img) {
      imgUrl.value = data.img
      emit('update:uuid', data.uuid)
    }
    else {
      hasError.value = true
    }
  }
  catch {
    hasError.value = true
  }
  finally {
    loading.value = false
  }
}

onMounted(() => {
  refresh()
})

defineExpose({ refresh })
</script>

<template>
  <div class="captcha-box" title="点击刷新验证码" @click="refresh">
    <img v-if="imgUrl" :src="imgUrl" alt="验证码">
    <div v-else class="placeholder">
      {{ loading ? '加载中...' : hasError ? '重试' : '点击加载' }}
    </div>
  </div>
</template>

<style scoped>
.captcha-box {
  /* Matches the backend captcha image size to avoid stretching artifacts. */
  width: 120px;
  height: 40px;
  cursor: pointer;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  flex-shrink: 0; /* 防止被 flex 布局挤压变形 */
}

.captcha-box img {
  width: 100%;
  height: 100%;
  /* Keep the full captcha visible even if the generated image ratio changes. */
  object-fit: contain;
  display: block;
}
.placeholder {
  font-size: 12px;
  color: #94a3b8;
}
</style>
