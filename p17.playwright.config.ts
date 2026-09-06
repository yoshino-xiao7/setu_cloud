import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'music-p17.spec.ts',
  workers: 1,
  timeout: 45000,
  expect: { timeout: 12000 },
  outputDir: '/private/tmp/p17-ui-results',
  reporter: [['list'], ['json', { outputFile: '/private/tmp/p17-ui-results.json' }]],
  use: { baseURL: 'http://127.0.0.1:4177', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  projects: [{ name: 'desktop1440', use: { viewport: { width: 1440, height: 900 } } }, { name: 'mobile390', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } }],
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 4177', url: 'http://127.0.0.1:4177', reuseExistingServer: false, timeout: 120000, env: { VITE_USE_API_MOCKS: 'true', VITE_API_BASE_URL: 'http://mock.local' } },
})
