import {
  doIntervalsOverlap,
  checkTimeConflict,
  findNextAvailableSlot,
  getEventsInRange,
  calculateDuration,
  formatConflictMessage,
} from "@/lib/conflict-detection";
import { createMockEvent, createMockTask } from "../../utils/test-utils";

describe("conflict-detection", () => {
  describe("doIntervalsOverlap", () => {
    it("detects overlapping intervals", () => {
      const start1 = new Date("2024-01-01T09:00:00");
      const end1 = new Date("2024-01-01T10:00:00");
      const start2 = new Date("2024-01-01T09:30:00");
      const end2 = new Date("2024-01-01T10:30:00");

      expect(doIntervalsOverlap(start1, end1, start2, end2)).toBe(true);
    });

    it("detects non-overlapping intervals", () => {
      const start1 = new Date("2024-01-01T09:00:00");
      const end1 = new Date("2024-01-01T10:00:00");
      const start2 = new Date("2024-01-01T10:00:00");
      const end2 = new Date("2024-01-01T11:00:00");

      expect(doIntervalsOverlap(start1, end1, start2, end2)).toBe(false);
    });

    it("handles intervals that touch at boundaries", () => {
      const start1 = new Date("2024-01-01T09:00:00");
      const end1 = new Date("2024-01-01T10:00:00");
      const start2 = new Date("2024-01-01T10:00:00");
      const end2 = new Date("2024-01-01T11:00:00");

      expect(doIntervalsOverlap(start1, end1, start2, end2)).toBe(false);
    });

    it("detects when one interval contains another", () => {
      const start1 = new Date("2024-01-01T09:00:00");
      const end1 = new Date("2024-01-01T11:00:00");
      const start2 = new Date("2024-01-01T09:30:00");
      const end2 = new Date("2024-01-01T10:00:00");

      expect(doIntervalsOverlap(start1, end1, start2, end2)).toBe(true);
    });
  });

  describe("checkTimeConflict", () => {
    const events = [
      createMockEvent({
        id: "event-1",
        startTime: new Date("2024-01-01T09:00:00"),
        endTime: new Date("2024-01-01T10:00:00"),
      }),
      createMockEvent({
        id: "event-2",
        startTime: new Date("2024-01-01T14:00:00"),
        endTime: new Date("2024-01-01T15:00:00"),
      }),
    ];

    const tasks = [
      createMockTask({
        id: "task-1",
        scheduledTime: new Date("2024-01-01T11:00:00"),
        dueDate: new Date("2024-01-01T12:00:00"),
      }),
    ];

    it("detects conflict with event", () => {
      const result = checkTimeConflict(
        new Date("2024-01-01T09:30:00"),
        new Date("2024-01-01T10:30:00"),
        events,
        []
      );

      expect(result.hasConflict).toBe(true);
      expect(result.conflictingEvents).toHaveLength(1);
      expect(result.conflictingEvents[0].id).toBe("event-1");
    });

    it("detects conflict with task", () => {
      const result = checkTimeConflict(
        new Date("2024-01-01T11:30:00"),
        new Date("2024-01-01T12:30:00"),
        [],
        tasks
      );

      expect(result.hasConflict).toBe(true);
      expect(result.conflictingEvents).toHaveLength(1);
      expect(result.conflictingEvents[0].id).toBe("task-1");
    });

    it("returns no conflict when time is free", () => {
      const result = checkTimeConflict(
        new Date("2024-01-01T16:00:00"),
        new Date("2024-01-01T17:00:00"),
        events,
        tasks
      );

      expect(result.hasConflict).toBe(false);
      expect(result.conflictingEvents).toHaveLength(0);
    });

    it("excludes specified ID when checking conflicts", () => {
      const result = checkTimeConflict(
        new Date("2024-01-01T09:00:00"),
        new Date("2024-01-01T10:00:00"),
        events,
        [],
        "event-1"
      );

      expect(result.hasConflict).toBe(false);
    });

    it("detects multiple conflicts", () => {
      const result = checkTimeConflict(
        new Date("2024-01-01T08:30:00"),
        new Date("2024-01-01T14:30:00"),
        events,
        tasks
      );

      expect(result.hasConflict).toBe(true);
      expect(result.conflictingEvents.length).toBeGreaterThan(1);
    });

    it("handles tasks without dueDate (assumes 1 hour duration)", () => {
      const tasksNoDueDate = [
        createMockTask({
          id: "task-2",
          scheduledTime: new Date("2024-01-01T13:00:00"),
          dueDate: undefined,
        }),
      ];

      const result = checkTimeConflict(
        new Date("2024-01-01T13:30:00"),
        new Date("2024-01-01T14:00:00"),
        [],
        tasksNoDueDate
      );

      expect(result.hasConflict).toBe(true);
    });

    it("provides suggestions when conflict is detected", () => {
      const result = checkTimeConflict(
        new Date("2024-01-01T09:30:00"),
        new Date("2024-01-01T10:30:00"),
        events,
        []
      );

      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions.some((s) => s.includes("overlaps"))).toBe(true);
    });
  });

  describe("findNextAvailableSlot", () => {
    const events = [
      createMockEvent({
        startTime: new Date("2024-01-01T09:00:00"),
        endTime: new Date("2024-01-01T10:00:00"),
      }),
      createMockEvent({
        startTime: new Date("2024-01-01T10:00:00"),
        endTime: new Date("2024-01-01T11:00:00"),
      }),
    ];

    it("finds next available slot", () => {
      const afterTime = new Date("2024-01-01T08:00:00");
      const slot = findNextAvailableSlot(afterTime, 60, events, []);

      expect(slot).not.toBeNull();
      expect(slot!.getHours()).toBeGreaterThanOrEqual(8);
    });

    it("respects working hours", () => {
      const afterTime = new Date("2024-01-01T08:00:00");
      const slot = findNextAvailableSlot(afterTime, 60, events, [], {
        workingHoursStart: 11,
        workingHoursEnd: 18,
      });

      expect(slot).not.toBeNull();
      expect(slot!.getHours()).toBeGreaterThanOrEqual(11);
    });

    it("returns null when no slot available within max days", () => {
      const afterTime = new Date("2024-01-01T08:00:00");
      const slot = findNextAvailableSlot(afterTime, 60, events, [], {
        workingHoursStart: 9,
        workingHoursEnd: 10,
        maxDaysToSearch: 0,
      });

      expect(slot).toBeNull();
    });

    it("finds slot on next day if current day is full", () => {
      const afterTime = new Date("2024-01-01T17:00:00");
      const slot = findNextAvailableSlot(afterTime, 60, events, [], {
        workingHoursStart: 9,
        workingHoursEnd: 11,
        maxDaysToSearch: 2,
      });

      expect(slot).not.toBeNull();
      expect(slot!.getDate()).toBeGreaterThan(afterTime.getDate());
    });
  });

  describe("getEventsInRange", () => {
    const events = [
      createMockEvent({
        id: "event-1",
        startTime: new Date("2024-01-01T09:00:00"),
        endTime: new Date("2024-01-01T10:00:00"),
      }),
      createMockEvent({
        id: "event-2",
        startTime: new Date("2024-01-01T14:00:00"),
        endTime: new Date("2024-01-01T15:00:00"),
      }),
      createMockEvent({
        id: "event-3",
        startTime: new Date("2024-01-02T09:00:00"),
        endTime: new Date("2024-01-02T10:00:00"),
      }),
    ];

    const tasks = [
      createMockTask({
        id: "task-1",
        scheduledTime: new Date("2024-01-01T11:00:00"),
        dueDate: new Date("2024-01-01T12:00:00"),
      }),
    ];

    it("returns events within range", () => {
      const startTime = new Date("2024-01-01T08:00:00");
      const endTime = new Date("2024-01-01T16:00:00");

      const inRange = getEventsInRange(startTime, endTime, events, tasks);

      expect(inRange.length).toBeGreaterThanOrEqual(3);
      expect(inRange.some((e) => e.id === "event-1")).toBe(true);
      expect(inRange.some((e) => e.id === "event-2")).toBe(true);
      expect(inRange.some((e) => e.id === "task-1")).toBe(true);
    });

    it("excludes events outside range", () => {
      const startTime = new Date("2024-01-01T08:00:00");
      const endTime = new Date("2024-01-01T13:00:00");

      const inRange = getEventsInRange(startTime, endTime, events, tasks);

      expect(inRange.some((e) => e.id === "event-2")).toBe(false);
      expect(inRange.some((e) => e.id === "event-3")).toBe(false);
    });

    it("includes events that span the range", () => {
      const startTime = new Date("2024-01-01T09:30:00");
      const endTime = new Date("2024-01-01T09:45:00");

      const inRange = getEventsInRange(startTime, endTime, events, []);

      expect(inRange.some((e) => e.id === "event-1")).toBe(true);
    });
  });

  describe("calculateDuration", () => {
    it("calculates duration in minutes correctly", () => {
      const start = new Date("2024-01-01T09:00:00");
      const end = new Date("2024-01-01T10:30:00");

      expect(calculateDuration(start, end)).toBe(90);
    });

    it("handles same start and end time", () => {
      const time = new Date("2024-01-01T09:00:00");

      expect(calculateDuration(time, time)).toBe(0);
    });

    it("calculates duration across hours", () => {
      const start = new Date("2024-01-01T09:15:00");
      const end = new Date("2024-01-01T11:45:00");

      expect(calculateDuration(start, end)).toBe(150);
    });
  });

  describe("formatConflictMessage", () => {
    it("returns no conflict message when no conflicts", () => {
      const conflict = {
        hasConflict: false,
        conflictingEvents: [],
        suggestions: [],
      };

      expect(formatConflictMessage(conflict)).toBe("No conflicts detected");
    });

    it("formats single conflict", () => {
      const conflict = {
        hasConflict: true,
        conflictingEvents: [createMockEvent({ title: "Meeting" })],
        suggestions: [],
      };

      const message = formatConflictMessage(conflict);
      expect(message).toContain("Meeting");
    });

    it("formats multiple conflicts", () => {
      const conflict = {
        hasConflict: true,
        conflictingEvents: [
          createMockEvent({ id: "e1", title: "Meeting 1" }),
          createMockEvent({ id: "e2", title: "Meeting 2" }),
        ],
        suggestions: [],
      };

      const message = formatConflictMessage(conflict);
      expect(message).toContain("Meeting 1");
      expect(message).toContain("Meeting 2");
    });

    it("limits displayed conflicts to 3 and shows count", () => {
      const conflict = {
        hasConflict: true,
        conflictingEvents: [
          createMockEvent({ id: "e1", title: "Meeting 1" }),
          createMockEvent({ id: "e2", title: "Meeting 2" }),
          createMockEvent({ id: "e3", title: "Meeting 3" }),
          createMockEvent({ id: "e4", title: "Meeting 4" }),
          createMockEvent({ id: "e5", title: "Meeting 5" }),
        ],
        suggestions: [],
      };

      const message = formatConflictMessage(conflict);
      expect(message).toContain("and 2 more");
    });
  });
});
