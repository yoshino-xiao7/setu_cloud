import type { UploadFileInfo } from 'naive-ui'

const UPLOAD_FILE_DB_NAME = 'gallery-upload-files-v1'
const UPLOAD_FILE_STORE_NAME = 'files'

export interface PersistedUploadFile {
  fileKey: string
  filename: string
  contentType: string
  lastModified: number
  file: File | Blob
  savedAt: number
}

export interface GalleryUploadFileDraftsOptions {
  onPersistError?: () => void
}

export function getFileDraftKey(rawFile: File) {
  return `${rawFile.name}::${rawFile.size}::${rawFile.lastModified}`
}

export function getPersistedFileFromRecord(record?: PersistedUploadFile) {
  if (!record?.file)
    return null

  if (record.file instanceof File)
    return record.file

  return new File([record.file], record.filename, {
    type: record.contentType,
    lastModified: record.lastModified,
  })
}

export function useGalleryUploadFileDrafts(options: GalleryUploadFileDraftsOptions = {}) {
  let uploadFileDbPromise: Promise<IDBDatabase> | null = null

  function openUploadFileDb() {
    if (!uploadFileDbPromise) {
      uploadFileDbPromise = new Promise<IDBDatabase>((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
          reject(new Error('当前浏览器不支持本地图片草稿存储'))
          return
        }

        const request = indexedDB.open(UPLOAD_FILE_DB_NAME, 1)
        request.onupgradeneeded = () => {
          const db = request.result
          if (!db.objectStoreNames.contains(UPLOAD_FILE_STORE_NAME))
            db.createObjectStore(UPLOAD_FILE_STORE_NAME, { keyPath: 'fileKey' })
        }
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error || new Error('打开图片草稿存储失败'))
        request.onblocked = () => reject(new Error('图片草稿存储被其他页面占用'))
      }).catch((error) => {
        uploadFileDbPromise = null
        throw error
      })
    }

    return uploadFileDbPromise
  }

  async function runUploadFileStore<T>(
    mode: IDBTransactionMode,
    action: (store: IDBObjectStore) => IDBRequest<T> | void,
  ) {
    const db = await openUploadFileDb()
    return new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(UPLOAD_FILE_STORE_NAME, mode)
      const store = tx.objectStore(UPLOAD_FILE_STORE_NAME)
      const request = action(store)
      let requestResult: T | undefined

      if (request) {
        request.onsuccess = () => {
          requestResult = request.result
        }
        request.onerror = () => reject(request.error || new Error('图片草稿读写失败'))
      }

      tx.oncomplete = () => resolve(requestResult)
      tx.onerror = () => reject(tx.error || new Error('图片草稿事务失败'))
      tx.onabort = () => reject(tx.error || new Error('图片草稿事务已取消'))
    })
  }

  async function persistUploadFiles(infos: UploadFileInfo[]) {
    try {
      for (const info of infos) {
        const rawFile = info.file
        if (!rawFile)
          continue

        await runUploadFileStore('readwrite', store => store.put({
          fileKey: getFileDraftKey(rawFile),
          filename: rawFile.name,
          contentType: info.type || rawFile.type,
          lastModified: rawFile.lastModified,
          file: rawFile,
          savedAt: Date.now(),
        } satisfies PersistedUploadFile))
      }
    }
    catch {
      options.onPersistError?.()
    }
  }

  async function getPersistedUploadFile(fileKey: string) {
    try {
      const record = await runUploadFileStore<PersistedUploadFile>('readonly', store => store.get(fileKey))
      return getPersistedFileFromRecord(record)
    }
    catch {
      return null
    }
  }

  function deletePersistedUploadFile(fileKey: string) {
    void runUploadFileStore('readwrite', store => store.delete(fileKey)).catch(() => {})
  }

  function clearPersistedUploadFiles() {
    void runUploadFileStore('readwrite', store => store.clear()).catch(() => {})
  }

  return {
    clearPersistedUploadFiles,
    deletePersistedUploadFile,
    getFileDraftKey,
    getPersistedUploadFile,
    persistUploadFiles,
  }
}
