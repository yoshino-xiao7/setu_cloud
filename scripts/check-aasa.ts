import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const expectedAppID = '7G6J4S76PN.icu.yukiryou.setuios'
const publicAASAPath = '/.well-known/apple-app-site-association'
const sourcePath = resolve(`public${publicAASAPath}`)
const buildPath = resolve(`dist${publicAASAPath}`)
const edgeOneConfigPath = resolve('edgeone.json')

for (const path of [sourcePath, buildPath]) {
  if (!existsSync(path))
    throw new Error(`AASA file is missing: ${path}`)

  const association = JSON.parse(readFileSync(path, 'utf8')) as {
    webcredentials?: { apps?: string[] }
  }

  if (!association.webcredentials?.apps?.includes(expectedAppID))
    throw new Error(`AASA webcredentials is missing ${expectedAppID}: ${path}`)
}

const edgeOneConfig = JSON.parse(readFileSync(edgeOneConfigPath, 'utf8')) as {
  headers?: Array<{
    source?: string
    headers?: Array<{ key?: string, value?: string }>
  }>
}
const aasaHeaders = edgeOneConfig.headers?.find(
  rule => rule.source === '/.well-known/*',
)?.headers
const hasJSONContentType = aasaHeaders?.some(
  header => header.key?.toLowerCase() === 'content-type' && header.value === 'application/json',
)

if (!hasJSONContentType)
  throw new Error('EdgeOne AASA route must return Content-Type: application/json')

console.warn('AASA source, build output, and response headers are valid.')
