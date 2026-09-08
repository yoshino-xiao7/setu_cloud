<script setup lang="ts">
import type { CrawlerTask } from '@/api/pixiv'
import { NAlert, NButton, NInput, NModal, NProgress, NTag, useMessage } from 'naive-ui'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { artworkError } from '@/api/artworks'
import { crawlByIds, fetchCrawlerTask } from '@/api/pixiv'
import { unwrapApiData } from '@/api/response'
import { parsePixivIds } from '@/utils/pixivIds'

const props = defineProps<{
  show: boolean
  pid?: string
}>()
const emit = defineEmits<{
  'update:show': [
        value: boolean,
  ]
  'imported': [
  ]
}>()
const message = useMessage()
const input = ref('')
const error = ref('')
const submitting = ref(false)
const task = ref<CrawlerTask | null>(null)
let timer: ReturnType<typeof setTimeout> | undefined
let generation = 0
const failedIds = computed(() => task.value?.results?.filter(result => !result.gallery_verified).map(result => result.pid) || [])
const running = computed(() => task.value && ['pending', 'running'].includes(task.value.status))
watch(() => props.show, (show) => {
  if (show) {
    if (props.pid)
      input.value = props.pid
    if (running.value && task.value)
      void poll(task.value.task_id, generation)
  }
  else {
    generation++
    clearTimeout(timer)
  }
})
async function poll(id: string, token: number) {
  clearTimeout(timer)
  try {
    const result = unwrapApiData<CrawlerTask>(await fetchCrawlerTask(id))
    if (token !== generation)
      return
    task.value = result
    if (['pending', 'running'].includes(result.status)) {
      timer = setTimeout(() => void poll(id, token), 3000)
    }
    else if (result.results?.some(item => item.gallery_verified)) {
      emit('imported')
    }
  }
  catch {
    if (token === generation)
      error.value = '任务状态获取失败，点击刷新继续查看'
  }
}
async function submit(retry = false) {
  if (submitting.value)
    return
  const token = generation
  error.value = ''
  try {
    const ids = parsePixivIds(retry ? failedIds.value.join(',') : input.value)
    submitting.value = true
    const result = unwrapApiData<{
      task_id?: string
      message?: string
    }>(await crawlByIds({ illustIds: ids, skipExisting: true }))
    if (!result.task_id)
      throw new Error(result.message || '抓取服务未返回任务编号')
    message.success('已提交，正在抓取并核验入库结果')
    task.value = { task_id: result.task_id, status: 'pending', mode: 'by_ids' }
    if (token === generation && props.show)
      void poll(result.task_id, ++generation)
  }
  catch (cause) {
    error.value = artworkError(cause, '提交失败，请重试')
  }
  finally {
    submitting.value = false
  }
}
onBeforeUnmount(() => {
  generation++
  clearTimeout(timer)
})
</script>

<template>
  <NModal :show="show" preset="card" title="通过 PID 新增图片" style="width: min(560px, 92vw)" @update:show="emit('update:show', $event)">
    <p>输入 Pixiv 作品 PID，成功抓取后直接进入本站图库。已有图片会跳过，缺少的页面会补齐。</p>
    <NInput v-model:value="input" type="textarea" placeholder="输入 PID，多个用逗号、空格或换行分隔" :autosize="{ minRows: 4, maxRows: 8 }" :disabled="!!running" />
    <NAlert v-if="error" type="error" style="margin-top: 16px">
      {{ error }}
    </NAlert>
    <section v-if="task" class="import-result" aria-live="polite">
      <div><NTag>{{ running ? '抓取中' : task.status === 'completed' ? '任务已结束' : task.status === 'failed' ? '任务失败' : '已取消' }}</NTag> <small>{{ task.task_id }}</small></div>
      <NProgress v-if="task.progress" type="line" :percentage="Math.round(task.progress.done / Math.max(1, task.progress.total) * 100)" />
      <p v-if="task.progress">
        新增 {{ task.progress.new }} · 跳过 {{ task.progress.skipped }} · 失败 {{ task.progress.failed }}
      </p>
      <div v-for="result in task.results" :key="result.pid" class="pid-result">
        <strong>{{ result.pid }}</strong>
        <span>{{ result.gallery_verified ? '已进入图库' : result.message || '尚未核验入库' }}</span>
      </div>
      <NAlert v-if="!running && !task.results?.length" type="warning">
        爬虫未返回逐 PID 核验结果，请到管理后台检查入库情况。
      </NAlert>
    </section>
    <template #footer>
      <div class="import-actions">
        <NButton v-if="task" @click="poll(task.task_id, generation)">
          刷新状态
        </NButton>
        <NButton v-if="failedIds.length && !running" :loading="submitting" @click="submit(true)">
          重试未入库 PID
        </NButton>
        <NButton type="primary" :loading="submitting" :disabled="!!running" @click="submit(false)">
          提交 PID
        </NButton>
      </div>
    </template>
  </NModal>
</template>

<style scoped>
.import-result { display: grid; gap: 12px; margin-top: 24px; max-height: 40vh; overflow: auto; }
.import-result p { margin: 0; }
.import-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
.pid-result { display: flex; gap: 16px; justify-content: space-between; font-size: 13px; }
</style>
