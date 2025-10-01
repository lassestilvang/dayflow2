import { renderHook, act } from "@testing-library/react";
import { useTasks } from "@/hooks/useTasks";
import { useAppStore } from "@/lib/store";
import {
  createMockTask,
  setMockDate,
  restoreRealDate,
} from "../../utils/test-utils";
import type { CategoryType } from "@/types";

// Mock the store
jest.mock("@/lib/store");

describe("useTasks", () => {
  const mockTasks = [
    createMockTask({
      id: "task-1",
      title: "Overdue Task",
      category: "work",
      priority: "high",
      dueDate: new Date("2024-01-10"),
      isCompleted: false,
    }),
    createMockTask({
      id: "task-2",
      title: "Today Task",
      category: "personal",
      priority: "medium",
      dueDate: new Date("2024-01-15"),
      isCompleted: false,
    }),
    createMockTask({
      id: "task-3",
      title: "Tomorrow Task",
      category: "work",
      priority: "low",
      dueDate: new Date("2024-01-16"),
      isCompleted: false,
    }),
    createMockTask({
      id: "task-4",
      title: "Completed Task",
      category: "work",
      priority: "medium",
      dueDate: new Date("2024-01-14"),
      isCompleted: true,
    }),
    createMockTask({
      id: "task-5",
      title: "This Week Task",
      category: "family",
      priority: "high",
      dueDate: new Date("2024-01-18"),
      isCompleted: false,
    }),
  ];

  beforeEach(() => {
    setMockDate("2024-01-15T12:00:00"); // Monday

    (useAppStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        tasks: {
          tasks: mockTasks,
          filters: {
            categories: [] as CategoryType[],
            priorities: [] as ("low" | "medium" | "high")[],
            showCompleted: false,
          },
          selectedCategory: null,
        },
        setTaskFilters: jest.fn(),
        setSelectedCategory: jest.fn(),
      })
    );
  });

  afterEach(() => {
    restoreRealDate();
    jest.clearAllMocks();
  });

  it("returns filtered tasks", () => {
    const { result } = renderHook(() => useTasks());
    expect(result.current.tasks.length).toBeGreaterThan(0);
  });

  it("filters out completed tasks by default", () => {
    const { result } = renderHook(() => useTasks());
    expect(result.current.tasks.every((t) => !t.isCompleted)).toBe(true);
  });

  it("includes completed tasks when filter is set", () => {
    (useAppStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        tasks: {
          tasks: mockTasks,
          filters: {
            categories: [],
            priorities: [],
            showCompleted: true,
          },
          selectedCategory: null,
        },
        setTaskFilters: jest.fn(),
        setSelectedCategory: jest.fn(),
      })
    );

    const { result } = renderHook(() => useTasks());
    expect(result.current.tasks.some((t) => t.isCompleted)).toBe(true);
  });

  it("filters by category", () => {
    (useAppStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        tasks: {
          tasks: mockTasks,
          filters: {
            categories: ["work"],
            priorities: [],
            showCompleted: false,
          },
          selectedCategory: null,
        },
        setTaskFilters: jest.fn(),
        setSelectedCategory: jest.fn(),
      })
    );

    const { result } = renderHook(() => useTasks());
    expect(result.current.tasks.every((t) => t.category === "work")).toBe(true);
  });

  it("filters by priority", () => {
    (useAppStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        tasks: {
          tasks: mockTasks,
          filters: {
            categories: [],
            priorities: ["high"],
            showCompleted: false,
          },
          selectedCategory: null,
        },
        setTaskFilters: jest.fn(),
        setSelectedCategory: jest.fn(),
      })
    );

    const { result } = renderHook(() => useTasks());
    expect(result.current.tasks.every((t) => t.priority === "high")).toBe(true);
  });

  it("filters by selected category", () => {
    (useAppStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        tasks: {
          tasks: mockTasks,
          filters: {
            categories: [],
            priorities: [],
            showCompleted: false,
          },
          selectedCategory: "personal" as CategoryType,
        },
        setTaskFilters: jest.fn(),
        setSelectedCategory: jest.fn(),
      })
    );

    const { result } = renderHook(() => useTasks());
    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0].category).toBe("personal");
  });

  it("computes overdue tasks correctly", () => {
    const { result } = renderHook(() => useTasks());
    expect(result.current.overdueTasks).toHaveLength(1);
    expect(result.current.overdueTasks[0].id).toBe("task-1");
  });

  it("computes today tasks correctly", () => {
    const { result } = renderHook(() => useTasks());
    expect(result.current.todayTasks).toHaveLength(1);
    expect(result.current.todayTasks[0].id).toBe("task-2");
  });

  it("computes upcoming tasks correctly", () => {
    const { result } = renderHook(() => useTasks());
    expect(result.current.upcomingTasks.length).toBeGreaterThan(0);
  });

  it("calculates task statistics", () => {
    const { result } = renderHook(() => useTasks());

    expect(result.current.stats.total).toBe(5);
    expect(result.current.stats.completed).toBe(1);
    expect(result.current.stats.overdue).toBe(1);
    expect(result.current.stats.today).toBe(1);
    expect(result.current.stats.completionRate).toBe(20);
  });

  it("provides setTaskFilters function", () => {
    const mockSetTaskFilters = jest.fn();
    (useAppStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        tasks: {
          tasks: [],
          filters: {
            categories: [],
            priorities: [],
            showCompleted: false,
          },
          selectedCategory: null,
        },
        setTaskFilters: mockSetTaskFilters,
        setSelectedCategory: jest.fn(),
      })
    );

    const { result } = renderHook(() => useTasks());

    act(() => {
      result.current.setTaskFilters({ showCompleted: true });
    });

    expect(mockSetTaskFilters).toHaveBeenCalledWith({ showCompleted: true });
  });

  it("provides setSelectedCategory function", () => {
    const mockSetSelectedCategory = jest.fn();
    (useAppStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        tasks: {
          tasks: [],
          filters: {
            categories: [],
            priorities: [],
            showCompleted: false,
          },
          selectedCategory: null,
        },
        setTaskFilters: jest.fn(),
        setSelectedCategory: mockSetSelectedCategory,
      })
    );

    const { result } = renderHook(() => useTasks());

    act(() => {
      result.current.setSelectedCategory("work");
    });

    expect(mockSetSelectedCategory).toHaveBeenCalledWith("work");
  });

  it("filters by date range", () => {
    (useAppStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        tasks: {
          tasks: mockTasks,
          filters: {
            categories: [],
            priorities: [],
            showCompleted: false,
            dateRange: {
              start: new Date("2024-01-15"),
              end: new Date("2024-01-16"),
            },
          },
          selectedCategory: null,
        },
        setTaskFilters: jest.fn(),
        setSelectedCategory: jest.fn(),
      })
    );

    const { result } = renderHook(() => useTasks());
    expect(result.current.tasks.length).toBeLessThanOrEqual(2);
  });

  it("handles empty task list", () => {
    (useAppStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        tasks: {
          tasks: [],
          filters: {
            categories: [],
            priorities: [],
            showCompleted: false,
          },
          selectedCategory: null,
        },
        setTaskFilters: jest.fn(),
        setSelectedCategory: jest.fn(),
      })
    );

    const { result } = renderHook(() => useTasks());

    expect(result.current.tasks).toHaveLength(0);
    expect(result.current.overdueTasks).toHaveLength(0);
    expect(result.current.todayTasks).toHaveLength(0);
    expect(result.current.upcomingTasks).toHaveLength(0);
    expect(result.current.stats.total).toBe(0);
  });

  it("returns loading state", () => {
    const { result } = renderHook(() => useTasks());
    expect(typeof result.current.loading).toBe("boolean");
  });

  it("returns current filters", () => {
    const { result } = renderHook(() => useTasks());
    expect(result.current.filters).toBeDefined();
    expect(result.current.filters.showCompleted).toBe(false);
  });

  it("returns selected category", () => {
    const { result } = renderHook(() => useTasks());
    expect(result.current.selectedCategory).toBeNull();
  });

  it("calculates completion rate correctly", () => {
    (useAppStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        tasks: {
          tasks: [
            createMockTask({ id: "1", isCompleted: true }),
            createMockTask({ id: "2", isCompleted: true }),
            createMockTask({ id: "3", isCompleted: false }),
          ],
          filters: {
            categories: [],
            priorities: [],
            showCompleted: true,
          },
          selectedCategory: null,
        },
        setTaskFilters: jest.fn(),
        setSelectedCategory: jest.fn(),
      })
    );

    const { result } = renderHook(() => useTasks());
    expect(result.current.stats.completionRate).toBe(67); // 2/3 rounded
  });

  it("handles tasks without due dates", () => {
    (useAppStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        tasks: {
          tasks: [
            createMockTask({
              id: "no-date",
              dueDate: undefined,
              isCompleted: false,
            }),
          ],
          filters: {
            categories: [],
            priorities: [],
            showCompleted: false,
          },
          selectedCategory: null,
        },
        setTaskFilters: jest.fn(),
        setSelectedCategory: jest.fn(),
      })
    );

    const { result } = renderHook(() => useTasks());
    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.overdueTasks).toHaveLength(0);
    expect(result.current.todayTasks).toHaveLength(0);
  });
});
