import * as tus from 'tus-js-client'
import { defineStore } from 'pinia'
import { createCloudVideoUploadSession, syncAdminCloudVideo } from '@/api/admin'
import { unwrapApiData } from '@/api/response'
import { getApiErrorMessage, shouldIgnoreApiError } from '@/composables/useApiError'

const VIDEO_NAME = /\.(mp4|mkv|webm|mov|m4v|avi)$/i

export interface CloudVideoUploadNotice {
  type: 'success' | 'error' | 'info'
  text: string
}

interface QueueItem {
  id: number
  file: File
}

function isVideoFile(file: File) {
  return file.type.startsWith('video/') || VIDEO_NAME.test(file.name)
}

let currentUpload: tus.Upload | null = null

export const useCloudVideoUploadStore = defineStore('cloudVideoUpload', {
  state: () => ({
    queued: [] as QueueItem[],
    activeName: '',
    percent: 0,
    label: '',
    running: false,
    notice: null as CloudVideoUploadNotice | null,
    nextId: 1,
    completedTick: 0,
  }),
  getters: {
    queuedCount: state => state.queued.length,
    busy: state => state.running || state.queued.length > 0,
    summary(state): string {
      if (!state.running && !state.queued.length)
        return ''
      const waiting = state.queued.length
      const waitText = waiting ? ` · 排队 ${waiting} 个` : ''
      return `${state.label || '准备上传'}${waitText}`
    },
  },
  actions: {
    clearNotice() {
      this.notice = null
    },

    enqueue(files: File[]) {
      const accepted = files.filter(isVideoFile)
      if (!accepted.length) {
        this.notice = { type: 'error', text: '请选择视频文件' }
        return
      }
      for (const file of accepted)
        this.queued.push({ id: this.nextId++, file })
      if (accepted.length > 1 || this.running)
        this.notice = { type: 'info', text: `已加入 ${accepted.length} 个上传任务，会按顺序传送` }
      void this.pump()
    },

    async pump() {
      if (this.running)
        return
      this.running = true
      try {
        while (this.queued.length) {
          const item = this.queued.shift()
          if (!item)
            break
          await this.uploadOne(item.file)
        }
      }
      finally {
        this.running = false
        this.activeName = ''
        this.percent = 0
        this.label = ''
        if (this.queued.length)
          void this.pump()
      }
    },

    async uploadOne(file: File) {
      this.activeName = file.name
      this.percent = 0
      this.label = `正在创建 ${file.name}`
      try {
        const session = unwrapApiData(await createCloudVideoUploadSession(
          file.name.replace(/\.[^.]+$/, '') || file.name,
        ))
        try {
          await new Promise<void>((resolve, reject) => {
            const upload = new tus.Upload(file, {
              endpoint: session.tusEndpoint,
              retryDelays: [0, 3000, 5000, 10000, 20000, 60000],
              headers: {
                AuthorizationSignature: session.authorizationSignature,
                AuthorizationExpire: String(session.authorizationExpire),
                LibraryId: String(session.libraryId),
                VideoId: session.bunnyVideoId,
              },
              metadata: {
                filename: file.name,
                filetype: file.type || 'video/mp4',
                title: session.title,
              },
              onError: error => reject(error),
              onProgress: (bytesUploaded, bytesTotal) => {
                this.percent = bytesTotal ? Math.round((bytesUploaded / bytesTotal) * 100) : 0
                this.label = `正在上传 ${file.name}（${this.percent}%）`
              },
              onSuccess: () => resolve(),
            })
            currentUpload = upload
            upload.start()
          })
        }
        finally {
          currentUpload = null
        }
        this.label = `正在同步 ${file.name}`
        await syncAdminCloudVideo(session.id)
        this.completedTick += 1
        this.notice = { type: 'success', text: `${file.name} 上传完成，转码完成后即可发布` }
      }
      catch (error) {
        if (!shouldIgnoreApiError(error)) {
          this.notice = {
            type: 'error',
            text: getApiErrorMessage(error, `上传 ${file.name} 失败`),
          }
        }
      }
    },
  },
})
