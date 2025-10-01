import { renderHook, act } from "@testing-library/react";
import { useCalendar } from "@/hooks/useCalendar";
import { useAppStore } from "@/lib/store";
import {
  createMockEvent,
  createMockTask,
  setMockDate,
  restoreRealDate,
} from "../../utils/test-utils";

// Mock the store
jest.mock("@/lib/store");

describe("useCalendar", () => {
  const mockEvents = [
    createMockEvent({
      id: "event-1",
      startTime: new Date("2024-01-15T09:00:00"),
      endTime: new Date("2024-01-15T10:00:00"),
    }),
    createMockEvent({
      id: "event-2",
      startTime: new Date("2024-01-15T14:00:00"),
      endTime: new Date("2024-01-15T15:00:00"),
    }),
  ];

  const mockTasks = [
    createMockTask({
      id: "task-1",
      scheduledTime: new Date("2024-01-15T11:00:00"),
      isCompleted: false,
    }),
    createMockTask({
      id: "task-2",
      scheduledTime: new Date("2024-01-15T16:00:00"),
      isCompleted: false,
    }),
    createMockTask({
      id: "task-3",
      scheduledTime: null,
      isCompleted: false,
    }),
  ];

  beforeEach(() => {
    setMockDate("2024-01-15T12:00:00");

    (useAppStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        events: {
          events: mockEvents,
          selectedDate: new Date("2024-01-15"),
          viewMode: "week",
        },
        tasks: {
          tasks: mockTasks,
        },
        setSelectedDate: jest.fn(),
        setViewMode: jest.fn(),
      })
    );
  });

  afterEach(() => {
    restoreRealDate();
    jest.clearAllMocks();
  });

  it("returns current selected date", () => {
    const { result } = renderHook(() => useCalendar());
    expect(result.current.selectedDate).toEqual(new Date("2024-01-15"));
  });

  it("returns current view mode", () => {
    const { result } = renderHook(() => useCalendar());
    expect(result.current.viewMode).toBe("week");
  });

  it("converts events to time blocks", () => {
    const { result } = renderHook(() => useCalendar());

    const eventBlocks = result.current.timeBlocks.filter(
      (b) => b.type === "event"
    );
    expect(eventBlocks).toHaveLength(2);
    expect(eventBlocks[0].id).toBe("event-1");
  });

  it("converts scheduled tasks to time blocks", () => {
    const { result } = renderHook(() => useCalendar());

    const taskBlocks = result.current.timeBlocks.filter(
      (b) => b.type === "task"
    );
    expect(taskBlocks).toHaveLength(2);
    expect(taskBlocks[0].id).toBe("task-1");
  });

  it("excludes completed tasks from time blocks", () => {
    const completedTask = createMockTask({
      id: "completed-task",
      scheduledTime: new Date("2024-01-15T13:00:00"),
      isCompleted: true,
    });

    (useAppStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        events: {
          events: [],
          selectedDate: new Date("2024-01-15"),
          viewMode: "week",
        },
        tasks: {
          tasks: [completedTask],
        },
        setSelectedDate: jest.fn(),
        setViewMode: jest.fn(),
      })
    );

    const { result } = renderHook(() => useCalendar());
    expect(result.current.timeBlocks).toHaveLength(0);
  });

  it("excludes tasks without scheduled time", () => {
    const { result } = renderHook(() => useCalendar());

    const taskBlocks = result.current.timeBlocks.filter(
      (b) => b.type === "task"
    );
    expect(taskBlocks).toHaveLength(2);
    expect(taskBlocks.every((b) => b.data.id !== "task-3")).toBe(true);
  });

  it("calculates duration for tasks (default 1 hour)", () => {
    const { result } = renderHook(() => useCalendar());

    const taskBlocks = result.current.timeBlocks.filter(
      (b) => b.type === "task"
    );
    expect(taskBlocks[0].duration).toBe(60);
  });

  it("returns getWeekDays function", () => {
    const { result } = renderHook(() => useCalendar());

    const weekDays = result.current.getWeekDays();
    expect(weekDays).toHaveLength(7);
    expect(weekDays[0].getDay()).toBe(1); // Monday
  });

  it("navigates to next week", () => {
    const mockSetSelectedDate = jest.fn();
    (useAppStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        events: {
          events: [],
          selectedDate: new Date("2024-01-15"),
          viewMode: "week",
        },
        tasks: { tasks: [] },
        setSelectedDate: mockSetSelectedDate,
        setViewMode: jest.fn(),
      })
    );

    const { result } = renderHook(() => useCalendar());

    act(() => {
      result.current.navigateDate("next");
    });

    expect(mockSetSelectedDate).toHaveBeenCalled();
    const newDate = mockSetSelectedDate.mock.calls[0][0];
    expect(newDate.getDate()).toBe(22); // 7 days later
  });

  it("navigates to previous week", () => {
    const mockSetSelectedDate = jest.fn();
    (useAppStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        events: {
          events: [],
          selectedDate: new Date("2024-01-15"),
          viewMode: "week",
        },
        tasks: { tasks: [] },
        setSelectedDate: mockSetSelectedDate,
        setViewMode: jest.fn(),
      })
    );

    const { result } = renderHook(() => useCalendar());

    act(() => {
      result.current.navigateDate("prev");
    });

    expect(mockSetSelectedDate).toHaveBeenCalled();
    const newDate = mockSetSelectedDate.mock.calls[0][0];
    expect(newDate.getDate()).toBe(8); // 7 days earlier
  });

  it("navigates by day when view mode is day", () => {
    const mockSetSelectedDate = jest.fn();
    (useAppStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        events: {
          events: [],
          selectedDate: new Date("2024-01-15"),
          viewMode: "day",
        },
        tasks: { tasks: [] },
        setSelectedDate: mockSetSelectedDate,
        setViewMode: jest.fn(),
      })
    );

    const { result } = renderHook(() => useCalendar());

    act(() => {
      result.current.navigateDate("next");
    });

    expect(mockSetSelectedDate).toHaveBeenCalled();
    const newDate = mockSetSelectedDate.mock.calls[0][0];
    expect(newDate.getDate()).toBe(16); // 1 day later
  });

  it("navigates by month when view mode is month", () => {
    const mockSetSelectedDate = jest.fn();
    (useAppStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        events: {
          events: [],
          selectedDate: new Date("2024-01-15"),
          viewMode: "month",
        },
        tasks: { tasks: [] },
        setSelectedDate: mockSetSelectedDate,
        setViewMode: jest.fn(),
      })
    );

    const { result } = renderHook(() => useCalendar());

    act(() => {
      result.current.navigateDate("next");
    });

    expect(mockSetSelectedDate).toHaveBeenCalled();
    const newDate = mockSetSelectedDate.mock.calls[0][0];
    expect(newDate.getMonth()).toBe(1); // February
  });

  it("updates time blocks when events change", () => {
    const { result, rerender } = renderHook(() => useCalendar());

    const initialBlocksCount = result.current.timeBlocks.length;

    // Update mock to have more events
    (useAppStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        events: {
          events: [
            ...mockEvents,
            createMockEvent({
              id: "event-3",
              startTime: new Date("2024-01-15T16:00:00"),
              endTime: new Date("2024-01-15T17:00:00"),
            }),
          ],
          selectedDate: new Date("2024-01-15"),
          viewMode: "week",
        },
        tasks: { tasks: mockTasks },
        setSelectedDate: jest.fn(),
        setViewMode: jest.fn(),
      })
    );

    rerender();

    expect(result.current.timeBlocks.length).toBeGreaterThan(
      initialBlocksCount
    );
  });

  it("provides setSelectedDate function", () => {
    const mockSetSelectedDate = jest.fn();
    (useAppStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        events: {
          events: [],
          selectedDate: new Date("2024-01-15"),
          viewMode: "week",
        },
        tasks: { tasks: [] },
        setSelectedDate: mockSetSelectedDate,
        setViewMode: jest.fn(),
      })
    );

    const { result } = renderHook(() => useCalendar());

    const newDate = new Date("2024-01-20");
    act(() => {
      result.current.setSelectedDate(newDate);
    });

    expect(mockSetSelectedDate).toHaveBeenCalledWith(newDate);
  });

  it("provides setViewMode function", () => {
    const mockSetViewMode = jest.fn();
    (useAppStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        events: {
          events: [],
          selectedDate: new Date("2024-01-15"),
          viewMode: "week",
        },
        tasks: { tasks: [] },
        setSelectedDate: jest.fn(),
        setViewMode: mockSetViewMode,
      })
    );

    const { result } = renderHook(() => useCalendar());

    act(() => {
      result.current.setViewMode("day");
    });

    expect(mockSetViewMode).toHaveBeenCalledWith("day");
  });
});
