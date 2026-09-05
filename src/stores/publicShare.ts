// src/stores/publicShare.ts
import type { CollectionInfoDTO, CollectionItemDTO, SquareCollectionDTO } from '@/api/collections'
import { defineStore } from 'pinia'

/**
 * 公开分享页的预取数据存根。
 * SSG 构建时由 onServerPrefetch 填充并随 window.__INITIAL_STATE__ 序列化，
 * 客户端 hydration 时从 initialState 还原，保证预渲染 HTML 与客户端首渲一致。
 */
export interface PrefetchedCollection {
  info: CollectionInfoDTO | null
  items: CollectionItemDTO[]
  total: number
}

export interface PrefetchedUserProfile {
  nickname: string
  avatar: string
  collections: SquareCollectionDTO[]
  total: number
}

interface PublicShareState {
  collections: Record<number, PrefetchedCollection>
  userProfiles: Record<number, PrefetchedUserProfile>
}

export const usePublicShareStore = defineStore('publicShare', {
  state: (): PublicShareState => ({
    collections: {},
    userProfiles: {},
  }),
})
