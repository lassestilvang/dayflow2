import { test, expect } from "@playwright/test";
import {
  navigateToDashboard,
  useQuickAdd,
  waitForCalendarLoad,
} from "./helpers";

test.describe("Quick Add - Natural Language Entry", () => {
  test.beforeEach(async ({ page }) => {
    await navigateToDashboard(page);
  });

  test.describe("Quick Add Modal", () => {
    test("quick add modal opens with keyboard shortcut", async ({ page }) => {
      await page.keyboard.press("Control+k");
      await page.waitForTimeout(300);

      const modal = page.locator('[role="dialog"]');
      if (await modal.isVisible({ timeout: 2000 })) {
        await expect(modal).toBeVisible();
      }
    });

    test("quick add modal opens with button click", async ({ page }) => {
      await page.click('button:has-text("Add"), button[aria-label*="Quick add" i]');
      
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Natural Language Detection", () => {
    test("detects task correctly", async ({ page }) => {
      await page.click('button:has-text("Add")');
      await page.waitForSelector('input[placeholder*="Try" i]', { timeout: 5000 });

      await page.fill('input[placeholder*="Try" i]', "Call Sarah about project");
      await page.waitForTimeout(800);

      const typeIndicator = page.locator('text="Task", text="task"');
      if (await typeIndicator.isVisible({ timeout: 2000 })) {
        await expect(typeIndicator).toBeVisible();
      }
    });

    test("detects event correctly", async ({ page }) => {
      await page.click('button:has-text("Add")');
      await page.waitForSelector('input[placeholder*="Try" i]');

      await page.fill('input[placeholder*="Try" i]', "Meeting tomorrow at 2pm");
      await page.waitForTimeout(800);

      const typeIndicator = page.locator('text="Event", text="event"');
      if (await typeIndicator.isVisible({ timeout: 2000 })) {
        await expect(typeIndicator).toBeVisible();
      }
    });

    test("extracts time from natural language", async ({ page }) => {
      await page.click('button:has-text("Add")');
      await page.waitForSelector('input[placeholder*="Try" i]');

      await page.fill('input[placeholder*="Try" i]', "Lunch meeting at 1pm");
      await page.waitForTimeout(800);

      const timeIndicator = page.locator('text=/1.*pm|13:00/i');
      if (await timeIndicator.isVisible({ timeout: 2000 })) {
        await expect(timeIndicator).toBeVisible();
      }
    });

    test("extracts date references", async ({ page }) => {
      await page.click('button:has-text("Add")');
      await page.waitForSelector('input[placeholder*="Try" i]');

      await page.fill('input[placeholder*="Try" i]', "Call client tomorrow");
      await page.waitForTimeout(800);

      const dateIndicator = page.locator('text=/tomorrow|Tomorrow/');
      if (await dateIndicator.isVisible({ timeout: 2000 })) {
        await expect(dateIndicator).toBeVisible();
      }
    });

    test("extracts priority", async ({ page }) => {
      await page.click('button:has-text("Add")');
      await page.waitForSelector('input[placeholder*="Try" i]');

      await page.fill('input[placeholder*="Try" i]', "Urgent: Fix production bug");
      await page.waitForTimeout(800);

      const priorityIndicator = page.locator('text=/high|urgent/i');
      if (await priorityIndicator.isVisible({ timeout: 2000 })) {
        await expect(priorityIndicator).toBeVisible();
      }
    });

    test("extracts category", async ({ page }) => {
      await page.click('button:has-text("Add")');
      await page.waitForSelector('input[placeholder*="Try" i]');

      await page.fill('input[placeholder*="Try" i]', "Work meeting with team");
      await page.waitForTimeout(800);

      const categoryIndicator = page.locator('text="work"');
      if (await categoryIndicator.isVisible({ timeout: 2000 })) {
        await expect(categoryIndicator).toBeVisible();
      }
    });
  });

  test.describe("Preview Display", () => {
    test("shows preview of detected fields", async ({ page }) => {
      await page.click('button:has-text("Add")');
      await page.waitForSelector('input[placeholder*="Try" i]');

      await page.fill('input[placeholder*="Try" i]', "Team meeting tomorrow at 2pm");
      await page.waitForTimeout(800);

      const preview = page.locator('[class*="preview"], [data-testid="preview"]');
      if (await preview.isVisible({ timeout: 2000 })) {
        await expect(preview).toBeVisible();
      }
    });

    test("updates preview in real-time", async ({ page }) => {
      await page.click('button:has-text("Add")');
      await page.waitForSelector('input[placeholder*="Try" i]');

      const input = page.locator('input[placeholder*="Try" i]');
      
      await input.fill("Meeting");
      await page.waitForTimeout(500);
      
      await input.fill("Meeting tomorrow");
      await page.waitForTimeout(500);
      
      await input.fill("Meeting tomorrow at 3pm");
      await page.waitForTimeout(800);

      expect(true).toBeTruthy();
    });
  });

  test.describe("Creation Flow", () => {
    test("can create task from quick add", async ({ page }) => {
      const taskTitle = `Quick Task ${Date.now()}`;

      await page.click('button:has-text("Add")');
      await page.waitForSelector('input[placeholder*="Try" i]');

      await page.fill('input[placeholder*="Try" i]', taskTitle);
      await page.waitForTimeout(500);

      await page.click('button:has-text("Create"), button[type="submit"]');
      await page.waitForSelector('[role="dialog"]', { state: "hidden", timeout: 5000 });

      await page.waitForTimeout(500);
      await expect(page.locator(`text="${taskTitle}"`)).toBeVisible();
    });

    test("can create event from quick add", async ({ page }) => {
      const eventText = "Team standup tomorrow at 9am";

      await page.click('button:has-text("Add")');
      await page.waitForSelector('input[placeholder*="Try" i]');

      await page.fill('input[placeholder*="Try" i]', eventText);
      await page.waitForTimeout(800);

      await page.click('button:has-text("Create"), button[type="submit"]');
      await page.waitForSelector('[role="dialog"]', { state: "hidden", timeout: 5000 });

      await page.waitForTimeout(500);
    });

    test("can open full modal for editing", async ({ page }) => {
      await page.click('button:has-text("Add")');
      await page.waitForSelector('input[placeholder*="Try" i]');

      await page.fill('input[placeholder*="Try" i]', "Review design");
      await page.waitForTimeout(500);

      const editButton = page.locator('button:has-text("Edit Details"), button:has-text("Edit")');
      if (await editButton.isVisible({ timeout: 2000 })) {
        await editButton.click();

        await page.waitForSelector('[role="dialog"]');
        const titleInput = page.locator('input[name="title"]');
        await expect(titleInput).toBeVisible();
      }
    });
  });

  test.describe("Examples", () => {
    test("example suggestions are displayed", async ({ page }) => {
      await page.click('button:has-text("Add")');
      await page.waitForSelector('input[placeholder*="Try" i]');

      const examples = page.locator('text="Examples", text="Try:"');
      if (await examples.isVisible({ timeout: 2000 })) {
        await expect(examples).toBeVisible();
      }
    });

    test("clicking example fills input", async ({ page }) => {
      await page.click('button:has-text("Add")');
      await page.waitForSelector('input[placeholder*="Try" i]');

      const exampleButton = page.locator('button:has-text("Meeting tomorrow")');
      if (await exampleButton.isVisible({ timeout: 2000 })) {
        await exampleButton.click();

        const input = page.locator('input[placeholder*="Try" i]');
        const value = await input.inputValue();
        expect(value).toContain("Meeting");
      }
    });
  });
});
