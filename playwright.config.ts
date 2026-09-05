import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  outputDir: 'test-results/demo',
  use: { baseURL: 'http://127.0.0.1:4200', headless: true },
  webServer: {
    command: 'node scripts/serve.mjs',
    url: 'http://127.0.0.1:4200',
    reuseExistingServer: true,
  },
  reporter: 'list',
});
