import * as tus from 'tus-js-client'
import { defineStore } from 'pinia'
import type { AdminCloudVideoUploadSession } from '@/api/admin'
import { createCloudVideoUploadSession, syncAdminCloudVideo } from '@/api/admin'
import { unwrapApiData } from '@/api/response'
import { getApiErrorMessage, shouldIgnoreApiError } from '@/composables/useApiError'

const VIDEO_NAME = /\.(mp4|mkv|webm|mov|m4v|avi)$/i
const MAX_ATTEMPTS = 12
const STALL_MS = 3 * 60 * 1000
const RETRY_PAUSE_MS = import.meta.env.MODE === 'test' ? 0 : 2000
const TUS_RETRY_DELAYS = [0, 3000, 5000, 10000, 20000, 60000, 120000, 300000]
const TUS_CHUNK_SIZE = 8 * 1024 * 1024

export interface CloudVideoUploadNotice {
  type: 'success' | 'error' | 'info'
  text: string
}

interface QueueItem {
  id: number
  file: File
  attempts: number
  session?: AdminCloudVideoUploadSession
}

function isVideoFile(file: File) {
  return file.type.startsWith('video/') || VIDEO_NAME.test(file.name)
}

function pause(ms: number) {
  if (ms <= 0)
    return Promise.resolve()
  return new Promise<void>(resolve => window.setTimeout(resolve, ms))
}

let currentUpload: tus.Upload | null = null
let wakeLock: WakeLockSentinel | null = null
let wakeLockWatching = false

function abortFrozenUpload() {
  try {
    currentUpload?.abort()
  }
  catch {
    // ignore
  }
}

async function holdWakeLock() {
  try {
    wakeLock = await navigator.wakeLock?.request('screen') ?? null
  }
  catch {
    wakeLock = null
  }
  if (!wakeLockWatching && typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', restoreWakeLock)
    document.addEventListener('freeze', abortFrozenUpload)
    document.addEventListener('resume', abortFrozenUpload)
    wakeLockWatching = true
  }
}

async function restoreWakeLock() {
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible')
    return
  await holdWakeLock()
}

async function releaseWakeLock() {
  if (wakeLockWatching && typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', restoreWakeLock)
    document.removeEventListener('freeze', abortFrozenUpload)
    document.removeEventListener('resume', abortFrozenUpload)
    wakeLockWatching = false
  }
  try {
    await wakeLock?.release()
  }
  catch {
    // ignore
  }
  wakeLock = null
}

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
      const waiting = state.running
        ? Math.max(0, state.queued.length - 1)
        : state.queued.length
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
        this.queued.push({ id: this.nextId++, file, attempts: 0 })
      if (accepted.length > 1 || this.running)
        this.notice = { type: 'info', text: `已加入 ${accepted.length} 个上传任务，会按顺序传送。请保持这个后台标签在前台，不要锁屏或整页刷新。` }
      void this.pump()
    },

    async pump() {
      if (this.running)
        return
      this.running = true
      void holdWakeLock()
      try {
        while (this.queued.length) {
          const item = this.queued[0]
          if (!item)
            break
          const ok = await this.uploadOne(item)
          if (ok) {
            this.queued.shift()
            continue
          }
          item.attempts += 1
          if (item.attempts >= MAX_ATTEMPTS) {
            this.queued.shift()
            this.notice = {
              type: 'error',
              text: `${item.file.name} 多次中断，已跳过后面继续`,
            }
            continue
          }
          this.label = `上传中断，正在续传 ${item.file.name}`
          await pause(RETRY_PAUSE_MS)
        }
      }
      finally {
        this.running = false
        this.activeName = ''
        this.percent = 0
        this.label = ''
        void releaseWakeLock()
        if (this.queued.length)
          void this.pump()
      }
    },

    async uploadOne(item: QueueItem) {
      const file = item.file
      this.activeName = file.name
      this.percent = 0
      try {
        if (!item.session) {
          this.label = `正在创建 ${file.name}`
          item.session = unwrapApiData(await createCloudVideoUploadSession(
            file.name.replace(/\.[^.]+$/, '') || file.name,
          ))
        }
        const session = item.session
        await this.transferFile(file, session)
        this.label = `正在同步 ${file.name}`
        await syncAdminCloudVideo(session.id)
        this.completedTick += 1
        this.notice = { type: 'success', text: `${file.name} 上传完成，转码完成后即可发布` }
        return true
      }
      catch (error) {
        if (!shouldIgnoreApiError(error)) {
          this.notice = {
            type: 'error',
            text: getApiErrorMessage(error, `上传 ${file.name} 失败，将自动续传`),
          }
        }
        return false
      }
    },

    transferFile(file: File, session: AdminCloudVideoUploadSession) {
      return new Promise<void>((resolve, reject) => {
        let settled = false
        let lastProgressAt = Date.now()
        let watchdog: number | null = null

        const finish = (handler: () => void) => {
          if (settled)
            return
          settled = true
          if (watchdog != null)
            window.clearInterval(watchdog)
          currentUpload = null
          handler()
        }

        const upload = new tus.Upload(file, {
          endpoint: session.tusEndpoint,
          chunkSize: TUS_CHUNK_SIZE,
          retryDelays: TUS_RETRY_DELAYS,
          storeFingerprintForResuming: true,
          removeFingerprintOnSuccess: true,
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
          onError: error => finish(() => reject(error)),
          onProgress: (bytesUploaded, bytesTotal) => {
            lastProgressAt = Date.now()
            this.percent = bytesTotal ? Math.round((bytesUploaded / bytesTotal) * 100) : 0
            this.label = `正在上传 ${file.name}（${this.percent}%）`
          },
          onSuccess: () => finish(() => resolve()),
        })

        if (import.meta.env.MODE !== 'test') {
          watchdog = window.setInterval(() => {
            if (Date.now() - lastProgressAt < STALL_MS)
              return
            try {
              upload.abort()
            }
            catch {
              // ignore
            }
            finish(() => reject(new Error('上传停滞，准备续传')))
          }, 15_000)
        }

        currentUpload = upload
        void upload.findPreviousUploads()
          .then((previous) => {
            if (settled)
              return
            if (previous[0])
              upload.resumeFromPreviousUpload(previous[0])
            upload.start()
          })
          .catch((error) => {
            finish(() => reject(error))
          })
      })
    },
  },
})
