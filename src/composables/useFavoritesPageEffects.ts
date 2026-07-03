import { onMounted } from 'vue'

export interface UseFavoritesPageEffectsOptions {
  fetchCollections: () => Promise<void>
  fetchItems: () => Promise<void>
}

export function useFavoritesPageEffects(options: UseFavoritesPageEffectsOptions) {
  onMounted(async () => {
    await options.fetchCollections()
    await options.fetchItems()
  })
}
