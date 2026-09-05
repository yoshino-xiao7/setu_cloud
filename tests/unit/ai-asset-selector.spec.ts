import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick } from 'vue'
import { fetchAiCapabilities } from '@/api/aiGeneration'
import { useAiAssetSelector } from '@/composables/useAiAssetSelector'

vi.mock('vue', async importOriginal => ({ ...await importOriginal<typeof import('vue')>(), onMounted: vi.fn() }))
vi.mock('vue-router', () => ({ useRoute: () => ({ query: {} }), useRouter: () => ({ push: vi.fn() }) }))
vi.mock('naive-ui', () => ({ useMessage: () => ({ error: vi.fn() }) }))
vi.mock('@/api/aiGeneration', () => ({ fetchAiCapabilities: vi.fn() }))
vi.mock('@/composables/useApiError', () => ({ shouldIgnoreApiError: () => false, showApiError: vi.fn() }))

function asset(name: string, category: string) {
  return { name, metadataJson: JSON.stringify({ category, category_type: '角色' }) }
}
function preset(name: string, category: string, checkpoint: string, nsfwOnly = false) {
  return { name, metadataJson: JSON.stringify({ category: nsfwOnly ? 'NSFW' : 'SFW', category_type: category, recommended_checkpoint: checkpoint, nsfw_only: nsfwOnly, style_tags: name }) }
}
async function selector() {
  const scope = effectScope()
  const state = scope.run(() => useAiAssetSelector())!
  await state.loadCapabilities()
  return { state, stop: () => scope.stop() }
}

describe('ai asset selector filter counts', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(fetchAiCapabilities).mockResolvedValue({ data: {
      checkpoints: [],
      vaes: [],
      workers: [],
      loras: [asset('red hair', 'A'), asset('blue hair', 'B')],
      characters: [asset('red hair', 'A'), asset('blue hair', 'B')],
      promptPresets: [preset('hug', '互动', 'wai'), preset('hug warm', '互动', 'wai', true), preset('walk', '日常', 'wai'), preset('hug blue', '互动', 'noob')],
    } } as Awaited<ReturnType<typeof fetchAiCapabilities>>)
  })

  it('uses model, keyword and safety filters for tree counts and list results', async () => {
    const { state, stop } = await selector()
    state.styleCheckpointFilter.value = 'wai'
    expect(state.visibleStylePresetDirectoryTree.value[0].label).toBe('全部 (3)')
    state.styleSearch.value = 'hug'
    expect(state.visibleStylePresetDirectoryTree.value[0].label).toBe('全部 (2)')
    expect(state.styleSafetyOptions.value).toEqual({ all: 2, sfw: 1, nsfw: 1 })
    state.styleSafetyFilter.value = 'sfw'
    await nextTick()
    expect(state.visibleStylePresetDirectoryTree.value[0].label).toBe('全部 (1)')
    expect(state.filteredStylePresets.value.map(item => item.value)).toEqual(['hug'])
    state.styleSearch.value = 'missing'
    expect(state.visibleStylePresetDirectoryTree.value[0].label).toBe('全部 (0)')
    expect(state.filteredStylePresets.value).toEqual([])
    state.styleSearch.value = ''
    state.styleCheckpointFilter.value = ''
    state.styleSafetyFilter.value = 'all'
    await nextTick()
    expect(state.visibleStylePresetDirectoryTree.value[0].label).toBe('全部 (4)')
    stop()
  })

  it('keeps sibling categories available when choosing a directory', async () => {
    const { state, stop } = await selector()
    state.styleCheckpointFilter.value = 'wai'
    state.styleDirectoryKeys.value = [`type:${encodeURIComponent('互动')}`]
    expect(state.filteredStylePresets.value).toHaveLength(2)
    expect(state.visibleStylePresetDirectoryTree.value[0].label).toBe('全部 (3)')
    expect(state.visibleStylePresetDirectoryTree.value).toHaveLength(3)
    stop()
  })

  it('updates LoRA and character tree counts with search', async () => {
    const { state, stop } = await selector()
    state.loraSearch.value = 'red'
    state.characterSearch.value = 'blue'
    expect(state.loraDirectoryTree.value[0].label).toBe('全部 (1)')
    expect(state.characterDirectoryTree.value[0].label).toBe('全部 (1)')
    expect(state.filteredLoraAssets.value[0]?.name).toBe('red hair')
    expect(state.filteredCharacterAssets.value[0]?.name).toBe('blue hair')
    state.loraSearch.value = 'missing'
    expect(state.loraDirectoryTree.value[0].label).toBe('全部 (0)')
    expect(state.filteredLoraAssets.value).toEqual([])
    stop()
  })
})
