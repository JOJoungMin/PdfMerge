import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  globalSetup: path.join(__dirname, 'e2e', 'global-setup.ts'),
  // EC2 대상 E2E는 백엔드 처리(압축/변환 등)가 느릴 수 있어 타임아웃 여유
  timeout: process.env.E2E_BASE_URL ? 90_000 : 30_000,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    acceptDownloads: true,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  // E2E_BASE_URL 있으면 EC2 스테이징 대상 → webServer 미기동
  // CI: 백엔드+프론트 둘 다 기동 (로컬 runner)
  // 로컬: 백엔드는 이미 띄워져 있다고 가정
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : process.env.CI
    ? [
        { command: 'cd ../backend && npm run start:dev', url: 'http://localhost:3001/api', reuseExistingServer: false, timeout: 60 * 1000 },
        { command: 'npm run dev', url: 'http://localhost:3000', reuseExistingServer: false, timeout: 120 * 1000 },
      ]
    : { command: 'npm run dev', url: 'http://localhost:3000', reuseExistingServer: true, timeout: 120 * 1000 },
});
