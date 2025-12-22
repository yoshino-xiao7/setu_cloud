<script setup lang="ts">
import { ref, onMounted } from 'vue'
import http from '@/api/http' // 使用你的 http 工具

const emit = defineEmits(['update:uuid'])

const imgUrl = ref('')
const loading = ref(false)

const refresh = async () => {
  loading.value = true
  try {
    // 请求后端接口
    const res: any = await http.get('/auth/captcha')
    // 后端返回结构: { uuid: "...", img: "..." }
    // 注意：根据你的 http.ts 配置，这里可能直接是 res，也可能是 res.data
    const data = res.data || res

    if (data && data.img) {
      imgUrl.value = data.img
      emit('update:uuid', data.uuid) // 把 uuid 传给父组件
    }
  } catch (e) {
    console.error('验证码加载失败', e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  refresh()
})

defineExpose({ refresh })
</script>

<template>
  <div class="captcha-box" @click="refresh" title="点击刷新验证码">
    <img v-if="imgUrl" :src="imgUrl" alt="验证码" />
    <div v-else class="placeholder">
      {{ loading ? '加载中...' : '点击加载' }}
    </div>
  </div>
</template>

<style scoped>
.captcha-box {
  /* ✅ 修正1：宽度改为 120px 以匹配后端 Hutool 的默认生成尺寸 */
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
  /* ✅ 修正2：使用 contain 确保图片完整显示，不被裁切 */
  object-fit: contain;
  display: block;
}
.placeholder {
  font-size: 12px;
  color: #94a3b8;
}
</style>