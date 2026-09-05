import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/compat-browser',
  outputDir: 'test-results/compat',
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:4201', headless: true },
  webServer: {
    command: 'node scripts/serve.mjs compat 4201',
    url: 'http://127.0.0.1:4201/angular-17/index.html',
    reuseExistingServer: true,
  },
  reporter: 'list',
});
