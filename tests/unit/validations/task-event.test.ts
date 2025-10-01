import {
  taskFormSchema,
  eventFormSchema,
  quickAddSchema,
  subtaskSchema,
  attendeeSchema,
  categorySchema,
  prioritySchema,
  calendarSourceSchema,
  validateTask,
  validateEvent,
  calculateDuration,
  calculateEndTime,
} from "@/lib/validations/task-event";

describe("task-event validations", () => {
  describe("categorySchema", () => {
    it("accepts valid categories", () => {
      expect(categorySchema.parse("work")).toBe("work");
      expect(categorySchema.parse("family")).toBe("family");
      expect(categorySchema.parse("personal")).toBe("personal");
      expect(categorySchema.parse("travel")).toBe("travel");
    });

    it("rejects invalid categories", () => {
      expect(() => categorySchema.parse("invalid")).toThrow();
    });
  });

  describe("prioritySchema", () => {
    it("accepts valid priorities", () => {
      expect(prioritySchema.parse("low")).toBe("low");
      expect(prioritySchema.parse("medium")).toBe("medium");
      expect(prioritySchema.parse("high")).toBe("high");
    });

    it("rejects invalid priorities", () => {
      expect(() => prioritySchema.parse("urgent")).toThrow();
    });
  });

  describe("calendarSourceSchema", () => {
    it("accepts valid sources", () => {
      expect(calendarSourceSchema.parse("google")).toBe("google");
      expect(calendarSourceSchema.parse("outlook")).toBe("outlook");
      expect(calendarSourceSchema.parse("apple")).toBe("apple");
      expect(calendarSourceSchema.parse("manual")).toBe("manual");
    });
  });

  describe("subtaskSchema", () => {
    it("validates correct subtask", () => {
      const subtask = {
        title: "Test Subtask",
        completed: false,
        order: 0,
      };

      const result = subtaskSchema.parse(subtask);
      expect(result.title).toBe("Test Subtask");
    });

    it("requires title", () => {
      const subtask = {
        title: "",
        completed: false,
        order: 0,
      };

      expect(() => subtaskSchema.parse(subtask)).toThrow();
    });

    it("enforces max title length", () => {
      const subtask = {
        title: "a".repeat(101),
        completed: false,
        order: 0,
      };

      expect(() => subtaskSchema.parse(subtask)).toThrow();
    });

    it("sets default completed to false", () => {
      const subtask = {
        title: "Test",
        order: 0,
      };

      const result = subtaskSchema.parse(subtask);
      expect(result.completed).toBe(false);
    });
  });

  describe("attendeeSchema", () => {
    it("validates correct attendee", () => {
      const attendee = {
        name: "John Doe",
        email: "john@example.com",
        status: "pending" as const,
      };

      const result = attendeeSchema.parse(attendee);
      expect(result.name).toBe("John Doe");
    });

    it("requires valid email", () => {
      const attendee = {
        name: "John Doe",
        email: "invalid-email",
        status: "pending" as const,
      };

      expect(() => attendeeSchema.parse(attendee)).toThrow();
    });

    it("sets default status to pending", () => {
      const attendee = {
        name: "John Doe",
        email: "john@example.com",
      };

      const result = attendeeSchema.parse(attendee);
      expect(result.status).toBe("pending");
    });
  });

  describe("taskFormSchema", () => {
    const validTask = {
      title: "Test Task",
      description: "Test Description",
      category: "work" as const,
      priority: "medium" as const,
      dueDate: new Date("2024-12-31"),
      scheduledTime: null,
      duration: 60,
      subtasks: [],
    };

    it("validates correct task", () => {
      const result = taskFormSchema.parse(validTask);
      expect(result.title).toBe("Test Task");
    });

    it("requires title", () => {
      const task = { ...validTask, title: "" };
      expect(() => taskFormSchema.parse(task)).toThrow();
    });

    it("enforces title max length", () => {
      const task = { ...validTask, title: "a".repeat(101) };
      expect(() => taskFormSchema.parse(task)).toThrow();
    });

    it("enforces description max length", () => {
      const task = { ...validTask, description: "a".repeat(501) };
      expect(() => taskFormSchema.parse(task)).toThrow();
    });

    it("allows empty description", () => {
      const task = { ...validTask, description: "" };
      const result = taskFormSchema.parse(task);
      expect(result.description).toBe("");
    });

    it("sets default priority to medium", () => {
      const task = { ...validTask };
      delete (task as Partial<typeof validTask>).priority;
      const result = taskFormSchema.parse(task);
      expect(result.priority).toBe("medium");
    });

    it("sets default duration to 60", () => {
      const task = { ...validTask };
      delete (task as Partial<typeof validTask>).duration;
      const result = taskFormSchema.parse(task);
      expect(result.duration).toBe(60);
    });

    it("enforces max duration", () => {
      const task = { ...validTask, duration: 1441 };
      expect(() => taskFormSchema.parse(task)).toThrow();
    });

    it("requires positive duration", () => {
      const task = { ...validTask, duration: -10 };
      expect(() => taskFormSchema.parse(task)).toThrow();
    });

    it("enforces max subtasks count", () => {
      const subtasks = Array(21).fill({
        title: "Subtask",
        completed: false,
        order: 0,
      });
      const task = { ...validTask, subtasks };
      expect(() => taskFormSchema.parse(task)).toThrow();
    });

    it("validates scheduledTime is before dueDate", () => {
      const task = {
        ...validTask,
        scheduledTime: new Date("2025-01-01"),
        dueDate: new Date("2024-12-31"),
      };
      expect(() => taskFormSchema.parse(task)).toThrow();
    });

    it("allows scheduledTime same as dueDate", () => {
      const date = new Date("2024-12-31");
      const task = {
        ...validTask,
        scheduledTime: date,
        dueDate: date,
      };
      const result = taskFormSchema.parse(task);
      expect(result).toBeDefined();
    });

    it("validates task duration is reasonable", () => {
      const task = {
        ...validTask,
        scheduledTime: new Date("2024-01-01T09:00:00"),
        duration: 1500, // 25 hours
      };
      expect(() => taskFormSchema.parse(task)).toThrow();
    });
  });

  describe("eventFormSchema", () => {
    const validEvent = {
      title: "Test Event",
      description: "Test Description",
      category: "work" as const,
      startTime: new Date("2024-01-01T09:00:00"),
      endTime: new Date("2024-01-01T10:00:00"),
      location: "Test Location",
      attendees: [],
      calendarSource: "manual" as const,
      isShared: false,
    };

    it("validates correct event", () => {
      const result = eventFormSchema.parse(validEvent);
      expect(result.title).toBe("Test Event");
    });

    it("requires title", () => {
      const event = { ...validEvent, title: "" };
      expect(() => eventFormSchema.parse(event)).toThrow();
    });

    it("enforces title max length", () => {
      const event = { ...validEvent, title: "a".repeat(101) };
      expect(() => eventFormSchema.parse(event)).toThrow();
    });

    it("requires startTime", () => {
      const event = { ...validEvent };
      delete (event as Partial<typeof validEvent>).startTime;
      expect(() => eventFormSchema.parse(event)).toThrow();
    });

    it("requires endTime", () => {
      const event = { ...validEvent };
      delete (event as Partial<typeof validEvent>).endTime;
      expect(() => eventFormSchema.parse(event)).toThrow();
    });

    it("validates endTime is after startTime", () => {
      const event = {
        ...validEvent,
        startTime: new Date("2024-01-01T10:00:00"),
        endTime: new Date("2024-01-01T09:00:00"),
      };
      expect(() => eventFormSchema.parse(event)).toThrow();
    });

    it("enforces maximum duration of 7 days", () => {
      const event = {
        ...validEvent,
        startTime: new Date("2024-01-01T09:00:00"),
        endTime: new Date("2024-01-09T09:00:00"),
      };
      expect(() => eventFormSchema.parse(event)).toThrow();
    });

    it("enforces minimum duration of 1 minute", () => {
      const time = new Date("2024-01-01T09:00:00");
      const event = {
        ...validEvent,
        startTime: time,
        endTime: time,
      };
      expect(() => eventFormSchema.parse(event)).toThrow();
    });

    it("allows 1 minute duration", () => {
      const event = {
        ...validEvent,
        startTime: new Date("2024-01-01T09:00:00"),
        endTime: new Date("2024-01-01T09:01:00"),
      };
      const result = eventFormSchema.parse(event);
      expect(result).toBeDefined();
    });

    it("enforces location max length", () => {
      const event = { ...validEvent, location: "a".repeat(201) };
      expect(() => eventFormSchema.parse(event)).toThrow();
    });

    it("allows empty location", () => {
      const event = { ...validEvent, location: "" };
      const result = eventFormSchema.parse(event);
      expect(result.location).toBe("");
    });

    it("sets default calendarSource to manual", () => {
      const event = { ...validEvent };
      delete (event as Partial<typeof validEvent>).calendarSource;
      const result = eventFormSchema.parse(event);
      expect(result.calendarSource).toBe("manual");
    });

    it("sets default isShared to false", () => {
      const event = { ...validEvent };
      delete (event as Partial<typeof validEvent>).isShared;
      const result = eventFormSchema.parse(event);
      expect(result.isShared).toBe(false);
    });
  });

  describe("quickAddSchema", () => {
    it("validates correct input", () => {
      const result = quickAddSchema.parse({ input: "Buy groceries tomorrow" });
      expect(result.input).toBe("Buy groceries tomorrow");
    });

    it("requires non-empty input", () => {
      expect(() => quickAddSchema.parse({ input: "" })).toThrow();
    });

    it("enforces max length", () => {
      const input = { input: "a".repeat(201) };
      expect(() => quickAddSchema.parse(input)).toThrow();
    });
  });

  describe("validateTask", () => {
    it("returns success for valid task", () => {
      const task = {
        title: "Test Task",
        category: "work",
        priority: "medium",
        subtasks: [],
        duration: 60,
      };

      const result = validateTask(task);
      expect(result.success).toBe(true);
    });

    it("returns error for invalid task", () => {
      const task = {
        title: "",
        category: "invalid",
      };

      const result = validateTask(task);
      expect(result.success).toBe(false);
    });
  });

  describe("validateEvent", () => {
    it("returns success for valid event", () => {
      const event = {
        title: "Test Event",
        category: "work",
        startTime: new Date("2024-01-01T09:00:00"),
        endTime: new Date("2024-01-01T10:00:00"),
        attendees: [],
        calendarSource: "manual",
        isShared: false,
      };

      const result = validateEvent(event);
      expect(result.success).toBe(true);
    });

    it("returns error for invalid event", () => {
      const event = {
        title: "",
        startTime: new Date("2024-01-01T10:00:00"),
        endTime: new Date("2024-01-01T09:00:00"),
      };

      const result = validateEvent(event);
      expect(result.success).toBe(false);
    });
  });

  describe("calculateDuration", () => {
    it("calculates duration in minutes", () => {
      const start = new Date("2024-01-01T09:00:00");
      const end = new Date("2024-01-01T10:30:00");

      expect(calculateDuration(start, end)).toBe(90);
    });

    it("handles same start and end time", () => {
      const time = new Date("2024-01-01T09:00:00");
      expect(calculateDuration(time, time)).toBe(0);
    });

    it("rounds to nearest minute", () => {
      const start = new Date("2024-01-01T09:00:00");
      const end = new Date("2024-01-01T09:00:30");

      expect(calculateDuration(start, end)).toBe(1);
    });
  });

  describe("calculateEndTime", () => {
    it("calculates end time correctly", () => {
      const start = new Date("2024-01-01T09:00:00");
      const end = calculateEndTime(start, 90);

      expect(end.getHours()).toBe(10);
      expect(end.getMinutes()).toBe(30);
    });

    it("handles zero duration", () => {
      const start = new Date("2024-01-01T09:00:00");
      const end = calculateEndTime(start, 0);

      expect(end.getTime()).toBe(start.getTime());
    });

    it("handles large durations", () => {
      const start = new Date("2024-01-01T09:00:00");
      const end = calculateEndTime(start, 1440); // 24 hours

      expect(end.getDate()).toBe(2);
      expect(end.getHours()).toBe(9);
    });
  });
});
