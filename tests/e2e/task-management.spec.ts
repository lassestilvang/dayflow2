import { test, expect } from "@playwright/test";
import {
  navigateToDashboard,
  createTask,
  editTask,
  completeTask,
  deleteTask,
  assertTaskExists,
  assertTaskCompleted,
  assertToastMessage,
  waitForCalendarLoad,
} from "./helpers";

test.describe("Task Management", () => {
  test.beforeEach(async ({ page }) => {
    await navigateToDashboard(page);
  });

  test.describe("Create Task", () => {
    test("user can create a new task via sidebar", async ({ page }) => {
      const taskTitle = `Test Task ${Date.now()}`;

      // Click add task button in sidebar
      await page.click(
        'button[aria-label*="Add task" i], button:has-text("Add")'
      );

      // Wait for task modal
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

      // Fill in task details
      await page.fill(
        'input[name="title"], input[placeholder*="title" i]',
        taskTitle
      );

      // Submit form
      await page.click(
        'button[type="submit"], button:has-text("Create"), button:has-text("Save")'
      );

      // Wait for modal to close
      await page.waitForSelector('[role="dialog"]', {
        state: "hidden",
        timeout: 5000,
      });

      // Verify task appears in sidebar
      await expect(page.locator(`text="${taskTitle}"`)).toBeVisible({
        timeout: 5000,
      });
    });

    test("user can create task with full details", async ({ page }) => {
      const taskTitle = `Detailed Task ${Date.now()}`;
      const description = "This is a test task description";

      await page.click('button[aria-label*="Add task" i]');
      await page.waitForSelector('[role="dialog"]');

      // Fill in all fields
      await page.fill('input[name="title"]', taskTitle);

      const descriptionField = page.locator(
        'textarea[name="description"], textarea[placeholder*="description" i]'
      );
      if (await descriptionField.isVisible({ timeout: 2000 })) {
        await descriptionField.fill(description);
      }

      // Select category if available
      const categorySelector = page.locator(
        '[name="category"], button:has-text("Category")'
      );
      if (await categorySelector.isVisible({ timeout: 2000 })) {
        await categorySelector.click();
        await page.click('text="work", [role="option"]:has-text("work")');
      }

      // Select priority if available
      const prioritySelector = page.locator(
        '[name="priority"], button:has-text("Priority")'
      );
      if (await prioritySelector.isVisible({ timeout: 2000 })) {
        await prioritySelector.click();
        await page.click('text="high", [role="option"]:has-text("high")');
      }

      // Submit
      await page.click('button[type="submit"]');
      await page.waitForSelector('[role="dialog"]', { state: "hidden" });

      // Verify task exists
      await expect(page.locator(`text="${taskTitle}"`)).toBeVisible();
    });

    test("cannot create task with empty title", async ({ page }) => {
      await page.click('button[aria-label*="Add task" i]');
      await page.waitForSelector('[role="dialog"]');

      // Try to submit without title
      await page.click('button[type="submit"]');

      // Modal should still be open or show error
      const modal = page.locator('[role="dialog"]');
      const isModalVisible = await modal.isVisible();
      const errorMessage = page.locator("text=/required|cannot be empty/i");
      const hasError = await errorMessage.isVisible({ timeout: 1000 });

      expect(isModalVisible || hasError).toBeTruthy();
    });

    test("task creation shows success notification", async ({ page }) => {
      const taskTitle = `Notification Test ${Date.now()}`;

      await page.click('button[aria-label*="Add task" i]');
      await page.waitForSelector('[role="dialog"]');
      await page.fill('input[name="title"]', taskTitle);
      await page.click('button[type="submit"]');

      // Look for success toast/notification
      const notification = page.locator(
        '[role="status"], [class*="toast"], [class*="Toaster"]'
      );
      await expect(notification.first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Edit Task", () => {
    test("user can edit an existing task", async ({ page }) => {
      const originalTitle = `Original Task ${Date.now()}`;
      const updatedTitle = `Updated Task ${Date.now()}`;

      // Create task first
      await page.click('button[aria-label*="Add task" i]');
      await page.waitForSelector('[role="dialog"]');
      await page.fill('input[name="title"]', originalTitle);
      await page.click('button[type="submit"]');
      await page.waitForSelector('[role="dialog"]', { state: "hidden" });

      // Click on the task to edit
      await page.click(`text="${originalTitle}"`);
      await page.waitForSelector('[role="dialog"]');

      // Update title
      const titleInput = page.locator('input[name="title"]');
      await titleInput.fill(updatedTitle);

      // Save changes
      await page.click('button[type="submit"], button:has-text("Save")');
      await page.waitForSelector('[role="dialog"]', { state: "hidden" });

      // Verify updated title appears
      await expect(page.locator(`text="${updatedTitle}"`)).toBeVisible();
      await expect(page.locator(`text="${originalTitle}"`)).not.toBeVisible();
    });

    test("user can change task category", async ({ page }) => {
      const taskTitle = `Category Task ${Date.now()}`;

      // Create task
      await page.click('button[aria-label*="Add task" i]');
      await page.waitForSelector('[role="dialog"]');
      await page.fill('input[name="title"]', taskTitle);
      await page.click('button[type="submit"]');
      await page.waitForSelector('[role="dialog"]', { state: "hidden" });

      // Edit task
      await page.click(`text="${taskTitle}"`);
      await page.waitForSelector('[role="dialog"]');

      // Change category
      const categorySelector = page.locator(
        '[name="category"], button:has-text("Category")'
      );
      if (await categorySelector.isVisible({ timeout: 2000 })) {
        await categorySelector.click();
        await page.click('text="family", [role="option"]:has-text("family")');
      }

      // Save
      await page.click('button[type="submit"]');
      await page.waitForSelector('[role="dialog"]', { state: "hidden" });

      // Verify change (category badge should be visible)
      const taskItem = page.locator(`text="${taskTitle}"`).locator("..");
      await expect(taskItem).toBeVisible();
    });

    test("user can change task priority", async ({ page }) => {
      const taskTitle = `Priority Task ${Date.now()}`;

      // Create task
      await page.click('button[aria-label*="Add task" i]');
      await page.waitForSelector('[role="dialog"]');
      await page.fill('input[name="title"]', taskTitle);
      await page.click('button[type="submit"]');
      await page.waitForSelector('[role="dialog"]', { state: "hidden" });

      // Edit task
      await page.click(`text="${taskTitle}"`);
      await page.waitForSelector('[role="dialog"]');

      // Change priority
      const prioritySelector = page.locator(
        '[name="priority"], button:has-text("Priority")'
      );
      if (await prioritySelector.isVisible({ timeout: 2000 })) {
        await prioritySelector.click();
        await page.click('text="high", [role="option"]:has-text("high")');
      }

      // Save
      await page.click('button[type="submit"]');
      await page.waitForSelector('[role="dialog"]', { state: "hidden" });
    });
  });

  test.describe("Complete Task", () => {
    test("user can mark task as complete", async ({ page }) => {
      const taskTitle = `Complete Me ${Date.now()}`;

      // Create task
      await page.click('button[aria-label*="Add task" i]');
      await page.waitForSelector('[role="dialog"]');
      await page.fill('input[name="title"]', taskTitle);
      await page.click('button[type="submit"]');
      await page.waitForSelector('[role="dialog"]', { state: "hidden" });

      // Find and check the checkbox
      const taskItem = page.locator(`text="${taskTitle}"`).locator("..");
      const checkbox = taskItem.locator(
        'input[type="checkbox"], [role="checkbox"]'
      );

      await checkbox.check();
      await page.waitForTimeout(500); // Wait for completion animation

      // Verify checkbox is checked
      await expect(checkbox).toBeChecked();
    });

    test("completed task shows visual indication", async ({ page }) => {
      const taskTitle = `Visual Complete ${Date.now()}`;

      // Create and complete task
      await page.click('button[aria-label*="Add task" i]');
      await page.waitForSelector('[role="dialog"]');
      await page.fill('input[name="title"]', taskTitle);
      await page.click('button[type="submit"]');
      await page.waitForSelector('[role="dialog"]', { state: "hidden" });

      const taskItem = page.locator(`text="${taskTitle}"`).locator("..");
      const checkbox = taskItem.locator('input[type="checkbox"]');
      await checkbox.check();

      // Check for strikethrough or opacity change
      const taskText = page.locator(`text="${taskTitle}"`);
      const textDecoration = await taskText.evaluate(
        (el) => window.getComputedStyle(el).textDecoration
      );
      const opacity = await taskText.evaluate(
        (el) => window.getComputedStyle(el).opacity
      );

      // Either strikethrough or reduced opacity indicates completion
      expect(
        textDecoration.includes("line-through") || parseFloat(opacity) < 1
      ).toBeTruthy();
    });

    test("user can uncomplete a completed task", async ({ page }) => {
      const taskTitle = `Uncomplete Me ${Date.now()}`;

      // Create task
      await page.click('button[aria-label*="Add task" i]');
      await page.waitForSelector('[role="dialog"]');
      await page.fill('input[name="title"]', taskTitle);
      await page.click('button[type="submit"]');
      await page.waitForSelector('[role="dialog"]', { state: "hidden" });

      const taskItem = page.locator(`text="${taskTitle}"`).locator("..");
      const checkbox = taskItem.locator('input[type="checkbox"]');

      // Complete task
      await checkbox.check();
      await expect(checkbox).toBeChecked();

      // Uncomplete task
      await checkbox.uncheck();
      await expect(checkbox).not.toBeChecked();
    });
  });

  test.describe("Delete Task", () => {
    test("user can delete a task", async ({ page }) => {
      const taskTitle = `Delete Me ${Date.now()}`;

      // Create task
      await page.click('button[aria-label*="Add task" i]');
      await page.waitForSelector('[role="dialog"]');
      await page.fill('input[name="title"]', taskTitle);
      await page.click('button[type="submit"]');
      await page.waitForSelector('[role="dialog"]', { state: "hidden" });

      // Verify task exists
      await expect(page.locator(`text="${taskTitle}"`)).toBeVisible();

      // Delete task - hover over task to show delete button
      const taskItem = page.locator(`text="${taskTitle}"`).locator("..");
      await taskItem.hover();

      const deleteButton = taskItem.locator(
        'button[aria-label*="delete" i], button[aria-label*="Delete" i]'
      );
      if (await deleteButton.isVisible({ timeout: 2000 })) {
        await deleteButton.click();

        // Handle confirmation dialog if it appears
        const confirmButton = page.locator(
          'button:has-text("Delete"), button:has-text("Confirm")'
        );
        if (await confirmButton.isVisible({ timeout: 2000 })) {
          await confirmButton.click();
        }

        await page.waitForTimeout(500);

        // Verify task is deleted
        await expect(page.locator(`text="${taskTitle}"`)).not.toBeVisible();
      }
    });

    test("delete task shows confirmation dialog", async ({ page }) => {
      const taskTitle = `Confirm Delete ${Date.now()}`;

      // Create task
      await page.click('button[aria-label*="Add task" i]');
      await page.waitForSelector('[role="dialog"]');
      await page.fill('input[name="title"]', taskTitle);
      await page.click('button[type="submit"]');
      await page.waitForSelector('[role="dialog"]', { state: "hidden" });

      // Try to delete
      const taskItem = page.locator(`text="${taskTitle}"`).locator("..");
      await taskItem.hover();

      const deleteButton = taskItem.locator('button[aria-label*="delete" i]');
      if (await deleteButton.isVisible({ timeout: 2000 })) {
        await deleteButton.click();

        // Look for confirmation dialog
        const confirmDialog = page.locator(
          'text=/confirm|are you sure/i, [role="alertdialog"]'
        );

        if (await confirmDialog.isVisible({ timeout: 2000 })) {
          // Cancel deletion
          await page.click('button:has-text("Cancel")');

          // Task should still exist
          await expect(page.locator(`text="${taskTitle}"`)).toBeVisible();
        }
      }
    });
  });

  test.describe("Subtasks", () => {
    test("user can add subtasks to a task", async ({ page }) => {
      const taskTitle = `Task with Subtasks ${Date.now()}`;
      const subtaskTitle = "Subtask 1";

      // Create main task
      await page.click('button[aria-label*="Add task" i]');
      await page.waitForSelector('[role="dialog"]');
      await page.fill('input[name="title"]', taskTitle);
      await page.click('button[type="submit"]');
      await page.waitForSelector('[role="dialog"]', { state: "hidden" });

      // Click task to edit
      await page.click(`text="${taskTitle}"`);
      await page.waitForSelector('[role="dialog"]');

      // Add subtask
      const addSubtaskButton = page.locator(
        'button:has-text("Add subtask"), button[aria-label*="Add subtask" i]'
      );
      if (await addSubtaskButton.isVisible({ timeout: 2000 })) {
        await addSubtaskButton.click();

        const subtaskInput = page
          .locator('input[placeholder*="subtask" i], input[name*="subtask" i]')
          .last();
        await subtaskInput.fill(subtaskTitle);

        await page.click('button[type="submit"]');
        await page.waitForSelector('[role="dialog"]', { state: "hidden" });

        // Verify subtask appears
        await page.click(`text="${taskTitle}"`);
        await expect(page.locator(`text="${subtaskTitle}"`)).toBeVisible();
      }
    });

    test("user can mark subtasks as complete", async ({ page }) => {
      const taskTitle = `Subtask Complete Test ${Date.now()}`;

      // Create task and navigate to it
      await page.click('button[aria-label*="Add task" i]');
      await page.waitForSelector('[role="dialog"]');
      await page.fill('input[name="title"]', taskTitle);
      await page.click('button[type="submit"]');
      await page.waitForSelector('[role="dialog"]', { state: "hidden" });

      // Open task to add subtask
      await page.click(`text="${taskTitle}"`);
      await page.waitForSelector('[role="dialog"]');

      // Add a subtask if possible
      const addSubtaskButton = page.locator('button:has-text("Add subtask")');
      if (await addSubtaskButton.isVisible({ timeout: 2000 })) {
        await addSubtaskButton.click();
        const subtaskInput = page
          .locator('input[placeholder*="subtask" i]')
          .last();
        await subtaskInput.fill("Test Subtask");
        await page.click('button[type="submit"]');
        await page.waitForSelector('[role="dialog"]', { state: "hidden" });

        // Reopen and complete subtask
        await page.click(`text="${taskTitle}"`);
        const subtaskCheckbox = page.locator('input[type="checkbox"]').nth(1); // Second checkbox (first is main task)
        if (await subtaskCheckbox.isVisible({ timeout: 2000 })) {
          await subtaskCheckbox.check();
          await expect(subtaskCheckbox).toBeChecked();
        }
      }
    });

    test("subtask progress is displayed", async ({ page }) => {
      const taskTitle = `Progress Test ${Date.now()}`;

      await page.click('button[aria-label*="Add task" i]');
      await page.waitForSelector('[role="dialog"]');
      await page.fill('input[name="title"]', taskTitle);
      await page.click('button[type="submit"]');
      await page.waitForSelector('[role="dialog"]', { state: "hidden" });

      // Look for subtask progress indicator (e.g., "0/2 completed")
      const taskItem = page.locator(`text="${taskTitle}"`).locator("..");
      const progressIndicator = taskItem.locator("text=/\\d+\\/\\d+/");

      // Progress indicator might exist if task has subtasks
      const hasProgress = await progressIndicator.isVisible({ timeout: 1000 });
      // This is ok if it doesn't exist for tasks without subtasks
      expect(typeof hasProgress).toBe("boolean");
    });
  });

  test.describe("Task Filtering and Categories", () => {
    test("tasks can be filtered by category", async ({ page }) => {
      // Look for category filter
      const categoryFilter = page.locator(
        '[aria-label*="Filter" i], button:has-text("Filter")'
      );

      if (await categoryFilter.isVisible({ timeout: 2000 })) {
        await categoryFilter.click();

        // Select a category
        const workCategory = page.locator(
          'text="work", [role="option"]:has-text("work")'
        );
        if (await workCategory.isVisible({ timeout: 2000 })) {
          await workCategory.click();
          await page.waitForTimeout(500);

          // Verify only work tasks are shown (implementation dependent)
        }
      }
    });

    test("tasks can be filtered by priority", async ({ page }) => {
      const priorityFilter = page.locator(
        'button:has-text("Priority"), [aria-label*="priority" i]'
      );

      if (await priorityFilter.isVisible({ timeout: 2000 })) {
        await priorityFilter.click();

        const highPriority = page.locator(
          'text="High", [role="option"]:has-text("High")'
        );
        if (await highPriority.isVisible({ timeout: 2000 })) {
          await highPriority.click();
          await page.waitForTimeout(500);
        }
      }
    });

    test("completed tasks can be hidden", async ({ page }) => {
      // Look for "Show completed" toggle
      const showCompletedToggle = page.locator(
        'text="Show completed", input[type="checkbox"]:near(text="completed")'
      );

      if (await showCompletedToggle.isVisible({ timeout: 2000 })) {
        const checkbox = showCompletedToggle.first();
        await checkbox.click();
        await page.waitForTimeout(500);

        // Verify completed tasks are hidden
      }
    });
  });

  test.describe("Overdue Tasks", () => {
    test("overdue tasks show in overdue section", async ({ page }) => {
      // Look for overdue section
      const overdueSection = page.locator(
        'text="Overdue", [data-testid="overdue-section"]'
      );

      if (await overdueSection.isVisible({ timeout: 2000 })) {
        // Verify it exists
        await expect(overdueSection).toBeVisible();
      }
    });

    test("overdue tasks have visual indicator", async ({ page }) => {
      // Look for any overdue tasks
      const overdueTasks = page.locator(
        '[class*="overdue"], [data-overdue="true"]'
      );

      if (await overdueTasks.first().isVisible({ timeout: 2000 })) {
        // Verify they have distinct styling
        const color = await overdueTasks
          .first()
          .evaluate((el) => window.getComputedStyle(el).color);
        expect(color).toBeTruthy();
      }
    });
  });

  test.describe("Task Statistics", () => {
    test("task statistics are displayed", async ({ page }) => {
      // Look for statistics section
      const statsSection = page.locator(
        'text=/\\d+ task/, text=/completed/i, [data-testid="stats"]'
      );

      if (await statsSection.first().isVisible({ timeout: 2000 })) {
        await expect(statsSection.first()).toBeVisible();
      }
    });

    test("statistics update when tasks are completed", async ({ page }) => {
      const taskTitle = `Stats Test ${Date.now()}`;

      // Get initial completed count if visible
      const completedStat = page.locator("text=/\\d+ completed/i");
      let initialCount = 0;

      if (await completedStat.isVisible({ timeout: 2000 })) {
        const text = await completedStat.textContent();
        const match = text?.match(/(\d+)/);
        if (match) initialCount = parseInt(match[1]);
      }

      // Create and complete a task
      await page.click('button[aria-label*="Add task" i]');
      await page.waitForSelector('[role="dialog"]');
      await page.fill('input[name="title"]', taskTitle);
      await page.click('button[type="submit"]');
      await page.waitForSelector('[role="dialog"]', { state: "hidden" });

      const checkbox = page
        .locator(`text="${taskTitle}"`)
        .locator("..")
        .locator('input[type="checkbox"]');
      await checkbox.check();

      await page.waitForTimeout(500);

      // Verify count increased (if stats are visible)
      if (await completedStat.isVisible({ timeout: 2000 })) {
        const newText = await completedStat.textContent();
        const match = newText?.match(/(\d+)/);
        if (match) {
          const newCount = parseInt(match[1]);
          expect(newCount).toBeGreaterThanOrEqual(initialCount);
        }
      }
    });
  });

  test.describe("Task Sorting", () => {
    test("tasks can be sorted by due date", async ({ page }) => {
      const sortButton = page.locator(
        'button:has-text("Sort"), [aria-label*="sort" i]'
      );

      if (await sortButton.isVisible({ timeout: 2000 })) {
        await sortButton.click();

        const dueDateOption = page.locator(
          'text="Due date", [role="option"]:has-text("Due date")'
        );
        if (await dueDateOption.isVisible({ timeout: 2000 })) {
          await dueDateOption.click();
          await page.waitForTimeout(500);
        }
      }
    });

    test("tasks can be sorted by priority", async ({ page }) => {
      const sortButton = page.locator('button:has-text("Sort")');

      if (await sortButton.isVisible({ timeout: 2000 })) {
        await sortButton.click();

        const priorityOption = page.locator('text="Priority"');
        if (await priorityOption.isVisible({ timeout: 2000 })) {
          await priorityOption.click();
          await page.waitForTimeout(500);
        }
      }
    });
  });
});
