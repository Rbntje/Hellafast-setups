import { defineConfig, devices } from '@playwright/test'

const baseURL = 'http://127.0.0.1:4173/Hellafast-setups/'
export default defineConfig({
  testDir: './tests/browser',
  timeout: 30_000,
  workers: 2,
  use: {
    baseURL,
    contextOptions: { reducedMotion: 'reduce' },
    launchOptions: { executablePath: process.env.HELLAFAST_CHROMIUM },
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'compact-chromium', use: { ...devices['iPhone SE'], defaultBrowserType: 'chromium' } },
  ],
  webServer: {
    command: 'npm run preview -- --base /Hellafast-setups/ --port 4173 --strictPort',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
})
