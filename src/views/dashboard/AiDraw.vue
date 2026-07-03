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
  NSpace,
  NSwitch,
  NTag,
} from 'naive-ui'
import AiDrawActiveJobCard from '@/components/ai-draw/AiDrawActiveJobCard.vue'
import AiDrawAssetComposer from '@/components/ai-draw/AiDrawAssetComposer.vue'
import AiDrawCharacterMaskPanel from '@/components/ai-draw/AiDrawCharacterMaskPanel.vue'
import AiDrawInjectedTagsEditor from '@/components/ai-draw/AiDrawInjectedTagsEditor.vue'
import AiDrawRecentJobsCard from '@/components/ai-draw/AiDrawRecentJobsCard.vue'
import { useAiDrawPage } from '@/composables/useAiDrawPage'

const {
  activeJob,
  canGenerate,
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
  generate,
  generateButtonText,
  generating,
  hasCharacterMaskStrokes,
  hasCompleteCharacterMaskStrokes,
  historyLoading,
  isAdmin,
  isDualMode,
  loadCapabilities,
  loadingCapabilities,
  moveCharacterMaskPaint,
  openAssetSelector,
  openCharacterSelector,
  openLoraSelector,
  points,
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
} = useAiDrawPage()
</script>

<template>
  <div class="ai-page ui-page">
    <div class="ui-page-header">
      <div>
        <h1 class="ui-page-title">
          AI 绘图
        </h1>
        <p class="ui-page-subtitle">
          每张图消耗 <b>{{ COST_PER_IMAGE }}</b> 积分，管理员免费。AI绘画正式版已开放，机器在线即可使用。
        </p>
      </div>
      <NSpace>
        <NTag round :type="isAdmin ? 'success' : 'info'">
          {{ isAdmin ? '管理员免费' : pointsLoading ? '积分加载中' : `${points} 积分` }}
        </NTag>
        <NButton secondary :loading="loadingCapabilities" @click="loadCapabilities">
          <template #icon>
            <NIcon><RefreshOutline /></NIcon>
          </template>
          刷新模型
        </NButton>
      </NSpace>
    </div>

    <NAlert :type="serviceStatusType" class="service-alert">
      <div class="service-status">
        <div>
          <strong>{{ serviceStatusLabel }}</strong>
          <span>{{ serviceStatusMessage }}</span>
          <small>开放规则：正式版不限时，机器在线即可使用。</small>
          <small>{{ queueStatusText }}</small>
        </div>
        <NTag round :type="serviceStatusType">
          {{ serviceStatus?.online ? `${serviceStatus.activeWorkerCount || 0} 个Worker在线` : 'Worker离线' }}
        </NTag>
      </div>
    </NAlert>

    <div class="draw-layout">
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

        <NForm label-placement="top">
          <NFormItem label="生成模式">
            <div class="mode-switch">
              <NRadioGroup v-model:value="form.generationMode">
                <NRadioButton value="SINGLE">
                  单角色
                </NRadioButton>
                <NRadioButton value="DUAL">
                  双角色
                </NRadioButton>
              </NRadioGroup>
              <span>{{ isAdmin ? '管理员免费' : `本次预计消耗 ${selectedGenerationCost} 积分` }}</span>
            </div>
          </NFormItem>

          <NFormItem label="NSFW 兼容模式">
            <div class="mode-switch">
              <NSwitch v-model:value="form.nsfwMode" @update:value="handleNsfwModeChange">
                <template #checked>
                  已开启
                </template>
                <template #unchecked>
                  已关闭
                </template>
              </NSwitch>
              <span>
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
              <span>只在 NSFW 开启时生效；强度越高，遮挡负面词和局部重绘幅度越强。</span>
            </div>
          </NFormItem>

          <NFormItem label="自然语言描绘">
            <NInput
              v-model:value="form.promptCn"
              type="textarea"
              :autosize="{ minRows: 5, maxRows: 10 }"
              maxlength="1000"
              show-count
              placeholder="例如：银发少女，雨夜街角，霓虹灯，电影感光影"
            />
          </NFormItem>

          <NFormItem label="画幅">
            <NRadioGroup v-model:value="selectedSize" class="size-presets" @update:value="applySizePreset">
              <NRadioButton v-for="preset in sizePresets" :key="preset.value" :value="preset.value">
                {{ preset.label }}
              </NRadioButton>
            </NRadioGroup>
          </NFormItem>

          <div class="prompt-actions">
            <NButton secondary :loading="translating" :disabled="!serviceReady || !form.promptCn.trim()" @click="preparePrompt">
              生成提示词
            </NButton>
            <span>{{ form.width }} x {{ form.height }} · {{ form.steps }} steps · CFG {{ form.cfg }}</span>
          </div>

          <NGrid :cols="2" :x-gap="12" :y-gap="4" responsive="screen">
            <NGridItem>
              <NFormItem label="正向提示词">
                <NInput
                  v-model:value="form.promptPositive"
                  type="textarea"
                  :autosize="{ minRows: 4, maxRows: 8 }"
                  placeholder="可选：补充场景、动作、镜头；不填则使用已选预设 tags"
                />
              </NFormItem>
            </NGridItem>
            <NGridItem>
              <NFormItem label="反向提示词">
                <NInput
                  v-model:value="form.promptNegative"
                  type="textarea"
                  :autosize="{ minRows: 4, maxRows: 8 }"
                />
              </NFormItem>
            </NGridItem>
          </NGrid>

          <NGrid :cols="2" :x-gap="12" :y-gap="4" responsive="screen">
            <NGridItem>
              <NFormItem label="Checkpoint">
                <NSelect v-model:value="form.checkpoint" :options="checkpointOptions" filterable />
              </NFormItem>
            </NGridItem>
            <NGridItem>
              <NFormItem label="主 LoRA 强度">
                <NInputNumber v-model:value="form.loraStrength" :min="0" :max="2" :step="0.05" :disabled="!form.loraName" />
              </NFormItem>
            </NGridItem>
          </NGrid>

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
          <div v-if="isDualMode" class="dual-character-panel">
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
              双角色会按两张图计费。不画区域时使用普通双角色生成；同时画出角色 A/B 范围后只作为构图参考，不会再触发区域 mask。
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

          <AiDrawInjectedTagsEditor
            v-model:negative-prompt="form.promptNegative"
            v-model:positive-prompt="form.promptPositive"
            :injected-tags="editableInjectedTagList"
            :should-show="!!(presetPositivePrompt || selectedStylePresetNegativeTags)"
            :tags-preview="editableInjectedTagsPreview"
          />

          <NCollapse class="advanced-panel">
            <NCollapseItem title="高级参数" name="advanced">
              <NGrid :cols="2" :x-gap="12" :y-gap="4" responsive="screen">
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

          <NButton type="primary" size="large" block :loading="generating" :disabled="!canGenerate" @click="generate">
            <template #icon>
              <NIcon><SparklesOutline /></NIcon>
            </template>
            {{ generateButtonText }}
          </NButton>
        </NForm>
      </NCard>

      <AiDrawActiveJobCard :active-job="activeJob" @download="downloadJob" />
    </div>

    <AiDrawRecentJobsCard :history-loading="historyLoading" :recent-jobs="recentJobs" @reuse="fillAgain" />
  </div>
</template>

<style scoped>
.ai-page {
  display: grid;
  gap: 18px;
}

.draw-layout {
  display: grid;
  grid-template-columns: minmax(360px, 560px) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.draw-card {
  border-radius: 8px;
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

.service-alert {
  border-radius: 8px;
}

.service-status {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.service-status > div {
  display: grid;
  gap: 3px;
}

.service-status span {
  line-height: 1.6;
}

.service-status small {
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
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

@media (max-width: 980px) {
  .draw-layout {
    grid-template-columns: 1fr;
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
