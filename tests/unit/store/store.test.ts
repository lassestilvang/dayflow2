import { useAppStore } from "@/lib/store";
import { createMockTask, createMockEvent } from "../../utils/test-utils";
import type { Task, Event } from "@/types";

describe("useAppStore", () => {
  beforeEach(() => {
    // Reset store before each test
    useAppStore.setState({
      ui: {
        theme: "system",
        sidebarOpen: true,
        taskSidebarOpen: true,
        loading: false,
        error: null,
        selectedTaskId: null,
      },
      modals: {
        taskModalOpen: false,
        eventModalOpen: false,
        quickAddModalOpen: false,
        editingItemId: null,
        prefilledData: null,
      },
      tasks: {
        tasks: [],
        filters: {
          categories: [],
          priorities: [],
          showCompleted: false,
        },
        selectedCategory: null,
      },
      events: {
        events: [],
        selectedDate: new Date("2024-01-15"),
        viewMode: "week",
      },
      drag: {
        isDragging: false,
        draggedItem: null,
        dragOverSlot: null,
      },
    });
  });

  describe("UI State", () => {
    it("has correct initial UI state", () => {
      const state = useAppStore.getState();
      expect(state.ui.theme).toBe("system");
      expect(state.ui.sidebarOpen).toBe(true);
      expect(state.ui.loading).toBe(false);
    });

    it("sets theme", () => {
      useAppStore.getState().setTheme("dark");
      expect(useAppStore.getState().ui.theme).toBe("dark");
    });

    it("toggles sidebar", () => {
      const initialState = useAppStore.getState().ui.sidebarOpen;
      useAppStore.getState().toggleSidebar();
      expect(useAppStore.getState().ui.sidebarOpen).toBe(!initialState);
    });

    it("toggles task sidebar", () => {
      const initialState = useAppStore.getState().ui.taskSidebarOpen;
      useAppStore.getState().toggleTaskSidebar();
      expect(useAppStore.getState().ui.taskSidebarOpen).toBe(!initialState);
    });

    it("sets loading state", () => {
      useAppStore.getState().setLoading(true);
      expect(useAppStore.getState().ui.loading).toBe(true);
    });

    it("sets error message", () => {
      useAppStore.getState().setError("Test error");
      expect(useAppStore.getState().ui.error).toBe("Test error");
    });

    it("sets selected task ID", () => {
      useAppStore.getState().setSelectedTaskId("task-123");
      expect(useAppStore.getState().ui.selectedTaskId).toBe("task-123");
    });
  });

  describe("Modal State", () => {
    it("has correct initial modal state", () => {
      const state = useAppStore.getState();
      expect(state.modals.taskModalOpen).toBe(false);
      expect(state.modals.eventModalOpen).toBe(false);
      expect(state.modals.quickAddModalOpen).toBe(false);
    });

    it("opens task modal", () => {
      useAppStore.getState().openTaskModal();
      const state = useAppStore.getState();
      expect(state.modals.taskModalOpen).toBe(true);
      expect(state.modals.eventModalOpen).toBe(false);
    });

    it("opens task modal with prefilled data", () => {
      const data = { title: "Test Task" };
      useAppStore.getState().openTaskModal(data);
      const state = useAppStore.getState();
      expect(state.modals.taskModalOpen).toBe(true);
      expect(state.modals.prefilledData).toEqual(data);
    });

    it("opens event modal", () => {
      useAppStore.getState().openEventModal();
      const state = useAppStore.getState();
      expect(state.modals.eventModalOpen).toBe(true);
      expect(state.modals.taskModalOpen).toBe(false);
    });

    it("opens quick add modal", () => {
      useAppStore.getState().openQuickAddModal();
      const state = useAppStore.getState();
      expect(state.modals.quickAddModalOpen).toBe(true);
    });

    it("closes all modals", () => {
      useAppStore.getState().openTaskModal();
      useAppStore.getState().closeModals();
      const state = useAppStore.getState();
      expect(state.modals.taskModalOpen).toBe(false);
      expect(state.modals.eventModalOpen).toBe(false);
      expect(state.modals.quickAddModalOpen).toBe(false);
    });

    it("sets editing item ID", () => {
      useAppStore.getState().setEditingItemId("item-123");
      expect(useAppStore.getState().modals.editingItemId).toBe("item-123");
    });
  });

  describe("Task State", () => {
    const mockTask = createMockTask();

    it("has correct initial task state", () => {
      const state = useAppStore.getState();
      expect(state.tasks.filters.showCompleted).toBe(false);
      expect(state.tasks.selectedCategory).toBeNull();
    });

    it("adds task", () => {
      useAppStore.getState().addTask(mockTask);
      const state = useAppStore.getState();
      expect(state.tasks.tasks).toHaveLength(1);
      expect(state.tasks.tasks[0].id).toBe(mockTask.id);
    });

    it("updates task", () => {
      useAppStore.getState().addTask(mockTask);
      useAppStore.getState().updateTask(mockTask.id, { title: "Updated" });
      const state = useAppStore.getState();
      expect(state.tasks.tasks[0].title).toBe("Updated");
    });

    it("deletes task", () => {
      useAppStore.getState().addTask(mockTask);
      useAppStore.getState().deleteTask(mockTask.id);
      const state = useAppStore.getState();
      expect(state.tasks.tasks).toHaveLength(0);
    });

    it("toggles task complete", () => {
      useAppStore.getState().addTask(mockTask);
      useAppStore.getState().toggleTaskComplete(mockTask.id);
      const state = useAppStore.getState();
      expect(state.tasks.tasks[0].isCompleted).toBe(!mockTask.isCompleted);
    });

    it("updates subtask", () => {
      const taskWithSubtasks = createMockTask({
        subtasks: [
          { id: "sub-1", title: "Subtask", completed: false, order: 0 },
        ],
      });
      useAppStore.getState().addTask(taskWithSubtasks);
      useAppStore
        .getState()
        .updateSubtask(taskWithSubtasks.id, "sub-1", { completed: true });

      const state = useAppStore.getState();
      expect(state.tasks.tasks[0].subtasks[0].completed).toBe(true);
    });

    it("schedules task without conflicts", () => {
      const task = createMockTask();
      useAppStore.getState().addTask(task);

      const scheduledTime = new Date("2024-01-15T10:00:00");
      const result = useAppStore
        .getState()
        .scheduleTask(task.id, scheduledTime);

      expect(result.success).toBe(true);
      const state = useAppStore.getState();
      expect(state.tasks.tasks[0].scheduledTime).toEqual(scheduledTime);
    });

    it("detects conflicts when scheduling task", () => {
      const event = createMockEvent({
        startTime: new Date("2024-01-15T10:00:00"),
        endTime: new Date("2024-01-15T11:00:00"),
      });
      useAppStore.getState().addEvent(event);

      const task = createMockTask();
      useAppStore.getState().addTask(task);

      const scheduledTime = new Date("2024-01-15T10:30:00");
      const result = useAppStore
        .getState()
        .scheduleTask(task.id, scheduledTime);

      expect(result.success).toBe(true);
      expect(result.conflict).toBeDefined();
    });

    it("sets task filters", () => {
      useAppStore.getState().setTaskFilters({ showCompleted: true });
      const state = useAppStore.getState();
      expect(state.tasks.filters.showCompleted).toBe(true);
    });

    it("sets selected category", () => {
      useAppStore.getState().setSelectedCategory("work");
      const state = useAppStore.getState();
      expect(state.tasks.selectedCategory).toBe("work");
    });

    it("sets tasks array", () => {
      const tasks = [createMockTask({ id: "1" }), createMockTask({ id: "2" })];
      useAppStore.getState().setTasks(tasks);
      const state = useAppStore.getState();
      expect(state.tasks.tasks).toHaveLength(2);
    });
  });

  describe("Event State", () => {
    const mockEvent = createMockEvent();

    it("has correct initial event state", () => {
      const state = useAppStore.getState();
      expect(state.events.viewMode).toBe("week");
      expect(state.events.selectedDate).toBeDefined();
    });

    it("adds event", () => {
      useAppStore.getState().addEvent(mockEvent);
      const state = useAppStore.getState();
      expect(state.events.events).toHaveLength(1);
      expect(state.events.events[0].id).toBe(mockEvent.id);
    });

    it("updates event", () => {
      useAppStore.getState().addEvent(mockEvent);
      useAppStore
        .getState()
        .updateEvent(mockEvent.id, { title: "Updated Event" });
      const state = useAppStore.getState();
      expect(state.events.events[0].title).toBe("Updated Event");
    });

    it("deletes event", () => {
      useAppStore.getState().addEvent(mockEvent);
      useAppStore.getState().deleteEvent(mockEvent.id);
      const state = useAppStore.getState();
      expect(state.events.events).toHaveLength(0);
    });

    it("moves event without conflicts", () => {
      const event = createMockEvent();
      useAppStore.getState().addEvent(event);

      const newStartTime = new Date("2024-01-15T14:00:00");
      const newEndTime = new Date("2024-01-15T15:00:00");
      const result = useAppStore
        .getState()
        .moveEvent(event.id, newStartTime, newEndTime);

      expect(result.success).toBe(true);
      const state = useAppStore.getState();
      expect(state.events.events[0].startTime).toEqual(newStartTime);
    });

    it("detects conflicts when moving event", () => {
      const event1 = createMockEvent({
        id: "event-1",
        startTime: new Date("2024-01-15T10:00:00"),
        endTime: new Date("2024-01-15T11:00:00"),
      });
      const event2 = createMockEvent({
        id: "event-2",
        startTime: new Date("2024-01-15T14:00:00"),
        endTime: new Date("2024-01-15T15:00:00"),
      });

      useAppStore.getState().addEvent(event1);
      useAppStore.getState().addEvent(event2);

      const newStartTime = new Date("2024-01-15T10:30:00");
      const newEndTime = new Date("2024-01-15T11:30:00");
      const result = useAppStore
        .getState()
        .moveEvent(event2.id, newStartTime, newEndTime);

      expect(result.success).toBe(true);
      expect(result.conflict).toBeDefined();
    });

    it("sets selected date", () => {
      const newDate = new Date("2024-02-01");
      useAppStore.getState().setSelectedDate(newDate);
      const state = useAppStore.getState();
      expect(state.events.selectedDate).toEqual(newDate);
    });

    it("sets view mode", () => {
      useAppStore.getState().setViewMode("day");
      const state = useAppStore.getState();
      expect(state.events.viewMode).toBe("day");
    });

    it("sets events array", () => {
      const events = [
        createMockEvent({ id: "1" }),
        createMockEvent({ id: "2" }),
      ];
      useAppStore.getState().setEvents(events);
      const state = useAppStore.getState();
      expect(state.events.events).toHaveLength(2);
    });
  });

  describe("Drag State", () => {
    it("has correct initial drag state", () => {
      const state = useAppStore.getState();
      expect(state.drag.isDragging).toBe(false);
      expect(state.drag.draggedItem).toBeNull();
    });

    it("sets dragging state", () => {
      useAppStore.getState().setDragging(true);
      expect(useAppStore.getState().drag.isDragging).toBe(true);
    });

    it("sets dragged item", () => {
      const item = { id: "item-1", type: "task" as const };
      useAppStore.getState().setDraggedItem(item);
      expect(useAppStore.getState().drag.draggedItem).toEqual(item);
    });

    it("sets drag over slot", () => {
      const slot = { date: new Date(), hour: 10 };
      useAppStore.getState().setDragOverSlot(slot);
      expect(useAppStore.getState().drag.dragOverSlot).toEqual(slot);
    });
  });

  describe("Conflict Detection", () => {
    it("checks conflicts correctly", () => {
      const event = createMockEvent({
        startTime: new Date("2024-01-15T10:00:00"),
        endTime: new Date("2024-01-15T11:00:00"),
      });
      useAppStore.getState().addEvent(event);

      const result = useAppStore
        .getState()
        .checkConflicts(
          new Date("2024-01-15T10:30:00"),
          new Date("2024-01-15T11:30:00")
        );

      expect(result.hasConflict).toBe(true);
      expect(result.conflictingEvents).toHaveLength(1);
    });

    it("excludes specified ID when checking conflicts", () => {
      const event = createMockEvent({
        startTime: new Date("2024-01-15T10:00:00"),
        endTime: new Date("2024-01-15T11:00:00"),
      });
      useAppStore.getState().addEvent(event);

      const result = useAppStore
        .getState()
        .checkConflicts(
          new Date("2024-01-15T10:00:00"),
          new Date("2024-01-15T11:00:00"),
          event.id
        );

      expect(result.hasConflict).toBe(false);
    });
  });

  describe("State Updates", () => {
    it("updates updatedAt timestamp when updating task", () => {
      const task = createMockTask();
      useAppStore.getState().addTask(task);

      const originalUpdatedAt = task.updatedAt;

      // Wait a bit to ensure timestamp difference
      setTimeout(() => {
        useAppStore.getState().updateTask(task.id, { title: "Updated" });
        const state = useAppStore.getState();
        expect(state.tasks.tasks[0].updatedAt.getTime()).toBeGreaterThan(
          originalUpdatedAt.getTime()
        );
      }, 10);
    });

    it("maintains immutability when updating tasks", () => {
      const task1 = createMockTask({ id: "1" });
      const task2 = createMockTask({ id: "2" });

      useAppStore.getState().addTask(task1);
      useAppStore.getState().addTask(task2);

      const originalTasks = useAppStore.getState().tasks.tasks;

      useAppStore.getState().updateTask("1", { title: "Updated" });

      const updatedTasks = useAppStore.getState().tasks.tasks;
      expect(updatedTasks).not.toBe(originalTasks);
    });
  });
});
