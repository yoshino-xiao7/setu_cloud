<script setup lang="ts">
import type { QqSpaceCharacter } from '@/api/qqSpace'
import { ArrowForwardOutline, BookOutline, ImagesOutline } from '@vicons/ionicons5'
import { NButton, NEmpty, NIcon, NSpin, useMessage } from 'naive-ui'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { fetchQqCharacters } from '@/api/qqSpace'
import { unwrapApiData } from '@/api/response'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'

const router = useRouter()
const message = useMessage()
const loading = ref(false)
const characters = ref<QqSpaceCharacter[]>([])

async function load() {
  loading.value = true
  try {
    characters.value = unwrapApiData(await fetchQqCharacters(), [])
  }
  catch (error) {
    if (!shouldIgnoreApiError(error))
      showApiError(message, error, '加载角色失败')
  }
  finally { loading.value = false }
}

onMounted(load)
</script>

<template>
  <div class="qq-page ui-page">
    <div class="ui-page-header">
      <div>
        <h1 class="ui-page-title">
          扣扣空间
        </h1>
        <p class="ui-page-subtitle">
          记录雪涼与铃木铃奈的角色设定、相册与故事。
        </p>
      </div>
      <div class="qq-actions">
        <NButton secondary @click="router.push('/dashboard/qq-space/albums')">
          <template #icon>
            <NIcon><ImagesOutline /></NIcon>
          </template>相册
        </NButton>
        <NButton type="primary" @click="router.push('/dashboard/qq-space/stories')">
          <template #icon>
            <NIcon><BookOutline /></NIcon>
          </template>故事
        </NButton>
      </div>
    </div>

    <NSpin :show="loading">
      <div v-if="characters.length" class="character-grid">
        <article
          v-for="character in characters"
          :key="character.slug"
          class="character-card ui-card ui-card-hover"
          :style="{ '--character-accent': character.themeColor || '#f586a9' }"
          @click="router.push(`/dashboard/qq-space/character/${character.slug}`)"
        >
          <div class="character-portrait">
            <img v-if="character.portraitUrl" :src="character.portraitUrl" :alt="character.name" loading="lazy">
            <div v-else class="portrait-empty">
              {{ character.name.slice(0, 1) }}
            </div>
          </div>
          <div class="character-info">
            <div class="character-heading">
              <img v-if="character.avatarUrl" :src="character.avatarUrl" alt="" class="character-avatar">
              <div>
                <h2>{{ character.name }}</h2>
                <p>{{ character.aliases || character.slug }}</p>
              </div>
            </div>
            <p class="character-intro">
              {{ character.intro || '还没有写下角色简介。' }}
            </p>
            <span class="character-link">查看角色档案 <NIcon><ArrowForwardOutline /></NIcon></span>
          </div>
        </article>
      </div>
      <NEmpty v-else description="还没有角色资料" />
    </NSpin>
  </div>
</template>

<style scoped>
.qq-page { display: grid; gap: 20px; }
.qq-actions { display: flex; gap: 10px; }
.character-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }
.character-card { display: grid; grid-template-columns: minmax(180px, .82fr) 1fr; min-height: 360px; cursor: pointer; border-top: 3px solid var(--character-accent); }
.character-portrait { min-height: 360px; overflow: hidden; background: linear-gradient(160deg, color-mix(in srgb, var(--character-accent) 18%, white), rgba(255,255,255,.3)); }
.character-portrait img { width: 100%; height: 100%; object-fit: cover; display: block; }
.portrait-empty { display: grid; place-items: center; height: 100%; font-size: 100px; color: var(--character-accent); font-weight: 800; }
.character-info { padding: 28px; display: flex; flex-direction: column; justify-content: center; gap: 18px; }
.character-heading { display: flex; align-items: center; gap: 14px; }
.character-avatar { width: 58px; height: 58px; border-radius: 18px; object-fit: cover; box-shadow: 0 8px 20px color-mix(in srgb, var(--character-accent) 22%, transparent); }
.character-heading h2 { margin: 0; color: var(--ui-text); font-size: 25px; }
.character-heading p, .character-intro { margin: 5px 0 0; color: var(--ui-text-muted); line-height: 1.7; }
.character-intro { min-height: 72px; }
.character-link { color: var(--character-accent); font-weight: 700; display: inline-flex; align-items: center; gap: 4px; }
@media (max-width: 760px) {
  .ui-page-header { align-items: flex-start; flex-direction: column; }
  .character-grid { grid-template-columns: 1fr; }
  .character-card { grid-template-columns: 108px 1fr; min-height: 220px; }
  .character-portrait { min-height: 220px; }
  .character-info { padding: 18px; gap: 10px; }
  .character-heading h2 { font-size: 20px; }
  .character-intro { min-height: 0; font-size: 13px; }
}
</style>
