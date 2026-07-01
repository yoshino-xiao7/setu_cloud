<script setup lang="ts">
import type { AiCapabilityResponse, AiNsfwVisibilityLevel } from '@/api/aiGeneration'
import type { AssetOption, StylePromptPreset } from '@/composables/useAiAssets'
import { ArrowBackOutline, CheckmarkOutline, InformationCircleOutline, RefreshOutline } from '@vicons/ionicons5'
import {
  NButton,
  NEmpty,
  NIcon,
  NInput,
  NModal,
  NRadioButton,
  NRadioGroup,
  NSkeleton,
  NTabPane,
  NTabs,
  NTag,
  NTree,
  useMessage,
} from 'naive-ui'
import { computed, onMounted, reactive, ref, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchAiCapabilities } from '@/api/aiGeneration'
import { unwrapApiData } from '@/api/response'
import {
  ALL_DIRECTORY_KEY,
  assetCompactSummary,
  assetDirectoryTree,
  filterAssets,
  firstNumber,
  firstText,
  parseMetadata,
  toAssetOption,
  toStylePromptPreset,
} from '@/composables/useAiAssets'
import { shouldIgnoreApiError, showApiError } from '@/composables/useApiError'
import { useAiDrawDraftStore } from '@/stores/aiDrawDraft'

type SelectorTab = 'lora' | 'character' | 'style'
type SelectorTarget = 'primary' | 'secondary'

const NSFW_LORA_STRENGTHS: Record<AiNsfwVisibilityLevel, number> = {
  LIGHT: 0.65,
  STANDARD: 0.6,
  STRONG: 0.55,
}

const route = useRoute()
const router = useRouter()
const message = useMessage()
const draftStore = useAiDrawDraftStore()

const activeTab = ref<SelectorTab>(normalizeTab(route.query.tab))
const target = ref<SelectorTarget>(normalizeTarget(route.query.target))
const loading = ref(false)
const loraSearch = ref('')
const characterSearch = ref('')
const styleSearch = ref('')
const loraDirectoryKeys = ref<string[]>([ALL_DIRECTORY_KEY])
const characterDirectoryKeys = ref<string[]>([ALL_DIRECTORY_KEY])
const styleDirectoryKeys = ref<string[]>([ALL_DIRECTORY_KEY])
const assetDetailOpen = ref(false)
const assetDetailKind = ref<'lora' | 'character'>('lora')
const assetDetailTarget = ref<AssetOption | null>(null)
const styleDetailOpen = ref(false)
const styleDetailTarget = ref<StylePromptPreset | null>(null)

const capabilities = shallowRef<AiCapabilityResponse>({
  checkpoints: [],
  loras: [],
  vaes: [],
  characters: [],
  promptPresets: [],
  workers: [],
})

const draft = reactive({
  generationMode: draftStore.generationMode,
  nsfwMode: draftStore.nsfwMode,
  nsfwVisibilityLevel: draftStore.nsfwVisibilityLevel,
  loraName: draftStore.loraName,
  loraStrength: draftStore.loraStrength,
  characterId: draftStore.characterId,
  secondLoraName: draftStore.secondLoraName,
  secondLoraStrength: draftStore.secondLoraStrength,
  secondCharacterId: draftStore.secondCharacterId,
  triggerWords: draftStore.triggerWords,
  styleTags: draftStore.styleTags,
  stylePresetIds: [...draftStore.stylePresetIds],
})

function normalizeTab(value: unknown): SelectorTab {
  return value === 'character' || value === 'style' || value === 'lora' ? value : 'lora'
}

function normalizeTarget(value: unknown): SelectorTarget {
  return value === 'secondary' ? 'secondary' : 'primary'
}

function selectDirectory(keys: Array<string | number>) {
  return [String(keys[0] || ALL_DIRECTORY_KEY)]
}

const loraAssets = computed(() => capabilities.value.loras.map(item => toAssetOption(item, '未分类')))
const characterAssets = computed(() => capabilities.value.characters.map(item => toAssetOption(item, '未分类角色')))
const stylePresets = computed(() => (capabilities.value.promptPresets || [])
  .map(toStylePromptPreset)
  .filter(preset => preset.value && (preset.tags || preset.negativeTags)))

function styleTypeLabel(preset: StylePromptPreset) {
  return preset.categoryType || '未分组'
}

function styleDirectoryTree(presets: StylePromptPreset[]) {
  const typeMap = new Map<string, Map<string, number>>()
  for (const preset of presets) {
    const type = styleTypeLabel(preset)
    if (!typeMap.has(type))
      typeMap.set(type, new Map())
    const categoryMap = typeMap.get(type)!
    categoryMap.set(preset.category, (categoryMap.get(preset.category) || 0) + 1)
  }
  return [
    {
      label: `全部 (${presets.length})`,
      key: ALL_DIRECTORY_KEY,
    },
    ...Array.from(typeMap.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'zh-CN'))
      .map(([type, categoryMap]) => {
        const total = Array.from(categoryMap.values()).reduce((sum, count) => sum + count, 0)
        return {
          label: `${type} (${total})`,
          key: `type:${encodeURIComponent(type)}`,
          children: Array.from(categoryMap.entries())
            .sort(([a], [b]) => a.localeCompare(b, 'zh-CN'))
            .map(([category, count]) => ({
              label: `${category} (${count})`,
              key: `category:${encodeURIComponent(type)}:${encodeURIComponent(category)}`,
            })),
        }
      }),
  ]
}

function parseStyleDirectoryKey(key: string) {
  if (key === ALL_DIRECTORY_KEY)
    return { mode: 'all', type: '', category: '' }
  if (key.startsWith('type:'))
    return { mode: 'type', type: decodeURIComponent(key.slice(5)), category: '' }
  if (key.startsWith('category:')) {
    const [, encodedType = '', encodedCategory = ''] = key.split(':')
    return {
      mode: 'category',
      type: decodeURIComponent(encodedType),
      category: decodeURIComponent(encodedCategory),
    }
  }
  return { mode: 'all', type: '', category: '' }
}

const loraDirectoryTree = computed(() => assetDirectoryTree(loraAssets.value))
const characterDirectoryTree = computed(() => assetDirectoryTree(characterAssets.value))
const stylePresetDirectoryTree = computed(() => styleDirectoryTree(stylePresets.value))
const filteredLoraAssets = computed(() => filterAssets(loraAssets.value, loraSearch.value, loraDirectoryKeys.value[0] || ALL_DIRECTORY_KEY))
const filteredCharacterAssets = computed(() => filterAssets(characterAssets.value, characterSearch.value, characterDirectoryKeys.value[0] || ALL_DIRECTORY_KEY))
const filteredStylePresets = computed(() => {
  const keyword = styleSearch.value.trim().toLowerCase()
  const directory = parseStyleDirectoryKey(styleDirectoryKeys.value[0] || ALL_DIRECTORY_KEY)
  return stylePresets.value.filter((preset) => {
    if (directory.mode === 'type' && styleTypeLabel(preset) !== directory.type)
      return false
    if (directory.mode === 'category' && (styleTypeLabel(preset) !== directory.type || preset.category !== directory.category))
      return false
    if (!keyword)
      return true
    return [
      preset.label,
      preset.value,
      preset.category,
      preset.categoryType,
      preset.tags,
      preset.negativeTags,
      preset.notes,
    ].some(value => value.toLowerCase().includes(keyword))
  })
})

const selectedLoraAsset = computed(() => loraAssets.value.find(item => item.name === draft.loraName) || null)
const selectedSecondLoraAsset = computed(() => loraAssets.value.find(item => item.name === draft.secondLoraName) || null)
const selectedCharacterAsset = computed(() => characterAssets.value.find(item => item.name === draft.characterId) || null)
const selectedSecondCharacterAsset = computed(() => characterAssets.value.find(item => item.name === draft.secondCharacterId) || null)

const currentLoraAsset = computed(() => target.value === 'secondary' ? selectedSecondLoraAsset.value : selectedLoraAsset.value)
const currentCharacterAsset = computed(() => target.value === 'secondary' ? selectedSecondCharacterAsset.value : selectedCharacterAsset.value)
const selectedStylePresets = computed(() => stylePresets.value.filter(preset => draft.stylePresetIds.includes(preset.value)))
const styleSummary = computed(() => {
  if (!stylePresets.value.length)
    return '本地 worker 未上报风格预设'
  if (!selectedStylePresets.value.length)
    return '未选择风格预设'
  return `已选择 ${selectedStylePresets.value.length} 个：${selectedStylePresets.value.map(preset => preset.label).join('、')}`
})

function isSelectedLora(asset: AssetOption) {
  return target.value === 'secondary'
    ? draft.secondLoraName === asset.name
    : draft.loraName === asset.name
}

function isSelectedCharacter(asset: AssetOption) {
  return target.value === 'secondary'
    ? draft.secondCharacterId === asset.name
    : draft.characterId === asset.name
}

function isSelectedStylePreset(value: string) {
  return draft.stylePresetIds.includes(value)
}

function selectLora(asset: AssetOption) {
  if (target.value === 'secondary') {
    draft.secondLoraName = asset.name
    if (draft.nsfwMode)
      draft.secondLoraStrength = NSFW_LORA_STRENGTHS[draft.nsfwVisibilityLevel]
    else if (asset.recommendedStrength !== null)
      draft.secondLoraStrength = asset.recommendedStrength
    return
  }

  draft.loraName = asset.name
  if (draft.nsfwMode)
    draft.loraStrength = NSFW_LORA_STRENGTHS[draft.nsfwVisibilityLevel]
  else if (asset.recommendedStrength !== null)
    draft.loraStrength = asset.recommendedStrength
  if (asset.triggerWords)
    draft.triggerWords = asset.triggerWords
}

function clearLora() {
  if (target.value === 'secondary') {
    draft.secondLoraName = ''
    draft.secondLoraStrength = draft.nsfwMode ? NSFW_LORA_STRENGTHS[draft.nsfwVisibilityLevel] : 0.65
    return
  }
  draft.loraName = ''
  draft.loraStrength = draft.nsfwMode ? NSFW_LORA_STRENGTHS[draft.nsfwVisibilityLevel] : 1
}

function selectCharacter(asset: AssetOption) {
  const metadata = asset.metadata || parseMetadata()
  const loraName = firstText(metadata.lora_name, metadata.loraName)
  if (target.value === 'secondary') {
    draft.secondCharacterId = asset.name
    if (loraName) {
      draft.secondLoraName = loraName
      draft.secondLoraStrength = draft.nsfwMode
        ? NSFW_LORA_STRENGTHS[draft.nsfwVisibilityLevel]
        : firstNumber(metadata.lora_strength, metadata.loraStrength, metadata.recommended_strength, metadata.recommendedStrength) || 0.65
    }
    return
  }

  draft.characterId = asset.name
  draft.triggerWords = firstText(metadata.trigger_words, metadata.triggerWords)
  draft.styleTags = firstText(metadata.style_tags, metadata.styleTags) || draft.styleTags
  if (loraName) {
    draft.loraName = loraName
    draft.loraStrength = draft.nsfwMode
      ? NSFW_LORA_STRENGTHS[draft.nsfwVisibilityLevel]
      : firstNumber(metadata.lora_strength, metadata.loraStrength, metadata.recommended_strength, metadata.recommendedStrength) || 1
  }
}

function clearCharacter() {
  if (target.value === 'secondary') {
    draft.secondCharacterId = ''
    draft.secondLoraName = ''
    draft.secondLoraStrength = 0.65
    return
  }
  draft.characterId = ''
}

function toggleStylePreset(value: string) {
  if (!value)
    return
  draft.stylePresetIds = isSelectedStylePreset(value)
    ? draft.stylePresetIds.filter(item => item !== value)
    : [...draft.stylePresetIds, value]
}

function clearStylePresets() {
  draft.stylePresetIds = []
}

function openAssetDetail(kind: 'lora' | 'character', asset: AssetOption) {
  assetDetailKind.value = kind
  assetDetailTarget.value = asset
  assetDetailOpen.value = true
}

function openStyleDetail(preset: StylePromptPreset) {
  styleDetailTarget.value = preset
  styleDetailOpen.value = true
}

function stylePresetSummary(preset: StylePromptPreset) {
  return preset.notes || [preset.categoryType, preset.category].filter(Boolean).join(' / ') || '未配置说明'
}

async function loadCapabilities() {
  loading.value = true
  try {
    capabilities.value = unwrapApiData(await fetchAiCapabilities(), capabilities.value)
  }
  catch (error) {
    if (!shouldIgnoreApiError(error))
      showApiError(message, error, '加载模型能力失败')
  }
  finally {
    loading.value = false
  }
}

function cancel() {
  void router.push('/dashboard/ai-draw')
}

function done() {
  draftStore.commitAssetSelection({
    loraName: draft.loraName,
    loraStrength: draft.loraStrength,
    characterId: draft.characterId,
    secondLoraName: draft.secondLoraName,
    secondLoraStrength: draft.secondLoraStrength,
    secondCharacterId: draft.secondCharacterId,
    triggerWords: draft.triggerWords,
    styleTags: draft.styleTags,
    stylePresetIds: draft.stylePresetIds,
  })
  void router.push('/dashboard/ai-draw')
}

onMounted(loadCapabilities)
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
                    v-for="asset in filteredLoraAssets"
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
                    v-for="asset in filteredCharacterAssets"
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
                <NEmpty v-else description="没有匹配的角色预设" />
              </div>
            </div>
          </div>
        </NTabPane>

        <NTabPane name="style" tab="风格预设">
          <div class="asset-tab-shell">
            <div class="asset-toolbar">
              <NInput v-model:value="styleSearch" clearable placeholder="搜索风格、分类、正向或反向 tags" />
              <NButton secondary :disabled="!draft.stylePresetIds.length" @click="clearStylePresets">
                清空风格
              </NButton>
            </div>
            <div class="asset-current">
              <span>当前风格</span>
              <strong>{{ styleSummary }}</strong>
              <em>风格预设支持多选</em>
            </div>
            <div class="asset-browser">
              <aside class="asset-tree-pane">
                <NTree
                  block-line
                  :data="stylePresetDirectoryTree"
                  :selected-keys="styleDirectoryKeys"
                  :default-expanded-keys="[ALL_DIRECTORY_KEY]"
                  @update:selected-keys="styleDirectoryKeys = selectDirectory($event)"
                />
              </aside>
              <div class="style-preset-shell">
                <NSkeleton v-if="loading" text :repeat="8" />
                <div v-else-if="filteredStylePresets.length" class="style-preset-grid">
                  <article
                    v-for="preset in filteredStylePresets"
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
  min-height: min(760px, calc(100vh - 250px));
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.78);
  padding: 12px;
}

.asset-workbench :deep(.n-tabs),
.asset-workbench :deep(.n-tab-pane),
.asset-workbench :deep(.n-tabs-pane-wrapper) {
  height: 100%;
  min-height: 0;
}

.asset-tab-shell {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: 12px;
  height: min(720px, calc(100vh - 285px));
  min-height: 0;
  padding-top: 8px;
}

.asset-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  min-width: 0;
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

.asset-browser {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 14px;
  min-height: 0;
  overflow: hidden;
}

.asset-tree-pane,
.asset-list-pane,
.style-preset-shell {
  min-width: 0;
  min-height: 0;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.72);
}

.asset-tree-pane,
.asset-list-pane,
.style-preset-shell {
  overflow: auto;
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
.asset-card-meta,
.style-preset-card em {
  min-width: 0;
  color: #64748b;
  font-size: 12px;
  font-style: normal;
  line-height: 1.45;
  overflow-wrap: anywhere;
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
  grid-template-rows: auto auto minmax(42px, 1fr) auto auto;
  gap: 7px;
  min-height: 176px;
  padding: 12px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.88);
  color: inherit;
  cursor: pointer;
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

  .asset-tab-shell {
    height: auto;
    min-height: 640px;
  }

  .asset-browser {
    overflow: visible;
  }

  .asset-tree-pane {
    max-height: 220px;
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
