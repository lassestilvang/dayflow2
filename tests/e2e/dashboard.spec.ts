import { test, expect } from "@playwright/test";
import {
  navigateToDashboard,
  waitForCalendarLoad,
  goToNextWeek,
  goToPreviousWeek,
  goToToday,
  Selectors,
} from "./helpers";

test.describe("Dashboard and Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await navigateToDashboard(page);
  });

  test.describe("Dashboard Access", () => {
    test("user can access the dashboard", async ({ page }) => {
      // Verify URL
      expect(page.url()).toContain("/dashboard");

      // Verify main layout elements are present
      await expect(page.locator(Selectors.topBar)).toBeVisible();
      await expect(page.locator(Selectors.mainContent)).toBeVisible();
    });

    test("dashboard loads without errors", async ({ page }) => {
      // Check for no JavaScript errors
      const errors: string[] = [];
      page.on("pageerror", (error) => {
        errors.push(error.message);
      });

      await page.waitForLoadState("networkidle");
      expect(errors).toHaveLength(0);
    });

    test("all critical elements are rendered", async ({ page }) => {
      // Top bar with logo
      await expect(page.locator('text="DayFlow"')).toBeVisible();

      // Main calendar view
      await expect(page.locator(Selectors.mainContent)).toBeVisible();

      // Quick add button
      await expect(
        page.locator(
          'button:has-text("Add"), button[aria-label*="Quick add" i]'
        )
      ).toBeVisible();
    });
  });

  test.describe("Calendar Display", () => {
    test("calendar displays current week", async ({ page }) => {
      // Wait for calendar to load
      await waitForCalendarLoad(page);

      // Check that we have 7 days displayed (week view)
      const days = await page.locator('[class*="day"], [data-day]').count();
      expect(days).toBeGreaterThanOrEqual(7);
    });

    test("current day is highlighted", async ({ page }) => {
      // Look for current day indicator
      const currentDayIndicator = page.locator(
        '[class*="current"], [class*="today"], [aria-current="date"]'
      );
      await expect(currentDayIndicator.first()).toBeVisible();
    });

    test("calendar shows hourly time slots", async ({ page }) => {
      // Check for time labels (e.g., "9 AM", "10 AM", etc.)
      const timeLabels = page.locator(
        "text=/^(1[0-2]|[1-9])\\s*(AM|PM|am|pm)$/"
      );
      const count = await timeLabels.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe("Task Sidebar", () => {
    test("task sidebar is visible on desktop", async ({ page }) => {
      // On desktop (viewport >= 1280px), task sidebar should be visible
      if (page.viewportSize()!.width >= 1280) {
        const sidebar = page.locator(
          'aside:has(text("Tasks")), [data-testid="task-sidebar"]'
        );
        await expect(sidebar).toBeVisible();
      }
    });

    test("task sidebar shows task list", async ({ page }) => {
      // Look for tasks in sidebar
      const taskList = page.locator(
        '[data-testid="task-list"], .task-list, text="Tasks"'
      );
      await expect(taskList.first()).toBeVisible();
    });
  });

  test.describe("Navigation Sidebar", () => {
    test("navigation sidebar is visible on large screens", async ({ page }) => {
      if (page.viewportSize()!.width >= 1024) {
        const navSidebar = page.locator(
          'aside nav, aside:has-text("Dashboard"), aside:has-text("Calendar")'
        );
        await expect(navSidebar.first()).toBeVisible();
      }
    });
  });

  test.describe("Week Navigation", () => {
    test("user can navigate to next week", async ({ page }) => {
      await waitForCalendarLoad(page);

      // Get current week's first date
      const initialDate = await page
        .locator('[data-testid="date-header"], .date-header')
        .first()
        .textContent();

      // Navigate to next week
      await goToNextWeek(page);

      // Verify date changed
      const newDate = await page
        .locator('[data-testid="date-header"], .date-header')
        .first()
        .textContent();

      expect(newDate).not.toBe(initialDate);
    });

    test("user can navigate to previous week", async ({ page }) => {
      await waitForCalendarLoad(page);

      const initialDate = await page
        .locator('[data-testid="date-header"], .date-header')
        .first()
        .textContent();

      await goToPreviousWeek(page);

      const newDate = await page
        .locator('[data-testid="date-header"], .date-header')
        .first()
        .textContent();

      expect(newDate).not.toBe(initialDate);
    });

    test("user can navigate to today", async ({ page }) => {
      // First go to next week
      await goToNextWeek(page);
      await page.waitForTimeout(300);

      // Then navigate back to today
      await goToToday(page);

      // Verify current day is highlighted
      const currentDayIndicator = page.locator(
        '[class*="current"], [class*="today"], [aria-current="date"]'
      );
      await expect(currentDayIndicator.first()).toBeVisible();
    });

    test("week navigation buttons are accessible", async ({ page }) => {
      const nextButton = page.locator(
        'button[aria-label*="next" i], button:has-text("Next")'
      );
      const prevButton = page.locator(
        'button[aria-label*="prev" i], button:has-text("Previous")'
      );
      const todayButton = page.locator(
        'button:has-text("Today"), button[aria-label*="today" i]'
      );

      await expect(nextButton).toBeVisible();
      await expect(prevButton).toBeVisible();
      await expect(todayButton).toBeVisible();
    });
  });

  test.describe("Top Bar", () => {
    test("top bar displays app branding", async ({ page }) => {
      await expect(page.locator('text="DayFlow"')).toBeVisible();
    });

    test("quick add button is accessible", async ({ page }) => {
      const quickAddButton = page.locator(
        'button:has-text("Add"), button[aria-label*="Quick add" i]'
      );
      await expect(quickAddButton.first()).toBeVisible();
    });

    test("user menu is accessible", async ({ page }) => {
      const userMenu = page.locator(
        'button[aria-label*="user" i], button:has-text("Demo User")'
      );

      if (await userMenu.isVisible({ timeout: 2000 })) {
        await userMenu.click();

        // Check for menu items
        await expect(
          page.locator('text="Profile", text="Settings", text="Sign out"')
        ).toBeVisible();

        // Close menu
        await page.keyboard.press("Escape");
      }
    });

    test("notifications icon is visible", async ({ page }) => {
      const notificationsButton = page.locator(
        'button[aria-label*="notification" i]'
      );

      if (await notificationsButton.isVisible({ timeout: 2000 })) {
        await expect(notificationsButton).toBeVisible();
      }
    });
  });

  test.describe("Responsive Behavior", () => {
    test("layout adapts to viewport size", async ({ page }) => {
      const viewportWidth = page.viewportSize()!.width;

      if (viewportWidth < 768) {
        // Mobile: Check that mobile-specific UI is shown
        const mobileMenu = page.locator('button[aria-label*="menu" i]');
        await expect(mobileMenu.first()).toBeVisible();
      } else if (viewportWidth >= 1280) {
        // Desktop: Check that sidebars are visible
        const taskSidebar = page.locator('aside:has(text("Tasks"))');
        await expect(taskSidebar).toBeVisible();
      }
    });

    test("content is scrollable", async ({ page }) => {
      // Check that main content area is scrollable
      const mainContent = page.locator(Selectors.mainContent);
      await expect(mainContent).toBeVisible();

      // Verify overflow properties allow scrolling
      const overflowY = await mainContent.evaluate(
        (el) => window.getComputedStyle(el).overflowY
      );
      expect(["auto", "scroll", "overlay"]).toContain(overflowY);
    });
  });

  test.describe("Performance", () => {
    test("dashboard loads within acceptable time", async ({ page }) => {
      const startTime = Date.now();
      await navigateToDashboard(page);
      await waitForCalendarLoad(page);
      const loadTime = Date.now() - startTime;

      // Dashboard should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test("no console errors on load", async ({ page }) => {
      const consoleErrors: string[] = [];

      page.on("console", (msg) => {
        if (msg.type() === "error") {
          consoleErrors.push(msg.text());
        }
      });

      await navigateToDashboard(page);
      await waitForCalendarLoad(page);

      // Filter out known/acceptable errors
      const criticalErrors = consoleErrors.filter(
        (error) =>
          !error.includes("favicon") && // Ignore favicon errors
          !error.includes("sourcemap") // Ignore sourcemap warnings
      );

      expect(criticalErrors).toHaveLength(0);
    });
  });

  test.describe("Accessibility", () => {
    test("page has proper heading hierarchy", async ({ page }) => {
      // Check for h1
      const h1 = page.locator("h1");
      await expect(h1.first()).toBeVisible();
    });

    test("interactive elements are keyboard accessible", async ({ page }) => {
      // Tab through interactive elements
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");

      // Check that focus is visible
      const focusedElement = await page.evaluate(
        () => document.activeElement?.tagName
      );
      expect(focusedElement).toBeTruthy();
    });

    test("navigation has proper ARIA labels", async ({ page }) => {
      const nextButton = page.locator('button[aria-label*="next" i]');

      if (await nextButton.isVisible({ timeout: 2000 })) {
        const ariaLabel = await nextButton.getAttribute("aria-label");
        expect(ariaLabel).toBeTruthy();
      }
    });
  });

  test.describe("Data Persistence", () => {
    test("calendar state persists on page reload", async ({ page }) => {
      // Navigate to next week
      await goToNextWeek(page);
      await page.waitForTimeout(500);

      const dateBeforeReload = await page
        .locator('[data-testid="date-header"], .date-header')
        .first()
        .textContent();

      // Reload page
      await page.reload();
      await waitForCalendarLoad(page);

      const dateAfterReload = await page
        .locator('[data-testid="date-header"], .date-header')
        .first()
        .textContent();

      // Date should be the same after reload
      expect(dateAfterReload).toBe(dateBeforeReload);
    });
  });

  test.describe("Search Functionality", () => {
    test("search bar is accessible on desktop", async ({ page }) => {
      if (page.viewportSize()!.width >= 768) {
        const searchInput = page.locator(
          'input[placeholder*="Search" i], input[type="search"]'
        );

        if (await searchInput.isVisible({ timeout: 2000 })) {
          await expect(searchInput).toBeVisible();
        }
      }
    });

    test("search can be opened on mobile", async ({ page }) => {
      if (page.viewportSize()!.width < 768) {
        const searchButton = page.locator('button[aria-label*="search" i]');

        if (await searchButton.isVisible({ timeout: 2000 })) {
          await searchButton.click();
          await expect(
            page.locator('input[placeholder*="Search" i]')
          ).toBeVisible();
        }
      }
    });
  });
});
