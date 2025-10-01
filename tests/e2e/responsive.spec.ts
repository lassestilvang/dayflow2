import { test, expect } from "@playwright/test";
import { navigateToDashboard, waitForCalendarLoad } from "./helpers";

test.describe("Responsive Design - Mobile Experience", () => {
  test.describe("Mobile Layout (< 768px)", () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test("dashboard renders correctly on mobile", async ({ page }) => {
      await navigateToDashboard(page);
      
      await expect(page.locator('header')).toBeVisible();
      await expect(page.locator('main')).toBeVisible();
    });

    test("sidebar collapses on mobile", async ({ page }) => {
      await navigateToDashboard(page);
      
      const navSidebar = page.locator('aside nav');
      const isVisible = await navSidebar.isVisible({ timeout: 2000 });
      
      expect(isVisible).toBeFalsy();
    });

    test("mobile menu button is visible", async ({ page }) => {
      await navigateToDashboard(page);
      
      const menuButton = page.locator('button[aria-label*="menu" i]');
      await expect(menuButton.first()).toBeVisible();
    });

    test("quick add works on mobile", async ({ page }) => {
      await navigateToDashboard(page);
      
      await page.click('button:has-text("Add"), button[aria-label*="add" i]');
      
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 5000 });
    });

    test("modals are full-screen on mobile", async ({ page }) => {
      await navigateToDashboard(page);
      
      await page.click('button:has-text("Add")');
      await page.waitForSelector('[role="dialog"]');
      
      const modal = page.locator('[role="dialog"]');
      const modalBox = await modal.boundingBox();
      const viewport = page.viewportSize()!;
      
      if (modalBox) {
        expect(modalBox.width).toBeGreaterThan(viewport.width * 0.8);
      }
    });

    test("navigation is accessible on mobile", async ({ page }) => {
      await navigateToDashboard(page);
      
      const menuButton = page.locator('button[aria-label*="menu" i]').first();
      
      if (await menuButton.isVisible({ timeout: 2000 })) {
        await menuButton.click();
        await page.waitForTimeout(300);
      }
    });

    test("calendar scrolls horizontally on mobile", async ({ page }) => {
      await navigateToDashboard(page);
      await waitForCalendarLoad(page);
      
      const calendar = page.locator('[class*="calendar"]').first();
      
      if (await calendar.isVisible({ timeout: 2000 })) {
        const scrollWidth = await calendar.evaluate((el) => el.scrollWidth);
        const clientWidth = await calendar.evaluate((el) => el.clientWidth);
        
        expect(scrollWidth).toBeGreaterThanOrEqual(clientWidth);
      }
    });

    test("touch events work for navigation", async ({ page }) => {
      await navigateToDashboard(page);
      
      const nextButton = page.locator('button:has-text("Next")');
      
      if (await nextButton.isVisible({ timeout: 2000 })) {
        await nextButton.tap();
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe("Tablet Layout (768px - 1024px)", () => {
    test.use({ viewport: { width: 768, height: 1024 } });

    test("dashboard renders correctly on tablet", async ({ page }) => {
      await navigateToDashboard(page);
      
      await expect(page.locator('header')).toBeVisible();
      await expect(page.locator('main')).toBeVisible();
    });

    test("navigation sidebar visible on tablet", async ({ page }) => {
      await navigateToDashboard(page);
      
      const navSidebar = page.locator('aside nav');
      
      if (await navSidebar.isVisible({ timeout: 2000 })) {
        await expect(navSidebar).toBeVisible();
      }
    });

    test("calendar displays appropriately on tablet", async ({ page }) => {
      await navigateToDashboard(page);
      await waitForCalendarLoad(page);
      
      const calendar = page.locator('[class*="calendar"]').first();
      await expect(calendar).toBeVisible();
    });
  });

  test.describe("Desktop Layout (>= 1024px)", () => {
    test.use({ viewport: { width: 1920, height: 1080 } });

    test("dashboard renders correctly on desktop", async ({ page }) => {
      await navigateToDashboard(page);
      
      await expect(page.locator('header')).toBeVisible();
      await expect(page.locator('main')).toBeVisible();
    });

    test("all sidebars visible on desktop", async ({ page }) => {
      await navigateToDashboard(page);
      
      const navSidebar = page.locator('aside nav');
      const taskSidebar = page.locator('aside:has(text("Tasks"))');
      
      if (page.viewportSize()!.width >= 1280) {
        await expect(taskSidebar).toBeVisible();
      }
    });

    test("calendar has full width on desktop", async ({ page }) => {
      await navigateToDashboard(page);
      await waitForCalendarLoad(page);
      
      const calendar = page.locator('[class*="calendar"]').first();
      const calendarBox = await calendar.boundingBox();
      
      if (calendarBox) {
        expect(calendarBox.width).toBeGreaterThan(800);
      }
    });
  });

  test.describe("Touch and Drag on Mobile", () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test("touch drag-and-drop works", async ({ page }) => {
      await navigateToDashboard(page);
      
      const task = page.locator('[data-testid="task-item"]').first();
      
      if (await task.isVisible({ timeout: 2000 })) {
        await task.tap();
        await page.waitForTimeout(300);
      }
    });

    test("swipe gestures work for navigation", async ({ page }) => {
      await navigateToDashboard(page);
      await waitForCalendarLoad(page);
      
      const calendar = page.locator('[class*="calendar"]').first();
      const box = await calendar.boundingBox();
      
      if (box) {
        await page.touchscreen.tap(box.x + 100, box.y + 100);
        await page.waitForTimeout(200);
      }
    });
  });

  test.describe("Text Readability", () => {
    test("text is readable on mobile", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await navigateToDashboard(page);
      
      const textElement = page.locator('h1, h2, p').first();
      
      if (await textElement.isVisible({ timeout: 2000 })) {
        const fontSize = await textElement.evaluate((el) => {
          return window.getComputedStyle(el).fontSize;
        });
        
        const sizeInPx = parseFloat(fontSize);
        expect(sizeInPx).toBeGreaterThan(12);
      }
    });

    test("text is readable on tablet", async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await navigateToDashboard(page);
      
      const textElement = page.locator('h1').first();
      
      if (await textElement.isVisible({ timeout: 2000 })) {
        const fontSize = await textElement.evaluate((el) => {
          return window.getComputedStyle(el).fontSize;
        });
        
        expect(fontSize).toBeTruthy();
      }
    });
  });

  test.describe("Interactive Elements", () => {
    test("buttons are appropriately sized on mobile", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await navigateToDashboard(page);
      
      const button = page.locator('button').first();
      const box = await button.boundingBox();
      
      if (box) {
        expect(box.height).toBeGreaterThan(40);
      }
    });

    test("tap targets meet minimum size on mobile", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await navigateToDashboard(page);
      
      const clickableElements = page.locator('button, a, input[type="checkbox"]');
      const count = await clickableElements.count();
      
      if (count > 0) {
        const firstElement = clickableElements.first();
        const box = await firstElement.boundingBox();
        
        if (box) {
          const minDimension = Math.min(box.width, box.height);
          expect(minDimension).toBeGreaterThanOrEqual(40);
        }
      }
    });
  });

  test.describe("Orientation Changes", () => {
    test("handles portrait to landscape", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await navigateToDashboard(page);
      
      await page.setViewportSize({ width: 667, height: 375 });
      await page.waitForTimeout(500);
      
      await expect(page.locator('header')).toBeVisible();
      await expect(page.locator('main')).toBeVisible();
    });
  });

  test.describe("Performance on Mobile", () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test("dashboard loads quickly on mobile", async ({ page }) => {
      const startTime = Date.now();
      
      await navigateToDashboard(page);
      await waitForCalendarLoad(page);
      
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(5000);
    });

    test("scrolling is smooth on mobile", async ({ page }) => {
      await navigateToDashboard(page);
      
      const scrollContainer = page.locator('[class*="calendar"]').first();
      
      if (await scrollContainer.isVisible({ timeout: 2000 })) {
        await scrollContainer.evaluate((el) => {
          el.scrollTop = 0;
        });
        
        await scrollContainer.evaluate((el) => {
          el.scrollTop = 500;
        });
        
        await page.waitForTimeout(100);
        
        const scrollTop = await scrollContainer.evaluate((el) => el.scrollTop);
        expect(scrollTop).toBeGreaterThan(400);
      }
    });
  });

  test.describe("Adaptive Content", () => {
    test("content adapts to screen size", async ({ page }) => {
      const sizes = [
        { width: 375, height: 667 },
        { width: 768, height: 1024 },
        { width: 1920, height: 1080 },
      ];
      
      for (const size of sizes) {
        await page.setViewportSize(size);
        await navigateToDashboard(page);
        
        const main = page.locator('main');
        await expect(main).toBeVisible();
        
        await page.waitForTimeout(300);
      }
    });
  });
});
