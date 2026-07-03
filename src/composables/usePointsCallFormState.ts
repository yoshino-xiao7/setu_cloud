import { computed, reactive } from 'vue'
import {
  createPointsCallDefaultForm,
  parsePointsCallTags,
} from '@/composables/usePointsCallDefaults'

export function usePointsCallFormState() {
  const form = reactive(createPointsCallDefaultForm())
  const parsedTags = computed(() => parsePointsCallTags(form.tagText || ''))

  return {
    form,
    parsedTags,
  }
}
