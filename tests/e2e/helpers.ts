import { Page, expect } from "@playwright/test";
import type { CategoryType } from "@/types";

/**
 * E2E Test Helpers for DayFlow Application
 *
 * This file contains reusable helper functions and selectors for E2E tests.
 * All helpers are designed to be composable and follow Playwright best practices.
 */

// ============================================================================
// NAVIGATION HELPERS
// ============================================================================

/**
 * Navigate to the dashboard page and wait for it to load
 */
export async function navigateToDashboard(page: Page): Promise<void> {
  await page.goto("/dashboard");
  await waitForCalendarLoad(page);
}

/**
 * Navigate to the home page
 */
export async function navigateToHome(page: Page): Promise<void> {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
}

// ============================================================================
// CALENDAR HELPERS
// ============================================================================

/**
 * Wait for the calendar to fully load with all time blocks visible
 */
export async function waitForCalendarLoad(page: Page): Promise<void> {
  // Wait for main calendar grid to be visible
  await page.waitForSelector(
    '[data-testid="calendar-grid"], .calendar-grid, [class*="grid"]',
    {
      state: "visible",
      timeout: 10000,
    }
  );

  // Wait for time blocks to render
  await page.waitForTimeout(500); // Allow time for initial render
}

/**
 * Get the current week displayed on the calendar
 */
export async function getCurrentWeekDates(page: Page): Promise<string[]> {
  const dateHeaders = await page
    .locator('[data-testid="date-header"], .date-header')
    .allTextContents();
  return dateHeaders;
}

/**
 * Navigate to next week in calendar
 */
export async function goToNextWeek(page: Page): Promise<void> {
  await page.click('button[aria-label*="next" i], button:has-text("Next")');
  await page.waitForTimeout(300); // Wait for navigation animation
}

/**
 * Navigate to previous week in calendar
 */
export async function goToPreviousWeek(page: Page): Promise<void> {
  await page.click('button[aria-label*="prev" i], button:has-text("Previous")');
  await page.waitForTimeout(300);
}

/**
 * Navigate to today in calendar
 */
export async function goToToday(page: Page): Promise<void> {
  await page.click('button:has-text("Today"), button[aria-label*="today" i]');
  await page.waitForTimeout(300);
}

/**
 * Click a time slot in the calendar to create an event
 */
export async function clickTimeSlot(
  page: Page,
  dayIndex: number,
  hour: number
): Promise<void> {
  // Try multiple selector strategies
  const selectors = [
    `[data-day="${dayIndex}"][data-hour="${hour}"]`,
    `.time-slot[data-day="${dayIndex}"][data-hour="${hour}"]`,
  ];

  for (const selector of selectors) {
    try {
      await page.click(selector, { timeout: 2000 });
      return;
    } catch (_e) {
      continue;
    }
  }

  // Fallback: click by position
  const calendar = await page.locator('[class*="calendar"]').first();
  const box = await calendar.boundingBox();
  if (box) {
    const x = box.x + (box.width / 7) * dayIndex + 50;
    const y = box.y + hour * 60 + 30; // Approximate hourly height
    await page.mouse.click(x, y);
  }
}

// ============================================================================
// TASK HELPERS
// ============================================================================

/**
 * Create a new task using the sidebar button
 */
export async function createTask(
  page: Page,
  options: {
    title: string;
    description?: string;
    category?: CategoryType;
    priority?: "low" | "medium" | "high";
    dueDate?: Date;
  }
): Promise<void> {
  // Open task modal
  await page.click('button[aria-label*="Add task" i], button:has-text("Add")');

  // Wait for modal to appear
  await page.waitForSelector('[role="dialog"], .modal, [class*="dialog"]');

  // Fill in title
  await page.fill(
    'input[name="title"], input[placeholder*="title" i]',
    options.title
  );

  // Fill in description if provided
  if (options.description) {
    await page.fill(
      'textarea[name="description"], textarea[placeholder*="description" i]',
      options.description
    );
  }

  // Select category if provided
  if (options.category) {
    await selectCategory(page, options.category);
  }

  // Select priority if provided
  if (options.priority) {
    await selectPriority(page, options.priority);
  }

  // Set due date if provided
  if (options.dueDate) {
    await setDatePicker(page, options.dueDate);
  }

  // Submit form
  await page.click(
    'button[type="submit"], button:has-text("Create"), button:has-text("Save")'
  );

  // Wait for modal to close
  await page.waitForSelector('[role="dialog"]', {
    state: "hidden",
    timeout: 5000,
  });
}

/**
 * Edit an existing task
 */
export async function editTask(
  page: Page,
  taskTitle: string,
  updates: {
    title?: string;
    description?: string;
    category?: CategoryType;
    priority?: "low" | "medium" | "high";
  }
): Promise<void> {
  // Find and click the task
  const taskLocator = page.locator(`text="${taskTitle}"`).first();
  await taskLocator.click();

  // Wait for edit modal
  await page.waitForSelector('[role="dialog"]');

  // Apply updates
  if (updates.title) {
    await page.fill('input[name="title"]', updates.title);
  }
  if (updates.description) {
    await page.fill('textarea[name="description"]', updates.description);
  }
  if (updates.category) {
    await selectCategory(page, updates.category);
  }
  if (updates.priority) {
    await selectPriority(page, updates.priority);
  }

  // Save changes
  await page.click('button[type="submit"], button:has-text("Save")');
  await page.waitForSelector('[role="dialog"]', { state: "hidden" });
}

/**
 * Mark a task as complete
 */
export async function completeTask(
  page: Page,
  taskTitle: string
): Promise<void> {
  const checkbox = page
    .locator(`text="${taskTitle}"`)
    .locator("..")
    .locator('input[type="checkbox"], [role="checkbox"]');
  await checkbox.check();
  await page.waitForTimeout(300); // Wait for completion animation
}

/**
 * Delete a task
 */
export async function deleteTask(page: Page, taskTitle: string): Promise<void> {
  // Find task and click delete button
  const taskItem = page.locator(`text="${taskTitle}"`).locator("..");
  await taskItem.hover();
  await taskItem.locator('button[aria-label*="delete" i]').click();

  // Confirm deletion if confirmation dialog appears
  const confirmButton = page.locator(
    'button:has-text("Delete"), button:has-text("Confirm")'
  );
  if (await confirmButton.isVisible({ timeout: 2000 })) {
    await confirmButton.click();
  }

  await page.waitForTimeout(300);
}

// ============================================================================
// EVENT HELPERS
// ============================================================================

/**
 * Create a new event
 */
export async function createEvent(
  page: Page,
  options: {
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    location?: string;
    category?: CategoryType;
  }
): Promise<void> {
  // Click time slot or use create button
  await page.click(
    'button:has-text("Add"), button[aria-label*="create event" i]'
  );

  // Wait for event modal
  await page.waitForSelector('[role="dialog"]');

  // Fill in details
  await page.fill('input[name="title"]', options.title);

  if (options.description) {
    await page.fill('textarea[name="description"]', options.description);
  }

  if (options.location) {
    await page.fill(
      'input[name="location"], input[placeholder*="location" i]',
      options.location
    );
  }

  if (options.category) {
    await selectCategory(page, options.category);
  }

  // Set times (implementation depends on your date picker)
  // This is a simplified version
  await setDateTimePicker(page, "start", options.startTime);
  await setDateTimePicker(page, "end", options.endTime);

  // Submit
  await page.click('button[type="submit"]');
  await page.waitForSelector('[role="dialog"]', { state: "hidden" });
}

/**
 * Delete an event
 */
export async function deleteEvent(
  page: Page,
  eventTitle: string
): Promise<void> {
  const eventBlock = page.locator(`text="${eventTitle}"`).first();
  await eventBlock.click();

  // Wait for event modal/menu
  await page.waitForTimeout(300);

  // Click delete
  await page.click('button[aria-label*="delete" i], button:has-text("Delete")');

  // Confirm if needed
  const confirmButton = page.locator(
    'button:has-text("Delete"), button:has-text("Confirm")'
  );
  if (await confirmButton.isVisible({ timeout: 2000 })) {
    await confirmButton.click();
  }
}

// ============================================================================
// DRAG AND DROP HELPERS
// ============================================================================

/**
 * Drag a task from sidebar to calendar
 */
export async function dragTaskToCalendar(
  page: Page,
  taskTitle: string,
  targetDay: number,
  targetHour: number
): Promise<void> {
  const task = page.locator(`text="${taskTitle}"`).first();

  // Get source position
  const sourceBox = await task.boundingBox();
  if (!sourceBox) throw new Error("Task not found");

  // Calculate target position
  const calendar = await page.locator('[class*="calendar"]').first();
  const calendarBox = await calendar.boundingBox();
  if (!calendarBox) throw new Error("Calendar not found");

  const targetX = calendarBox.x + (calendarBox.width / 7) * targetDay + 50;
  const targetY = calendarBox.y + targetHour * 60 + 30;

  // Perform drag
  await page.mouse.move(
    sourceBox.x + sourceBox.width / 2,
    sourceBox.y + sourceBox.height / 2
  );
  await page.mouse.down();
  await page.mouse.move(targetX, targetY, { steps: 10 });
  await page.waitForTimeout(500); // Wait for drop zone highlight
  await page.mouse.up();

  await page.waitForTimeout(500); // Wait for drop animation
}

/**
 * Drag an event to a different time slot
 */
export async function dragEventToNewTime(
  page: Page,
  eventTitle: string,
  targetDay: number,
  targetHour: number
): Promise<void> {
  const event = page.locator(`text="${eventTitle}"`).first();

  const sourceBox = await event.boundingBox();
  if (!sourceBox) throw new Error("Event not found");

  const calendar = await page.locator('[class*="calendar"]').first();
  const calendarBox = await calendar.boundingBox();
  if (!calendarBox) throw new Error("Calendar not found");

  const targetX = calendarBox.x + (calendarBox.width / 7) * targetDay + 50;
  const targetY = calendarBox.y + targetHour * 60 + 30;

  await page.mouse.move(
    sourceBox.x + sourceBox.width / 2,
    sourceBox.y + sourceBox.height / 2
  );
  await page.mouse.down();
  await page.mouse.move(targetX, targetY, { steps: 10 });
  await page.waitForTimeout(500);
  await page.mouse.up();

  await page.waitForTimeout(500);
}

/**
 * Handle conflict modal after drag and drop
 */
export async function handleConflictModal(
  page: Page,
  action: "schedule" | "cancel"
): Promise<void> {
  // Wait for conflict modal
  await page.waitForSelector('text="Conflict"', { timeout: 3000 });

  if (action === "schedule") {
    await page.click(
      'button:has-text("Schedule Anyway"), button:has-text("Continue")'
    );
  } else {
    await page.click('button:has-text("Cancel")');
  }

  await page.waitForTimeout(300);
}

// ============================================================================
// QUICK ADD HELPERS
// ============================================================================

/**
 * Use quick add to create task or event
 */
export async function useQuickAdd(
  page: Page,
  text: string,
  options?: {
    editDetails?: boolean;
    confirmCreation?: boolean;
  }
): Promise<void> {
  // Open quick add modal
  await page.click('button[aria-label*="Quick add" i], button:has-text("Add")');

  // Wait for quick add modal
  await page.waitForSelector(
    'input[placeholder*="naturally" i], input[placeholder*="Try" i]'
  );

  // Type the text
  await page.fill('input[placeholder*="Try" i], input[type="text"]', text);

  // Wait for parsing
  await page.waitForTimeout(500);

  if (options?.editDetails) {
    await page.click('button:has-text("Edit Details")');
    await page.waitForSelector('[role="dialog"]');
  } else if (options?.confirmCreation !== false) {
    await page.click('button:has-text("Create"), button[type="submit"]');
    await page.waitForSelector('[role="dialog"]', { state: "hidden" });
  }
}

// ============================================================================
// THEME HELPERS
// ============================================================================

/**
 * Switch theme
 */
export async function switchTheme(
  page: Page,
  theme: "light" | "dark" | "system"
): Promise<void> {
  // Find theme switcher - could be in settings or top bar
  const themeSwitcher = page.locator(
    '[aria-label*="theme" i], button:has-text("Theme")'
  );

  if (await themeSwitcher.isVisible({ timeout: 2000 })) {
    await themeSwitcher.click();
    await page.click(
      `button:has-text("${theme}"), [role="menuitem"]:has-text("${theme}")`
    );
  } else {
    // Theme might be in a dropdown menu
    await page.click('[aria-label*="settings" i], [aria-label*="user menu" i]');
    await page.click('button:has-text("Theme")');
    await page.click(`button:has-text("${theme}")`);
  }

  await page.waitForTimeout(500); // Wait for theme transition
}

/**
 * Get current theme
 */
export async function getCurrentTheme(page: Page): Promise<string> {
  return await page.evaluate(() => {
    return document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";
  });
}

// ============================================================================
// UI INTERACTION HELPERS
// ============================================================================

/**
 * Select a category from dropdown
 */
export async function selectCategory(
  page: Page,
  category: CategoryType
): Promise<void> {
  await page.click(
    '[name="category"], select[name="category"], button:has-text("Category")'
  );
  await page.click(`text="${category}"`);
}

/**
 * Select priority
 */
export async function selectPriority(
  page: Page,
  priority: "low" | "medium" | "high"
): Promise<void> {
  await page.click('[name="priority"], button:has-text("Priority")');
  await page.click(`text="${priority}"`);
}

/**
 * Set date picker
 */
export async function setDatePicker(page: Page, date: Date): Promise<void> {
  const dateString = date.toISOString().split("T")[0] || "";
  await page.fill('input[type="date"], input[name*="date" i]', dateString);
}

/**
 * Set date-time picker
 */
export async function setDateTimePicker(
  page: Page,
  field: "start" | "end",
  dateTime: Date
): Promise<void> {
  const dateString = dateTime.toISOString().split("T")[0] || "";
  const timeString = dateTime.toTimeString().slice(0, 5);

  await page.fill(`input[name*="${field}" i][type="date"]`, dateString);
  await page.fill(`input[name*="${field}" i][type="time"]`, timeString);
}

/**
 * Toggle sidebar
 */
export async function toggleSidebar(page: Page): Promise<void> {
  await page.click('button[aria-label*="sidebar" i]');
  await page.waitForTimeout(300);
}

/**
 * Toggle task sidebar
 */
export async function toggleTaskSidebar(page: Page): Promise<void> {
  await page.click('button[aria-label*="task sidebar" i]');
  await page.waitForTimeout(300);
}

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

/**
 * Assert task exists in sidebar
 */
export async function assertTaskExists(
  page: Page,
  taskTitle: string
): Promise<void> {
  await expect(page.locator(`text="${taskTitle}"`).first()).toBeVisible();
}

/**
 * Assert event exists in calendar
 */
export async function assertEventExists(
  page: Page,
  eventTitle: string
): Promise<void> {
  await expect(page.locator(`text="${eventTitle}"`).first()).toBeVisible();
}

/**
 * Assert task is completed
 */
export async function assertTaskCompleted(
  page: Page,
  taskTitle: string
): Promise<void> {
  const checkbox = page
    .locator(`text="${taskTitle}"`)
    .locator("..")
    .locator('input[type="checkbox"], [role="checkbox"]');
  await expect(checkbox).toBeChecked();
}

/**
 * Assert toast message appears
 */
export async function assertToastMessage(
  page: Page,
  message: string
): Promise<void> {
  await expect(
    page
      .locator('[role="status"], [class*="toast"], [class*="notification"]')
      .locator(`text="${message}"`)
  ).toBeVisible({ timeout: 5000 });
}

// ============================================================================
// COMMON SELECTORS
// ============================================================================

export const Selectors = {
  // Layout
  topBar: "header, [data-testid='top-bar']",
  navigation: "aside nav, [data-testid='navigation']",
  taskSidebar: "[data-testid='task-sidebar'], aside:has(text('Tasks'))",
  mainContent: "main",

  // Calendar
  calendarGrid: "[data-testid='calendar-grid'], .calendar-grid",
  weekView: "[data-testid='week-view']",
  timeSlot: ".time-slot, [data-testid='time-slot']",
  eventBlock: ".event-block, [data-testid='event-block']",

  // Tasks
  taskList: "[data-testid='task-list'], .task-list",
  taskItem: "[data-testid='task-item'], .task-item",
  addTaskButton: "button[aria-label*='Add task' i]",

  // Modals
  modal: "[role='dialog']",
  taskModal: "[data-testid='task-modal']",
  eventModal: "[data-testid='event-modal']",
  quickAddModal: "[data-testid='quick-add-modal']",
  conflictModal: "text='Conflict'",

  // Forms
  titleInput: "input[name='title']",
  descriptionInput: "textarea[name='description']",
  submitButton: "button[type='submit']",
  cancelButton: "button:has-text('Cancel')",

  // Common buttons
  deleteButton: "button[aria-label*='delete' i]",
  editButton: "button[aria-label*='edit' i]",
  closeButton: "button[aria-label*='close' i]",
} as const;

// ============================================================================
// KEYBOARD SHORTCUTS
// ============================================================================

/**
 * Press keyboard shortcut
 */
export async function pressShortcut(
  page: Page,
  key: string,
  modifiers?: ("Control" | "Shift" | "Alt" | "Meta")[]
): Promise<void> {
  const modifier = modifiers?.join("+") || "";
  const shortcut = modifier ? `${modifier}+${key}` : key;
  await page.keyboard.press(shortcut);
  await page.waitForTimeout(200);
}

/**
 * Common keyboard shortcuts for DayFlow
 */
export const Shortcuts = {
  quickAdd: async (page: Page) => await pressShortcut(page, "k", ["Control"]),
  newTask: async (page: Page) => await pressShortcut(page, "t", ["Control"]),
  newEvent: async (page: Page) => await pressShortcut(page, "e", ["Control"]),
  search: async (page: Page) => await pressShortcut(page, "f", ["Control"]),
  toggleTheme: async (page: Page) =>
    await pressShortcut(page, "d", ["Control"]),
} as const;
