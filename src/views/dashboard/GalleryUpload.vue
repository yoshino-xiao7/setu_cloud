<script setup lang="ts">
import type { UploadFileInfo } from 'naive-ui'
import type {
  GalleryPidMode,
  GallerySubmissionBatchDetail,
  GallerySubmissionBatchSummary,
  GalleryUploadCompleteItem,
  GalleryUploadInitItem,
  GalleryUploadInitResponse,
  GalleryUploadItemUploadStatus,
  GalleryUploadStatus,
} from '@/api/galleryUpload'
import {
  AlbumsOutline,
  CloseCircleOutline,
  CloudUploadOutline,
  EyeOutline,
  RefreshOutline,
  TrashOutline,
} from '@vicons/ionicons5'
import {
  NAlert,
  NButton,
  NCard,
  NCheckbox,
  NEmpty,
  NForm,
  NFormItem,
  NGrid,
  NGridItem,
  NIcon,
  NImage,
  NInput,
  NInputNumber,
  NModal,
  NPagination,
  NProgress,
  NRadioButton,
  NRadioGroup,
  NSelect,
  NSpin,
  NTabPane,
  NTabs,
  NTag,
  useDialog,
  useMessage,
} from 'naive-ui'
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  calculateFileSha256,
  cancelGalleryUploadBatch,
  completeGalleryUploadBatch,
  createGalleryUploadBatch,
  fetchMyGalleryUploadBatchDetail,
  fetchMyGalleryUploadBatches,
  updateGalleryUploadItemStatus,
  uploadGalleryFileToOss,
} from '@/api/galleryUpload'
import { unwrapApiData } from '@/api/response'
import { getApiErrorMessage, shouldIgnoreApiError, showApiError } from '@/composables/useApiError'
import { formatDate } from '@/utils/dateFormat'
import {
  formatFileSize,
  GALLERY_PID_MODE_OPTIONS,
  GALLERY_UPLOAD_STATUS_OPTIONS,
  getGalleryPidModeLabel,
  getGalleryUploadStatusMeta,
  parseTagsInput,
} from '@/utils/galleryUploadStatus'

type LocalUploadStatus = 'pending' | 'hashing' | 'uploading' | 'finished' | 'error'

interface LocalUploadItem {
  id: string
  clientItemId: string
  fileKey: string
  file: File
  filename: string
  contentType: string
  sizeBytes: number
  lastModified: number
  previewUrl: string
  pageIndex: number
  title: string
  author: string
  tagsText: string
  progress: number
  status: LocalUploadStatus
  uploadStatus?: GalleryUploadItemUploadStatus
  sha256?: string
  submissionId?: number
  objectKey?: string
  etag?: string
  error?: string
}

interface GalleryUploadDraftItem {
  clientItemId?: string
  fileKey: string
  filename: string
  contentType: string
  sizeBytes: number
  lastModified: number
  pageIndex: number
  title: string
  author: string
  tagsText: string
  status?: LocalUploadStatus
  uploadStatus?: GalleryUploadItemUploadStatus
  sha256?: string
  submissionId?: number
  objectKey?: string
  etag?: string
}

interface GalleryUploadDraft {
  version: 2
  updatedAt: number
  uploadIntentKey: string
  batchId?: number
  createBatchAttempted: boolean
  includeSha256: boolean
  form: {
    pidMode: GalleryPidMode
    title: string
    author: string
    r18: boolean
    aiType: number
    tagsText: string
  }
  items: GalleryUploadDraftItem[]
}

interface PersistedUploadFile {
  fileKey: string
  filename: string
  contentType: string
  lastModified: number
  file: File | Blob
  savedAt: number
}

interface GalleryUploadIncompleteItem {
  submissionId?: number
  clientItemId?: string
  filename?: string
  status?: string
  uploadStatus?: string
  message?: string
  errorMessage?: string
  errorCode?: string
}

interface GalleryUploadIncompletePayload {
  code?: string
  message?: string
  items: GalleryUploadIncompleteItem[]
}

const MAX_FILES = 5
const MAX_FILE_SIZE = 10 * 1024 * 1024
const MAX_BATCH_SIZE = 100 * 1024 * 1024
const COMPLETE_UPLOAD_TIMEOUT = 180_000
const UPLOAD_DRAFT_STORAGE_KEY = 'gallery-upload-draft-v1'
const UPLOAD_FILE_DB_NAME = 'gallery-upload-files-v1'
const UPLOAD_FILE_STORE_NAME = 'files'
const ACCEPT_TYPES = ['image/jpeg', 'image/png']

const message = useMessage()
const dialog = useDialog()
const route = useRoute()

const activeTab = ref<'upload' | 'records'>('upload')
const nativeFileInputRef = ref<HTMLInputElement | null>(null)
const fileList = ref<UploadFileInfo[]>([])
const uploadItems = ref<LocalUploadItem[]>([])
const includeSha256 = ref(true)
const uploading = ref(false)
const submitError = ref('')
const draftRestoredNotice = ref(false)
const draftRestoreMessage = ref('')
const draftItemMap = ref(new Map<string, GalleryUploadDraftItem>())
const draftReady = ref(false)
const activeInitResponse = ref<GalleryUploadInitResponse | null>(null)
const activeBatchId = ref<number | null>(null)
let uploadFileIdSeed = 0
let uploadFileDbPromise: Promise<IDBDatabase> | null = null
let shaWarningShown = false
let restoringDraftFiles = false

function createUploadIntentKey() {
  if (typeof crypto.randomUUID === 'function')
    return crypto.randomUUID()

  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0F) | 0x40
  bytes[8] = (bytes[8] & 0x3F) | 0x80
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0'))
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`
}

function createClientItemId() {
  return createUploadIntentKey()
}

const uploadIntentKey = ref(createUploadIntentKey())
const createBatchAttempted = ref(false)

const form = reactive({
  pidMode: 'MULTI_PID_P0' as GalleryPidMode,
  title: '',
  author: '',
  r18: false,
  aiType: 0,
  tagsText: '',
})

const aiTypeOptions = [
  { label: '未知', value: 0 },
  { label: '非 AI', value: 1 },
  { label: 'AI 生成', value: 2 },
]

const statusOptions = GALLERY_UPLOAD_STATUS_OPTIONS
const pidModeOptions = GALLERY_PID_MODE_OPTIONS
const totalSize = computed(() => uploadItems.value.reduce((sum, item) => sum + item.sizeBytes, 0))
const selectedCount = computed(() => uploadItems.value.length)
const canStartUpload = computed(() => selectedCount.value > 0 && !uploading.value)
const canPickFiles = computed(() => !uploading.value && selectedCount.value < MAX_FILES)

const recordsLoading = ref(false)
const records = ref<GallerySubmissionBatchSummary[]>([])
const recordsTotal = ref(0)
const recordsPage = ref(1)
const recordsPageSize = 10
const recordsStatus = ref('ALL')

const detailModal = ref(false)
const detailLoading = ref(false)
const detailData = ref<GallerySubmissionBatchDetail | null>(null)

function revokePreviewUrl(url?: string) {
  if (url)
    URL.revokeObjectURL(url)
}

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
      request.onblocked = () => reject(new Error('图片草稿存储被其它页面占用'))
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

function getPersistedFileFromRecord(record?: PersistedUploadFile) {
  if (!record?.file)
    return null

  if (record.file instanceof File)
    return record.file

  return new File([record.file], record.filename, {
    type: record.contentType,
    lastModified: record.lastModified,
  })
}

function getFileDraftKey(rawFile: File) {
  return `${rawFile.name}::${rawFile.size}::${rawFile.lastModified}`
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
    message.warning('浏览器没有保存图片草稿，刷新后可能需要重新选择图片')
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

function findDraftItem(rawFile: File) {
  const fileKey = getFileDraftKey(rawFile)
  return draftItemMap.value.get(fileKey)
    || Array.from(draftItemMap.value.values()).find((item) => {
      return item.filename === rawFile.name && item.sizeBytes === rawFile.size
    })
}

function createDraftItem(item: LocalUploadItem): GalleryUploadDraftItem {
  return {
    clientItemId: item.clientItemId,
    fileKey: item.fileKey,
    filename: item.filename,
    contentType: item.contentType,
    sizeBytes: item.sizeBytes,
    lastModified: item.lastModified,
    pageIndex: item.pageIndex,
    title: item.title,
    author: item.author,
    tagsText: item.tagsText,
    status: item.status,
    uploadStatus: item.uploadStatus,
    sha256: item.sha256,
    submissionId: item.submissionId,
    objectKey: item.objectKey,
    etag: item.etag,
  }
}

function buildUploadDraft(): GalleryUploadDraft {
  return {
    version: 2,
    updatedAt: Date.now(),
    uploadIntentKey: uploadIntentKey.value,
    batchId: activeBatchId.value || undefined,
    createBatchAttempted: createBatchAttempted.value,
    includeSha256: includeSha256.value,
    form: {
      pidMode: form.pidMode,
      title: form.title,
      author: form.author,
      r18: form.r18,
      aiType: form.aiType,
      tagsText: form.tagsText,
    },
    items: uploadItems.value.map(createDraftItem),
  }
}

function hasMeaningfulDraft(draft: GalleryUploadDraft) {
  return draft.items.length > 0
    || !!draft.form.title
    || !!draft.form.author
    || !!draft.form.r18
    || draft.form.aiType !== 0
    || !!draft.form.tagsText
    || draft.form.pidMode !== 'MULTI_PID_P0'
}

function saveUploadDraft() {
  if (!draftReady.value)
    return

  const draft = buildUploadDraft()
  if (!hasMeaningfulDraft(draft)) {
    localStorage.removeItem(UPLOAD_DRAFT_STORAGE_KEY)
    return
  }

  localStorage.setItem(UPLOAD_DRAFT_STORAGE_KEY, JSON.stringify(draft))
}

function clearUploadDraft() {
  localStorage.removeItem(UPLOAD_DRAFT_STORAGE_KEY)
  draftItemMap.value = new Map()
  activeBatchId.value = null
  draftRestoredNotice.value = false
  draftRestoreMessage.value = ''
  clearPersistedUploadFiles()
}

function loadUploadDraft() {
  const rawDraft = localStorage.getItem(UPLOAD_DRAFT_STORAGE_KEY)
  if (!rawDraft)
    return

  try {
    const draft = JSON.parse(rawDraft) as Partial<GalleryUploadDraft>
    if ((draft.version !== 1 && draft.version !== 2) || !draft.form)
      return

    form.pidMode = draft.form.pidMode === 'SINGLE_PID_MULTI_PAGE' ? draft.form.pidMode : 'MULTI_PID_P0'
    form.title = draft.form.title || ''
    form.author = draft.form.author || ''
    form.r18 = !!draft.form.r18
    form.aiType = Number.isFinite(draft.form.aiType) ? Number(draft.form.aiType) : 0
    form.tagsText = draft.form.tagsText || ''
    includeSha256.value = draft.includeSha256 ?? true
    uploadIntentKey.value = draft.uploadIntentKey || createUploadIntentKey()
    activeBatchId.value = Number.isFinite(draft.batchId) ? Number(draft.batchId) : null
    createBatchAttempted.value = !!draft.createBatchAttempted

    const draftItems = Array.isArray(draft.items) ? draft.items : []
    draftItemMap.value = new Map(
      draftItems
        .filter(item => item?.fileKey)
        .map(item => [item.fileKey, item as GalleryUploadDraftItem]),
    )
    if (draftItems.length > 0) {
      draftRestoredNotice.value = true
      draftRestoreMessage.value = '已恢复上次填写的投稿草稿，正在尝试恢复已选择的图片。'
    }
  }
  catch {
    localStorage.removeItem(UPLOAD_DRAFT_STORAGE_KEY)
  }
}

async function restoreDraftFiles() {
  const draftItems = Array.from(draftItemMap.value.values())
  if (draftItems.length === 0)
    return

  const restoredInfos: UploadFileInfo[] = []
  for (const item of draftItems) {
    const file = await getPersistedUploadFile(item.fileKey)
    if (!file)
      continue

    const contentType = getAcceptedContentType(file) || item.contentType
    restoredInfos.push(createUploadFileInfo(file, contentType))
  }

  if (restoredInfos.length > 0) {
    restoringDraftFiles = true
    try {
      fileList.value = restoredInfos
      syncUploadItems(fileList.value)
    }
    finally {
      restoringDraftFiles = false
    }
    draftRestoredNotice.value = true
    draftRestoreMessage.value = restoredInfos.length === draftItems.length
      ? '已自动恢复上次未完成的投稿图片和填写内容，可直接继续提交。'
      : `已自动恢复 ${restoredInfos.length}/${draftItems.length} 张图片，其余图片需要重新选择。`
    return
  }

  draftRestoredNotice.value = true
  draftRestoreMessage.value = '已恢复上次填写的投稿草稿，但浏览器没有保留图片文件；请重新选择图片，同名图片会自动带回单图信息。'
}

function makeLocalUploadItem(info: UploadFileInfo, index: number, existing?: LocalUploadItem): LocalUploadItem | null {
  const rawFile = info.file
  if (!rawFile)
    return null

  if (existing) {
    if (!existing.clientItemId)
      existing.clientItemId = createClientItemId()
    existing.pageIndex = Number.isFinite(existing.pageIndex) ? existing.pageIndex : index
    return existing
  }

  const draftItem = findDraftItem(rawFile)
  const clientItemId = draftItem?.clientItemId || createClientItemId()
  const restoredFinished = (draftItem?.status === 'finished' || draftItem?.uploadStatus === 'UPLOADED')
    && !!draftItem.submissionId
    && !!draftItem.objectKey
  const restoredFailed = !restoredFinished && (draftItem?.status === 'error' || draftItem?.uploadStatus === 'FAILED')

  return {
    id: info.id,
    clientItemId,
    fileKey: getFileDraftKey(rawFile),
    file: rawFile,
    filename: rawFile.name,
    contentType: info.type || rawFile.type,
    sizeBytes: rawFile.size,
    lastModified: rawFile.lastModified,
    previewUrl: URL.createObjectURL(rawFile),
    pageIndex: Number.isFinite(draftItem?.pageIndex) ? draftItem!.pageIndex : index,
    title: draftItem?.title || '',
    author: draftItem?.author || '',
    tagsText: draftItem?.tagsText || '',
    progress: restoredFinished ? 100 : 0,
    status: restoredFinished ? 'finished' : restoredFailed ? 'error' : 'pending',
    uploadStatus: restoredFinished ? 'UPLOADED' : restoredFailed ? 'FAILED' : draftItem?.uploadStatus,
    sha256: draftItem?.sha256,
    submissionId: draftItem?.submissionId,
    objectKey: draftItem?.objectKey,
    etag: draftItem?.etag,
  }
}

function syncUploadItems(nextFileList: UploadFileInfo[]) {
  const previous = new Map(uploadItems.value.map(item => [item.id, item]))
  const nextItems = nextFileList
    .map((info, index) => makeLocalUploadItem(info, index, previous.get(info.id)))
    .filter((item): item is LocalUploadItem => !!item)

  const nextIds = new Set(nextItems.map(item => item.id))
  uploadItems.value.forEach((item) => {
    if (!nextIds.has(item.id))
      revokePreviewUrl(item.previewUrl)
  })

  uploadItems.value = nextItems.map((item, index) => ({
    ...item,
    pageIndex: form.pidMode === 'SINGLE_PID_MULTI_PAGE' && item.pageIndex >= 0 ? item.pageIndex : index,
  }))
}

function resetUploadIntentKey() {
  uploadIntentKey.value = createUploadIntentKey()
  createBatchAttempted.value = false
  activeInitResponse.value = null
  activeBatchId.value = null
}

function clearItemUploadSession(item: LocalUploadItem, renewClientItem = false): LocalUploadItem {
  return {
    ...item,
    clientItemId: renewClientItem ? createClientItemId() : item.clientItemId,
    progress: 0,
    status: 'pending',
    uploadStatus: undefined,
    submissionId: undefined,
    objectKey: undefined,
    etag: undefined,
    error: undefined,
  }
}

function isExpiredUploadStatus(status?: string | null) {
  return status === 'EXPIRED'
}

function resetExpiredUploadDraft(messageText = '上传已过期，请重新投稿') {
  uploadItems.value = uploadItems.value.map(item => clearItemUploadSession(item, true))
  resetUploadIntentKey()
  submitError.value = `${messageText}。已保留已选图片和填写内容，并已生成新的投稿批次标识，可直接重新提交。`
  saveUploadDraft()
}

function renewUploadIntentAfterEdit() {
  if (!draftReady.value || uploading.value || restoringDraftFiles || !createBatchAttempted.value)
    return

  uploadItems.value = uploadItems.value.map(item => clearItemUploadSession(item, true))
  resetUploadIntentKey()
}

function getUploadDraftWatchSource() {
  return [
    form.pidMode,
    form.title,
    form.author,
    form.r18,
    form.aiType,
    form.tagsText,
    includeSha256.value,
    ...uploadItems.value.map(item => [
      item.fileKey,
      item.filename,
      item.contentType,
      item.sizeBytes,
      item.lastModified,
      item.pageIndex,
      item.title,
      item.author,
      item.tagsText,
      item.sha256,
    ].join(':')),
  ]
}

watch(
  getUploadDraftWatchSource,
  () => {
    renewUploadIntentAfterEdit()
    saveUploadDraft()
  },
)

function isInitResponseExpiring(initResponse: GalleryUploadInitResponse) {
  const expirationTimes = [
    Date.parse(initResponse.credentials.expiration),
    Date.parse(initResponse.uploadPolicy.expiresAt),
  ].filter(Number.isFinite)

  if (expirationTimes.length === 0)
    return false

  return Math.min(...expirationTimes) - Date.now() < 60_000
}

function assertInitResponseNotExpired(initResponse: GalleryUploadInitResponse) {
  if (!isExpiredUploadStatus(initResponse.status))
    return

  const messageText = '上传窗口已过期，请重新投稿'
  resetExpiredUploadDraft(messageText)
  throw new Error(messageText)
}

async function ensureInitResponse() {
  if (activeInitResponse.value && !isInitResponseExpiring(activeInitResponse.value)) {
    assertInitResponseNotExpired(activeInitResponse.value)
    return activeInitResponse.value
  }

  createBatchAttempted.value = true
  const initResponse = unwrapApiData(await createGalleryUploadBatch({
    pidMode: form.pidMode,
    defaults: {
      title: form.title.trim() || undefined,
      author: form.author.trim() || undefined,
      r18: form.r18,
      aiType: form.aiType,
      tags: parseTagsInput(form.tagsText),
    },
    items: buildInitItems(),
  }, {
    idempotencyKey: uploadIntentKey.value,
  }))
  assertInitResponseNotExpired(initResponse)
  activeInitResponse.value = initResponse
  activeBatchId.value = initResponse.batchId
  applyPreparedItemsToLocal(initResponse.items)
  saveUploadDraft()
  return initResponse
}

async function refreshInitResponseForUploadRetry() {
  activeInitResponse.value = null
  return ensureInitResponse()
}

function applyPreparedItemsToLocal(items: GalleryUploadInitResponse['items']) {
  const byClientItemId = new Map(
    items
      .filter(item => item.clientItemId)
      .map(item => [item.clientItemId!, item]),
  )
  const byIndex = new Map(items.map(item => [item.itemIndex, item]))

  uploadItems.value = uploadItems.value.map((localItem, index) => {
    const preparedItem = byClientItemId.get(localItem.clientItemId) || byIndex.get(index)
    if (!preparedItem)
      return localItem

    const uploadStatus = preparedItem.uploadStatus || localItem.uploadStatus
    const isUploaded = uploadStatus === 'UPLOADED'
    const isFailed = uploadStatus === 'FAILED'
    const isExpired = isExpiredUploadStatus(preparedItem.status)

    return {
      ...localItem,
      submissionId: preparedItem.submissionId || localItem.submissionId,
      objectKey: preparedItem.objectKey || localItem.objectKey,
      uploadStatus: uploadStatus || undefined,
      status: isExpired ? 'error' : isUploaded ? 'finished' : isFailed ? 'error' : localItem.status,
      progress: isUploaded ? 100 : localItem.progress,
      error: isExpired
        ? '上传已过期，请重新投稿'
        : isFailed ? (preparedItem.errorMessage || localItem.error || '上传失败') : localItem.error,
    }
  })
}

async function recoverDraftBatch() {
  if (!activeBatchId.value || uploadItems.value.length === 0)
    return

  try {
    const detail = unwrapApiData(await fetchMyGalleryUploadBatchDetail(activeBatchId.value), null)
    if (!detail)
      return

    applyPreparedItemsToLocal(detail.items)
    saveUploadDraft()
  }
  catch (error) {
    if (!shouldIgnoreApiError(error)) {
      draftRestoredNotice.value = true
      draftRestoreMessage.value = `${draftRestoreMessage.value || '已恢复本地草稿。'} 但暂时无法同步后端批次状态：${getApiErrorMessage(error, '恢复失败')}`
    }
  }
}

function getPreparedUploadItem(initResponse: GalleryUploadInitResponse, item: LocalUploadItem, index: number) {
  return initResponse.items.find(entry => entry.clientItemId === item.clientItemId)
    || initResponse.items.find(entry => entry.itemIndex === index)
    || initResponse.items[index]
}

function getCompletedUploadItem(item: LocalUploadItem): GalleryUploadCompleteItem | null {
  if (!item.submissionId || !item.objectKey)
    return null

  return {
    submissionId: item.submissionId,
    objectKey: item.objectKey,
    etag: item.etag,
    sha256: item.sha256,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function optionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function optionalNumber(value: unknown) {
  if (typeof value === 'number')
    return Number.isFinite(value) ? value : undefined

  if (typeof value !== 'string' || !value.trim())
    return undefined

  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : undefined
}

function getErrorResponseData(error: unknown) {
  if (!isRecord(error) || !isRecord(error.response))
    return undefined

  return error.response.data
}

function normalizeIncompleteItem(value: unknown): GalleryUploadIncompleteItem | null {
  if (!isRecord(value))
    return null

  return {
    submissionId: optionalNumber(value.submissionId),
    clientItemId: optionalString(value.clientItemId),
    filename: optionalString(value.filename),
    status: optionalString(value.status),
    uploadStatus: optionalString(value.uploadStatus),
    message: optionalString(value.message),
    errorMessage: optionalString(value.errorMessage),
    errorCode: optionalString(value.errorCode),
  }
}

function getGalleryUploadIncompletePayload(value: unknown): GalleryUploadIncompletePayload | null {
  if (!isRecord(value))
    return null

  if (value.code === 'GALLERY_UPLOAD_INCOMPLETE') {
    return {
      code: 'GALLERY_UPLOAD_INCOMPLETE',
      message: optionalString(value.message),
      items: Array.isArray(value.items)
        ? value.items.map(normalizeIncompleteItem).filter((item): item is GalleryUploadIncompleteItem => !!item)
        : [],
    }
  }

  return getGalleryUploadIncompletePayload(value.data)
}

function getIncompleteItemError(item: GalleryUploadIncompleteItem) {
  return item.message
    || item.errorMessage
    || (item.status === 'FAILED' || item.uploadStatus === 'FAILED' ? '上传失败' : '后端未确认该图片上传完成')
}

function summarizeMarkedFilenames(filenames: string[]) {
  if (filenames.length === 0)
    return ''

  const visibleNames = filenames.slice(0, 3).join('、')
  return filenames.length > 3
    ? `${visibleNames} 等 ${filenames.length} 张`
    : visibleNames
}

function markGalleryUploadIncompleteItems(incompleteItems: GalleryUploadIncompleteItem[]) {
  const byClientItemId = new Map(
    incompleteItems
      .filter(item => item.clientItemId)
      .map(item => [item.clientItemId!, item]),
  )
  const bySubmissionId = new Map(
    incompleteItems
      .filter(item => item.submissionId)
      .map(item => [item.submissionId!, item]),
  )
  const byFilename = new Map(
    incompleteItems
      .filter(item => item.filename)
      .map(item => [item.filename!, item]),
  )
  const markedFilenames: string[] = []

  uploadItems.value = uploadItems.value.map((localItem) => {
    const incompleteItem = byClientItemId.get(localItem.clientItemId)
      || (localItem.submissionId ? bySubmissionId.get(localItem.submissionId) : undefined)
      || byFilename.get(localItem.filename)

    if (!incompleteItem) {
      if (localItem.status === 'finished' && localItem.submissionId && localItem.objectKey) {
        return {
          ...localItem,
          uploadStatus: 'UPLOADED',
          progress: 100,
          error: undefined,
        }
      }

      return localItem
    }

    markedFilenames.push(localItem.filename)
    return {
      ...localItem,
      status: 'error',
      uploadStatus: 'FAILED',
      progress: 0,
      etag: undefined,
      error: getIncompleteItemError(incompleteItem),
    }
  })

  return markedFilenames
}

function handleGalleryUploadIncomplete(error: unknown) {
  const payload = getGalleryUploadIncompletePayload(getErrorResponseData(error))
    || getGalleryUploadIncompletePayload(error)

  if (!payload)
    return false

  const markedFilenames = markGalleryUploadIncompleteItems(payload.items)
  const markedLabel = summarizeMarkedFilenames(markedFilenames)
  const baseMessage = getApiErrorMessage(error, payload.message || '仍有图片未上传完成')
  submitError.value = markedFilenames.length > 0
    ? `${baseMessage}。已标记需要重传的图片：${markedLabel}；再次提交只会重传失败项，已成功的图片不会重复上传。`
    : `${baseMessage}。后端没有返回可定位的图片 ID，请刷新后重试或重新选择失败图片。`
  saveUploadDraft()

  showApiError(message, error, '上传未完成', {
    messageOverride: markedFilenames.length > 0
      ? '仍有图片未上传完成，已标出需要重试的图片'
      : '仍有图片未上传完成，但没有可定位的图片 ID',
  })

  return true
}

function markRetryableItemsPending() {
  uploadItems.value = uploadItems.value.map((item) => {
    if (item.status === 'finished' && item.submissionId && item.objectKey) {
      return {
        ...item,
        uploadStatus: 'UPLOADED',
        error: undefined,
      }
    }

    return {
      ...item,
      status: 'pending',
      uploadStatus: 'PENDING',
      progress: 0,
      error: undefined,
    }
  })
}

function resetUploadForm() {
  uploadItems.value.forEach(item => revokePreviewUrl(item.previewUrl))
  fileList.value = []
  uploadItems.value = []
  submitError.value = ''
  resetUploadIntentKey()
  clearUploadDraft()
}

watch(
  () => activeTab.value,
  () => {
    submitError.value = ''
  },
)

function handleDraftAlertClose() {
  draftRestoredNotice.value = false
}

function handleFailedUpload(error: unknown) {
  const messageText = getApiErrorMessage(error, '上传失败')
  const activeItem = uploadItems.value.find(item => item.status === 'hashing' || item.status === 'uploading')
    || uploadItems.value.find(item => item.status === 'error')
  if (activeItem) {
    activeItem.status = 'error'
    activeItem.error = messageText
  }
  submitError.value = `${messageText}。已保留已选图片和填写内容，可直接重新提交；已上传成功的图片不会重复上传。`
}

function getUploadErrorCode(error: unknown) {
  if (!error || typeof error !== 'object')
    return ''

  const anyError = error as {
    code?: unknown
    name?: unknown
    status?: unknown
    statusCode?: unknown
    res?: { status?: unknown }
  }

  const code = typeof anyError.code === 'string'
    ? anyError.code
    : typeof anyError.name === 'string' ? anyError.name : ''
  if (code)
    return code

  const status = Number(anyError.status ?? anyError.statusCode ?? anyError.res?.status)
  return Number.isFinite(status) ? String(status) : ''
}

function isRefreshableOssUploadError(error: unknown) {
  const code = getUploadErrorCode(error)
  if (code === 'SecurityTokenExpired' || code === 'InvalidAccessKeyId' || code === 'AccessDenied' || code === '403')
    return true

  const text = getApiErrorMessage(error, '').toLowerCase()
  return text.includes('securitytokenexpired')
    || text.includes('invalidaccesskeyid')
    || text.includes('accessdenied')
}

function isExpiredUploadError(error: unknown) {
  const text = getApiErrorMessage(error, '').toLowerCase()
  return text.includes('上传窗口已过期') || text.includes('上传已过期') || text.includes('expired')
}

async function tryCalculateSha256(item: LocalUploadItem) {
  if (!includeSha256.value || item.sha256)
    return

  try {
    item.status = 'hashing'
    item.sha256 = await calculateFileSha256(item.file)
  }
  catch {
    item.sha256 = undefined
    if (!shaWarningShown) {
      shaWarningShown = true
      message.warning('手机端计算 SHA-256 失败，已跳过校验值继续上传')
    }
  }
}

async function reportItemUploadStatus(
  batchId: number,
  item: LocalUploadItem,
  uploadStatus: GalleryUploadItemUploadStatus,
  errorMessage?: string,
) {
  item.uploadStatus = uploadStatus
  saveUploadDraft()

  try {
    await updateGalleryUploadItemStatus(batchId, item.clientItemId, {
      uploadStatus,
      objectKey: item.objectKey,
      sha256: uploadStatus === 'UPLOADED' ? item.sha256 : undefined,
      errorCode: uploadStatus === 'FAILED' ? 'CLIENT_UPLOAD_FAILED' : undefined,
      errorMessage,
    })
  }
  catch (error) {
    if (!shouldIgnoreApiError(error))
      console.warn('[GalleryUpload] 同步单图上传状态失败', error)
  }
}

watch(
  () => createBatchAttempted.value,
  () => saveUploadDraft(),
)

watch(
  () => uploadIntentKey.value,
  () => saveUploadDraft(),
)

watch(
  () => activeBatchId.value,
  () => saveUploadDraft(),
)

watch(
  () => uploadItems.value.map(item => [item.clientItemId, item.status, item.uploadStatus, item.progress, item.error, item.sha256, item.submissionId, item.objectKey, item.etag].join(':')),
  () => saveUploadDraft(),
)

function getAcceptedContentType(rawFile: File) {
  if (ACCEPT_TYPES.includes(rawFile.type))
    return rawFile.type

  if (rawFile.type === 'image/jpg')
    return 'image/jpeg'

  const lowerName = rawFile.name.toLowerCase()
  if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg'))
    return 'image/jpeg'
  if (lowerName.endsWith('.png'))
    return 'image/png'

  return ''
}

function createUploadFileInfo(rawFile: File, contentType: string): UploadFileInfo {
  uploadFileIdSeed += 1
  return {
    id: `gallery-upload-${Date.now()}-${uploadFileIdSeed}`,
    name: rawFile.name,
    status: 'pending',
    percentage: 0,
    file: rawFile,
    type: contentType,
  }
}

function addNativeFiles(rawFiles: File[]) {
  if (!canPickFiles.value || rawFiles.length === 0)
    return

  const availableSlots = MAX_FILES - uploadItems.value.length
  const acceptedFiles = rawFiles.slice(0, availableSlots)
  let invalidTypeCount = 0
  let oversizedCount = 0
  let batchSizeRejectedCount = 0
  let runningTotalSize = totalSize.value

  const nextFiles = acceptedFiles.reduce<UploadFileInfo[]>((result, rawFile) => {
    const contentType = getAcceptedContentType(rawFile)
    if (!contentType) {
      invalidTypeCount += 1
      return result
    }

    if (rawFile.size > MAX_FILE_SIZE) {
      oversizedCount += 1
      return result
    }

    if (runningTotalSize + rawFile.size > MAX_BATCH_SIZE) {
      batchSizeRejectedCount += 1
      return result
    }

    runningTotalSize += rawFile.size
    result.push(createUploadFileInfo(rawFile, contentType))
    return result
  }, [])

  if (rawFiles.length > availableSlots)
    message.warning(`单批次最多 ${MAX_FILES} 张图片，已跳过超出部分`)
  if (invalidTypeCount > 0)
    message.warning('已跳过不支持的文件，仅支持 JPG 和 PNG 图片')
  if (oversizedCount > 0)
    message.warning('已跳过超过 10MB 的图片')
  if (batchSizeRejectedCount > 0)
    message.warning('已跳过会导致批次超过 100MB 的图片')

  if (nextFiles.length === 0)
    return

  const selectedFilesMatchDraft = nextFiles.length === draftItemMap.value.size
    && nextFiles.every(info => info.file && !!findDraftItem(info.file))
  const isRestoringDraftFiles = draftRestoredNotice.value && uploadItems.value.length === 0 && selectedFilesMatchDraft
  if (!isRestoringDraftFiles)
    renewUploadIntentAfterEdit()
  fileList.value = [...fileList.value, ...nextFiles]
  restoringDraftFiles = isRestoringDraftFiles
  try {
    syncUploadItems(fileList.value)
  }
  finally {
    restoringDraftFiles = false
  }
  void persistUploadFiles(nextFiles)
}

function removeUploadItem(item: LocalUploadItem) {
  revokePreviewUrl(item.previewUrl)
  uploadItems.value = uploadItems.value.filter(entry => entry.id !== item.id)
  fileList.value = fileList.value.filter(file => file.id !== item.id)
  deletePersistedUploadFile(item.fileKey)
  renewUploadIntentAfterEdit()
}

function openNativeFilePicker() {
  if (!canPickFiles.value)
    return
  nativeFileInputRef.value?.click()
}

function handleNativeFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  addNativeFiles(Array.from(input.files || []))
  input.value = ''
}

function validateBeforeSubmit() {
  if (uploadItems.value.length === 0) {
    message.warning('请选择图片')
    return false
  }

  if (uploadItems.value.length > MAX_FILES) {
    message.warning(`单批次最多 ${MAX_FILES} 张图片`)
    return false
  }

  if (totalSize.value > MAX_BATCH_SIZE) {
    message.warning('单批次总大小不能超过 100MB')
    return false
  }

  const pageIndexes = new Set<number>()
  for (const item of uploadItems.value) {
    const title = item.title.trim() || form.title.trim()
    const author = item.author.trim() || form.author.trim()
    if (!title || !author) {
      message.warning(`${item.filename} 缺少标题或作者`)
      return false
    }

    if (form.pidMode === 'SINGLE_PID_MULTI_PAGE') {
      if (!Number.isInteger(item.pageIndex) || item.pageIndex < 0) {
        message.warning(`${item.filename} 的页码必须是非负整数`)
        return false
      }
      if (pageIndexes.has(item.pageIndex)) {
        message.warning('同一 PID 多页模式下页码不能重复')
        return false
      }
      pageIndexes.add(item.pageIndex)
    }
  }

  return true
}

function buildInitItems(): GalleryUploadInitItem[] {
  return uploadItems.value.map((item) => {
    const tags = parseTagsInput(item.tagsText)
    return {
      clientItemId: item.clientItemId,
      filename: item.filename,
      contentType: item.contentType,
      sizeBytes: item.sizeBytes,
      pageIndex: form.pidMode === 'SINGLE_PID_MULTI_PAGE' ? item.pageIndex : undefined,
      title: item.title.trim() || undefined,
      author: item.author.trim() || undefined,
      r18: undefined,
      aiType: undefined,
      tags: tags.length > 0 ? tags : undefined,
    }
  })
}

async function handleStartUpload() {
  if (uploading.value)
    return

  if (!validateBeforeSubmit())
    return

  uploading.value = true
  submitError.value = ''
  shaWarningShown = false
  markRetryableItemsPending()

  try {
    let initResponse = await ensureInitResponse()

    const completedItems: GalleryUploadCompleteItem[] = []
    for (let index = 0; index < uploadItems.value.length; index += 1) {
      let localItem = uploadItems.value[index]
      if (!localItem)
        throw new Error('本地上传项丢失')

      const completedItem = getCompletedUploadItem(localItem)
      if (localItem.status === 'finished' && completedItem) {
        completedItems.push(completedItem)
        continue
      }

      let credentialRefreshAttempted = false
      while (true) {
        if (isInitResponseExpiring(initResponse)) {
          initResponse = await refreshInitResponseForUploadRetry()
          localItem = uploadItems.value[index] || localItem
        }

        const preparedItem = getPreparedUploadItem(initResponse, localItem, index)
        if (!preparedItem)
          throw new Error('初始化响应缺少上传项')
        if (isExpiredUploadStatus(preparedItem.status)) {
          resetExpiredUploadDraft('上传窗口已过期，请重新投稿')
          throw new Error('上传窗口已过期，请重新投稿')
        }

        try {
          await tryCalculateSha256(localItem)

          localItem.status = 'uploading'
          localItem.progress = 0
          localItem.submissionId = preparedItem.submissionId
          localItem.objectKey = preparedItem.objectKey
          await reportItemUploadStatus(initResponse.batchId, localItem, 'UPLOADING')

          const result = await uploadGalleryFileToOss({
            initResponse,
            uploadItem: preparedItem,
            file: localItem.file,
            contentType: localItem.contentType,
            onProgress: percent => (localItem.progress = percent),
          })

          localItem.status = 'finished'
          localItem.progress = 100
          localItem.etag = result.etag
          await reportItemUploadStatus(initResponse.batchId, localItem, 'UPLOADED')
          completedItems.push({
            submissionId: result.submissionId,
            objectKey: result.objectKey,
            etag: result.etag,
            sha256: localItem.sha256,
          })
          break
        }
        catch (itemError) {
          if (!credentialRefreshAttempted && isRefreshableOssUploadError(itemError) && localItem.objectKey === preparedItem.objectKey) {
            credentialRefreshAttempted = true
            localItem.error = '上传凭证已刷新，正在重试'
            initResponse = await refreshInitResponseForUploadRetry()
            localItem = uploadItems.value[index] || localItem
            continue
          }

          localItem.status = 'error'
          localItem.error = getApiErrorMessage(itemError, '上传失败')
          await reportItemUploadStatus(initResponse.batchId, localItem, 'FAILED', localItem.error)
          throw itemError
        }
      }
    }

    const completed = unwrapApiData(await completeGalleryUploadBatch(initResponse.batchId, {
      items: completedItems,
    }, {
      timeout: COMPLETE_UPLOAD_TIMEOUT,
    }))
    if (isExpiredUploadStatus(completed.status)) {
      resetExpiredUploadDraft('上传窗口已过期，请重新投稿')
      message.error('上传已过期，请重新投稿')
      return
    }

    message.success(completed.message || '上传完成，等待管理员审核')
    resetUploadForm()
    activeTab.value = 'records'
    recordsPage.value = 1
    recordsStatus.value = 'ALL'
    await loadRecords()
  }
  catch (error) {
    if (!shouldIgnoreApiError(error)) {
      if (handleGalleryUploadIncomplete(error))
        return
      if (isExpiredUploadError(error)) {
        message.error('上传已过期，请重新投稿')
        return
      }

      handleFailedUpload(error)
      showApiError(message, error, '上传失败')
    }
  }
  finally {
    uploading.value = false
    saveUploadDraft()
  }
}

async function loadRecords() {
  recordsLoading.value = true
  try {
    const status = recordsStatus.value === 'ALL' ? undefined : recordsStatus.value
    const data = unwrapApiData(await fetchMyGalleryUploadBatches({
      status: status as GalleryUploadStatus | undefined,
      page: recordsPage.value,
      pageSize: recordsPageSize,
    }), {
      total: 0,
      page: recordsPage.value,
      pageSize: recordsPageSize,
      list: [],
    })
    records.value = data.list || []
    recordsTotal.value = data.total || 0
    recordsPage.value = data.page || recordsPage.value
  }
  catch (error) {
    if (!shouldIgnoreApiError(error))
      showApiError(message, error, '加载投稿记录失败')
  }
  finally {
    recordsLoading.value = false
  }
}

function handleStatusChange() {
  recordsPage.value = 1
  void loadRecords()
}

function handleRecordPageChange(page: number) {
  recordsPage.value = page
  void loadRecords()
}

function parsePositiveId(value: unknown) {
  const raw = Array.isArray(value) ? value[0] : value
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : null
}

async function openDetailByBatchId(batchId: number) {
  detailModal.value = true
  detailLoading.value = true
  detailData.value = null
  try {
    detailData.value = unwrapApiData(await fetchMyGalleryUploadBatchDetail(batchId), null)
  }
  catch (error) {
    if (!shouldIgnoreApiError(error))
      showApiError(message, error, '加载投稿详情失败')
    detailModal.value = false
  }
  finally {
    detailLoading.value = false
  }
}

async function openDetail(batch: GallerySubmissionBatchSummary) {
  await openDetailByBatchId(batch.batchId)
}

function openDetailFromQuery() {
  const batchId = parsePositiveId(route.query.batchId)
  if (!batchId)
    return

  activeTab.value = 'records'
  recordsStatus.value = 'ALL'
  void openDetailByBatchId(batchId)
}

function canCancel(batch: GallerySubmissionBatchSummary) {
  return batch.status === 'UPLOADING' || batch.status === 'WAITING_MANUAL_REVIEW'
}

function confirmCancel(batch: GallerySubmissionBatchSummary) {
  dialog.warning({
    title: '取消投稿',
    content: `确认取消批次 #${batch.batchId} 吗？`,
    positiveText: '确认取消',
    negativeText: '保留',
    onPositiveClick: async () => {
      try {
        await cancelGalleryUploadBatch(batch.batchId)
        message.success('已取消投稿批次')
        await loadRecords()
      }
      catch (error) {
        if (!shouldIgnoreApiError(error))
          showApiError(message, error, '取消失败')
      }
    },
  })
}

function getItemStatusText(status: LocalUploadStatus) {
  if (status === 'hashing')
    return '计算 SHA-256'
  if (status === 'uploading')
    return '上传 OSS'
  if (status === 'finished')
    return '已上传'
  if (status === 'error')
    return '失败'
  return '待上传'
}

function publicImageLabel(item: { publicPid?: number | null, publicP?: number | null }) {
  if (item.publicPid === null || item.publicPid === undefined)
    return '-'
  return `${item.publicPid}_p${item.publicP ?? 0}`
}

onMounted(() => {
  loadUploadDraft()
  draftReady.value = true
  void (async () => {
    await restoreDraftFiles()
    await recoverDraftBatch()
  })()
  void loadRecords()
})

watch(
  () => route.query.batchId,
  () => openDetailFromQuery(),
  { immediate: true },
)

onUnmounted(() => {
  uploadItems.value.forEach(item => revokePreviewUrl(item.previewUrl))
})
</script>

<template>
  <div class="page-container ui-page" data-testid="gallery-upload-page">
    <div class="page-header ui-page-header">
      <h1 class="page-title ui-page-title">
        <NIcon size="28" color="#f586a9">
          <CloudUploadOutline />
        </NIcon>
        图库投稿
      </h1>
      <NButton secondary :loading="recordsLoading" @click="loadRecords">
        <template #icon>
          <NIcon><RefreshOutline /></NIcon>
        </template>
        刷新
      </NButton>
    </div>

    <NTabs v-model:value="activeTab" type="segment" animated class="gallery-tabs">
      <NTabPane name="upload" tab="新投稿">
        <div class="upload-layout">
          <NCard :bordered="false" class="panel-card">
            <NForm label-placement="top" class="upload-form">
              <NGrid :cols="2" :x-gap="16" :y-gap="8" responsive="screen">
                <NGridItem span="2 m:1">
                  <NFormItem label="投稿模式">
                    <NRadioGroup v-model:value="form.pidMode" name="pidMode" :disabled="uploading">
                      <NRadioButton
                        v-for="option in pidModeOptions"
                        :key="option.value"
                        :value="option.value"
                      >
                        {{ option.label }}
                      </NRadioButton>
                    </NRadioGroup>
                  </NFormItem>
                </NGridItem>
                <NGridItem>
                  <NFormItem label="默认标题">
                    <NInput v-model:value="form.title" placeholder="标题" maxlength="80" clearable :disabled="uploading" />
                  </NFormItem>
                </NGridItem>
                <NGridItem>
                  <NFormItem label="默认作者">
                    <NInput v-model:value="form.author" placeholder="作者" maxlength="80" clearable :disabled="uploading" />
                  </NFormItem>
                </NGridItem>
                <NGridItem>
                  <NFormItem label="分级">
                    <NCheckbox v-model:checked="form.r18" :disabled="uploading">
                      R18
                    </NCheckbox>
                  </NFormItem>
                </NGridItem>
                <NGridItem>
                  <NFormItem label="AI 类型">
                    <NSelect v-model:value="form.aiType" :options="aiTypeOptions" :disabled="uploading" />
                  </NFormItem>
                </NGridItem>
                <NGridItem span="2">
                  <NFormItem label="默认标签">
                    <NInput v-model:value="form.tagsText" placeholder="用逗号或换行分隔" clearable :disabled="uploading" />
                  </NFormItem>
                </NGridItem>
              </NGrid>
            </NForm>
          </NCard>

          <NCard :bordered="false" class="panel-card">
            <NAlert
              v-if="draftRestoredNotice"
              type="info"
              closable
              class="upload-alert"
              @close="handleDraftAlertClose"
            >
              {{ draftRestoreMessage }}
            </NAlert>

            <NAlert
              v-if="submitError"
              type="error"
              class="upload-alert"
            >
              {{ submitError }}
            </NAlert>

            <div
              class="upload-dragger native-upload-trigger"
              data-testid="gallery-upload-picker"
              role="button"
              :tabindex="canPickFiles ? 0 : -1"
              :aria-disabled="!canPickFiles"
              @keydown.enter.stop.prevent="openNativeFilePicker"
              @keydown.space.stop.prevent="openNativeFilePicker"
            >
              <input
                ref="nativeFileInputRef"
                class="native-file-input"
                data-testid="gallery-upload-file-input"
                type="file"
                multiple
                accept="image/jpeg,image/png"
                :disabled="!canPickFiles"
                tabindex="-1"
                aria-label="选择投稿图片"
                @change="handleNativeFileChange"
              >
              <NIcon size="34" color="#f586a9">
                <CloudUploadOutline />
              </NIcon>
              <div class="dragger-title">
                选择投稿图片
              </div>
              <div class="dragger-meta">
                {{ selectedCount }}/{{ MAX_FILES }} · {{ formatFileSize(totalSize) }} / 100MB
              </div>
            </div>

            <div v-if="uploadItems.length > 0" class="selected-toolbar">
              <NCheckbox v-model:checked="includeSha256" :disabled="uploading">
                上传前计算 SHA-256
              </NCheckbox>
              <NButton tertiary size="small" :disabled="uploading" @click="resetUploadForm">
                清空
              </NButton>
            </div>

            <div v-if="uploadItems.length > 0" class="file-list">
              <div v-for="item in uploadItems" :key="item.id" class="file-row" data-testid="gallery-upload-file-row">
                <div class="file-preview">
                  <img :src="item.previewUrl" :alt="item.filename">
                </div>
                <div class="file-editor">
                  <div class="file-head">
                    <div>
                      <div class="file-name">
                        {{ item.filename }}
                      </div>
                      <div class="file-meta">
                        {{ item.contentType }} · {{ formatFileSize(item.sizeBytes) }}
                      </div>
                    </div>
                    <NButton
                      quaternary
                      circle
                      size="small"
                      :disabled="uploading"
                      @click="removeUploadItem(item)"
                    >
                      <template #icon>
                        <NIcon><TrashOutline /></NIcon>
                      </template>
                    </NButton>
                  </div>

                  <div class="item-fields">
                    <NInput v-model:value="item.title" size="small" placeholder="单图标题（可选）" clearable :disabled="uploading" />
                    <NInput v-model:value="item.author" size="small" placeholder="单图作者（可选）" clearable :disabled="uploading" />
                    <NInputNumber
                      v-if="form.pidMode === 'SINGLE_PID_MULTI_PAGE'"
                      v-model:value="item.pageIndex"
                      size="small"
                      :min="0"
                      :precision="0"
                      placeholder="页码"
                      :disabled="uploading"
                    />
                    <NInput v-model:value="item.tagsText" size="small" placeholder="单图标签（可选）" clearable :disabled="uploading" />
                  </div>

                  <div v-if="item.status !== 'pending'" class="progress-row">
                    <span>{{ getItemStatusText(item.status) }}</span>
                    <NProgress
                      type="line"
                      :percentage="item.status === 'hashing' ? 0 : item.progress"
                      :status="item.status === 'error' ? 'error' : item.status === 'finished' ? 'success' : 'default'"
                      :processing="item.status === 'hashing' || item.status === 'uploading'"
                    />
                  </div>
                  <div v-if="item.error" class="item-error">
                    {{ item.error }}
                  </div>
                </div>
              </div>
            </div>

            <div class="submit-bar">
              <NButton
                type="primary"
                size="large"
                :loading="uploading"
                :disabled="!canStartUpload"
                @click="handleStartUpload"
              >
                <template #icon>
                  <NIcon><CloudUploadOutline /></NIcon>
                </template>
                提交投稿
              </NButton>
            </div>
          </NCard>
        </div>
      </NTabPane>

      <NTabPane name="records" tab="我的投稿">
        <NCard :bordered="false" class="panel-card records-panel">
          <div class="records-toolbar">
            <NSelect
              v-model:value="recordsStatus"
              class="status-select"
              :options="statusOptions"
              @update:value="handleStatusChange"
            />
            <NButton secondary :loading="recordsLoading" @click="loadRecords">
              <template #icon>
                <NIcon><RefreshOutline /></NIcon>
              </template>
              刷新
            </NButton>
          </div>

          <NSpin :show="recordsLoading">
            <div v-if="records.length > 0" class="record-list">
              <div v-for="batch in records" :key="batch.batchId" class="record-card">
                <div class="record-main">
                  <div class="record-icon">
                    <NIcon size="24">
                      <AlbumsOutline />
                    </NIcon>
                  </div>
                  <div class="record-content">
                    <div class="record-title">
                      {{ batch.title || `投稿批次 #${batch.batchId}` }}
                    </div>
                    <div class="record-meta">
                      <span>#{{ batch.batchId }}</span>
                      <span>{{ getGalleryPidModeLabel(batch.pidMode) }}</span>
                      <span>{{ batch.itemCount }} 张</span>
                      <span>{{ formatDate(batch.createdAt) }}</span>
                    </div>
                    <div v-if="batch.tags?.length" class="tag-row">
                      <NTag v-for="tag in batch.tags.slice(0, 6)" :key="tag" size="small" round>
                        {{ tag }}
                      </NTag>
                    </div>
                  </div>
                </div>

                <div class="record-stats">
                  <NTag :type="getGalleryUploadStatusMeta(batch.status).type" round>
                    {{ getGalleryUploadStatusMeta(batch.status).label }}
                  </NTag>
                  <div class="count-line">
                    {{ batch.uploadedCount }}/{{ batch.itemCount }} 已上传
                  </div>
                  <div v-if="isExpiredUploadStatus(batch.status)" class="count-line expired-line">
                    上传已过期，请重新投稿
                  </div>
                  <div v-if="batch.publishedCount > 0" class="count-line">
                    {{ batch.publishedCount }} 已发布
                  </div>
                </div>

                <div class="record-actions">
                  <NButton secondary size="small" @click="openDetail(batch)">
                    <template #icon>
                      <NIcon><EyeOutline /></NIcon>
                    </template>
                    详情
                  </NButton>
                  <NButton
                    v-if="canCancel(batch)"
                    tertiary
                    type="error"
                    size="small"
                    @click="confirmCancel(batch)"
                  >
                    <template #icon>
                      <NIcon><CloseCircleOutline /></NIcon>
                    </template>
                    取消
                  </NButton>
                </div>
              </div>
            </div>
            <div v-else class="empty-box">
              <NEmpty description="暂无投稿记录" />
            </div>
          </NSpin>

          <div v-if="recordsTotal > recordsPageSize" class="pagination-wrapper">
            <NPagination
              :page="recordsPage"
              :page-count="Math.ceil(recordsTotal / recordsPageSize)"
              @update:page="handleRecordPageChange"
            />
          </div>
        </NCard>
      </NTabPane>
    </NTabs>

    <NModal v-model:show="detailModal">
      <NCard class="detail-card" :bordered="false">
        <template #header>
          <div class="modal-title">
            <NIcon size="22" color="#f586a9">
              <EyeOutline />
            </NIcon>
            投稿详情
          </div>
        </template>

        <NSpin :show="detailLoading">
          <div v-if="detailData" class="detail-content">
            <div class="detail-summary">
              <div>
                <div class="detail-name">
                  {{ detailData.title || `投稿批次 #${detailData.batchId}` }}
                </div>
                <div class="detail-meta">
                  #{{ detailData.batchId }} · {{ getGalleryPidModeLabel(detailData.pidMode) }} · {{ formatDate(detailData.createdAt) }}
                </div>
              </div>
              <NTag :type="getGalleryUploadStatusMeta(detailData.status).type" round>
                {{ getGalleryUploadStatusMeta(detailData.status).label }}
              </NTag>
            </div>

            <NAlert
              v-if="isExpiredUploadStatus(detailData.status)"
              type="error"
              title="上传已过期"
              class="detail-alert"
            >
              该投稿批次的上传窗口已过期，后端可能已清理未完成的 OSS 对象。请重新发起投稿。
            </NAlert>

            <div class="detail-grid">
              <div v-for="item in detailData.items" :key="item.submissionId" class="detail-item">
                <div class="detail-image">
                  <NImage
                    v-if="item.previewUrl"
                    :src="item.previewUrl"
                    object-fit="cover"
                    :img-props="{ referrerpolicy: 'no-referrer' }"
                  />
                  <div v-else class="no-preview">
                    <NIcon size="24">
                      <AlbumsOutline />
                    </NIcon>
                  </div>
                </div>
                <div class="detail-item-body">
                  <div class="detail-item-title">
                    {{ item.title || detailData.title || item.objectKey }}
                  </div>
                  <div class="detail-item-meta">
                    <span>submission {{ item.submissionId }}</span>
                    <span v-if="item.pageIndex !== null && item.pageIndex !== undefined">p{{ item.pageIndex }}</span>
                    <span>{{ formatFileSize(item.sizeBytes) }}</span>
                    <NTag size="tiny" :type="getGalleryUploadStatusMeta(item.status).type">
                      {{ getGalleryUploadStatusMeta(item.status).label }}
                    </NTag>
                  </div>
                  <div class="detail-item-meta">
                    <span>发布 PID：{{ publicImageLabel(item) }}</span>
                  </div>
                  <div v-if="item.rejectReason" class="reject-reason">
                    {{ item.rejectReason }}
                  </div>
                  <div v-if="item.tags?.length" class="tag-row">
                    <NTag v-for="tag in item.tags.slice(0, 6)" :key="tag" size="small">
                      {{ tag }}
                    </NTag>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-else-if="!detailLoading" class="empty-box">
            <NEmpty description="未找到详情" />
          </div>
        </NSpin>
      </NCard>
    </NModal>
  </div>
</template>

<style scoped>
.gallery-tabs {
  margin-top: 18px;
}

.upload-layout {
  display: grid;
  grid-template-columns: minmax(280px, 0.9fr) minmax(360px, 1.3fr);
  gap: 18px;
}

.panel-card {
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.72);
  box-shadow: 0 16px 38px rgba(31, 41, 55, 0.08);
}

.upload-form :deep(.n-form-item) {
  margin-bottom: 2px;
}

.upload-alert {
  margin-bottom: 12px;
}

.upload-dragger {
  position: relative;
  display: grid;
  place-items: center;
  border-radius: 8px;
  padding: 28px 18px;
  border: 1px dashed rgba(245, 134, 169, 0.52);
  background: rgba(255, 255, 255, 0.56);
  cursor: pointer;
  overflow: hidden;
  text-align: center;
  touch-action: manipulation;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.upload-dragger:hover,
.upload-dragger:focus-visible {
  border-color: rgba(245, 134, 169, 0.9);
  background: rgba(255, 247, 250, 0.74);
  outline: none;
}

.native-upload-trigger[aria-disabled="true"] {
  cursor: not-allowed;
  opacity: 0.62;
}

.native-file-input {
  position: absolute;
  inset: 0;
  z-index: 2;
  width: 100%;
  height: 100%;
  cursor: pointer;
  opacity: 0;
}

.native-file-input:disabled {
  cursor: not-allowed;
  pointer-events: none;
}

.native-upload-trigger > :not(.native-file-input) {
  pointer-events: none;
}

.dragger-title {
  margin-top: 10px;
  font-size: 16px;
  font-weight: 700;
  color: #263247;
}

.dragger-meta {
  margin-top: 4px;
  font-size: 13px;
  color: #64748b;
}

.selected-toolbar,
.records-toolbar,
.submit-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px;
}

.file-list,
.record-list,
.detail-grid {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}

.file-row {
  display: grid;
  grid-template-columns: 92px 1fr;
  gap: 12px;
  padding: 12px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.62);
  content-visibility: auto;
  contain-intrinsic-size: 116px;
}

.file-preview,
.detail-image {
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 8px;
  background: #f1f5f9;
}

.file-preview img,
.detail-image :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.file-editor {
  min-width: 0;
}

.file-head,
.record-main,
.detail-summary {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.file-name,
.record-title,
.detail-name,
.detail-item-title {
  font-weight: 700;
  color: #263247;
  overflow-wrap: anywhere;
}

.file-meta,
.record-meta,
.detail-meta,
.detail-item-meta,
.count-line {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
  color: #64748b;
  font-size: 12px;
}

.item-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 10px;
}

.progress-row {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  color: #64748b;
  font-size: 12px;
}

.item-error,
.reject-reason {
  margin-top: 8px;
  color: #dc2626;
  font-size: 13px;
}

.expired-line {
  color: #dc2626;
  font-weight: 700;
}

.records-panel {
  min-height: 360px;
}

.status-select {
  width: 220px;
}

.record-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 16px;
  align-items: center;
  padding: 14px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.66);
}

.record-icon {
  display: grid;
  place-items: center;
  flex: 0 0 44px;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  color: #f26d99;
  background: rgba(245, 134, 169, 0.14);
}

.record-content {
  min-width: 0;
  flex: 1;
}

.record-stats,
.record-actions {
  display: grid;
  justify-items: end;
  gap: 8px;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.empty-box {
  display: grid;
  place-items: center;
  min-height: 220px;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
}

.detail-card {
  width: min(920px, 94vw);
  max-height: 86vh;
  overflow: auto;
  border-radius: 8px;
}

.modal-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-summary {
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.22);
}

.detail-alert {
  margin-top: 14px;
}

.detail-item {
  display: grid;
  grid-template-columns: 128px minmax(0, 1fr);
  gap: 12px;
  padding: 12px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.72);
}

.no-preview {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  color: #94a3b8;
}

@media (max-width: 980px) {
  .upload-layout,
  .record-card {
    grid-template-columns: 1fr;
  }

  .record-stats,
  .record-actions {
    justify-items: start;
  }
}

@media (max-width: 640px) {
  .file-row,
  .detail-item {
    grid-template-columns: 1fr;
  }

  .file-preview,
  .detail-image {
    max-height: 220px;
  }

  .item-fields,
  .progress-row {
    grid-template-columns: 1fr;
  }

  .selected-toolbar,
  .records-toolbar,
  .submit-bar {
    align-items: stretch;
    flex-direction: column;
  }

  .status-select {
    width: 100%;
  }
}
</style>
