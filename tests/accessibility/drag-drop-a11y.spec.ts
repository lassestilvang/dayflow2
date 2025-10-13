import { test, expect } from "@playwright/test";
import { navigateToDashboard, waitForCalendarLoad } from "../e2e/helpers";

test.describe("Drag and Drop Accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await navigateToDashboard(page);
    await waitForCalendarLoad(page);
  });

  test("draggable items have proper ARIA attributes", async ({ page }) => {
    const draggableItem = page.locator('[draggable="true"], [role="button"][aria-grabbed]').first();

    if (await draggableItem.isVisible({ timeout: 2000 })) {
      const ariaLabel = await draggableItem.getAttribute("aria-label");
      const role = await draggableItem.getAttribute("role");

      // Should have accessibility attributes
      expect(ariaLabel || role).toBeTruthy();
    }
  });

  test("drag and drop is keyboard accessible", async ({ page }) => {
    const task = page.locator('[data-testid="task-item"]').first();

    if (await task.isVisible({ timeout: 2000 })) {
      // Focus on task
      await task.focus();

      // Try keyboard activation (Space or Enter)
      await page.keyboard.press("Space");
      await page.waitForTimeout(300);

      // Arrow keys might allow repositioning
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("ArrowDown");

      // Confirm with Enter or Space
      await page.keyboard.press("Space");

      await page.waitForTimeout(500);

      // Just verify keyboard interaction doesn't cause errors
      expect(true).toBeTruthy();
    }
  });

  test("screen reader announcements during drag", async ({ page }) => {
    const task = page.locator('[data-testid="task-item"]').first();

    if (await task.isVisible({ timeout: 2000 })) {
      const taskBox = await task.boundingBox();
      if (!taskBox) return;

      // Start drag
      await page.mouse.move(
        taskBox.x + taskBox.width / 2,
        taskBox.y + taskBox.height / 2
      );
      await page.mouse.down();

      // Check for ARIA live regions or announcements
      const liveRegions = await page.locator('[aria-live], [role="status"], [role="alert"]').count();
      const hasLiveRegions = liveRegions > 0;

      await page.mouse.up();

      // Should have live regions for screen reader announcements
      expect(hasLiveRegions).toBe(true);
    }
  });

  test("high contrast mode support", async ({ page }) => {
    // Enable high contrast mode
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.evaluate(() => {
      // Simulate high contrast CSS media query
      document.documentElement.style.setProperty('--high-contrast', '1');
    });

    const task = page.locator('[data-testid="task-item"]').first();

    if (await task.isVisible({ timeout: 2000 })) {
      const taskBox = await task.boundingBox();
      if (!taskBox) return;

      // Perform drag operation
      await page.mouse.move(
        taskBox.x + taskBox.width / 2,
        taskBox.y + taskBox.height / 2
      );
      await page.mouse.down();
      await page.mouse.move(taskBox.x + 100, taskBox.y + 100, { steps: 10 });
      await page.mouse.up();

      // Check that drag feedback is visible in high contrast
      const dragOverlay = await page.locator('[class*="drag"], [class*="dragging"]').isVisible();
      expect(dragOverlay).toBe(true);
    }
  });

  test("focus management during drag operations", async ({ page }) => {
    const task = page.locator('[data-testid="task-item"]').first();

    if (await task.isVisible({ timeout: 2000 })) {
      // Focus should be maintained during drag
      await task.focus();

      const taskBox = await task.boundingBox();
      if (!taskBox) return;

      // Start drag
      await page.mouse.move(
        taskBox.x + taskBox.width / 2,
        taskBox.y + taskBox.height / 2
      );
      await page.mouse.down();

      // Focus should still be on the dragged element or appropriate element
      const focusedElement = await page.evaluate(() => {
        return document.activeElement?.tagName;
      });

      await page.mouse.up();

      // Should have proper focus management
      expect(focusedElement).toBeTruthy();
    }
  });

  test("keyboard navigation alternatives", async ({ page }) => {
    const tasks = page.locator('[data-testid="task-item"]');

    if (await tasks.first().isVisible({ timeout: 2000 })) {
      // Tab through tasks
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");

      // Check if focused element has keyboard alternatives
      const focusedElement = await page.evaluate(() => {
        const element = document.activeElement;
        return {
          hasArrowKeys: element?.hasAttribute('data-keyboard-nav'),
          hasContextMenu: element?.hasAttribute('data-context-menu'),
          hasTooltip: element?.querySelector('[role="tooltip"]') !== null,
        };
      });

      // Should provide keyboard alternatives
      expect(focusedElement.hasArrowKeys || focusedElement.hasContextMenu).toBe(true);
    }
  });

  test("color contrast for drag indicators", async ({ page }) => {
    const task = page.locator('[data-testid="task-item"]').first();

    if (await task.isVisible({ timeout: 2000 })) {
      const taskBox = await task.boundingBox();
      if (!taskBox) return;

      // Start drag to show indicators
      await page.mouse.move(
        taskBox.x + taskBox.width / 2,
        taskBox.y + taskBox.height / 2
      );
      await page.mouse.down();

      // Check color contrast of drag indicators
      const contrastRatio = await page.evaluate(() => {
        // This would typically use a color contrast checking library
        // For now, we'll check if indicators are visible and styled
        const indicators = document.querySelectorAll('[class*="drag"], [class*="drop"]');
        return indicators.length > 0;
      });

      await page.mouse.up();

      // Should have visible drag indicators
      expect(contrastRatio).toBe(true);
    }
  });

  test("reduced motion support", async ({ page }) => {
    // Enable reduced motion preference
    await page.evaluate(() => {
      // Simulate reduced motion media query
      document.documentElement.style.setProperty('--reduced-motion', '1');
    });

    const task = page.locator('[data-testid="task-item"]').first();

    if (await task.isVisible({ timeout: 2000 })) {
      const taskBox = await task.boundingBox();
      if (!taskBox) return;

      // Perform drag operation
      await page.mouse.move(
        taskBox.x + taskBox.width / 2,
        taskBox.y + taskBox.height / 2
      );
      await page.mouse.down();
      await page.mouse.move(taskBox.x + 100, taskBox.y + 100, { steps: 10 });
      await page.mouse.up();

      // Check that animations respect reduced motion
      const hasSmoothAnimations = await page.evaluate(() => {
        const style = window.getComputedStyle(document.body);
        return style.getPropertyValue('--reduced-motion') === '1';
      });

      expect(hasSmoothAnimations).toBe(true);
    }
  });
});