<script setup lang="ts">
import { useAliyunCaptcha } from '@/composables/useAliyunCaptcha'

const props = defineProps<{
  sceneId?: string
  buttonId: string
  elementId?: string
}>()

const emit = defineEmits<{
  (e: 'success', captchaVerifyParam: string): void
  (e: 'fail', result: unknown): void
  (e: 'ready'): void
  (e: 'loading', loading: boolean): void
}>()

const { captchaElementId, isReady, reset, getInstance } = useAliyunCaptcha(props, emit)

defineExpose({
  reset,
  isReady,
  getInstance,
})
</script>

<template>
  <!-- 无痕验证模式下，只需要一个隐藏的容器元素 -->
  <div :id="captchaElementId" class="esa-captcha-container" />
</template>

<style scoped>
.esa-captcha-container {
  /* 容器本身不显示，验证码会以弹窗形式出现 */
  display: block;
}
</style>
