import { existsSync } from 'node:fs';

import { defineConfig } from '@playwright/test';

const systemChromium = ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable']
  .find((candidate) => existsSync(candidate));

export default defineConfig({
  testDir: './tests/browser',
  testMatch: '**/*.pw.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  outputDir: './node_modules/.cache/playwright-results',
  reporter: 'list',
  use: {
    browserName: 'chromium',
    headless: true,
    launchOptions: systemChromium ? { executablePath: systemChromium } : {},
    screenshot: 'off',
    trace: 'off',
    video: 'off',
  },
});
