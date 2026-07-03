import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import process from 'node:process'
import { TextDecoder } from 'node:util'

const ROOT = process.cwd()
const EXCLUDED_DIRS = new Set([
  '.git',
  'dist',
  'node_modules',
  'test-results',
  'playwright-report',
])
const TEXT_EXTENSIONS = new Set([
  '.css',
  '.html',
  '.js',
  '.json',
  '.md',
  '.mjs',
  '.ts',
  '.tsx',
  '.vue',
  '.xml',
  '.yml',
  '.yaml',
])
const TEXT_FILENAMES = new Set([
  '.editorconfig',
])
const decoder = new TextDecoder('utf-8', { fatal: true })
const invalidFiles: string[] = []
const suspiciousFiles: Array<{ file: string, reason: string }> = []

const SUSPICIOUS_TEXT_PATTERNS: Array<{ pattern: RegExp, reason: string }> = [
  { pattern: /\uFFFD/, reason: 'contains Unicode replacement characters' },
  { pattern: /[\uE000-\uF8FF]/, reason: 'contains private-use characters often produced by broken decoding' },
  { pattern: /[\u00C2\u00C3]|\u00E2[\u0080\u20AC]/, reason: 'matches common UTF-8-as-Latin-1 mojibake' },
  { pattern: /[\u947E\u922D\u9983\u9241]|\u6FB6\u8FAB|\u9358\u71B7|\u93C0\u60F0|\u9422\u5BA0/, reason: 'matches common UTF-8-as-GBK mojibake' },
]

function getExtension(filePath: string) {
  const slash = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'))
  const dot = filePath.lastIndexOf('.')
  return dot > slash ? filePath.slice(dot).toLowerCase() : ''
}

function shouldCheckFile(filePath: string) {
  const name = filePath.slice(Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\')) + 1)
  return TEXT_FILENAMES.has(name) || TEXT_EXTENSIONS.has(getExtension(filePath))
}

function walk(dir: string) {
  for (const entry of readdirSync(dir)) {
    if (EXCLUDED_DIRS.has(entry))
      continue

    const path = join(dir, entry)
    const stat = statSync(path)
    if (stat.isDirectory()) {
      walk(path)
      continue
    }

    if (!stat.isFile() || !shouldCheckFile(path))
      continue

    const bytes = readFileSync(path)
    try {
      const text = decoder.decode(bytes)
      const suspiciousPattern = SUSPICIOUS_TEXT_PATTERNS.find(({ pattern }) => pattern.test(text))
      if (suspiciousPattern) {
        suspiciousFiles.push({
          file: relative(ROOT, path),
          reason: suspiciousPattern.reason,
        })
      }
    }
    catch {
      invalidFiles.push(relative(ROOT, path))
    }
  }
}

walk(ROOT)

if (invalidFiles.length > 0) {
  console.error('Non UTF-8 text files detected:')
  for (const file of invalidFiles)
    console.error(`- ${file}`)
  process.exit(1)
}

if (suspiciousFiles.length > 0) {
  console.error('Suspicious mojibake text detected:')
  for (const entry of suspiciousFiles)
    console.error(`- ${entry.file}: ${entry.reason}`)
  process.exit(1)
}

console.warn('All checked text files are valid UTF-8 and free of known mojibake markers.')
