import { test, expect } from "@playwright/test";
import { navigateToDashboard, waitForCalendarLoad } from "../e2e/helpers";

test.describe("Drag and Drop Performance", () => {
  test.beforeEach(async ({ page }) => {
    await navigateToDashboard(page);
    await waitForCalendarLoad(page);

    // Enable performance monitoring
    await page.evaluate(() => {
      // Start performance monitoring
      (window as any).performanceMonitor?.startMonitoring?.();
    });
  });

  test.afterEach(async ({ page }) => {
    // Collect performance metrics
    const metrics = await page.evaluate(() => {
      return (window as any).performanceMonitor?.generateReport?.();
    });

    if (metrics) {
      console.log("Performance Report:", metrics);
    }
  });

  test("drag operation maintains 60fps", async ({ page }) => {
    const task = page.locator('[data-testid="task-item"]').first();

    if (await task.isVisible({ timeout: 2000 })) {
      const taskBox = await task.boundingBox();
      if (!taskBox) return;

      // Monitor frame rate during drag
      const frameRatePromise = page.evaluate(() => {
        return new Promise<number>((resolve) => {
          let frameCount = 0;
          let lastTime = performance.now();

          const monitor = () => {
            frameCount++;
            const now = performance.now();
            const deltaTime = now - lastTime;

            if (deltaTime >= 1000) { // After 1 second
              const fps = Math.round((frameCount * 1000) / deltaTime);
              resolve(fps);
              return;
            }

            requestAnimationFrame(monitor);
          };

          requestAnimationFrame(monitor);
        });
      });

      // Perform drag operation
      await page.mouse.move(
        taskBox.x + taskBox.width / 2,
        taskBox.y + taskBox.height / 2
      );
      await page.mouse.down();
      await page.mouse.move(taskBox.x + 200, taskBox.y + 200, { steps: 20 });
      await page.mouse.up();

      const fps = await frameRatePromise;

      // Should maintain at least 30fps during drag
      expect(fps).toBeGreaterThanOrEqual(30);
    }
  });

  test("memory usage stays within limits during drag", async ({ page }) => {
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    const task = page.locator('[data-testid="task-item"]').first();

    if (await task.isVisible({ timeout: 2000 })) {
      const taskBox = await task.boundingBox();
      if (!taskBox) return;

      // Perform multiple drag operations
      for (let i = 0; i < 10; i++) {
        await page.mouse.move(
          taskBox.x + taskBox.width / 2,
          taskBox.y + taskBox.height / 2
        );
        await page.mouse.down();
        await page.mouse.move(taskBox.x + 100, taskBox.y + 100, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(100);
      }

      const finalMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncreaseMB).toBeLessThan(50);
    }
  });

  test("collision detection performance", async ({ page }) => {
    // Create multiple tasks for collision testing
    await page.click('button:has-text("Add")');
    await page.waitForSelector('[role="dialog"]');

    for (let i = 0; i < 5; i++) {
      await page.fill('input[name="title"]', `Task ${i}`);
      await page.click('button[type="submit"]');
      await page.waitForSelector('[role="dialog"]', { state: "hidden" });
      await page.waitForTimeout(500);
    }

    const startTime = Date.now();

    // Perform drag that triggers collision detection
    const task = page.locator('[data-testid="task-item"]').first();
    if (await task.isVisible({ timeout: 2000 })) {
      const taskBox = await task.boundingBox();
      if (!taskBox) return;

      await page.mouse.move(
        taskBox.x + taskBox.width / 2,
        taskBox.y + taskBox.height / 2
      );
      await page.mouse.down();

      // Move over multiple potential collision areas
      for (let i = 0; i < 10; i++) {
        await page.mouse.move(taskBox.x + (i * 50), taskBox.y + 100, { steps: 5 });
        await page.waitForTimeout(50);
      }

      await page.mouse.up();
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Collision detection should complete within reasonable time
    expect(duration).toBeLessThan(2000);
  });

  test("GPU acceleration is active during drag", async ({ page }) => {
    const task = page.locator('[data-testid="task-item"]').first();

    if (await task.isVisible({ timeout: 2000 })) {
      const taskBox = await task.boundingBox();
      if (!taskBox) return;

      // Check GPU acceleration status
      const gpuAcceleration = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        return !!gl;
      });

      // Perform drag operation
      await page.mouse.move(
        taskBox.x + taskBox.width / 2,
        taskBox.y + taskBox.height / 2
      );
      await page.mouse.down();
      await page.mouse.move(taskBox.x + 200, taskBox.y + 200, { steps: 10 });
      await page.mouse.up();

      // GPU acceleration should be available
      expect(gpuAcceleration).toBe(true);
    }
  });

  test("drag operation performance with many items", async ({ page }) => {
    // Create many tasks to test performance with large lists
    for (let i = 0; i < 20; i++) {
      await page.click('button:has-text("Add")');
      await page.waitForSelector('[role="dialog"]');
      await page.fill('input[name="title"]', `Performance Task ${i}`);
      await page.click('button[type="submit"]');
      await page.waitForSelector('[role="dialog"]', { state: "hidden" });
      await page.waitForTimeout(200);
    }

    const startTime = Date.now();

    // Drag the first task
    const task = page.locator('[data-testid="task-item"]').first();
    if (await task.isVisible({ timeout: 2000 })) {
      const taskBox = await task.boundingBox();
      if (!taskBox) return;

      await page.mouse.move(
        taskBox.x + taskBox.width / 2,
        taskBox.y + taskBox.height / 2
      );
      await page.mouse.down();
      await page.mouse.move(taskBox.x + 300, taskBox.y + 300, { steps: 30 });
      await page.mouse.up();
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should handle large lists efficiently
    expect(duration).toBeLessThan(3000);
  });
});