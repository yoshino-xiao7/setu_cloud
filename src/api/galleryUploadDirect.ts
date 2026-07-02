import type { GalleryUploadInitResponse, GalleryUploadPreparedItem } from '@/api/galleryUpload'

function getDirectUploadUrl(initResponse: GalleryUploadInitResponse, uploadItem: GalleryUploadPreparedItem) {
  return uploadItem.uploadUrl || initResponse.uploadPolicy.uploadUrl || ''
}

function getDirectUploadHeaders(
  initResponse: GalleryUploadInitResponse,
  uploadItem: GalleryUploadPreparedItem,
  contentType: string,
) {
  return {
    ...(initResponse.uploadPolicy.uploadHeaders || {}),
    ...(uploadItem.uploadHeaders || {}),
    'Content-Type': contentType,
  }
}

export function resolveDirectUploadRequest(
  initResponse: GalleryUploadInitResponse,
  uploadItem: GalleryUploadPreparedItem,
  contentType: string,
) {
  const url = getDirectUploadUrl(initResponse, uploadItem)
  if (!url)
    return null

  return {
    url,
    method: uploadItem.uploadMethod || initResponse.uploadPolicy.uploadMethod || 'PUT',
    headers: getDirectUploadHeaders(initResponse, uploadItem, contentType),
  }
}
