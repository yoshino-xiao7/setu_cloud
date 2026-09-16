<script setup lang="ts">
import {
  ColorWandOutline,
  RefreshOutline,
  SparklesOutline,
} from '@vicons/ionicons5'
import {
  NAlert,
  NButton,
  NCard,
  NCollapse,
  NCollapseItem,
  NForm,
  NFormItem,
  NGrid,
  NGridItem,
  NIcon,
  NInput,
  NInputNumber,
  NRadioButton,
  NRadioGroup,
  NSelect,
  NSwitch,
  NTag,
} from 'naive-ui'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AiChatDrawPanel from '@/components/ai-chat-draw/AiChatDrawPanel.vue'
import AiDrawActiveJobCard from '@/components/ai-draw/AiDrawActiveJobCard.vue'
import AiDrawAssetComposer from '@/components/ai-draw/AiDrawAssetComposer.vue'
import AiDrawCharacterMaskPanel from '@/components/ai-draw/AiDrawCharacterMaskPanel.vue'
import AiDrawInjectedTagsEditor from '@/components/ai-draw/AiDrawInjectedTagsEditor.vue'
import AiDrawRecentJobsCard from '@/components/ai-draw/AiDrawRecentJobsCard.vue'
import AiDrawSourceImagePanel from '@/components/ai-draw/AiDrawSourceImagePanel.vue'
import { formatAiChatDrawPricing } from '@/composables/ai-chat-draw/aiChatDrawUsage'
import { useAiDrawPage } from '@/composables/useAiDrawPage'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { useMusicStore } from '@/stores/music'

const { isCompact, isMobile } = useBreakpoint()
const route = useRoute()
const router = useRouter()
const musicStore = useMusicStore()
/* 只有音乐播放条出现时才需要为它预留底部空间 */
const hasMiniPlayer = computed(() => Boolean(musicStore.currentSong))
const isChatMode = computed(() => String(route.query.mode || '') === 'chat')

function setDrawMode(mode: 'form' | 'chat') {
  const query = { ...route.query }
  if (mode === 'chat')
    query.mode = 'chat'
  else
    delete query.mode
  void router.replace({ query })
}

const {
  activeJob,
  canAttemptGenerate,
  capabilities,
  characterMaskBrush,
  characterMaskHint,
  characterMaskRole,
  checkpointOptions,
  clearCharacter,
  clearCharacterMask,
  clearLora,
  COST_PER_IMAGE,
  downloadJob,
  editableInjectedTagList,
  editableInjectedTagsPreview,
  endCharacterMaskPaint,
  fillAgain,
  form,
  animaAvailable,
  generate,
  generateButtonText,
  generating,
  hasCharacterMaskStrokes,
  hasCompleteCharacterMaskStrokes,
  historyLoading,
  isAdmin,
  isAnimaMode,
  isDualMode,
  isImg2ImgMode,
  loadCapabilities,
  loadingCapabilities,
  loadPoints,
  moveCharacterMaskPaint,
  openAssetSelector,
  openCharacterSelector,
  openLoraSelector,
  points,
  pointsLoading,
  preparePrompt,
  presetPositivePrompt,
  queueStatusText,
  recentJobs,
  selectedCharacterAsset,
  selectedGenerationCost,
  selectedLoraAsset,
  selectedSecondCharacterAsset,
  selectedSecondLoraAsset,
  selectedSize,
  selectedStylePresetNames,
  selectedStylePresetNegativeTags,
  selectedStylePresetSummary,
  selectSourceImage,
  clearSourceImage,
  sourceImageError,
  sourceImageFileName,
  sourceImagePreviewUrl,
  serviceReady,
  serviceStatus,
  serviceStatusLabel,
  serviceStatusMessage,
  serviceStatusType,
  setCharacterMaskCanvas,
  sizePresets,
  startCharacterMaskPaint,
  translating,
  undoCharacterMaskStroke,
  applySizePreset,
  handleNsfwModeChange,
  handleNsfwVisibilityChange,
  handleLightHiresChange,
  workflowEngine,
} = useAiDrawPage()

const promptAutosize = computed(() => (
  isMobile.value
    ? { minRows: 3, maxRows: 6 }
    : { minRows: 5, maxRows: 10 }
))
const tagAutosize = computed(() => (
  isMobile.value
    ? { minRows: 3, maxRows: 6 }
    : { minRows: 4, maxRows: 8 }
))
</script>

<template>
  <div class="ai-page ui-page" :class="[isChatMode ? 'is-chat-mode' : 'is-form-mode', { 'has-mini-player': hasMiniPlayer }]">
    <div class="ui-page-header">
      <div>
        <h1 class="ui-page-title">
          AI 绘图
        </h1>
        <p class="ui-page-subtitle">
          <template v-if="isChatMode">
            对话绘画按 Token 计费（{{ isAdmin ? '管理员免费' : formatAiChatDrawPricing() }}），可查看思考链和用量。
          </template>
          <template v-else-if="isCompact">
            每张图 {{ COST_PER_IMAGE }} 积分，机器在线即可画。
          </template>
          <template v-else>
            每张图消耗 <b>{{ COST_PER_IMAGE }}</b> 积分，管理员免费，机器在线即可使用。
          </template>
        </p>
      </div>
      <div class="ai-head-actions">
        <NTag round :type="isAdmin ? 'success' : 'info'">
          {{ isAdmin ? '管理员免费' : pointsLoading ? '积分加载中' : `${points} 积分` }}
        </NTag>
        <NButton secondary size="small" :loading="loadingCapabilities" @click="loadCapabilities">
          <template #icon>
            <NIcon><RefreshOutline /></NIcon>
          </template>
          刷新模型
        </NButton>
      </div>
    </div>

    <div class="ai-toolbar">
      <NRadioGroup :value="isChatMode ? 'chat' : 'form'" @update:value="(value: string) => setDrawMode(value === 'chat' ? 'chat' : 'form')">
        <NRadioButton value="form">
          描述绘图
        </NRadioButton>
        <NRadioButton value="chat">
          AI 对话绘画
        </NRadioButton>
      </NRadioGroup>
      <div class="ai-status" :class="`is-${serviceStatusType}`" :title="serviceStatusMessage">
        <span class="ai-status-dot" aria-hidden="true" />
        <strong>{{ serviceStatusLabel }}</strong>
        <span class="ai-status-text">{{ queueStatusText }}</span>
        <NTag v-if="!isCompact && serviceStatus?.online" size="small" round :type="serviceStatusType">
          {{ serviceStatus.activeWorkerCount || 0 }} 个Worker在线
        </NTag>
      </div>
    </div>

    <AiChatDrawPanel v-if="isChatMode" :is-admin="isAdmin" :load-points="loadPoints" />

    <div v-else class="draw-layout">
      <NCard class="ui-card draw-card" :bordered="false">
        <template #header>
          <div class="card-title">
            <NIcon><ColorWandOutline /></NIcon>
            绘制设置
          </div>
        </template>

        <NAlert v-if="!capabilities.workers.length" type="warning" class="worker-alert">
          当前没有 Worker 上报在线能力，任务可以入队，但需要本机 Worker 启动后才会生成。
        </NAlert>

        <NForm label-placement="top" class="draw-form">
          <div class="draw-block draw-block-mode">
            <NFormItem label="工作流">
              <div class="mode-switch">
                <NRadioGroup v-model:value="workflowEngine">
                  <NRadioButton value="classic">
                    现有模型
                  </NRadioButton>
                  <NRadioButton value="anima" :disabled="!animaAvailable">
                    Anima
                  </NRadioButton>
                </NRadioGroup>
                <span>
                  {{ isAnimaMode
                    ? (isCompact ? '番剧风独立工作流' : 'Anima 使用独立工作流，不套现有角色 LoRA')
                    : (isCompact ? 'WAI / Animagine' : '现有 WAI / Animagine 工作流，可使用角色 LoRA') }}
                </span>
              </div>
            </NFormItem>

            <NFormItem v-if="!isAnimaMode && !isImg2ImgMode" :label="isCompact ? '轻二采' : '轻二采精修'">
              <div class="mode-switch">
                <NSwitch v-model:value="form.lightHires" @update:value="handleLightHiresChange">
                  <template #checked>
                    已开启
                  </template>
                  <template #unchecked>
                    已关闭
                  </template>
                </NSwitch>
                <span>
                  {{ form.lightHires
                    ? (isCompact ? 'Euler a + 1.25× 二采' : 'Euler a、CLIP skip 2、1.25× 二采，细节更干净，稍慢一点')
                    : (isCompact ? '当前默认采样' : '使用当前默认 Euler / CFG 4.5，不二次放大') }}
                </span>
              </div>
            </NFormItem>

            <NFormItem label="出图方式">
              <div class="mode-switch">
                <NRadioGroup v-model:value="form.jobType">
                  <NRadioButton value="TEXT2IMG">
                    文生图
                  </NRadioButton>
                  <NRadioButton value="IMG2IMG">
                    图生图
                  </NRadioButton>
                </NRadioGroup>
                <span>{{ isImg2ImgMode ? (isCompact ? '整图按强度重绘' : '上传一张图后整图重绘，不支持双角色和轻二采') : (isCompact ? '按提示词出图' : '按提示词从空白 latent 出图') }}</span>
              </div>
            </NFormItem>

            <NFormItem v-if="isImg2ImgMode" label="源图与改动强度">
              <AiDrawSourceImagePanel
                v-model:denoise="form.denoise"
                :compact="isCompact"
                :error="sourceImageError"
                :file-name="sourceImageFileName"
                :preview-url="sourceImagePreviewUrl"
                @clear="clearSourceImage"
                @select-file="selectSourceImage"
              />
            </NFormItem>

            <NFormItem label="生成模式">
              <div class="mode-switch">
                <NRadioGroup v-model:value="form.generationMode">
                  <NRadioButton value="SINGLE">
                    单角色
                  </NRadioButton>
                  <NRadioButton value="DUAL" :disabled="isImg2ImgMode">
                    双角色
                  </NRadioButton>
                </NRadioGroup>
                <span>{{ isImg2ImgMode ? '图生图仅支持单角色' : (isAdmin ? '管理员免费' : `本次预计消耗 ${selectedGenerationCost} 积分`) }}</span>
              </div>
            </NFormItem>

            <NFormItem :label="isCompact ? 'NSFW' : 'NSFW 兼容模式'">
              <div class="mode-switch">
                <NSwitch v-model:value="form.nsfwMode" @update:value="handleNsfwModeChange">
                  <template #checked>
                    已开启
                  </template>
                  <template #unchecked>
                    已关闭
                  </template>
                </NSwitch>
                <span v-if="!isCompact">
                  {{ form.nsfwMode
                    ? '过滤服装、审查与遮挡标签，强化无遮挡构图，并将 LoRA 默认强度调整为 0.60'
                    : '保留全部预设标签和普通 LoRA 强度' }}
                </span>
              </div>
            </NFormItem>

            <NFormItem v-if="form.nsfwMode" label="NSFW 可见性强度">
              <div class="visibility-level-field">
                <NRadioGroup
                  v-model:value="form.nsfwVisibilityLevel"
                  @update:value="handleNsfwVisibilityChange"
                >
                  <NRadioButton value="LIGHT">
                    轻度
                  </NRadioButton>
                  <NRadioButton value="STANDARD">
                    标准
                  </NRadioButton>
                  <NRadioButton value="STRONG">
                    强力
                  </NRadioButton>
                </NRadioGroup>
                <span v-if="!isCompact">只在 NSFW 开启时生效；强度越高，遮挡负面词和局部重绘幅度越强。</span>
              </div>
            </NFormItem>
          </div>

          <div class="draw-block draw-block-prompt">
            <NFormItem :label="isCompact ? '想画什么' : '自然语言描绘'">
              <NInput
                v-model:value="form.promptCn"
                type="textarea"
                :autosize="promptAutosize"
                maxlength="1000"
                show-count
                placeholder="例如：银发少女，雨夜街角，霓虹灯，电影感光影"
              />
            </NFormItem>
          </div>

          <div class="draw-block draw-block-size">
            <NFormItem label="画幅">
              <NRadioGroup v-model:value="selectedSize" class="size-presets" @update:value="applySizePreset">
                <NRadioButton v-for="preset in sizePresets" :key="preset.value" :value="preset.value">
                  {{ preset.label }}
                </NRadioButton>
              </NRadioGroup>
            </NFormItem>
          </div>

          <div class="draw-block draw-block-prompts">
            <div class="prompt-actions">
              <NButton secondary :loading="translating" :disabled="!serviceReady || !form.promptCn.trim()" @click="preparePrompt">
                生成提示词
              </NButton>
              <span>{{ form.width }} x {{ form.height }} · {{ form.steps }} steps · CFG {{ form.cfg }}{{ isImg2ImgMode ? ` · 图生图 ${form.denoise}` : (form.lightHires && !isAnimaMode ? ' · 轻二采' : '') }}</span>
            </div>

            <NGrid cols="1 m:2" :x-gap="12" :y-gap="4" responsive="screen">
              <NGridItem>
                <NFormItem label="正向提示词">
                  <NInput
                    v-model:value="form.promptPositive"
                    type="textarea"
                    :autosize="tagAutosize"
                    placeholder="可只填这项生成；清空「想画什么」时，未改过的自动提示词会一起清掉"
                  />
                </NFormItem>
              </NGridItem>
              <NGridItem>
                <NFormItem label="反向提示词">
                  <NInput
                    v-model:value="form.promptNegative"
                    type="textarea"
                    :autosize="tagAutosize"
                  />
                </NFormItem>
              </NGridItem>
            </NGrid>

            <NGrid cols="1 m:2" :x-gap="12" :y-gap="4" responsive="screen">
              <NGridItem>
                <NFormItem :label="isAnimaMode ? 'Anima 模型' : 'Checkpoint'">
                  <NSelect v-model:value="form.checkpoint" :options="checkpointOptions" filterable />
                </NFormItem>
              </NGridItem>
              <NGridItem>
                <NFormItem label="主 LoRA 强度">
                  <NInputNumber v-model:value="form.loraStrength" :min="0" :max="2" :step="0.05" :disabled="!form.loraName" />
                </NFormItem>
              </NGridItem>
            </NGrid>
          </div>

          <div class="draw-block draw-block-assets">
            <p v-if="isAnimaMode" class="field-hint">
              Anima 暂不使用现有角色 LoRA；角色标签仍会写入提示词。
            </p>
            <NFormItem label="资产组合">
              <AiDrawAssetComposer
                :character-asset="selectedCharacterAsset"
                :character-id="form.characterId"
                :lora-asset="selectedLoraAsset"
                :lora-name="form.loraName"
                :selected-style-preset-names="selectedStylePresetNames"
                :selected-style-preset-summary="selectedStylePresetSummary"
                @clear-character="clearCharacter"
                @clear-lora="clearLora"
                @open-asset="openAssetSelector"
                @open-character="openCharacterSelector"
                @open-lora="openLoraSelector"
              />
            </NFormItem>
          </div>

          <div v-if="isDualMode" class="draw-block draw-block-dual dual-character-panel">
            <NFormItem label="角色 B 资产组合">
              <AiDrawAssetComposer
                target="secondary"
                :character-asset="selectedSecondCharacterAsset"
                :character-id="form.secondCharacterId"
                :lora-asset="selectedSecondLoraAsset"
                :lora-name="form.secondLoraName"
                :lora-strength="form.secondLoraStrength"
                @clear-character="clearCharacter"
                @clear-lora="clearLora"
                @open-asset="openAssetSelector"
                @open-character="openCharacterSelector"
                @open-lora="openLoraSelector"
                @update-lora-strength="value => form.secondLoraStrength = value ?? 0"
              />
            </NFormItem>
            <p class="field-hint">
              {{ isCompact ? '双角色按两张图计费。画出 A/B 范围后只作构图参考。' : '双角色会按两张图计费。不画区域时使用普通双角色生成；同时画出角色 A/B 范围后只作为构图参考，不会再触发区域 mask。' }}
            </p>
            <AiDrawCharacterMaskPanel
              v-model:brush="characterMaskBrush"
              v-model:role="characterMaskRole"
              :canvas-aspect-ratio="`${form.width} / ${form.height}`"
              :has-complete-strokes="hasCompleteCharacterMaskStrokes"
              :has-strokes="hasCharacterMaskStrokes"
              :hint="characterMaskHint"
              @canvas-ready="setCharacterMaskCanvas"
              @clear="clearCharacterMask"
              @end-paint="endCharacterMaskPaint"
              @move-paint="moveCharacterMaskPaint"
              @start-paint="startCharacterMaskPaint"
              @undo="undoCharacterMaskStroke"
            />
          </div>

          <div class="draw-block draw-block-injected">
            <AiDrawInjectedTagsEditor
              v-model:negative-prompt="form.promptNegative"
              v-model:positive-prompt="form.promptPositive"
              :injected-tags="editableInjectedTagList"
              :should-show="!!(presetPositivePrompt || selectedStylePresetNegativeTags)"
              :tags-preview="editableInjectedTagsPreview"
            />
          </div>

          <div class="draw-block draw-block-advanced">
            <NCollapse class="advanced-panel">
              <NCollapseItem title="高级参数" name="advanced">
                <NGrid cols="1 m:2" :x-gap="12" :y-gap="4" responsive="screen">
                  <NGridItem>
                    <NFormItem label="步数">
                      <NInputNumber v-model:value="form.steps" :min="8" :max="80" />
                    </NFormItem>
                  </NGridItem>
                  <NGridItem>
                    <NFormItem label="CFG">
                      <NInputNumber v-model:value="form.cfg" :min="1" :max="20" :step="0.5" />
                    </NFormItem>
                  </NGridItem>
                  <NGridItem>
                    <NFormItem label="Seed">
                      <NInputNumber v-model:value="form.seed" :min="1" clearable placeholder="留空随机" />
                    </NFormItem>
                  </NGridItem>
                  <NGridItem>
                    <NFormItem label="风格补充 tag">
                      <NInput v-model:value="form.styleTags" clearable placeholder="masterpiece, cinematic lighting" />
                    </NFormItem>
                  </NGridItem>
                  <NGridItem>
                    <NFormItem label="角色/LoRA 触发词">
                      <NInput v-model:value="form.triggerWords" clearable placeholder="选择角色后可自动填入，也可手动编辑" />
                    </NFormItem>
                  </NGridItem>
                </NGrid>
              </NCollapseItem>
            </NCollapse>
          </div>

          <div class="draw-block draw-block-generate draw-inline-generate">
            <NButton type="primary" size="large" block :loading="generating" :disabled="!canAttemptGenerate" @click="generate">
              <template #icon>
                <NIcon><SparklesOutline /></NIcon>
              </template>
              {{ generateButtonText }}
            </NButton>
          </div>
        </NForm>
      </NCard>

      <div class="draw-side" :class="{ 'has-active-job': Boolean(activeJob) }">
        <AiDrawActiveJobCard :active-job="activeJob" @download="downloadJob" />
        <AiDrawRecentJobsCard :history-loading="historyLoading" :recent-jobs="recentJobs" @reuse="fillAgain" />
      </div>
    </div>

    <div v-if="!isChatMode" class="mobile-action-bar draw-mobile-cta">
      <NButton type="primary" size="large" block :loading="generating" :disabled="!canAttemptGenerate" @click="generate">
        <template #icon>
          <NIcon><SparklesOutline /></NIcon>
        </template>
        {{ generateButtonText }}
      </NButton>
    </div>
  </div>
</template>

<style scoped>
/* 工作台锁在可视区高度内：页面本身不滚动，只有各面板内部滚动 */
.ai-page {
  /* 控制台页头 64 + 内容区上留白 28 */
  --ai-page-chrome: calc(92px + env(safe-area-inset-bottom, 0px));
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: calc(100vh - var(--ai-page-chrome));
  height: calc(100dvh - var(--ai-page-chrome));
  min-height: 0;
  overflow: hidden;
}

/* 播放条出现在底部时才为它补回 96px 下留白 */
.ai-page.has-mini-player {
  --ai-page-chrome: calc(188px + env(safe-area-inset-bottom, 0px));
}

/* 无播放条时抵消内容区为它预留的底部留白，避免大片空白 */
@media (min-width: 981px) {
  .ai-page:not(.has-mini-player) {
    margin-bottom: calc(-96px - env(safe-area-inset-bottom, 0px));
  }

  /* 对话模式单行化：标题 + 分区切换 + 状态并排，省下一整行给对话区 */
  .ai-page.is-chat-mode {
    display: grid;
    grid-template-columns: auto auto minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr);
    gap: 10px 14px;
  }

  .ai-page.is-chat-mode .ui-page-header > div:first-child,
  .ai-page.is-chat-mode .ai-toolbar,
  .ai-page.is-chat-mode .ai-head-actions {
    align-self: center;
  }

  .ai-page.is-chat-mode .ui-page-header {
    display: contents;
  }

  .ai-page.is-chat-mode .ui-page-header > div:first-child {
    grid-row: 1;
    grid-column: 1;
  }

  .ai-page.is-chat-mode .ui-page-subtitle {
    display: none;
  }

  .ai-page.is-chat-mode .ai-toolbar {
    grid-row: 1;
    grid-column: 2;
    justify-content: flex-start;
  }

  .ai-page.is-chat-mode .ai-head-actions {
    grid-row: 1;
    grid-column: 3;
    justify-self: end;
  }

  .ai-page.is-chat-mode > .chat-card {
    grid-row: 2;
    grid-column: 1 / -1;
  }
}

.ai-page > * {
  flex: 0 0 auto;
  min-width: 0;
}

.ai-page .ui-page-header {
  align-items: center;
  gap: 12px;
  margin-bottom: 0;
}

.ai-page .ui-page-title {
  font-size: 24px;
}

.ai-page .ui-page-subtitle {
  margin-top: 2px;
  font-size: 13px;
}

.ai-head-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 10px;
}

.ai-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.ai-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  min-height: 30px;
  padding: 3px 12px;
  border: 1px solid rgba(255, 255, 255, 0.82);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.62);
  box-shadow: var(--ui-shadow-sm);
  color: #64748b;
  font-size: 12px;
}

.ai-status-dot {
  flex: 0 0 auto;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #94a3b8;
  box-shadow: 0 0 0 4px rgba(148, 163, 184, 0.18);
}

.ai-status.is-success .ai-status-dot {
  background: #10b981;
  box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.18);
}

.ai-status.is-error .ai-status-dot {
  background: #ef4444;
  box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.18);
}

.ai-status.is-info .ai-status-dot {
  background: var(--ui-primary);
  box-shadow: 0 0 0 4px var(--ui-primary-soft);
}

.ai-status strong {
  color: #334155;
  font-size: 12px;
  font-weight: 800;
}

.ai-status-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 主体区域吃满剩余高度 */
.ai-page > .draw-layout,
.ai-page > .chat-card {
  flex: 1 1 auto;
  min-height: 0;
}

/* 绘制设置保持较小尺寸，右侧留给任务结果与历史 */
.draw-layout {
  display: grid;
  grid-template-columns: minmax(340px, 480px) minmax(0, 1fr);
  gap: 16px;
  height: 100%;
  min-height: 0;
}

.draw-card,
.draw-side .result-card,
.draw-side .recent-card {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-radius: var(--ui-radius-md);
}

/* 栅格子项默认 min-width:auto，会被内部横向轨道撑破布局，这里显式允许收缩 */
.draw-card,
.draw-side {
  min-width: 0;
}

.ai-page.ui-page :deep(.n-card-header) {
  padding-top: 14px;
  padding-bottom: 12px;
}

.ai-page .draw-card :deep(.n-card__content) {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.draw-side {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  min-height: 0;
}

.draw-side .result-card {
  position: static;
  flex: 1.4 1 0;
}

.draw-side:not(.has-active-job) .result-card {
  flex: 0 0 auto;
}

.draw-side .recent-card {
  flex: 1 1 0;
}

.ai-page .draw-side :deep(.n-card__content) {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--ui-text);
  font-weight: 800;
}

.worker-alert {
  margin-bottom: 14px;
}

.mode-switch {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
}

.mode-switch span {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.visibility-level-field,
.size-presets {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  width: 100%;
  margin-bottom: 10px;
}

.prompt-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin: 16px 0 16px;
  color: #64748b;
  font-size: 12px;
}

.prompt-actions :deep(.n-button) {
  flex: 0 0 auto;
}

.prompt-actions span {
  min-width: 0;
  overflow-wrap: anywhere;
}

.preset-picker-group,
.preset-picker-section,
.style-preset-summary {
  display: grid;
  gap: 6px;
  min-width: 0;
  width: 100%;
}

.preset-picker-group {
  gap: 12px;
}

.preset-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.preset-section-head strong {
  min-width: 0;
  color: #263247;
  font-size: 13px;
  overflow-wrap: anywhere;
}

.preset-section-head span {
  flex: 0 0 auto;
  color: #64748b;
  font-size: 12px;
}

.field-hint {
  margin-top: 6px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.asset-picker-field {
  display: grid;
  gap: 8px;
  width: 100%;
}

.asset-trigger {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 12px;
  width: 100%;
  min-height: 86px;
  padding: 8px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.78);
  color: inherit;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.asset-trigger:hover {
  border-color: rgba(56, 189, 248, 0.72);
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.08);
  transform: translateY(-1px);
}

.asset-preview,
.asset-card-preview {
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 8px;
  background: linear-gradient(135deg, #e0f2fe, #f8fafc 52%, #fee2e2);
  color: #475569;
  font-size: 12px;
  font-weight: 800;
}

.asset-preview {
  width: 72px;
  height: 72px;
}

.asset-preview img,
.asset-card-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.asset-trigger-text {
  display: grid;
  align-content: center;
  gap: 3px;
  min-width: 0;
}

.asset-trigger-text small {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.asset-trigger-text strong {
  color: #263247;
  font-size: 15px;
  overflow-wrap: anywhere;
}

.asset-trigger-text em {
  display: -webkit-box;
  overflow: hidden;
  color: #64748b;
  font-size: 12px;
  font-style: normal;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.asset-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.dual-character-panel {
  margin: 0 0 16px;
  padding: 12px;
  border: 1px solid rgba(14, 165, 233, 0.18);
  border-radius: 8px;
  background: rgba(224, 242, 254, 0.34);
}

.asset-detail {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  width: 100%;
  margin-top: 8px;
  padding: 10px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.84);
}

.asset-detail div {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.asset-detail span {
  color: #64748b;
  font-size: 11px;
}

.asset-detail strong {
  color: #334155;
  font-size: 12px;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.asset-detail-wide {
  grid-column: 1 / -1;
}

.asset-selector {
  display: grid;
  gap: 14px;
  height: 100%;
  min-height: 0;
}

.preset-selector-modal :deep(.n-card__content) {
  display: grid;
  height: calc(min(960px, 96vh) - 72px);
  min-height: 0;
  overflow: hidden;
}

.asset-selector :deep(.n-tabs) {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.asset-selector :deep(.n-tab-pane),
.asset-selector :deep(.n-tabs-pane-wrapper) {
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.asset-selector-tab {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 12px;
  height: 100%;
  min-height: 0;
  padding-top: 8px;
}

.asset-selector-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  min-height: 0;
}

.asset-selector-toolbar .field-hint {
  max-height: 40px;
  margin-top: 0;
  overflow: auto;
}

.asset-browser {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 14px;
  align-items: stretch;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.asset-tree-pane,
.asset-list-pane {
  min-width: 0;
  min-height: 0;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.72);
}

.asset-tree-pane {
  max-height: none;
  height: 100%;
  overflow: auto;
  padding: 8px;
}

.asset-tree-pane :deep(.n-tree-node-content__text) {
  font-size: 12px;
}

.asset-list-pane {
  max-height: none;
  height: 100%;
  overflow: auto;
  padding: 10px;
}

.asset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 12px;
}

.asset-card {
  display: grid;
  grid-template-columns: 68px minmax(0, 1fr);
  gap: 10px;
  min-height: 114px;
  padding: 10px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.86);
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.asset-card:hover,
.asset-card.active {
  border-color: rgba(14, 165, 233, 0.78);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.1);
}

.asset-card.chosen {
  background: rgba(224, 242, 254, 0.78);
}

.style-preset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  align-content: start;
  gap: 12px;
  max-height: none;
  height: 100%;
  overflow: auto;
  padding: 10px;
}

.style-preset-shell {
  height: 100%;
  min-height: 0;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.72);
  overflow: hidden;
}

.style-preset-card {
  display: grid;
  grid-template-rows: auto auto minmax(42px, 1fr) auto auto;
  gap: 7px;
  min-width: 0;
  min-height: 176px;
  padding: 12px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.88);
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.style-preset-card:hover {
  border-color: rgba(14, 165, 233, 0.78);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.1);
}

.style-preset-card.chosen {
  border-color: rgba(14, 165, 233, 0.9);
  background: rgba(224, 242, 254, 0.86);
}

.style-preset-state {
  display: flex;
  align-items: center;
  min-width: 0;
}

.style-preset-card strong {
  min-width: 0;
  color: #263247;
  font-size: 15px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.style-preset-card em {
  display: -webkit-box;
  min-width: 0;
  overflow: hidden;
  color: #64748b;
  font-size: 12px;
  font-style: normal;
  line-height: 1.45;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.asset-card-preview {
  width: 68px;
  height: 92px;
  align-self: start;
  font-size: 15px;
}

.asset-card-body {
  display: grid;
  align-content: start;
  gap: 5px;
  min-width: 0;
}

.asset-card-topline {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.asset-card-topline small {
  min-width: 0;
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.asset-card strong {
  color: #263247;
  font-size: 14px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.asset-card em,
.asset-card-meta,
.asset-card-notes {
  min-width: 0;
  color: #64748b;
  font-size: 12px;
  font-style: normal;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.asset-card-actions {
  display: flex;
  justify-content: flex-start;
  padding-top: 2px;
}

.asset-card-notes {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.asset-detail-modal {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}

.style-preset-detail-modal {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.style-preset-detail-notes {
  margin: 0;
  color: #64748b;
  font-size: 13px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.style-preset-detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.style-preset-detail-grid section {
  display: grid;
  gap: 6px;
  min-width: 0;
  padding: 10px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.84);
}

.style-preset-detail-grid span {
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
}

.style-preset-detail-grid pre {
  max-height: min(34vh, 320px);
  margin: 0;
  overflow: auto;
  color: #334155;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.asset-detail-modal .asset-detail,
.asset-detail-modal :deep(.n-button) {
  grid-column: 1 / -1;
}

.asset-inspector-preview {
  display: grid;
  width: 100%;
  aspect-ratio: 3 / 4;
  place-items: center;
  overflow: hidden;
  border-radius: 8px;
  background: linear-gradient(135deg, #e0f2fe, #f8fafc 52%, #fee2e2);
  color: #475569;
  font-size: 24px;
  font-weight: 900;
}

.asset-inspector-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.asset-inspector-head {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.asset-inspector-head strong {
  color: #263247;
  font-size: 16px;
  overflow-wrap: anywhere;
}

.asset-inspector-head em {
  color: #64748b;
  font-size: 12px;
  font-style: normal;
  overflow-wrap: anywhere;
}

.advanced-panel {
  margin-bottom: 16px;
}

.draw-form {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
}

/* 生成按钮常驻面板底部，随时可点，不必滚到底 */
.draw-block-generate {
  position: sticky;
  bottom: 0;
  z-index: 3;
  margin-top: 4px;
  padding-top: 12px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, rgba(255, 250, 252, 0.94) 46%);
}

.draw-mobile-cta {
  width: 100%;
}

.draw-mobile-cta :deep(.n-button) {
  flex: 1 1 auto;
}

@media (max-width: 980px) {
  /* 窄屏改成常规文档流，避免出现两段嵌套滚动 */
  .ai-page.is-form-mode {
    height: auto;
    overflow: visible;
  }

  .draw-layout {
    grid-template-columns: minmax(0, 1fr);
    height: auto;
  }

  .draw-card,
  .draw-side,
  .draw-side .result-card,
  .draw-side .recent-card {
    height: auto;
    flex: 0 0 auto;
  }

  .ai-page .draw-card :deep(.n-card__content),
  .ai-page .draw-side :deep(.n-card__content) {
    overflow: visible;
  }

  .draw-block-generate {
    position: static;
  }

  .asset-selector-toolbar,
  .asset-browser,
  .asset-detail-modal,
  .asset-detail,
  .style-preset-detail-grid {
    grid-template-columns: 1fr;
  }

  .asset-tree-pane,
  .asset-list-pane {
    max-height: none;
  }

  .asset-card {
    grid-template-columns: 64px minmax(0, 1fr);
  }

  .asset-card-preview {
    width: 64px;
    height: 86px;
  }

  .style-preset-grid {
    grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  }

  .style-preset-detail-grid pre {
    max-height: 220px;
  }
}

@media (max-width: 768px) {
  .ai-page .ui-page-header {
    align-items: stretch;
  }

  .ai-status-text { display: none; }

  .draw-block-prompt { order: 1; }
  .draw-block-size { order: 2; }
  .draw-block-assets { order: 3; }
  .draw-block-mode { order: 4; }
  .draw-block-prompts { order: 5; }
  .draw-block-dual { order: 6; }
  .draw-block-injected { order: 7; }
  .draw-block-advanced { order: 8; }
  .draw-block-generate { order: 9; }

  .draw-inline-generate {
    display: none;
  }

  .draw-mobile-cta {
    position: fixed;
    left: 14px;
    right: 14px;
    bottom: calc(72px + env(safe-area-inset-bottom, 0px));
    z-index: 40;
  }

  .ai-page {
    padding-bottom: 88px;
  }

  .ai-page.is-chat-mode {
    /* 移动端头部 56 + 内容区上留白 16 */
    --ai-page-chrome: calc(72px + env(safe-area-inset-bottom, 0px));
    padding-bottom: 0;
  }

  .ai-page.is-chat-mode .ui-page-subtitle {
    display: none;
  }

  .ai-page.is-chat-mode.has-mini-player {
    --ai-page-chrome: calc(152px + env(safe-area-inset-bottom, 0px));
  }

  .ai-page.is-chat-mode:not(.has-mini-player) {
    margin-bottom: calc(-80px - env(safe-area-inset-bottom, 0px));
  }

  .size-presets {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .size-presets :deep(.n-radio-button) {
    width: 100%;
  }

  .size-presets :deep(.n-radio-button__state-border) {
    inset: 0;
  }
}

@media (max-width: 640px) {
  .ai-page {
    gap: 12px;
  }

  .draw-layout {
    gap: 12px;
  }

  .preset-section-head {
    align-items: flex-start;
  }

  .asset-trigger {
    grid-template-columns: 58px minmax(0, 1fr);
    min-height: 74px;
    gap: 10px;
  }

  .asset-preview {
    width: 58px;
    height: 58px;
  }

  .asset-actions :deep(.n-button) {
    flex: 1 1 auto;
    min-width: 0;
  }

  .style-preset-grid {
    grid-template-columns: 1fr;
    gap: 10px;
    padding: 8px;
  }

  .style-preset-card {
    min-height: auto;
    padding: 10px;
  }

  .style-preset-card strong {
    font-size: 14px;
  }

  .preset-selector-modal :deep(.n-card__content) {
    height: calc(92vh - 72px);
  }

}
</style>
