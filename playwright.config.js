import { defineConfig, devices } from '@playwright/test'
import { createBrowserLibrary } from './tests/e2e/fixtures.js'

process.env.PORTFOLIO_E2E_ASSET_DIR ||= createBrowserLibrary()

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4178',
    trace: 'retain-on-failure',
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4178 --strictPort',
    url: 'http://127.0.0.1:4178',
    reuseExistingServer: false,
    env: {
      NODE_ENV: 'development',
      PORTFOLIO_ASSET_DIR: process.env.PORTFOLIO_E2E_ASSET_DIR,
      // Public test fixtures only; never used in a deployment.
      PORTFOLIO_PASSWORD: 'portfolio-e2e-fixture-only',
      PORTFOLIO_SESSION_SECRET: 'portfolio-e2e-signing-fixture-not-for-deployment-123456',
    },
  },
})
