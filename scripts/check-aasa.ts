import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const expectedAppID = '7G6J4S76PN.icu.yukiryou.setuios'
const sourcePath = resolve('public/.well-known/apple-app-site-association')
const buildPath = resolve('dist/.well-known/apple-app-site-association')

for (const path of [sourcePath, buildPath]) {
  if (!existsSync(path))
    throw new Error(`AASA file is missing: ${path}`)

  const association = JSON.parse(readFileSync(path, 'utf8')) as {
    webcredentials?: { apps?: string[] }
  }

  if (!association.webcredentials?.apps?.includes(expectedAppID))
    throw new Error(`AASA webcredentials is missing ${expectedAppID}: ${path}`)
}

console.warn('AASA source and build output are valid.')
