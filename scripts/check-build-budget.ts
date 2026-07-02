import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import process from 'node:process'
import { gzipSync } from 'node:zlib'

const args = process.argv.slice(2)
const distArgIndex = args.findIndex(arg => arg === '--dist')
const distDir = resolve(distArgIndex >= 0 ? args[distArgIndex + 1] || 'dist' : 'dist')
const assetsDir = join(distDir, 'assets')

const KB = 1024
const ROUTE_CHUNK_RAW_LIMIT = 500 * KB
const ENTRY_GZIP_LIMIT = 300 * KB
const DASHBOARD_GZIP_LIMIT = 450 * KB

const VENDOR_BUDGETS = [
  { prefix: 'vendor-oss-', rawLimit: 725 * KB, gzipLimit: 205 * KB },
  { prefix: 'vendor-charts-', rawLimit: 525 * KB, gzipLimit: 185 * KB },
  { prefix: 'vendor-icons-', rawLimit: 95 * KB, gzipLimit: 30 * KB },
]

interface AssetBudget {
  file: string
  rawBytes: number
  gzipBytes: number
}

const formatKb = (bytes: number) => `${(bytes / KB).toFixed(1)}KB`

function readAssets(): AssetBudget[] {
  const files = readdirSync(assetsDir)
    .filter(file => file.endsWith('.js'))

  return files.map((file) => {
    const path = join(assetsDir, file)
    const raw = readFileSync(path)
    return {
      file,
      rawBytes: statSync(path).size,
      gzipBytes: gzipSync(raw).length,
    }
  })
}

const isSharedVendor = (file: string) => file.startsWith('vendor-')
const isAppEntry = (file: string) => file.startsWith('index-')
const isDashboardShell = (file: string) => file.startsWith('UserLayout-') || file.startsWith('UserDashboard-')

const assets = readAssets()
const failures: string[] = []

for (const asset of assets) {
  if (!isSharedVendor(asset.file) && !isAppEntry(asset.file) && asset.rawBytes > ROUTE_CHUNK_RAW_LIMIT) {
    failures.push(`${asset.file} raw ${formatKb(asset.rawBytes)} exceeds route chunk budget ${formatKb(ROUTE_CHUNK_RAW_LIMIT)}`)
  }
}

const appEntry = assets.find(asset => isAppEntry(asset.file))
if (appEntry && appEntry.gzipBytes > ENTRY_GZIP_LIMIT) {
  failures.push(`${appEntry.file} gzip ${formatKb(appEntry.gzipBytes)} exceeds app entry budget ${formatKb(ENTRY_GZIP_LIMIT)}`)
}

const dashboardGzip = assets
  .filter(asset => isDashboardShell(asset.file))
  .reduce((total, asset) => total + asset.gzipBytes, 0)

if (dashboardGzip > DASHBOARD_GZIP_LIMIT) {
  failures.push(`dashboard shell gzip ${formatKb(dashboardGzip)} exceeds budget ${formatKb(DASHBOARD_GZIP_LIMIT)}`)
}

for (const budget of VENDOR_BUDGETS) {
  const asset = assets.find(asset => asset.file.startsWith(budget.prefix))
  if (!asset)
    continue

  if (asset.rawBytes > budget.rawLimit) {
    failures.push(`${asset.file} raw ${formatKb(asset.rawBytes)} exceeds vendor budget ${formatKb(budget.rawLimit)}`)
  }
  if (asset.gzipBytes > budget.gzipLimit) {
    failures.push(`${asset.file} gzip ${formatKb(asset.gzipBytes)} exceeds vendor budget ${formatKb(budget.gzipLimit)}`)
  }
}

if (failures.length) {
  console.error('Build budget check failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

const largest = [...assets]
  .sort((a, b) => b.gzipBytes - a.gzipBytes)
  .slice(0, 8)
  .map(asset => `${asset.file}: raw ${formatKb(asset.rawBytes)}, gzip ${formatKb(asset.gzipBytes)}`)

console.warn('Build budget check passed.')
console.warn(`Checked ${assets.length} JS assets in ${distDir}`)
console.warn('Largest gzip assets:')
for (const line of largest) console.warn(`- ${line}`)
