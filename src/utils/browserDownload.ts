function sanitizeDownloadFilename(filename: string) {
  return filename.replace(/[\\/:*?"<>|]+/g, '_').trim() || 'download'
}

export async function downloadUrlInBrowser(url: string, filename: string) {
  let response: Response

  try {
    response = await fetch(url, {
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    })
  }
  catch {
    throw new Error('浏览器无法读取该跨域资源，不能直接下载')
  }

  if (!response.ok)
    throw new Error(`下载失败：资源响应 ${response.status}`)

  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  try {
    anchor.href = objectUrl
    anchor.download = sanitizeDownloadFilename(filename)
    anchor.rel = 'noopener'
    anchor.style.display = 'none'
    document.body.appendChild(anchor)
    anchor.click()
  }
  finally {
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
  }
}
