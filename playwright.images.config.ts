import { defineConfig } from '@playwright/test'
import base from './playwright.config'
export default defineConfig({
  ...base,
  testMatch: /images\.spec\.ts/,
  timeout: 60000,
  projects: [
    { name: 'images-mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: 'images-desktop', use: { viewport: { width: 1440, height: 1000 } } },
  ],
})
