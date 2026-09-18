/* eslint-disable regexp/no-super-linear-backtracking */
function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function inline(value: string, assets: Record<string, string>) {
  let result = escapeHtml(value)
  result = result.replace(/!\[([^\]]*)\]\(asset:\/\/(\d+)\)/g, (_match, alt: string, id: string) => {
    const url = assets[id]
    return url ? `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" loading="lazy">` : ''
  })
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  result = result.replace(/`([^`]+)`/g, '<code>$1</code>')
  return result
}

export function renderQqMarkdown(markdown: string, assetUrls: Record<string, string> = {}) {
  const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n')
  const html: string[] = []
  let paragraph: string[] = []
  let listOpen = false
  let codeOpen = false
  const flushParagraph = () => {
    if (paragraph.length) {
      html.push(`<p>${inline(paragraph.join(' '), assetUrls)}</p>`)
      paragraph = []
    }
  }
  const closeList = () => {
    if (listOpen) {
      html.push('</ul>')
      listOpen = false
    }
  }
  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      flushParagraph()
      closeList()
      if (codeOpen) {
        html.push('</code></pre>')
        codeOpen = false
      }
      else {
        html.push('<pre><code>')
        codeOpen = true
      }
      continue
    }
    if (codeOpen) {
      html.push(`${escapeHtml(line)}\n`)
      continue
    }
    if (!line.trim()) {
      flushParagraph()
      closeList()
      continue
    }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line.trim())
    if (heading) {
      flushParagraph()
      closeList()
      const level = heading[1].length
      html.push(`<h${level}>${inline(heading[2], assetUrls)}</h${level}>`)
      continue
    }
    const list = /^[-*]\s+(.+)$/.exec(line.trim())
    if (list) {
      flushParagraph()
      if (!listOpen) {
        html.push('<ul>')
        listOpen = true
      }
      html.push(`<li>${inline(list[1], assetUrls)}</li>`)
      continue
    }
    const quote = /^>\s?(.+)$/.exec(line.trim())
    if (quote) {
      flushParagraph()
      closeList()
      html.push(`<blockquote>${inline(quote[1], assetUrls)}</blockquote>`)
      continue
    }
    if (line.trim() === '---') {
      flushParagraph()
      closeList()
      html.push('<hr>')
      continue
    }
    paragraph.push(line.trim())
  }
  flushParagraph()
  closeList()
  if (codeOpen)
    html.push('</code></pre>')
  return html.join('')
}
