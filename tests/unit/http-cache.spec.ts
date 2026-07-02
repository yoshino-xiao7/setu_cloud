import { describe, expect, it } from 'vitest'
import { cloneCachedResponseData } from '@/api/httpCache'

describe('cloneCachedResponseData', () => {
  it('deep clones nested response data', () => {
    const source = {
      list: [{ id: 1, meta: { liked: false } }],
    }

    const cloned = cloneCachedResponseData(source) as typeof source
    cloned.list[0].meta.liked = true

    expect(source.list[0].meta.liked).toBe(false)
  })

  it('falls back to shallow clone for non-serializable objects', () => {
    const fn = () => 'ok'
    const source = { fn }

    const cloned = cloneCachedResponseData(source) as typeof source

    expect(cloned).not.toBe(source)
    expect(cloned.fn).toBe(fn)
  })
})
