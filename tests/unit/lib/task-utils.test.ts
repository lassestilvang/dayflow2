import {
  isTaskOverdue,
  calculateSubtaskProgress,
  getSubtaskProgressText,
  sortTasksByPriority,
  sortTasksByDueDate,
  filterTasksByCategory,
  filterTasksByCompletion,
  getOverdueTasks,
  getTodayTasks,
  getTomorrowTasks,
  getThisWeekTasks,
  getUnscheduledTasks,
  groupTasksByDate,
  getCategoryCounts,
  generateTaskId,
  generateSubtaskId,
  formatTaskDueDate,
  getPriorityColor,
  getCategoryColor,
} from "@/lib/task-utils";
import {
  createMockTask,
  createMockSubtask,
  setMockDate,
  restoreRealDate,
} from "../../utils/test-utils";

describe("task-utils", () => {
  describe("isTaskOverdue", () => {
    beforeEach(() => {
      setMockDate("2024-01-15T12:00:00");
    });

    afterEach(() => {
      restoreRealDate();
    });

    it("returns true for past due date", () => {
      const task = createMockTask({
        dueDate: new Date("2024-01-10"),
        isCompleted: false,
      });
      expect(isTaskOverdue(task)).toBe(true);
    });

    it("returns false for future due date", () => {
      const task = createMockTask({
        dueDate: new Date("2024-01-20"),
        isCompleted: false,
      });
      expect(isTaskOverdue(task)).toBe(false);
    });

    it("returns false for today's due date", () => {
      const task = createMockTask({
        dueDate: new Date("2024-01-15"),
        isCompleted: false,
      });
      expect(isTaskOverdue(task)).toBe(false);
    });

    it("returns false for completed tasks", () => {
      const task = createMockTask({
        dueDate: new Date("2024-01-10"),
        isCompleted: true,
      });
      expect(isTaskOverdue(task)).toBe(false);
    });

    it("returns false when no due date", () => {
      const task = createMockTask({
        dueDate: undefined,
        isCompleted: false,
      });
      expect(isTaskOverdue(task)).toBe(false);
    });
  });

  describe("calculateSubtaskProgress", () => {
    it("returns 0 for no subtasks", () => {
      expect(calculateSubtaskProgress([])).toBe(0);
    });

    it("calculates progress correctly", () => {
      const subtasks = [
        createMockSubtask({ completed: true }),
        createMockSubtask({ id: "sub-2", completed: true }),
        createMockSubtask({ id: "sub-3", completed: false }),
        createMockSubtask({ id: "sub-4", completed: false }),
      ];
      expect(calculateSubtaskProgress(subtasks)).toBe(50);
    });

    it("returns 100 for all completed", () => {
      const subtasks = [
        createMockSubtask({ completed: true }),
        createMockSubtask({ id: "sub-2", completed: true }),
      ];
      expect(calculateSubtaskProgress(subtasks)).toBe(100);
    });

    it("returns 0 for no completed", () => {
      const subtasks = [
        createMockSubtask({ completed: false }),
        createMockSubtask({ id: "sub-2", completed: false }),
      ];
      expect(calculateSubtaskProgress(subtasks)).toBe(0);
    });
  });

  describe("getSubtaskProgressText", () => {
    it("returns correct text", () => {
      const subtasks = [
        createMockSubtask({ completed: true }),
        createMockSubtask({ id: "sub-2", completed: false }),
        createMockSubtask({ id: "sub-3", completed: false }),
      ];
      expect(getSubtaskProgressText(subtasks)).toBe("1/3 completed");
    });

    it("handles empty subtasks", () => {
      expect(getSubtaskProgressText([])).toBe("0/0 completed");
    });
  });

  describe("sortTasksByPriority", () => {
    it("sorts by priority correctly", () => {
      const tasks = [
        createMockTask({ id: "task-1", priority: "low" }),
        createMockTask({ id: "task-2", priority: "high" }),
        createMockTask({ id: "task-3", priority: "medium" }),
      ];

      const sorted = sortTasksByPriority(tasks);
      expect(sorted[0].priority).toBe("high");
      expect(sorted[1].priority).toBe("medium");
      expect(sorted[2].priority).toBe("low");
    });

    it("sorts by due date when priority is same", () => {
      const tasks = [
        createMockTask({
          id: "task-1",
          priority: "high",
          dueDate: new Date("2024-01-20"),
        }),
        createMockTask({
          id: "task-2",
          priority: "high",
          dueDate: new Date("2024-01-15"),
        }),
      ];

      const sorted = sortTasksByPriority(tasks);
      expect(sorted[0].id).toBe("task-2");
    });

    it("handles tasks without priority", () => {
      const tasks = [
        createMockTask({ id: "task-1", priority: "high" }),
        createMockTask({ id: "task-2", priority: undefined }),
      ];

      const sorted = sortTasksByPriority(tasks);
      expect(sorted[0].id).toBe("task-1");
    });
  });

  describe("sortTasksByDueDate", () => {
    it("sorts tasks by due date", () => {
      const tasks = [
        createMockTask({ id: "task-1", dueDate: new Date("2024-01-20") }),
        createMockTask({ id: "task-2", dueDate: new Date("2024-01-15") }),
        createMockTask({ id: "task-3", dueDate: new Date("2024-01-25") }),
      ];

      const sorted = sortTasksByDueDate(tasks);
      expect(sorted[0].id).toBe("task-2");
      expect(sorted[1].id).toBe("task-1");
      expect(sorted[2].id).toBe("task-3");
    });

    it("places tasks with dates before tasks without", () => {
      const tasks = [
        createMockTask({ id: "task-1", dueDate: undefined }),
        createMockTask({ id: "task-2", dueDate: new Date("2024-01-15") }),
      ];

      const sorted = sortTasksByDueDate(tasks);
      expect(sorted[0].id).toBe("task-2");
    });
  });

  describe("filterTasksByCategory", () => {
    it("filters tasks by category", () => {
      const tasks = [
        createMockTask({ id: "task-1", category: "work" }),
        createMockTask({ id: "task-2", category: "personal" }),
        createMockTask({ id: "task-3", category: "work" }),
      ];

      const filtered = filterTasksByCategory(tasks, "work");
      expect(filtered).toHaveLength(2);
      expect(filtered[0].id).toBe("task-1");
      expect(filtered[1].id).toBe("task-3");
    });

    it("returns all tasks when category is null", () => {
      const tasks = [
        createMockTask({ id: "task-1", category: "work" }),
        createMockTask({ id: "task-2", category: "personal" }),
      ];

      const filtered = filterTasksByCategory(tasks, null);
      expect(filtered).toHaveLength(2);
    });
  });

  describe("filterTasksByCompletion", () => {
    it("filters out completed tasks when showCompleted is false", () => {
      const tasks = [
        createMockTask({ id: "task-1", isCompleted: false }),
        createMockTask({ id: "task-2", isCompleted: true }),
        createMockTask({ id: "task-3", isCompleted: false }),
      ];

      const filtered = filterTasksByCompletion(tasks, false);
      expect(filtered).toHaveLength(2);
    });

    it("shows all tasks when showCompleted is true", () => {
      const tasks = [
        createMockTask({ id: "task-1", isCompleted: false }),
        createMockTask({ id: "task-2", isCompleted: true }),
      ];

      const filtered = filterTasksByCompletion(tasks, true);
      expect(filtered).toHaveLength(2);
    });
  });

  describe("getOverdueTasks", () => {
    beforeEach(() => {
      setMockDate("2024-01-15T12:00:00");
    });

    afterEach(() => {
      restoreRealDate();
    });

    it("returns only overdue tasks", () => {
      const tasks = [
        createMockTask({
          id: "task-1",
          dueDate: new Date("2024-01-10"),
          isCompleted: false,
        }),
        createMockTask({
          id: "task-2",
          dueDate: new Date("2024-01-20"),
          isCompleted: false,
        }),
        createMockTask({
          id: "task-3",
          dueDate: new Date("2024-01-05"),
          isCompleted: false,
        }),
      ];

      const overdue = getOverdueTasks(tasks);
      expect(overdue).toHaveLength(2);
    });
  });

  describe("getTodayTasks", () => {
    beforeEach(() => {
      setMockDate("2024-01-15T12:00:00");
    });

    afterEach(() => {
      restoreRealDate();
    });

    it("returns tasks due today", () => {
      const tasks = [
        createMockTask({
          id: "task-1",
          dueDate: new Date("2024-01-15"),
          isCompleted: false,
        }),
        createMockTask({
          id: "task-2",
          dueDate: new Date("2024-01-16"),
          isCompleted: false,
        }),
        createMockTask({
          id: "task-3",
          dueDate: new Date("2024-01-15T18:00:00"),
          isCompleted: false,
        }),
      ];

      const today = getTodayTasks(tasks);
      expect(today).toHaveLength(2);
    });

    it("excludes completed tasks", () => {
      const tasks = [
        createMockTask({
          id: "task-1",
          dueDate: new Date("2024-01-15"),
          isCompleted: true,
        }),
      ];

      const today = getTodayTasks(tasks);
      expect(today).toHaveLength(0);
    });
  });

  describe("getTomorrowTasks", () => {
    beforeEach(() => {
      setMockDate("2024-01-15T12:00:00");
    });

    afterEach(() => {
      restoreRealDate();
    });

    it("returns tasks due tomorrow", () => {
      const tasks = [
        createMockTask({
          id: "task-1",
          dueDate: new Date("2024-01-16"),
          isCompleted: false,
        }),
        createMockTask({
          id: "task-2",
          dueDate: new Date("2024-01-15"),
          isCompleted: false,
        }),
      ];

      const tomorrow = getTomorrowTasks(tasks);
      expect(tomorrow).toHaveLength(1);
      expect(tomorrow[0].id).toBe("task-1");
    });
  });

  describe("getThisWeekTasks", () => {
    beforeEach(() => {
      setMockDate("2024-01-15T12:00:00"); // Monday
    });

    afterEach(() => {
      restoreRealDate();
    });

    it("returns tasks due this week", () => {
      const tasks = [
        createMockTask({
          id: "task-1",
          dueDate: new Date("2024-01-16"),
          isCompleted: false,
        }),
        createMockTask({
          id: "task-2",
          dueDate: new Date("2024-01-20"),
          isCompleted: false,
        }),
        createMockTask({
          id: "task-3",
          dueDate: new Date("2024-01-25"),
          isCompleted: false,
        }),
      ];

      const thisWeek = getThisWeekTasks(tasks);
      expect(thisWeek).toHaveLength(2);
    });
  });

  describe("getUnscheduledTasks", () => {
    it("returns tasks without scheduled time", () => {
      const tasks = [
        createMockTask({
          id: "task-1",
          scheduledTime: null,
          isCompleted: false,
        }),
        createMockTask({
          id: "task-2",
          scheduledTime: new Date(),
          isCompleted: false,
        }),
        createMockTask({
          id: "task-3",
          scheduledTime: null,
          isCompleted: false,
        }),
      ];

      const unscheduled = getUnscheduledTasks(tasks);
      expect(unscheduled).toHaveLength(2);
    });

    it("excludes completed tasks", () => {
      const tasks = [
        createMockTask({
          id: "task-1",
          scheduledTime: null,
          isCompleted: true,
        }),
      ];

      const unscheduled = getUnscheduledTasks(tasks);
      expect(unscheduled).toHaveLength(0);
    });
  });

  describe("groupTasksByDate", () => {
    beforeEach(() => {
      setMockDate("2024-01-15T12:00:00");
    });

    afterEach(() => {
      restoreRealDate();
    });

    it("groups tasks correctly", () => {
      const tasks = [
        createMockTask({
          id: "task-1",
          dueDate: new Date("2024-01-10"),
          isCompleted: false,
        }),
        createMockTask({
          id: "task-2",
          dueDate: new Date("2024-01-15"),
          isCompleted: false,
        }),
        createMockTask({
          id: "task-3",
          dueDate: new Date("2024-01-16"),
          isCompleted: false,
        }),
        createMockTask({
          id: "task-4",
          dueDate: new Date("2024-01-18"),
          isCompleted: false,
        }),
        createMockTask({
          id: "task-5",
          dueDate: new Date("2024-01-25"),
          isCompleted: false,
        }),
        createMockTask({
          id: "task-6",
          dueDate: undefined,
          isCompleted: false,
        }),
      ];

      const grouped = groupTasksByDate(tasks);
      expect(grouped.overdue).toHaveLength(1);
      expect(grouped.today).toHaveLength(1);
      expect(grouped.tomorrow).toHaveLength(1);
      expect(grouped.thisWeek).toHaveLength(1);
      expect(grouped.later).toHaveLength(1);
      expect(grouped.noDate).toHaveLength(1);
    });
  });

  describe("getCategoryCounts", () => {
    it("counts tasks by category", () => {
      const tasks = [
        createMockTask({ category: "work", isCompleted: false }),
        createMockTask({ category: "work", isCompleted: false }),
        createMockTask({ category: "personal", isCompleted: false }),
        createMockTask({ category: "family", isCompleted: false }),
      ];

      const counts = getCategoryCounts(tasks);
      expect(counts.work).toBe(2);
      expect(counts.personal).toBe(1);
      expect(counts.family).toBe(1);
      expect(counts.travel).toBe(0);
    });

    it("excludes completed tasks", () => {
      const tasks = [
        createMockTask({ category: "work", isCompleted: false }),
        createMockTask({ category: "work", isCompleted: true }),
      ];

      const counts = getCategoryCounts(tasks);
      expect(counts.work).toBe(1);
    });
  });

  describe("generateTaskId", () => {
    it("generates unique task IDs", () => {
      const id1 = generateTaskId();
      const id2 = generateTaskId();

      expect(id1).toMatch(/^task-/);
      expect(id2).toMatch(/^task-/);
      expect(id1).not.toBe(id2);
    });
  });

  describe("generateSubtaskId", () => {
    it("generates unique subtask IDs", () => {
      const id1 = generateSubtaskId();
      const id2 = generateSubtaskId();

      expect(id1).toMatch(/^subtask-/);
      expect(id2).toMatch(/^subtask-/);
      expect(id1).not.toBe(id2);
    });
  });

  describe("formatTaskDueDate", () => {
    beforeEach(() => {
      setMockDate("2024-01-15T12:00:00"); // Monday
    });

    afterEach(() => {
      restoreRealDate();
    });

    it("formats today as 'Today'", () => {
      const date = new Date("2024-01-15");
      expect(formatTaskDueDate(date)).toBe("Today");
    });

    it("formats tomorrow as 'Tomorrow'", () => {
      const date = new Date("2024-01-16");
      expect(formatTaskDueDate(date)).toBe("Tomorrow");
    });

    it("formats this week with day name", () => {
      const date = new Date("2024-01-18"); // Thursday
      expect(formatTaskDueDate(date)).toBe("Thursday");
    });

    it("formats other dates with month and day", () => {
      const date = new Date("2024-02-15");
      expect(formatTaskDueDate(date)).toBe("Feb 15");
    });
  });

  describe("getPriorityColor", () => {
    it("returns correct color for high priority", () => {
      expect(getPriorityColor("high")).toContain("red");
    });

    it("returns correct color for medium priority", () => {
      expect(getPriorityColor("medium")).toContain("yellow");
    });

    it("returns correct color for low priority", () => {
      expect(getPriorityColor("low")).toContain("blue");
    });

    it("returns default color for undefined priority", () => {
      expect(getPriorityColor(undefined)).toContain("muted");
    });
  });

  describe("getCategoryColor", () => {
    it("returns correct color for work", () => {
      expect(getCategoryColor("work")).toContain("blue");
    });

    it("returns correct color for family", () => {
      expect(getCategoryColor("family")).toContain("green");
    });

    it("returns correct color for personal", () => {
      expect(getCategoryColor("personal")).toContain("orange");
    });

    it("returns correct color for travel", () => {
      expect(getCategoryColor("travel")).toContain("purple");
    });
  });
});
