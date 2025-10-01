import {
  getWeekDays,
  formatTime,
  formatTime24,
  getWeekRangeString,
  calculateEventPosition,
  doBlocksOverlap,
  groupOverlappingBlocks,
  getCurrentTimePosition,
  isTimePast,
  isDateToday,
  getBlocksForDay,
  navigateWeek,
  navigateDay,
  isWithinBusinessHours,
  getHourSlots,
  createTimeOnDay,
} from "@/lib/calendar-utils";
import {
  createMockEvent,
  createMockTimeBlock,
  setMockDate,
  restoreRealDate,
} from "../../utils/test-utils";

describe("calendar-utils", () => {
  describe("getWeekDays", () => {
    it("returns 7 days starting from Monday", () => {
      const date = new Date("2024-01-10"); // Wednesday
      const weekDays = getWeekDays(date);

      expect(weekDays).toHaveLength(7);
      expect(weekDays[0].getDay()).toBe(1); // Monday
      expect(weekDays[6].getDay()).toBe(0); // Sunday
    });

    it("returns correct week for date at start of year", () => {
      const date = new Date("2024-01-01"); // Monday
      const weekDays = getWeekDays(date);

      expect(weekDays).toHaveLength(7);
      expect(weekDays[0].getDate()).toBe(1);
    });

    it("returns correct week for date at end of year", () => {
      const date = new Date("2024-12-31"); // Tuesday
      const weekDays = getWeekDays(date);

      expect(weekDays).toHaveLength(7);
      expect(weekDays[0].getDay()).toBe(1); // Monday
    });
  });

  describe("formatTime", () => {
    it("formats morning time correctly", () => {
      const date = new Date("2024-01-01T09:00:00");
      expect(formatTime(date)).toBe("9:00 AM");
    });

    it("formats afternoon time correctly", () => {
      const date = new Date("2024-01-01T14:30:00");
      expect(formatTime(date)).toBe("2:30 PM");
    });

    it("formats midnight correctly", () => {
      const date = new Date("2024-01-01T00:00:00");
      expect(formatTime(date)).toBe("12:00 AM");
    });

    it("formats noon correctly", () => {
      const date = new Date("2024-01-01T12:00:00");
      expect(formatTime(date)).toBe("12:00 PM");
    });
  });

  describe("formatTime24", () => {
    it("formats time in 24-hour format", () => {
      const date = new Date("2024-01-01T09:30:00");
      expect(formatTime24(date)).toBe("09:30");
    });

    it("formats afternoon time correctly", () => {
      const date = new Date("2024-01-01T14:30:00");
      expect(formatTime24(date)).toBe("14:30");
    });
  });

  describe("getWeekRangeString", () => {
    it("formats week range within same month", () => {
      const date = new Date("2024-01-10");
      const range = getWeekRangeString(date);
      expect(range).toBe("Jan 8 - 14");
    });

    it("formats week range across different months", () => {
      const date = new Date("2024-01-01");
      const range = getWeekRangeString(date);
      expect(range).toMatch(/Dec \d+ - Jan \d+/);
    });
  });

  describe("calculateEventPosition", () => {
    it("calculates correct position for morning event", () => {
      const event = createMockEvent({
        startTime: new Date("2024-01-01T09:00:00"),
        endTime: new Date("2024-01-01T10:00:00"),
      });

      const position = calculateEventPosition(event);
      expect(position.top).toBe(180); // (9 - 6) * 60
      expect(position.height).toBe(60); // 1 hour * 60
    });

    it("calculates correct position for afternoon event", () => {
      const event = createMockEvent({
        startTime: new Date("2024-01-01T14:00:00"),
        endTime: new Date("2024-01-01T16:00:00"),
      });

      const position = calculateEventPosition(event);
      expect(position.top).toBe(480); // (14 - 6) * 60
      expect(position.height).toBe(120); // 2 hours * 60
    });

    it("handles events with minutes", () => {
      const event = createMockEvent({
        startTime: new Date("2024-01-01T09:30:00"),
        endTime: new Date("2024-01-01T10:45:00"),
      });

      const position = calculateEventPosition(event);
      expect(position.top).toBe(210); // (9.5 - 6) * 60
      expect(position.height).toBe(75); // 1.25 hours * 60
    });

    it("enforces minimum height", () => {
      const event = createMockEvent({
        startTime: new Date("2024-01-01T09:00:00"),
        endTime: new Date("2024-01-01T09:15:00"),
      });

      const position = calculateEventPosition(event);
      expect(position.height).toBe(30); // Minimum height
    });

    it("handles events before grid start time", () => {
      const event = createMockEvent({
        startTime: new Date("2024-01-01T05:00:00"),
        endTime: new Date("2024-01-01T07:00:00"),
      });

      const position = calculateEventPosition(event);
      expect(position.top).toBe(0); // Clamped to 0
    });
  });

  describe("doBlocksOverlap", () => {
    it("detects overlapping blocks", () => {
      const block1 = createMockTimeBlock({
        startTime: new Date("2024-01-01T09:00:00"),
        endTime: new Date("2024-01-01T10:00:00"),
      });

      const block2 = createMockTimeBlock({
        id: "block-2",
        startTime: new Date("2024-01-01T09:30:00"),
        endTime: new Date("2024-01-01T10:30:00"),
      });

      expect(doBlocksOverlap(block1, block2)).toBe(true);
    });

    it("detects non-overlapping blocks", () => {
      const block1 = createMockTimeBlock({
        startTime: new Date("2024-01-01T09:00:00"),
        endTime: new Date("2024-01-01T10:00:00"),
      });

      const block2 = createMockTimeBlock({
        id: "block-2",
        startTime: new Date("2024-01-01T10:00:00"),
        endTime: new Date("2024-01-01T11:00:00"),
      });

      expect(doBlocksOverlap(block1, block2)).toBe(false);
    });

    it("handles blocks that touch at boundaries", () => {
      const block1 = createMockTimeBlock({
        startTime: new Date("2024-01-01T09:00:00"),
        endTime: new Date("2024-01-01T10:00:00"),
      });

      const block2 = createMockTimeBlock({
        id: "block-2",
        startTime: new Date("2024-01-01T10:00:00"),
        endTime: new Date("2024-01-01T11:00:00"),
      });

      expect(doBlocksOverlap(block1, block2)).toBe(false);
    });
  });

  describe("groupOverlappingBlocks", () => {
    it("groups overlapping blocks together", () => {
      const blocks = [
        createMockTimeBlock({
          id: "block-1",
          startTime: new Date("2024-01-01T09:00:00"),
          endTime: new Date("2024-01-01T10:00:00"),
        }),
        createMockTimeBlock({
          id: "block-2",
          startTime: new Date("2024-01-01T09:30:00"),
          endTime: new Date("2024-01-01T10:30:00"),
        }),
        createMockTimeBlock({
          id: "block-3",
          startTime: new Date("2024-01-01T11:00:00"),
          endTime: new Date("2024-01-01T12:00:00"),
        }),
      ];

      const groups = groupOverlappingBlocks(blocks);
      expect(groups).toHaveLength(2);
      expect(groups[0]).toHaveLength(2); // block-1 and block-2 overlap
      expect(groups[1]).toHaveLength(1); // block-3 is separate
    });

    it("returns empty array for no blocks", () => {
      const groups = groupOverlappingBlocks([]);
      expect(groups).toEqual([]);
    });

    it("handles single block", () => {
      const blocks = [createMockTimeBlock()];
      const groups = groupOverlappingBlocks(blocks);
      expect(groups).toHaveLength(1);
      expect(groups[0]).toHaveLength(1);
    });
  });

  describe("getCurrentTimePosition", () => {
    beforeEach(() => {
      setMockDate("2024-01-01T10:30:00");
    });

    afterEach(() => {
      restoreRealDate();
    });

    it("calculates current time position correctly", () => {
      const position = getCurrentTimePosition();
      expect(position).toBe(270); // (10.5 - 6) * 60
    });
  });

  describe("isTimePast", () => {
    beforeEach(() => {
      setMockDate("2024-01-01T12:00:00");
    });

    afterEach(() => {
      restoreRealDate();
    });

    it("returns true for past time", () => {
      const pastTime = new Date("2024-01-01T10:00:00");
      expect(isTimePast(pastTime)).toBe(true);
    });

    it("returns false for future time", () => {
      const futureTime = new Date("2024-01-01T14:00:00");
      expect(isTimePast(futureTime)).toBe(false);
    });
  });

  describe("isDateToday", () => {
    beforeEach(() => {
      setMockDate("2024-01-01T12:00:00");
    });

    afterEach(() => {
      restoreRealDate();
    });

    it("returns true for today's date", () => {
      const today = new Date("2024-01-01T15:00:00");
      expect(isDateToday(today)).toBe(true);
    });

    it("returns false for other dates", () => {
      const otherDay = new Date("2024-01-02T12:00:00");
      expect(isDateToday(otherDay)).toBe(false);
    });
  });

  describe("getBlocksForDay", () => {
    it("filters blocks for specific day", () => {
      const blocks = [
        createMockTimeBlock({
          id: "block-1",
          startTime: new Date("2024-01-01T09:00:00"),
        }),
        createMockTimeBlock({
          id: "block-2",
          startTime: new Date("2024-01-02T09:00:00"),
        }),
        createMockTimeBlock({
          id: "block-3",
          startTime: new Date("2024-01-01T14:00:00"),
        }),
      ];

      const day = new Date("2024-01-01");
      const dayBlocks = getBlocksForDay(blocks, day);

      expect(dayBlocks).toHaveLength(2);
      expect(dayBlocks[0].id).toBe("block-1");
      expect(dayBlocks[1].id).toBe("block-3");
    });

    it("returns empty array when no blocks match", () => {
      const blocks = [
        createMockTimeBlock({
          startTime: new Date("2024-01-02T09:00:00"),
        }),
      ];

      const day = new Date("2024-01-01");
      const dayBlocks = getBlocksForDay(blocks, day);

      expect(dayBlocks).toHaveLength(0);
    });
  });

  describe("navigateWeek", () => {
    it("navigates to next week", () => {
      const current = new Date("2024-01-01");
      const next = navigateWeek(current, "next");

      expect(next.getDate()).toBe(8);
    });

    it("navigates to previous week", () => {
      const current = new Date("2024-01-15");
      const prev = navigateWeek(current, "prev");

      expect(prev.getDate()).toBe(8);
    });
  });

  describe("navigateDay", () => {
    it("navigates to next day", () => {
      const current = new Date("2024-01-01");
      const next = navigateDay(current, "next");

      expect(next.getDate()).toBe(2);
    });

    it("navigates to previous day", () => {
      const current = new Date("2024-01-02");
      const prev = navigateDay(current, "prev");

      expect(prev.getDate()).toBe(1);
    });
  });

  describe("isWithinBusinessHours", () => {
    it("returns true for time within business hours", () => {
      const time = new Date("2024-01-01T10:00:00");
      expect(isWithinBusinessHours(time)).toBe(true);
    });

    it("returns false for time before business hours", () => {
      const time = new Date("2024-01-01T05:00:00");
      expect(isWithinBusinessHours(time)).toBe(false);
    });

    it("returns false for time after business hours", () => {
      const time = new Date("2024-01-01T23:00:00");
      expect(isWithinBusinessHours(time)).toBe(false);
    });

    it("returns true for start of business hours", () => {
      const time = new Date("2024-01-01T06:00:00");
      expect(isWithinBusinessHours(time)).toBe(true);
    });
  });

  describe("getHourSlots", () => {
    it("returns correct number of hour slots", () => {
      const slots = getHourSlots();
      expect(slots).toHaveLength(17); // 6 AM to 10 PM
    });

    it("starts at 6 AM", () => {
      const slots = getHourSlots();
      expect(slots[0]).toBe(6);
    });

    it("ends at 10 PM", () => {
      const slots = getHourSlots();
      expect(slots[slots.length - 1]).toBe(22);
    });
  });

  describe("createTimeOnDay", () => {
    it("creates time on specified day", () => {
      const day = new Date("2024-01-15");
      const time = createTimeOnDay(day, 14);

      expect(time.getDate()).toBe(15);
      expect(time.getHours()).toBe(14);
      expect(time.getMinutes()).toBe(0);
    });

    it("preserves original date object", () => {
      const day = new Date("2024-01-15T10:30:00");
      const time = createTimeOnDay(day, 14);

      expect(day.getHours()).toBe(10); // Original unchanged
      expect(time.getHours()).toBe(14); // New time
    });
  });
});
