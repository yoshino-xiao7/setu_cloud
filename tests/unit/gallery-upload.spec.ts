import type { GalleryUploadInitResponse, GalleryUploadPreparedItem } from '@/api/galleryUpload'
import { describe, expect, it } from 'vitest'
import { resolveDirectUploadRequest } from '@/api/galleryUploadDirect'

function createInitResponse(): GalleryUploadInitResponse {
  return {
    batchId: 1,
    pidMode: 'MULTI_PID_P0',
    status: 'UPLOADING',
    uploadPolicy: {
      provider: 'oss',
      region: 'oss-cn-test',
      bucket: 'bucket',
      endpoint: 'https://bucket.example.test',
      prefix: 'gallery/',
      expiresAt: '2099-01-01T00:00:00Z',
      maxSizeBytes: 1024,
      allowedContentTypes: ['image/png'],
      uploadUrl: 'https://upload.example.test/policy',
      uploadMethod: 'PUT',
      uploadHeaders: { 'x-policy': '1' },
    },
    credentials: {
      accessKeyId: 'id',
      accessKeySecret: 'secret',
      securityToken: 'token',
      expiration: '2099-01-01T00:00:00Z',
    },
    items: [],
  }
}

function createUploadItem(): GalleryUploadPreparedItem {
  return {
    submissionId: 1,
    itemIndex: 0,
    objectKey: 'gallery/a.png',
    status: 'UPLOADING',
  }
}

describe('resolveDirectUploadRequest', () => {
  it('uses compatible policy-level direct upload fields', () => {
    const request = resolveDirectUploadRequest(createInitResponse(), createUploadItem(), 'image/png')

    expect(request).toEqual({
      url: 'https://upload.example.test/policy',
      method: 'PUT',
      headers: {
        'x-policy': '1',
        'Content-Type': 'image/png',
      },
    })
  })

  it('lets item-level direct upload fields override policy fields', () => {
    const item = {
      ...createUploadItem(),
      uploadUrl: 'https://upload.example.test/item',
      uploadMethod: 'POST',
      uploadHeaders: { 'x-item': '1' },
    }

    const request = resolveDirectUploadRequest(createInitResponse(), item, 'image/jpeg')

    expect(request).toEqual({
      url: 'https://upload.example.test/item',
      method: 'POST',
      headers: {
        'x-policy': '1',
        'x-item': '1',
        'Content-Type': 'image/jpeg',
      },
    })
  })
})
