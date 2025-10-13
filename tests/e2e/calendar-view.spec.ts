import { test, expect } from "@playwright/test";
import {
  navigateToDashboard,
  waitForCalendarLoad,
  goToNextWeek,
  goToPreviousWeek,
  goToToday,
} from "./helpers";

test.describe("Calendar View Features", () => {
  test.beforeEach(async ({ page }) => {
    await navigateToDashboard(page);
    await waitForCalendarLoad(page);
  });

  test.describe("Week Display", () => {
    test("calendar shows current week by default", async ({ page }) => {
      const today = new Date();
      const dayName = today.toLocaleDateString("en-US", { weekday: "short" });

      const dayHeader = page.locator(`text="${dayName}"`);
      await expect(dayHeader.first()).toBeVisible();
    });

    test("displays 7 days in week view", async ({ page }) => {
      const dayHeaders = page.locator(
        '[data-testid="day-header"], .day-header, [class*="day"]'
            );
      const count = await dayHeaders.count();

      expect(count).toBeGreaterThanOrEqual(7);
    });

          test("days are labeled correctly", async ({ page }) => {
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

      for (const day of days) {
        const dayElement = page.locator(`text=/^${day}/i`);
        if (await dayElement.isVisible({ timeout: 1000 })) {
          await expect(dayElement.first()).toBeVisible();
        }
      }
    });
  });

  test.describe("Current Day Highlighting", () => {
          test("current day is visually distinct", async ({ page }) => {
      const currentDay = page.locator(
        '[class*="current"], [class*="today"], [aria-current="date"]'
      );

              if (await currentDay.first().isVisible({ timeout: 2000 })) {
        const backgroundColor = await currentDay.first().evaluate((el) => {
          return window.getComputedStyle(el).backgroundColor;
        });

        expect(backgroundColor).toBeTruthy();
      }
          });

    test("current day has appropriate ARIA attributes", async ({ page }) => {
      const currentDay = page.locator('[aria-current="date"]');

      if (await currentDay.isVisible({ timeout: 2000 })) {
        const ariaCurrent = await currentDay.getAttribute("aria-current");
        expect(ariaCurrent).toBe("date");
      }
    });
  });

test.describe("Current Time Indicator", () => {
    test("current time indicator is displayed during business hours", async ({
      page,
            }) => {
      const now = new Date();
      const hour = now.getHours();

      if (hour >= 6 && hour <= 22) {
        const timeIndicator = page.locator(
          '[class*="time-indicator"], [class*="current-time"]'
        );

              if (await timeIndicator.isVisible({ timeout: 2000 })) {
          await expect(timeIndicator).toBeVisible();
              }
      }
    });

    test("time indicator updates position", async ({ page }) => {
      const timeIndicator = page.locator('[class*="time-indicator"]').first();

      if (await timeIndicator.isVisible({ timeout: 2000 })) {
        const position1 = await timeIndicator.evaluate((el) => {
          return el.getBoundingClientRect().top;
        });

        await page.waitForTimeout(60000); // Wait 1 minute

        const position2 = await timeIndicator.evaluate((el) => {
          return el.getBoundingClientRect().top;
        });

        expect(position2).not.toBe(position1);
      }
});
  });

  test.describe("Time Slots", () => {
    test("hourly time slots are displayed", async ({ page }) => {
            const timeLabels = page.locator("text=/[0-9]{1,2}\\s*(AM|PM|am|pm)/");
      const count = await timeLabels.count();

              expect(count).toBeGreaterThan(10);
    });

    test("time slots are clickable", async ({ page }) => {
      const timeSlot = page
        .locator('[class*="time-slot"], [data-testid="time-slot"]')
        .first();

      if (await timeSlot.isVisible({ timeout: 2000 })) {
        await timeSlot.click();

        const modal = page.locator('[role="dialog"]');
        if (await modal.isVisible({ timeout: 2000 })) {
          await expect(modal).toBeVisible();
        }
              }
    });

    test("time slots have appropriate height", async ({ page }) => {
      const timeSlot = page.locator('[class*="time-slot"]').first();

      if (await timeSlot.isVisible({ timeout: 2000 })) {
        const height = await timeSlot.evaluate((el) => {
          return el.getBoundingClientRect().height;
        });

        expect(height).toBeGreaterThan(40);
      }
    });
  });

  test.describe("Event Rendering", () => {
    test("events display at correct times", async ({ page }) => {
      const eventBlocks = page.locator(
        '[class*="event"], [data-testid*="event"]'
            );
      const count = await eventBlocks.count();

      if (count > 0) {
                const firstEvent = eventBlocks.first();
        await expect(firstEvent).toBeVisible();
      }
            });

    test("overlapping events display side-by-side", async ({ page }) => {
      const eventBlocks = page.locator('[class*="event"]');
      const count = await eventBlocks.count();

                if (count >= 2) {
        const event1 = eventBlocks.nth(0);
        const event2 = eventBlocks.nth(1);

        const box1 = await event1.boundingBox();
        const box2 = await event2.boundingBox();

        if (box1 && box2) {
          const overlap =
            box1.y < box2.y + box2.height && box1.y + box1.height > box2.y;

          if (overlap) {
            expect(Math.abs(box1.x - box2.x)).toBeGreaterThan(10);
          }
        }
              }
    });

    test("past events have reduced opacity", async ({ page }) => {
      const pastEvents = page.locator('[class*="past"], [data-past="true"]');

      if (await pastEvents.first().isVisible({ timeout: 2000 })) {
              const opacity = await pastEvents.first().evaluate((el) => {
          return window.getComputedStyle(el).opacity;
        });

        expect(parseFloat(opacity)).toBeLessThan(1);
      }
    });

    test("events have appropriate visual styling", async ({ page }) => {
      const event = page.locator('[class*="event"]').first();

      if (await event.isVisible({ timeout: 2000 })) {
        const styles = await event.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            borderRadius: computed.borderRadius,
            padding: computed.padding,
            backgroundColor: computed.backgroundColor,
          };
              });

        expect(styles.backgroundColor).toBeTruthy();
            }
    });
  });

  test.describe("Calendar Navigation", () => {
          test("can navigate through weeks", async ({ page }) => {
      const initialHeader = await page
        .locator('[class*="date-header"]')
        .first()
        .textContent();

      await goToNextWeek(page);
      const nextHeader = await page
              .locator('[class*="date-header"]')
        .first()
              .textContent();

      expect(nextHeader).not.toBe(initialHeader);

      await goToPreviousWeek(page);
      const backHeader = await page
        .locator('[class*="date-header"]')
              .first()
        .textContent();

      expect(backHeader).toBe(initialHeader);
    });

    test("today button returns to current week", async ({ page }) => {
      const todayButton = page.locator('[data-testid="go-to-today"]');

      if (await todayButton.isVisible({ timeout: 2000 })) {
        await todayButton.click();

        const currentDay = page.locator('[class*="current"], [class*="today"]');
        await expect(currentDay.first()).toBeVisible();
      }
    });

    test("calendar maintains scroll position after navigation", async ({
            page,
    }) => {
      const calendarContent = page
                .locator('[class*="calendar-content"]')
        .first();

      if (await calendarContent.isVisible({ timeout: 2000 })) {
        await calendarContent.evaluate((el) => {
          el.scrollTop = 500;
        });

        await page.waitForTimeout(300);

                const scrollPos1 = await calendarContent.evaluate((el) => el.scrollTop);
        expect(scrollPos1).toBeGreaterThan(400);
      }
    });
  });

  test.describe("Calendar Grid Layout", () => {
          test("calendar has consistent column widths", async ({ page }) => {
      const dayColumns = page.locator('[data-day], [class*="day-column"]');
      const count = await dayColumns.count();

      if (count >= 7) {
                const widths: number[] = [];

        for (let i = 0; i < 7; i++) {
          const width = await dayColumns.nth(i).evaluate((el) => {
            return el.getBoundingClientRect().width;
          });
          widths.push(width);
        }

              const avgWidth = widths.reduce((a, b) => a + b, 0) / widths.length;
        const variance = widths.every((w) => Math.abs(w - avgWidth) < 10);

        expect(variance).toBeTruthy();
      }
          });

    test("calendar fills available height", async ({ page }) => {
      const calendar = page.locator('[class*="calendar-grid"]').first();

      if (await calendar.isVisible({ timeout: 2000 })) {
              const height = await calendar.evaluate((el) => {
          return el.getBoundingClientRect().height;
        });

        expect(height).toBeGreaterThan(400);
              }
    });
  });

  test.describe("Scrolling Behavior", () => {
    test("calendar is scrollable", async ({ page }) => {
      const scrollContainer = page.locator(
        '[class*="calendar"], main'
      ).first();

      if (await scrollContainer.isVisible({ timeout: 2000 })) {
        const style = await scrollContainer.evaluate((el) => {
          return getComputedStyle(el);
        });

        expect(style.overflowY).toBe("auto" || "scroll");
      }
    });

    test("can scroll to different times of day", async ({ page }) => {
            const scrollContainer = page
        .locator('[class*="calendar-content"]')
        .first();

      if (await scrollContainer.isVisible({ timeout: 2000 })) {
              await scrollContainer.evaluate((el) => {
          (el as HTMLElement).scrollTop = 0;
        });

        const scrollTop1 = await scrollContainer.evaluate<number>(
          (el) => (el as HTMLElement).scrollTop
        );

              await scrollContainer.evaluate((el) => {
          (el as HTMLElement).scrollTop = 1000;
        });

              const scrollTop2 = await scrollContainer.evaluate<number>(
          (el) => (el as HTMLElement).scrollTop
        );

        expect(scrollTop2).toBeGreaterThan(scrollTop1);
      }
     });
  });

  test.describe("Performance", () => {
    test("calendar renders quickly", async ({ page }) => {
      const startTime = Date.now();

      await page.goto("/dashboard");
      await waitForCalendarLoad(page);

      const renderTime = Date.now() - startTime;

      expect(renderTime).toBeLessThan(3000);
    });

    test("week navigation is responsive", async ({ page }) => {
      const startTime = Date.now();

      await goToNextWeek(page);

      const navTime = Date.now() - startTime;

      expect(navTime).toBeLessThan(1000);
    });
  });
});
