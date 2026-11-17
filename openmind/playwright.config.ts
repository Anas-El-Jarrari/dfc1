import { defineConfig, devices } from '@playwright/test';

// Reuses a running `npm run dev` on PW_PORT; Next allows only one dev server per project folder.
const port = process.env.PW_PORT ?? '3000';

export default defineConfig({
  testDir: 'tests/e2e',
  use: { baseURL: `http://localhost:${port}`, ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } },
  webServer: { command: `npx next dev -p ${port}`, url: `http://localhost:${port}/entdecken`, reuseExistingServer: true, timeout: 120_000 },
});
