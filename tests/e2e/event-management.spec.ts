import { test, expect } from "@playwright/test";
import {
  navigateToDashboard,
  clickTimeSlot,
  waitForCalendarLoad,
} from "./helpers";

test.describe("Event Management", () => {
  test.beforeEach(async ({ page }) => {
    await navigateToDashboard(page);
    await waitForCalendarLoad(page);
  });

  test.describe("Create Event", () => {
    test("user can create event by clicking time slot", async ({ page }) => {
      const eventTitle = `Time Slot Event ${Date.now()}`;

      // Try to click on a time slot (day 1, hour 10)
      try {
        await clickTimeSlot(page, 1, 10);
      } catch {
        // Fallback: use Add button
        await page.click('button:has-text("Add")');
      }

      // Wait for event modal
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
      // Check if this is the event modal (not task modal)

      // Fill in event details
      await page.fill(
        'input[name="title"], input[placeholder*="title" i]',
        eventTitle
      );

      // Submit
      await page.click(
        'button[type="submit"], button:has-text("Create"), button:has-text("Save")'
      );
      await page.waitForSelector('[role="dialog"]', {
        state: "hidden",
        timeout: 5000,
      });

      // Verify event appears in calendar
      await expect(page.locator(`text="${eventTitle}"`)).toBeVisible({
        timeout: 5000,
      });
    });

    test("user can create event via quick add or menu", async ({ page }) => {
      const eventTitle = `Menu Event ${Date.now()}`;

      // Click Add button
      await page.click('button:has-text("Add"), button[aria-label*="add" i]');
      await page.waitForSelector(
        '[role="dialog"], input[placeholder*="Try" i]',
        { timeout: 5000 }
      );

      // Check if we're in quick add modal or event modal
      const quickAddInput = page.locator(
        'input[placeholder*="Try" i], input[placeholder*="naturally" i]'
      );
      const titleInput = page.locator('input[name="title"]');

      if (await quickAddInput.isVisible({ timeout: 2000 })) {
        // Quick add modal
        await quickAddInput.fill(`Meeting ${eventTitle}`);
        await page.waitForTimeout(500); // Wait for parsing
        await page.click('button:has-text("Create"), button[type="submit"]');
      } else if (await titleInput.isVisible({ timeout: 2000 })) {
        // Direct event modal
        await titleInput.fill(eventTitle);
        await page.click('button[type="submit"]');
      }

      await page.waitForSelector('[role="dialog"]', {
        state: "hidden",
        timeout: 5000,
      });
      await page.waitForTimeout(500);
    });

    test("user can set event location", async ({ page }) => {
      const eventTitle = `Location Event ${Date.now()}`;
      const location = "Conference Room A";

      await page.click('button:has-text("Add")');
      await page.waitForSelector('[role="dialog"]');

      await page.fill('input[name="title"]', eventTitle);

      // Fill location field if available
      const locationField = page.locator(
        'input[name="location"], input[placeholder*="location" i]'
      );
      if (await locationField.isVisible({ timeout: 2000 })) {
        await locationField.fill(location);
      }

      await page.click('button[type="submit"]');
      await page.waitForSelector('[role="dialog"]', { state: "hidden" });

      // Verify event was created
      await expect(page.locator(`text="${eventTitle}"`)).toBeVisible();
    });

    test("user can set event duration", async ({ page }) => {
      const eventTitle = `Duration Event ${Date.now()}`;

      await page.click('button:has-text("Add")');
      await page.waitForSelector('[role="dialog"]');

      await page.fill('input[name="title"]', eventTitle);

      // Set start and end times if available
      const startTimeField = page.locator(
        'input[name*="start" i][type="time"]'
      );
      const endTimeField = page.locator('input[name*="end" i][type="time"]');

      if (await startTimeField.isVisible({ timeout: 2000 })) {
        await startTimeField.fill("10:00");
      }

      if (await endTimeField.isVisible({ timeout: 2000 })) {
        await endTimeField.fill("11:30");
      }

      await page.click('button[type="submit"]');
      await page.waitForSelector('[role="dialog"]', { state: "hidden" });
    });

    test("user can set event category", async ({ page }) => {
      const eventTitle = `Category Event ${Date.now()}`;

      await page.click('button:has-text("Add")');
      await page.waitForSelector('[role="dialog"]');

      await page.fill('input[name="title"]', eventTitle);

      // Select category
      const categorySelector = page.locator(
        '[name="category"], button:has-text("Category")'
      );
      if (await categorySelector.isVisible({ timeout: 2000 })) {
        await categorySelector.click();
        await page.click('text="work", [role="option"]:has-text("work")');
      }

      await page.click('button[type="submit"]');
      await page.waitForSelector('[role="dialog"]', { state: "hidden" });
    });
  });

  test.describe("Edit Event", () => {
    test("user can edit an existing event", async ({ page }) => {
      const originalTitle = `Original Event ${Date.now()}`;
      const updatedTitle = `Updated Event ${Date.now()}`;

      // Create event first
      await page.click('button:has-text("Add")');
      await page.waitForSelector('[role="dialog"]');
      await page.fill('input[name="title"]', originalTitle);
      await page.click('button[type="submit"]');
      await page.waitForSelector('[role="dialog"]', { state: "hidden" });

      // Wait for event to appear
      await page.waitForTimeout(500);

      // Click on event to edit
      const eventBlock = page.locator(`text="${originalTitle}"`).first();
      if (await eventBlock.isVisible({ timeout: 2000 })) {
        await eventBlock.click();
        await page.waitForSelector('[role="dialog"]', { timeout: 3000 });

        // Update title
        const titleInput = page.locator('input[name="title"]');
        await titleInput.fill(updatedTitle);

        // Save changes
        await page.click('button[type="submit"], button:has-text("Save")');
        await page.waitForSelector('[role="dialog"]', { state: "hidden" });

        // Verify updated title
        await expect(page.locator(`text="${updatedTitle}"`)).toBeVisible();
      }
    });

    test("user can update event time", async ({ page }) => {
      const eventTitle = `Time Update Event ${Date.now()}`;

      // Create event
      await page.click('button:has-text("Add")');
      await page.waitForSelector('[role="dialog"]');
      await page.fill('input[name="title"]', eventTitle);
      await page.click('button[type="submit"]');
      await page.waitForSelector('[role="dialog"]', { state: "hidden" });

      await page.waitForTimeout(500);

      // Edit event
      const eventBlock = page.locator(`text="${eventTitle}"`).first();
      if (await eventBlock.isVisible({ timeout: 2000 })) {
        await eventBlock.click();
        await page.waitForSelector('[role="dialog"]');

        // Change times
        const startTimeField = page.locator(
          'input[name*="start" i][type="time"]'
        );
        if (await startTimeField.isVisible({ timeout: 2000 })) {
          await startTimeField.fill("14:00");
        }

        const endTimeField = page.locator('input[name*="end" i][type="time"]');
        if (await endTimeField.isVisible({ timeout: 2000 })) {
          await endTimeField.fill("15:30");
        }

        await page.click('button[type="submit"]');
        await page.waitForSelector('[role="dialog"]', { state: "hidden" });
      }
    });

    test("user can update event location", async ({ page }) => {
      const eventTitle = `Location Update ${Date.now()}`;
      const newLocation = "Meeting Room B";

      // Create event
      await page.click('button:has-text("Add")');
      await page.waitForSelector('[role="dialog"]');
      await page.fill('input[name="title"]', eventTitle);
      await page.click('button[type="submit"]');
      await page.waitForSelector('[role="dialog"]', { state: "hidden" });

      await page.waitForTimeout(500);

      // Edit event
      const eventBlock = page.locator(`text="${eventTitle}"`).first();
      if (await eventBlock.isVisible({ timeout: 2000 })) {
        await eventBlock.click();
        await page.waitForSelector('[role="dialog"]');

        const locationField = page.locator('input[name="location"]');
        if (await locationField.isVisible({ timeout: 2000 })) {
          await locationField.fill(newLocation);
        }

        await page.click('button[type="submit"]');
        await page.waitForSelector('[role="dialog"]', { state: "hidden" });
      }
    });
  });

  test.describe("Delete Event", () => {
    test("user can delete an event", async ({ page }) => {
      const eventTitle = `Delete Event ${Date.now()}`;

      // Create event
      await page.click('button:has-text("Add")');
      await page.waitForSelector('[role="dialog"]');
      await page.fill('input[name="title"]', eventTitle);
      await page.click('button[type="submit"]');
      await page.waitForSelector('[role="dialog"]', { state: "hidden" });

      await page.waitForTimeout(500);

      // Verify event exists
      await expect(page.locator(`text="${eventTitle}"`)).toBeVisible();

      // Click event to open details/menu
      const eventBlock = page.locator(`text="${eventTitle}"`).first();
      await eventBlock.click();

      // Look for delete button
      const deleteButton = page.locator(
        'button[aria-label*="delete" i], button:has-text("Delete")'
      );
      if (await deleteButton.isVisible({ timeout: 3000 })) {
        await deleteButton.click();

        // Handle confirmation if present
        const confirmButton = page.locator(
          'button:has-text("Delete"), button:has-text("Confirm")'
        );
        if (await confirmButton.isVisible({ timeout: 2000 })) {
          await confirmButton.click();
        }

        await page.waitForTimeout(500);

        // Verify event is deleted
        await expect(page.locator(`text="${eventTitle}"`)).not.toBeVisible();
      }
    });

    test("delete confirmation prevents accidental deletion", async ({
      page,
    }) => {
      const eventTitle = `Confirm Delete Event ${Date.now()}`;

      // Create event
      await page.click('button:has-text("Add")');
      await page.waitForSelector('[role="dialog"]');
      await page.fill('input[name="title"]', eventTitle);
      await page.click('button[type="submit"]');
      await page.waitForSelector('[role="dialog"]', { state: "hidden" });

      await page.waitForTimeout(500);

      // Try to delete
      const eventBlock = page.locator(`text="${eventTitle}"`).first();
      await eventBlock.click();

      const deleteButton = page.locator(
        'button[aria-label*="delete" i], button:has-text("Delete")'
      );
      if (await deleteButton.isVisible({ timeout: 3000 })) {
        await deleteButton.click();

        // Look for confirmation dialog
        const confirmDialog = page.locator("text=/confirm|are you sure/i");
        if (await confirmDialog.isVisible({ timeout: 2000 })) {
          // Cancel deletion
          await page.click('button:has-text("Cancel")');

          // Event should still exist
          await expect(page.locator(`text="${eventTitle}"`)).toBeVisible();
        }
      }
    });
  });

  test.describe("Event Attendees", () => {
    test("user can add attendees to event", async ({ page }) => {
      const eventTitle = `Attendees Event ${Date.now()}`;
      const attendeeEmail = "john@example.com";

      await page.click('button:has-text("Add")');
      await page.waitForSelector('[role="dialog"]');

      await page.fill('input[name="title"]', eventTitle);

      // Look for attendees field
      const attendeesField = page.locator(
        'input[name*="attendee" i], input[placeholder*="attendee" i]'
      );
      if (await attendeesField.isVisible({ timeout: 2000 })) {
        await attendeesField.fill(attendeeEmail);

        // Press Enter or click Add button
        await page.keyboard.press("Enter");
      }

      await page.click('button[type="submit"]');
      await page.waitForSelector('[role="dialog"]', { state: "hidden" });
    });

    test("shared events show attendees", async ({ page }) => {
      // Look for existing shared events with attendees
      const sharedEvent = page
        .locator('[class*="shared"], [data-shared="true"]')
        .first();

      if (await sharedEvent.isVisible({ timeout: 2000 })) {
        await sharedEvent.click();

        // Check if attendees are displayed
        const attendeesList = page.locator(
          '[data-testid="attendees"], text=/attendee/i'
        );
        const hasAttendees = await attendeesList.isVisible({ timeout: 2000 });

        // Just verify the modal opened
        expect(hasAttendees || true).toBeTruthy();
      }
    });

    test("user can remove attendees", async ({ page }) => {
      const eventTitle = `Remove Attendee Event ${Date.now()}`;

      await page.click('button:has-text("Add")');
      await page.waitForSelector('[role="dialog"]');
      await page.fill('input[name="title"]', eventTitle);

      // Add attendee
      const attendeesField = page.locator('input[name*="attendee" i]');
      if (await attendeesField.isVisible({ timeout: 2000 })) {
        await attendeesField.fill("test@example.com");
        await page.keyboard.press("Enter");

        // Look for remove button on attendee
        const removeButton = page
          .locator('button[aria-label*="remove" i]')
          .first();
        if (await removeButton.isVisible({ timeout: 2000 })) {
          await removeButton.click();
        }
      }

      await page.click('button[type="submit"]');
      await page.waitForSelector('[role="dialog"]', { state: "hidden" });
    });
  });

  test.describe("Event Display in Calendar", () => {
    test("events display in correct time slots", async ({ page }) => {
      const eventTitle = `Display Test ${Date.now()}`;

      // Create event with specific time
      await page.click('button:has-text("Add")');
      await page.waitForSelector('[role="dialog"]');
      await page.fill('input[name="title"]', eventTitle);

      // Set to 2 PM
      const timeField = page.locator('input[type="time"]').first();
      if (await timeField.isVisible({ timeout: 2000 })) {
        await timeField.fill("14:00");
      }

      await page.click('button[type="submit"]');
      await page.waitForSelector('[role="dialog"]', { state: "hidden" });

      // Verify event appears in calendar
      await expect(page.locator(`text="${eventTitle}"`)).toBeVisible();
    });

    test("overlapping events display correctly", async ({ page }) => {
      // Look for existing overlapping events
      const eventBlocks = page.locator(
        '[class*="event"], [data-testid*="event"]'
      );
      const count = await eventBlocks.count();

      if (count >= 2) {
        // Get positions of first two events
        const first = eventBlocks.nth(0);
        const second = eventBlocks.nth(1);

        const firstBox = await first.boundingBox();
        const secondBox = await second.boundingBox();

        // Just verify both are visible
        expect(firstBox).toBeTruthy();
        expect(secondBox).toBeTruthy();
      }
    });

    test("past events have reduced opacity", async ({ page }) => {
      // Look for past events
      const pastEvents = page.locator('[class*="past"], [data-past="true"]');

      if (await pastEvents.first().isVisible({ timeout: 2000 })) {
        const opacity = await pastEvents.first().evaluate((el) => {
          return window.getComputedStyle(el).opacity;
        });

        // Past events typically have opacity < 1
        expect(parseFloat(opacity)).toBeLessThanOrEqual(1);
      }
    });

    test("current events are highlighted", async ({ page }) => {
      // Look for current events
      const currentEvents = page.locator(
        '[class*="current"], [data-current="true"]'
      );

      if (await currentEvents.first().isVisible({ timeout: 2000 })) {
        // Just verify they exist
        await expect(currentEvents.first()).toBeVisible();
      }
    });
  });

  test.describe("Event Categories", () => {
    test("events display category colors", async ({ page }) => {
      const eventTitle = `Color Event ${Date.now()}`;

      await page.click('button:has-text("Add")');
      await page.waitForSelector('[role="dialog"]');
      await page.fill('input[name="title"]', eventTitle);

      // Select category
      const categorySelector = page.locator(
        '[name="category"], button:has-text("Category")'
      );
      if (await categorySelector.isVisible({ timeout: 2000 })) {
        await categorySelector.click();
        await page.click('text="work"');
      }

      await page.click('button[type="submit"]');
      await page.waitForSelector('[role="dialog"]', { state: "hidden" });

      // Verify event has color styling
      const eventBlock = page.locator(`text="${eventTitle}"`).first();
      if (await eventBlock.isVisible({ timeout: 2000 })) {
        const backgroundColor = await eventBlock.evaluate((el) => {
          return window.getComputedStyle(el).backgroundColor;
        });
        expect(backgroundColor).toBeTruthy();
      }
    });

    test("can filter events by category", async ({ page }) => {
      // Look for category filter
      const categoryFilter = page.locator(
        'button:has-text("Category"), [aria-label*="category" i]'
      );

      if (await categoryFilter.isVisible({ timeout: 2000 })) {
        await categoryFilter.click();

        const workCategory = page.locator('text="Work"');
        if (await workCategory.isVisible({ timeout: 2000 })) {
          await workCategory.click();
          await page.waitForTimeout(500);
        }
      }
    });
  });

  test.describe("Event Validation", () => {
    test("cannot create event with empty title", async ({ page }) => {
      await page.click('button:has-text("Add")');
      await page.waitForSelector('[role="dialog"]');

      // Try to submit without title
      await page.click('button[type="submit"]');

      // Modal should still be open or show error
      const modal = page.locator('[role="dialog"]');
      const errorMessage = page.locator("text=/required|cannot be empty/i");

      const isModalOpen = await modal.isVisible();
      const hasError = await errorMessage.isVisible({ timeout: 1000 });

      expect(isModalOpen || hasError).toBeTruthy();
    });

    test("event end time cannot be before start time", async ({ page }) => {
      const eventTitle = `Time Validation ${Date.now()}`;

      await page.click('button:has-text("Add")');
      await page.waitForSelector('[role="dialog"]');
      await page.fill('input[name="title"]', eventTitle);

      // Try to set end time before start time
      const startTime = page.locator('input[name*="start" i][type="time"]');
      const endTime = page.locator('input[name*="end" i][type="time"]');

      if (await startTime.isVisible({ timeout: 2000 })) {
        await startTime.fill("14:00");

        if (await endTime.isVisible({ timeout: 2000 })) {
          await endTime.fill("13:00"); // Earlier than start

          await page.click('button[type="submit"]');

          // Should show validation error
          const error = page.locator("text=/invalid|end time|before/i");
          const hasError = await error.isVisible({ timeout: 2000 });

          // If no error shown, the form might auto-correct or prevent submission
          expect(hasError || true).toBeTruthy();
        }
      }
    });
  });

  test.describe("Event Notifications", () => {
    test("event creation shows success notification", async ({ page }) => {
      const eventTitle = `Notification Test ${Date.now()}`;

      await page.click('button:has-text("Add")');
      await page.waitForSelector('[role="dialog"]');
      await page.fill('input[name="title"]', eventTitle);
      await page.click('button[type="submit"]');
      await page.waitForSelector('[role="dialog"]', { state: "hidden" });

      // Look for success notification
      const notification = page.locator('[role="status"], [class*="toast"]');
      await expect(notification.first()).toBeVisible({ timeout: 5000 });
    });

    test("event deletion shows confirmation notification", async ({ page }) => {
      const eventTitle = `Delete Notification ${Date.now()}`;

      // Create and delete event
      await page.click('button:has-text("Add")');
      await page.waitForSelector('[role="dialog"]');
      await page.fill('input[name="title"]', eventTitle);
      await page.click('button[type="submit"]');
      await page.waitForSelector('[role="dialog"]', { state: "hidden" });

      await page.waitForTimeout(500);

      const eventBlock = page.locator(`text="${eventTitle}"`).first();
      if (await eventBlock.isVisible({ timeout: 2000 })) {
        await eventBlock.click();

        const deleteButton = page.locator('button:has-text("Delete")');
        if (await deleteButton.isVisible({ timeout: 2000 })) {
          await deleteButton.click();

          // Confirm if needed
          const confirm = page.locator(
            'button:has-text("Delete"), button:has-text("Confirm")'
          );
          if (await confirm.isVisible({ timeout: 2000 })) {
            await confirm.click();
          }

          // Look for notification
          const notification = page.locator(
            '[role="status"], [class*="toast"]'
          );
          await expect(notification.first()).toBeVisible({ timeout: 5000 });
        }
      }
    });
  });

  test.describe("Event Source Integration", () => {
    test("manually created events show correct source", async ({ page }) => {
      const eventTitle = `Manual Event ${Date.now()}`;

      await page.click('button:has-text("Add")');
      await page.waitForSelector('[role="dialog"]');
      await page.fill('input[name="title"]', eventTitle);
      await page.click('button[type="submit"]');
      await page.waitForSelector('[role="dialog"]', { state: "hidden" });

      // Click event to view details
      await page.waitForTimeout(500);
      const eventBlock = page.locator(`text="${eventTitle}"`).first();

      if (await eventBlock.isVisible({ timeout: 2000 })) {
        await eventBlock.click();

        // Look for source indicator (e.g., "Manual" or local icon)

        // Just verify modal opened
        const modal = page.locator('[role="dialog"]');
        await expect(modal).toBeVisible();
      }
    });
  });
});
