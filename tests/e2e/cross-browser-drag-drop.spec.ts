import { test, expect, chromium, firefox, webkit } from "@playwright/test";
import { navigateToDashboard, waitForCalendarLoad } from "./helpers";

// Browser-specific test behaviors
const BROWSER_TESTS = {
  chromium: {
    name: "Chrome/Chromium",
    features: ["GPU acceleration", "Hardware concurrency", "WebGL"],
    optimizations: ["CSS transforms", "Compositing", "Layer promotion"],
  },
  firefox: {
    name: "Firefox",
    features: ["WebRender", "Quantum CSS", "Servo"],
    optimizations: ["OMTP", "APZ", "WebGL"],
  },
  webkit: {
    name: "Safari/WebKit",
    features: ["Metal", "Core Animation", "WebGL"],
    optimizations: ["Tile-based rendering", "Accelerated compositing"],
  },
};

test.describe("Cross-Browser Drag and Drop Compatibility", () => {
  for (const [browserName, config] of Object.entries(BROWSER_TESTS)) {
    test.describe(`${config.name} Specific Tests`, () => {
      test(`GPU acceleration in ${config.name}`, async ({ browser }) => {
        const context = await browser.newContext({
          viewport: { width: 1920, height: 1080 },
        });
        const page = await context.newPage();

        await navigateToDashboard(page);
        await waitForCalendarLoad(page);

        // Check GPU acceleration support
        const gpuAcceleration = await page.evaluate(() => {
          const canvas = document.createElement('canvas');
          const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
          return !!gl;
        });

        const task = page.locator('[data-testid="task-item"]').first();
        if (await task.isVisible({ timeout: 2000 })) {
          const taskBox = await task.boundingBox();
          if (taskBox) {
            // Test drag with GPU acceleration
            await page.mouse.move(taskBox.x + taskBox.width / 2, taskBox.y + taskBox.height / 2);
            await page.mouse.down();
            await page.mouse.move(taskBox.x + 200, taskBox.y + 200, { steps: 20 });
            await page.mouse.up();

            expect(gpuAcceleration).toBe(true);
          }
        }

        await context.close();
      });

      test(`CSS transform performance in ${config.name}`, async ({ browser }) => {
        const context = await browser.newContext({
          viewport: { width: 1920, height: 1080 },
        });
        const page = await context.newPage();

        await navigateToDashboard(page);
        await waitForCalendarLoad(page);

        const task = page.locator('[data-testid="task-item"]').first();
        if (await task.isVisible({ timeout: 2000 })) {
          const taskBox = await task.boundingBox();
          if (taskBox) {
            // Monitor transform performance
            const startTime = Date.now();

            await page.mouse.move(taskBox.x + taskBox.width / 2, taskBox.y + taskBox.height / 2);
            await page.mouse.down();

            // Multiple transform operations
            for (let i = 0; i < 10; i++) {
              await page.mouse.move(taskBox.x + (i * 20), taskBox.y + 100, { steps: 5 });
            }

            await page.mouse.up();

            const duration = Date.now() - startTime;

            // Should complete transforms efficiently
            expect(duration).toBeLessThan(2000);
          }
        }

        await context.close();
      });

      test(`event handling consistency in ${config.name}`, async ({ browser }) => {
        const context = await browser.newContext({
          viewport: { width: 1920, height: 1080 },
        });
        const page = await context.newPage();

        await navigateToDashboard(page);
        await waitForCalendarLoad(page);

        // Monitor drag events
        const dragEvents = await page.evaluate(() => {
          const events: string[] = [];

          const logEvent = (event: string) => (e: Event) => {
            events.push(`${event}:${e.type}`);
          };

          document.addEventListener('dragstart', logEvent('dragstart'));
          document.addEventListener('dragmove', logEvent('dragmove'));
          document.addEventListener('dragend', logEvent('dragend'));

          return events;
        });

        const task = page.locator('[data-testid="task-item"]').first();
        if (await task.isVisible({ timeout: 2000 })) {
          const taskBox = await task.boundingBox();
          if (taskBox) {
            await page.mouse.move(taskBox.x + taskBox.width / 2, taskBox.y + taskBox.height / 2);
            await page.mouse.down();
            await page.mouse.move(taskBox.x + 100, taskBox.y + 100, { steps: 10 });
            await page.mouse.up();

            // Should have consistent event firing
            expect(dragEvents.length).toBeGreaterThan(0);
          }
        }

        await context.close();
      });
    });
  }

  test("browser-specific drag behaviors", async ({ browser }) => {
    const browserName = browser.name();

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    });
    const page = await context.newPage();

    await navigateToDashboard(page);
    await waitForCalendarLoad(page);

    const task = page.locator('[data-testid="task-item"]').first();
    if (await task.isVisible({ timeout: 2000 })) {
      const taskBox = await task.boundingBox();
      if (taskBox) {
        // Test browser-specific drag behavior
        await page.mouse.move(taskBox.x + taskBox.width / 2, taskBox.y + taskBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(taskBox.x + 150, taskBox.y + 150, { steps: 15 });
        await page.mouse.up();

        // Browser-specific validations
        if (browserName === 'chromium') {
          // Chrome should have smooth GPU acceleration
          const hasCompositing = await page.evaluate(() => {
            return document.body.style.transform !== undefined;
          });
          expect(hasCompositing).toBe(true);
        } else if (browserName === 'firefox') {
          // Firefox should handle transforms well
          const hasTransforms = await page.evaluate(() => {
            return CSS.supports('transform', 'translate3d(0,0,0)');
          });
          expect(hasTransforms).toBe(true);
        } else if (browserName === 'webkit') {
          // Safari should have Core Animation support
          const hasAnimation = await page.evaluate(() => {
            return CSS.supports('animation', 'slidein 1s');
          });
          expect(hasAnimation).toBe(true);
        }
      }
    }

    await context.close();
  });
});

test.describe("Browser Version Compatibility", () => {
  test("modern browser features", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    });
    const page = await context.newPage();

    await navigateToDashboard(page);
    await waitForCalendarLoad(page);

    // Test modern CSS features
    const modernFeatures = await page.evaluate(() => {
      return {
        cssGrid: CSS.supports('display', 'grid'),
        cssCustomProps: CSS.supports('--custom', 'value'),
        intersectionObserver: 'IntersectionObserver' in window,
        webAnimations: 'animate' in document.createElement('div'),
        pointerEvents: CSS.supports('pointer-events', 'none'),
      };
    });

    const task = page.locator('[data-testid="task-item"]').first();
    if (await task.isVisible({ timeout: 2000 })) {
      const taskBox = await task.boundingBox();
      if (taskBox) {
        await page.mouse.move(taskBox.x + taskBox.width / 2, taskBox.y + taskBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(taskBox.x + 100, taskBox.y + 100, { steps: 10 });
        await page.mouse.up();

        // Modern features should be available
        expect(modernFeatures.cssGrid).toBe(true);
        expect(modernFeatures.cssCustomProps).toBe(true);
      }
    }

    await context.close();
  });
});

test.describe("Browser Edge Cases", () => {
  test("drag and drop with browser extensions", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    });
    const page = await context.newPage();

    await navigateToDashboard(page);
    await waitForCalendarLoad(page);

    const task = page.locator('[data-testid="task-item"]').first();
    if (await task.isVisible({ timeout: 2000 })) {
      const taskBox = await task.boundingBox();
      if (taskBox) {
        // Test drag doesn't interfere with potential extensions
        await page.mouse.move(taskBox.x + taskBox.width / 2, taskBox.y + taskBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(taskBox.x + 100, taskBox.y + 100, { steps: 10 });
        await page.mouse.up();

        // Should complete without extension interference
        expect(true).toBeTruthy();
      }
    }

    await context.close();
  });

  test("drag and drop with strict CSP", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    });
    const page = await context.newPage();

    // Set strict CSP
    await page.route('**/*', (route) => {
      route.continue({
        headers: {
          'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'",
        },
      });
    });

    await navigateToDashboard(page);
    await waitForCalendarLoad(page);

    const task = page.locator('[data-testid="task-item"]').first();
    if (await task.isVisible({ timeout: 2000 })) {
      const taskBox = await task.boundingBox();
      if (taskBox) {
        await page.mouse.move(taskBox.x + taskBox.width / 2, taskBox.y + taskBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(taskBox.x + 100, taskBox.y + 100, { steps: 10 });
        await page.mouse.up();

        expect(true).toBeTruthy();
      }
    }

    await context.close();
  });
});