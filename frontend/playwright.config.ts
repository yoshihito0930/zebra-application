import { defineConfig, devices } from '@playwright/test';

const API_BASE_URL =
  process.env.E2E_API_BASE_URL ||
  'https://ynnrspq7rl.execute-api.ap-northeast-1.amazonaws.com/dev/';
const FRONTEND_BASE_URL = process.env.E2E_FRONTEND_BASE_URL || 'http://localhost:5173';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: FRONTEND_BASE_URL,
    extraHTTPHeaders: { 'Content-Type': 'application/json' },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'api',
      testMatch: /.*\.api\.spec\.ts/,
      use: { baseURL: API_BASE_URL },
    },
    {
      name: 'ui',
      testMatch: /.*\.ui\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: FRONTEND_BASE_URL },
      dependencies: [],
    },
  ],
  // UIテスト時のみフロントエンド開発サーバを起動する。
  // E2E_SKIP_WEBSERVER=1 で常にスキップ可能。
  webServer:
    process.env.E2E_SKIP_WEBSERVER === '1'
      ? undefined
      : {
          command: 'npm run dev',
          url: FRONTEND_BASE_URL,
          reuseExistingServer: true,
          timeout: 120_000,
        },
});
