<script setup lang="ts">
import { ArrowBackOutline, CheckmarkOutline, InformationCircleOutline, RefreshOutline } from '@vicons/ionicons5'
import {
  NButton,
  NEmpty,
  NIcon,
  NInput,
  NModal,
  NPagination,
  NRadioButton,
  NRadioGroup,
  NSelect,
  NSkeleton,
  NTabPane,
  NTabs,
  NTag,
  NTree,
} from 'naive-ui'
import { useAiAssetSelector } from '@/composables/useAiAssetSelector'

const {
  ALL_DIRECTORY_KEY,
  PAGE_SIZE_OPTIONS,
  activeTab,
  assetCompactSummary,
  assetDetailKind,
  assetDetailOpen,
  assetDetailTarget,
  cancel,
  characterDirectoryKeys,
  characterDirectoryTree,
  characterPage,
  characterPageSize,
  characterSearch,
  clearCharacter,
  clearLora,
  clearStylePresets,
  currentCharacterAsset,
  currentLoraAsset,
  done,
  draft,
  filteredCharacterAssets,
  filteredLoraAssets,
  filteredStylePresets,
  isSelectedCharacter,
  isSelectedLora,
  isSelectedStylePreset,
  loadCapabilities,
  loading,
  loraDirectoryKeys,
  loraDirectoryTree,
  loraPage,
  loraPageSize,
  loraSearch,
  openAssetDetail,
  openStyleDetail,
  paginatedCharacterAssets,
  paginatedLoraAssets,
  paginatedStylePresets,
  selectCharacter,
  selectDirectory,
  selectLora,
  selectedStylePresets,
  styleCheckpointFilter,
  styleCheckpointOptions,
  styleDetailOpen,
  styleDetailTarget,
  styleDirectoryKeys,
  stylePage,
  stylePageSize,
  stylePresetSummary,
  styleSafetyFilter,
  styleSafetyOptions,
  styleSearch,
  styleSummary,
  target,
  toggleStylePreset,
  visibleStylePresetDirectoryTree,
} = useAiAssetSelector()
</script>

<template>
  <div class="ai-asset-page ui-page">
    <div class="asset-page-head">
      <div>
        <h1 class="ui-page-title">
          AI 资产选择
        </h1>
        <p class="ui-page-subtitle">
          统一选择 LoRA、角色预设和风格预设
        </p>
      </div>
      <div class="asset-page-actions">
        <NButton secondary :loading="loading" @click="loadCapabilities">
          <template #icon>
            <NIcon><RefreshOutline /></NIcon>
          </template>
          刷新
        </NButton>
        <NButton secondary @click="cancel">
          <template #icon>
            <NIcon><ArrowBackOutline /></NIcon>
          </template>
          取消
        </NButton>
        <NButton type="primary" @click="done">
          <template #icon>
            <NIcon><CheckmarkOutline /></NIcon>
          </template>
          完成
        </NButton>
      </div>
    </div>

    <section class="asset-workbench">
      <NTabs v-model:value="activeTab" type="segment" animated>
        <NTabPane name="lora" tab="LoRA">
          <div class="asset-tab-shell">
            <div class="asset-toolbar">
              <NInput v-model:value="loraSearch" clearable placeholder="搜索显示名、文件名、触发词、分类或说明" />
              <NRadioGroup v-model:value="target" size="small">
                <NRadioButton value="primary">
                  主 LoRA
                </NRadioButton>
                <NRadioButton value="secondary">
                  LoRA B
                </NRadioButton>
              </NRadioGroup>
              <NButton secondary :disabled="!currentLoraAsset" @click="clearLora">
                不使用
              </NButton>
            </div>
            <div class="asset-current">
              <span>{{ target === 'secondary' ? '当前 LoRA B' : '当前主 LoRA' }}</span>
              <strong>{{ currentLoraAsset?.displayName || '不使用 LoRA' }}</strong>
              <em>{{ assetCompactSummary(currentLoraAsset, '当前不会加载 LoRA') }}</em>
            </div>
            <div class="asset-browser">
              <aside class="asset-tree-pane">
                <NTree
                  block-line
                  :data="loraDirectoryTree"
                  :selected-keys="loraDirectoryKeys"
                  :default-expanded-keys="[ALL_DIRECTORY_KEY]"
                  @update:selected-keys="loraDirectoryKeys = selectDirectory($event)"
                />
              </aside>
              <div class="asset-list-pane">
                <NSkeleton v-if="loading" text :repeat="8" />
                <div v-else-if="filteredLoraAssets.length" class="asset-grid">
                  <article
                    v-for="asset in paginatedLoraAssets"
                    :key="asset.name"
                    role="button"
                    tabindex="0"
                    class="asset-card"
                    :class="{ chosen: isSelectedLora(asset) }"
                    @click="selectLora(asset)"
                    @keydown.enter.prevent="selectLora(asset)"
                    @keydown.space.prevent="selectLora(asset)"
                  >
                    <span class="asset-card-preview">
                      <img v-if="asset.previewImage" :src="asset.previewImage" :alt="asset.displayName">
                      <span v-else>{{ asset.displayName.slice(0, 2) }}</span>
                    </span>
                    <span class="asset-card-body">
                      <span class="asset-card-topline">
                        <NTag size="small" round>{{ asset.category }}</NTag>
                        <small v-if="asset.categoryType">{{ asset.categoryType }}</small>
                      </span>
                      <strong>{{ asset.displayName }}</strong>
                      <em>{{ asset.fileName }}</em>
                      <span class="asset-card-model">
                        推荐模型：{{ asset.recommendedCheckpoint || '未配置' }}
                      </span>
                      <span class="asset-card-meta">{{ assetCompactSummary(asset, '未配置触发词') }}</span>
                      <span class="asset-card-actions">
                        <NButton size="tiny" secondary @click.stop="openAssetDetail('lora', asset)">
                          <template #icon>
                            <NIcon><InformationCircleOutline /></NIcon>
                          </template>
                          详情
                        </NButton>
                      </span>
                    </span>
                  </article>
                </div>
                <NPagination
                  v-if="filteredLoraAssets.length"
                  v-model:page="loraPage"
                  v-model:page-size="loraPageSize"
                  show-size-picker
                  :item-count="filteredLoraAssets.length"
                  :page-sizes="PAGE_SIZE_OPTIONS"
                  class="asset-pagination"
                />
                <NEmpty v-else description="没有匹配的 LoRA" />
              </div>
            </div>
          </div>
        </NTabPane>

        <NTabPane name="character" tab="角色预设">
          <div class="asset-tab-shell">
            <div class="asset-toolbar">
              <NInput v-model:value="characterSearch" clearable placeholder="搜索角色、作品/风格分类、触发词或说明" />
              <NRadioGroup v-model:value="target" size="small">
                <NRadioButton value="primary">
                  角色 A
                </NRadioButton>
                <NRadioButton value="secondary">
                  角色 B
                </NRadioButton>
              </NRadioGroup>
              <NButton secondary :disabled="!currentCharacterAsset" @click="clearCharacter">
                不使用
              </NButton>
            </div>
            <div class="asset-current">
              <span>{{ target === 'secondary' ? '当前角色 B' : '当前角色 A' }}</span>
              <strong>{{ currentCharacterAsset?.displayName || '未选择角色' }}</strong>
              <em>{{ assetCompactSummary(currentCharacterAsset, target === 'secondary' ? '用于双角色构图的角色 B' : '可从角色预设注入 tags') }}</em>
            </div>
            <div class="asset-browser">
              <aside class="asset-tree-pane">
                <NTree
                  block-line
                  :data="characterDirectoryTree"
                  :selected-keys="characterDirectoryKeys"
                  :default-expanded-keys="[ALL_DIRECTORY_KEY]"
                  @update:selected-keys="characterDirectoryKeys = selectDirectory($event)"
                />
              </aside>
              <div class="asset-list-pane">
                <NSkeleton v-if="loading" text :repeat="8" />
                <div v-else-if="filteredCharacterAssets.length" class="asset-grid">
                  <article
                    v-for="asset in paginatedCharacterAssets"
                    :key="asset.name"
                    role="button"
                    tabindex="0"
                    class="asset-card"
                    :class="{ chosen: isSelectedCharacter(asset) }"
                    @click="selectCharacter(asset)"
                    @keydown.enter.prevent="selectCharacter(asset)"
                    @keydown.space.prevent="selectCharacter(asset)"
                  >
                    <span class="asset-card-preview">
                      <img v-if="asset.previewImage" :src="asset.previewImage" :alt="asset.displayName">
                      <span v-else>{{ asset.displayName.slice(0, 2) }}</span>
                    </span>
                    <span class="asset-card-body">
                      <span class="asset-card-topline">
                        <NTag size="small" round>{{ asset.category }}</NTag>
                        <small v-if="asset.categoryType">{{ asset.categoryType }}</small>
                      </span>
                      <strong>{{ asset.displayName }}</strong>
                      <em>{{ asset.fileName }}</em>
                      <span class="asset-card-model">
                        推荐模型：{{ asset.recommendedCheckpoint || '未配置' }}
                      </span>
                      <span class="asset-card-meta">{{ assetCompactSummary(asset, '未配置触发词') }}</span>
                      <span class="asset-card-actions">
                        <NButton size="tiny" secondary @click.stop="openAssetDetail('character', asset)">
                          <template #icon>
                            <NIcon><InformationCircleOutline /></NIcon>
                          </template>
                          详情
                        </NButton>
                      </span>
                    </span>
                  </article>
                </div>
                <NPagination
                  v-if="filteredCharacterAssets.length"
                  v-model:page="characterPage"
                  v-model:page-size="characterPageSize"
                  show-size-picker
                  :item-count="filteredCharacterAssets.length"
                  :page-sizes="PAGE_SIZE_OPTIONS"
                  class="asset-pagination"
                />
                <NEmpty v-else description="没有匹配的角色预设" />
              </div>
            </div>
          </div>
        </NTabPane>

        <NTabPane name="style" tab="风格预设">
          <div class="asset-tab-shell">
            <div class="asset-toolbar style-toolbar">
              <NInput v-model:value="styleSearch" clearable placeholder="搜索风格、分类、正向或反向 tags" />
              <NRadioGroup v-model:value="styleSafetyFilter" size="small" class="style-safety-tabs">
                <NRadioButton value="all">
                  全部 {{ styleSafetyOptions.all }}
                </NRadioButton>
                <NRadioButton value="sfw">
                  SFW {{ styleSafetyOptions.sfw }}
                </NRadioButton>
                <NRadioButton value="nsfw">
                  NSFW {{ styleSafetyOptions.nsfw }}
                </NRadioButton>
              </NRadioGroup>
              <NSelect
                v-model:value="styleCheckpointFilter"
                clearable
                :options="styleCheckpointOptions"
                placeholder="推荐模型"
                class="style-model-select"
              />
              <NButton secondary :disabled="!draft.stylePresetIds.length" @click="clearStylePresets">
                清空风格
              </NButton>
            </div>
            <div class="asset-current style-current">
              <span>当前风格</span>
              <div v-if="selectedStylePresets.length" class="style-current-presets">
                <NTag
                  v-for="preset in selectedStylePresets"
                  :key="preset.value"
                  round
                  closable
                  type="success"
                  @close="toggleStylePreset(preset.value)"
                >
                  {{ preset.label }}
                </NTag>
              </div>
              <strong v-else class="style-current-empty">{{ styleSummary }}</strong>
            </div>
            <div class="asset-browser">
              <aside class="asset-tree-pane">
                <NTree
                  block-line
                  :data="visibleStylePresetDirectoryTree"
                  :selected-keys="styleDirectoryKeys"
                  :default-expanded-keys="[ALL_DIRECTORY_KEY]"
                  @update:selected-keys="styleDirectoryKeys = selectDirectory($event)"
                />
              </aside>
              <div class="style-preset-shell">
                <NSkeleton v-if="loading" text :repeat="8" />
                <div v-else-if="filteredStylePresets.length" class="style-preset-grid">
                  <article
                    v-for="preset in paginatedStylePresets"
                    :key="preset.value"
                    role="button"
                    tabindex="0"
                    class="style-preset-card"
                    :class="{ chosen: isSelectedStylePreset(preset.value) }"
                    @click="toggleStylePreset(preset.value)"
                    @keydown.enter.prevent="toggleStylePreset(preset.value)"
                    @keydown.space.prevent="toggleStylePreset(preset.value)"
                  >
                    <span class="asset-card-topline">
                      <NTag size="small" round>{{ preset.category }}</NTag>
                      <small v-if="preset.categoryType">{{ preset.categoryType }}</small>
                    </span>
                    <strong>{{ preset.label }}</strong>
                    <span v-if="preset.recommendedCheckpoint" class="style-model-chip">
                      推荐模型：{{ preset.recommendedCheckpoint }}
                    </span>
                    <span v-else class="style-model-chip muted">推荐模型：未配置</span>
                    <em>{{ stylePresetSummary(preset) }}</em>
                    <span class="style-preset-state">
                      <NTag v-if="isSelectedStylePreset(preset.value)" size="small" type="success" round>
                        已选择
                      </NTag>
                      <NTag v-else size="small" round>
                        可加入
                      </NTag>
                    </span>
                    <span class="asset-card-actions">
                      <NButton size="tiny" secondary @click.stop="openStyleDetail(preset)">
                        <template #icon>
                          <NIcon><InformationCircleOutline /></NIcon>
                        </template>
                        详情
                      </NButton>
                    </span>
                  </article>
                </div>
                <NPagination
                  v-if="filteredStylePresets.length"
                  v-model:page="stylePage"
                  v-model:page-size="stylePageSize"
                  show-size-picker
                  :item-count="filteredStylePresets.length"
                  :page-sizes="PAGE_SIZE_OPTIONS"
                  class="asset-pagination"
                />
                <NEmpty v-else description="没有匹配的风格预设" />
              </div>
            </div>
          </div>
        </NTabPane>
      </NTabs>
    </section>

    <div class="asset-bottom-bar">
      <div>
        <strong>{{ currentLoraAsset?.displayName || '无 LoRA' }}</strong>
        <span>{{ currentCharacterAsset?.displayName || '无角色' }} · {{ selectedStylePresets.length }} 个风格</span>
      </div>
      <div>
        <NButton secondary @click="cancel">
          取消
        </NButton>
        <NButton type="primary" @click="done">
          完成
        </NButton>
      </div>
    </div>

    <NModal
      v-model:show="assetDetailOpen"
      preset="card"
      :title="assetDetailKind === 'lora' ? 'LoRA 详情' : '角色预设详情'"
      :style="{ width: '760px', maxWidth: '94vw' }"
    >
      <div v-if="assetDetailTarget" class="asset-detail-modal">
        <div class="asset-inspector-preview">
          <img v-if="assetDetailTarget.previewImage" :src="assetDetailTarget.previewImage" :alt="assetDetailTarget.displayName">
          <span v-else>{{ assetDetailTarget.displayName.slice(0, 2) }}</span>
        </div>
        <div class="asset-inspector-head">
          <NTag size="small" round>
            {{ assetDetailTarget.category }}
          </NTag>
          <strong>{{ assetDetailTarget.displayName }}</strong>
          <em>{{ assetDetailTarget.fileName }}</em>
        </div>
        <div class="asset-detail">
          <div><span>显示名</span><strong>{{ assetDetailTarget.displayName }}</strong></div>
          <div><span>文件名</span><strong>{{ assetDetailTarget.fileName }}</strong></div>
          <div><span>目录</span><strong>{{ assetDetailTarget.categoryType || '未分组' }} / {{ assetDetailTarget.category }}</strong></div>
          <div><span>触发词</span><strong>{{ assetDetailTarget.triggerWords || '未配置' }}</strong></div>
          <div><span>推荐强度</span><strong>{{ assetDetailTarget.recommendedStrength ?? '未配置' }}</strong></div>
          <div><span>适配模型</span><strong>{{ assetDetailTarget.recommendedCheckpoint || '未配置' }}</strong></div>
          <div class="asset-detail-wide">
            <span>说明</span><strong>{{ assetDetailTarget.notes || '未配置说明' }}</strong>
          </div>
        </div>
        <NButton
          type="primary"
          block
          @click="assetDetailKind === 'lora' ? selectLora(assetDetailTarget) : selectCharacter(assetDetailTarget); assetDetailOpen = false"
        >
          {{ assetDetailKind === 'lora' ? '选择这个 LoRA' : '选择这个角色预设' }}
        </NButton>
      </div>
    </NModal>

    <NModal
      v-model:show="styleDetailOpen"
      preset="card"
      title="风格预设详情"
      :style="{ width: '860px', maxWidth: '94vw' }"
    >
      <div v-if="styleDetailTarget" class="style-preset-detail-modal">
        <div class="asset-inspector-head">
          <NTag size="small" round>
            {{ styleDetailTarget.category }}
          </NTag>
          <strong>{{ styleDetailTarget.label }}</strong>
          <em v-if="styleDetailTarget.categoryType">{{ styleDetailTarget.categoryType }}</em>
        </div>
        <p class="style-preset-detail-notes">
          {{ styleDetailTarget.notes || '未配置说明' }}
        </p>
        <div class="style-preset-detail-grid">
          <section>
            <span>推荐模型</span>
            <pre>{{ styleDetailTarget.recommendedCheckpoint || '未配置' }}</pre>
          </section>
          <section>
            <span>正向提示词</span>
            <pre>{{ styleDetailTarget.tags || '无' }}</pre>
          </section>
          <section>
            <span>反向提示词</span>
            <pre>{{ styleDetailTarget.negativeTags || '无' }}</pre>
          </section>
        </div>
        <NButton
          type="primary"
          block
          @click="toggleStylePreset(styleDetailTarget.value)"
        >
          {{ isSelectedStylePreset(styleDetailTarget.value) ? '取消选择这个风格' : '选择这个风格' }}
        </NButton>
      </div>
    </NModal>
  </div>
</template>

<style scoped>
.ai-asset-page {
  display: grid;
  gap: 16px;
  padding-bottom: 74px;
}

.asset-page-head,
.asset-page-actions,
.asset-toolbar,
.asset-bottom-bar,
.asset-bottom-bar > div {
  display: flex;
  align-items: center;
  gap: 10px;
}

.asset-page-head {
  justify-content: space-between;
}

.asset-page-actions,
.asset-bottom-bar > div {
  flex-wrap: wrap;
}

.asset-workbench {
  overflow: visible;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.78);
  padding: 12px;
}

.asset-workbench :deep(.n-tabs),
.asset-workbench :deep(.n-tab-pane),
.asset-workbench :deep(.n-tabs-pane-wrapper) {
  overflow: visible;
}

.asset-tab-shell {
  display: grid;
  grid-template-rows: auto auto auto;
  gap: 12px;
  padding-top: 8px;
}

.asset-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  min-width: 0;
}

.style-toolbar {
  grid-template-columns: minmax(0, 1fr) auto auto auto;
}

.style-safety-tabs {
  white-space: nowrap;
}

.style-model-select {
  width: min(280px, 32vw);
}

.asset-current {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 4px 10px;
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.78);
}

.asset-current span,
.asset-current em {
  color: #64748b;
  font-size: 12px;
  font-style: normal;
}

.asset-current strong,
.asset-current em {
  min-width: 0;
  overflow-wrap: anywhere;
}

.asset-current em {
  grid-column: 2;
}

.style-current {
  align-items: start;
}

.style-current-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}

.style-current-presets :deep(.n-tag) {
  max-width: 100%;
  height: auto;
  min-height: 28px;
  white-space: normal;
}

.style-current-presets :deep(.n-tag__content) {
  min-width: 0;
  overflow-wrap: anywhere;
  white-space: normal;
}

.style-current-empty {
  min-width: 0;
  overflow-wrap: anywhere;
}

.asset-browser {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 14px;
  overflow: visible;
}

.asset-tree-pane,
.asset-list-pane,
.style-preset-shell {
  min-width: 0;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.72);
}

.asset-tree-pane,
.asset-list-pane,
.style-preset-shell {
  overflow: visible;
  padding: 10px;
}

.asset-tree-pane :deep(.n-tree-node-content__text) {
  font-size: 12px;
}

.asset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 12px;
}

.asset-pagination {
  justify-content: flex-end;
  margin-top: 14px;
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
.asset-card.chosen,
.style-preset-card:hover,
.style-preset-card.chosen {
  border-color: rgba(14, 165, 233, 0.88);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.1);
}

.asset-card.chosen,
.style-preset-card.chosen {
  background: rgba(224, 242, 254, 0.86);
}

.asset-card-preview,
.asset-inspector-preview {
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 8px;
  background: linear-gradient(135deg, #e0f2fe, #fce7f3);
  color: #2563eb;
  font-weight: 800;
}

.asset-card-preview {
  width: 68px;
  height: 92px;
  align-self: start;
}

.asset-card-preview img,
.asset-inspector-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
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

.asset-card-topline small,
.asset-card em,
.asset-card-model,
.asset-card-meta,
.style-preset-card em {
  min-width: 0;
  color: #64748b;
  font-size: 12px;
  font-style: normal;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.asset-card-model,
.style-model-chip {
  color: #0f766e;
  font-weight: 800;
}

.asset-card strong,
.style-preset-card strong {
  min-width: 0;
  color: #263247;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.asset-card-actions,
.style-preset-state {
  display: flex;
  align-items: center;
  gap: 8px;
}

.style-preset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.style-preset-card {
  display: grid;
  grid-template-rows: auto auto auto minmax(42px, 1fr) auto auto;
  gap: 7px;
  min-height: 176px;
  padding: 12px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.88);
  color: inherit;
  cursor: pointer;
}

.style-model-chip {
  min-width: 0;
  font-size: 11px;
  overflow-wrap: anywhere;
}

.style-model-chip.muted,
.asset-card-model {
  color: #64748b;
}

.asset-bottom-bar {
  position: sticky;
  bottom: 12px;
  z-index: 4;
  justify-content: space-between;
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(14px);
}

.asset-bottom-bar span {
  color: #64748b;
  font-size: 12px;
}

.asset-detail-modal {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 14px;
}

.asset-inspector-preview {
  width: 220px;
  min-height: 280px;
  font-size: 28px;
}

.asset-inspector-head {
  display: grid;
  align-content: start;
  gap: 6px;
  min-width: 0;
}

.asset-inspector-head strong {
  color: #263247;
  font-size: 20px;
  overflow-wrap: anywhere;
}

.asset-inspector-head em {
  color: #64748b;
  font-style: normal;
  overflow-wrap: anywhere;
}

.asset-detail {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.asset-detail div,
.style-preset-detail-grid section {
  display: grid;
  gap: 4px;
  min-width: 0;
  padding: 10px;
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.86);
}

.asset-detail .asset-detail-wide {
  grid-column: 1 / -1;
}

.asset-detail span,
.style-preset-detail-grid span {
  color: #64748b;
  font-size: 12px;
}

.asset-detail strong,
.style-preset-detail-grid pre {
  min-width: 0;
  margin: 0;
  color: #263247;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.style-preset-detail-modal {
  display: grid;
  gap: 14px;
}

.style-preset-detail-notes {
  margin: 0;
  color: #64748b;
  line-height: 1.7;
}

.style-preset-detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

@media (max-width: 860px) {
  .asset-page-head,
  .asset-bottom-bar,
  .asset-toolbar,
  .asset-browser,
  .asset-detail-modal,
  .asset-detail,
  .style-preset-detail-grid {
    grid-template-columns: 1fr;
  }

  .asset-page-head,
  .asset-bottom-bar {
    align-items: stretch;
  }

  .asset-page-actions,
  .asset-bottom-bar,
  .asset-bottom-bar > div {
    justify-content: stretch;
  }

  .asset-page-actions :deep(.n-button),
  .asset-bottom-bar :deep(.n-button) {
    flex: 1 1 auto;
  }

  .style-model-select {
    width: 100%;
  }

  .asset-browser {
    overflow: visible;
  }

  .asset-pagination {
    justify-content: center;
  }

  .asset-inspector-preview {
    width: 100%;
    min-height: 220px;
  }

  .asset-current,
  .asset-current em {
    grid-column: auto;
  }
}
</style>
