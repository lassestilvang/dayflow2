import { defineConfig, devices } from "@playwright/test";

/**
 * Enhanced Playwright configuration for comprehensive drag and drop testing
 * across browsers, devices, and performance scenarios
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["html"], ["github"]]
    : [["html"], ["list"]],

  // Global test timeout
  timeout: 60000, // 60 seconds per test

  // Expect timeout for assertions
  expect: {
    timeout: 10000, // 10 seconds for expect assertions
  },

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",

    // Context options
    actionTimeout: 15000, // 15 seconds for actions
    navigationTimeout: 30000, // 30 seconds for navigation
  },

  projects: [
    // === DESKTOP BROWSERS ===
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1920, height: 1080 },
        // Enable GPU acceleration testing
        launchOptions: {
          args: [
            '--enable-gpu-rasterization',
            '--enable-zero-copy',
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
            '--disable-backgrounding-occluded-windows',
          ],
        },
      },
    },

    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        viewport: { width: 1920, height: 1080 },
        // Firefox-specific optimizations
        launchOptions: {
          firefoxUserPrefs: {
            'dom.webcomponents.enabled': true,
            'dom.webcomponents.customelements.enabled': true,
            'layers.acceleration.force-enabled': true,
          },
        },
      },
    },

    {
      name: "webkit",
      use: {
        ...devices["Desktop Safari"],
        viewport: { width: 1920, height: 1080 },
        // Safari-specific settings for drag and drop
        launchOptions: {
          args: [
            '--enable-gpu-rasterization',
            '--disable-background-timer-throttling',
          ],
        },
      },
    },

    // === MOBILE BROWSERS ===
    {
      name: "Mobile Chrome",
      use: {
        ...devices["Pixel 5"],
        // Mobile-specific optimizations
        launchOptions: {
          args: [
            '--enable-gpu-rasterization',
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
          ],
        },
      },
    },
    {
      name: "Mobile Safari",
      use: {
        ...devices["iPhone 12"],
        // iOS Safari optimizations
        launchOptions: {
          args: [
            '--enable-gpu-rasterization',
            '--disable-background-timer-throttling',
          ],
        },
      },
    },

    // === TABLET BROWSERS ===
    {
      name: "iPad Chrome",
      use: {
        ...devices["iPad Pro"],
        isMobile: true,
        hasTouch: true,
        launchOptions: {
          args: [
            '--enable-gpu-rasterization',
            '--disable-background-timer-throttling',
          ],
        },
      },
    },
    {
      name: "iPad Safari",
      use: {
        ...devices["iPad Pro"],
        isMobile: true,
        hasTouch: true,
        browserName: 'webkit',
        launchOptions: {
          args: [
            '--enable-gpu-rasterization',
            '--disable-background-timer-throttling',
          ],
        },
      },
    },

    // === PERFORMANCE TESTING ===
    {
      name: "chromium-performance",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1920, height: 1080 },
        launchOptions: {
          args: [
            '--enable-gpu-rasterization',
            '--enable-zero-copy',
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
            '--disable-backgrounding-occluded-windows',
            '--enable-logging',
            '--v=1',
          ],
        },
      },
      testDir: './tests/performance',
    },

    // === ACCESSIBILITY TESTING ===
    {
      name: "chromium-a11y",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1920, height: 1080 },
      },
      testDir: './tests/accessibility',
    },

    // === LEGACY BROWSER TESTING ===
    {
      name: "edge",
      use: {
        ...devices["Desktop Edge"],
        viewport: { width: 1920, height: 1080 },
        launchOptions: {
          args: [
            '--enable-gpu-rasterization',
            '--disable-background-timer-throttling',
          ],
        },
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // 2 minutes to start server
  },
});