import React, { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { DndContext } from "@dnd-kit/core";
import "@testing-library/jest-dom";
import type {
  Task,
  Event,
  CategoryType,
  Subtask,
  Attendee,
  TimeBlock,
} from "@/types";
import { useAppStore } from "@/lib/store";

// Mock data factories
export const createMockTask = (overrides?: Partial<Task>): Task => ({
  id: "task-1",
  title: "Test Task",
  description: "Test Description",
  category: "work",
  dueDate: new Date("2024-12-31"),
  scheduledTime: undefined,
  subtasks: [],
  isOverdue: false,
  isCompleted: false,
  priority: "medium",
  userId: "user-1",
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockEvent = (overrides?: Partial<Event>): Event => ({
  id: "event-1",
  title: "Test Event",
  description: "Test Event Description",
  startTime: new Date("2024-01-01T09:00:00"),
  endTime: new Date("2024-01-01T10:00:00"),
  category: "work",
  location: "Test Location",
  attendees: [],
  isShared: false,
  calendarSource: "manual",
  userId: "user-1",
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockSubtask = (overrides?: Partial<Subtask>): Subtask => ({
  id: "subtask-1",
  title: "Test Subtask",
  completed: false,
  order: 0,
  ...overrides,
});

export const createMockAttendee = (
  overrides?: Partial<Attendee>
): Attendee => ({
  id: "attendee-1",
  name: "John Doe",
  email: "john@example.com",
  status: "pending",
  ...overrides,
});

export const createMockTimeBlock = (
  overrides?: Partial<TimeBlock>
): TimeBlock => ({
  id: "block-1",
  type: "event",
  data: createMockEvent(),
  startTime: new Date("2024-01-01T09:00:00"),
  endTime: new Date("2024-01-01T10:00:00"),
  duration: 60,
  ...overrides,
});

// Date helpers
export const createDate = (
  dayOffset: number,
  hour: number,
  minute: number = 0
): Date => {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date;
};

export const setMockDate = (date: Date | string) => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(date));
};

export const restoreRealDate = () => {
  jest.useRealTimers();
};

// Store helpers
export const createMockStore = () => ({
  ui: {
    theme: "light" as const,
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
      categories: [] as CategoryType[],
      priorities: [] as ("low" | "medium" | "high")[],
      showCompleted: false,
    },
    selectedCategory: null,
  },
  events: {
    events: [],
    selectedDate: new Date(),
    viewMode: "week" as const,
  },
  drag: {
    isDragging: false,
    draggedItem: null,
    dragOverSlot: null,
  },
});

// Theme Provider Mock
export const MockThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return <div data-testid="theme-provider">{children}</div>;
};

// DnD Provider Mock
export const MockDndProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return <DndContext>{children}</DndContext>;
};

// Custom render with providers
interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  withDnd?: boolean;
  withTheme?: boolean;
}

export function renderWithProviders(
  ui: ReactElement,
  options?: CustomRenderOptions
) {
  const {
    withDnd = false,
    withTheme = false,
    ...renderOptions
  } = options || {};

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    let content = children;

    if (withTheme) {
      content = <MockThemeProvider>{content}</MockThemeProvider>;
    }

    if (withDnd) {
      content = <MockDndProvider>{content}</MockDndProvider>;
    }

    return <>{content}</>;
  };

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// Zustand store testing helpers
export const mockUseAppStore = <T,>(
  selector: (state: ReturnType<typeof createMockStore>) => T,
  returnValue: T
) => {
  const mockStore = useAppStore as unknown as jest.Mock;
  mockStore.mockImplementation(
    (selectorFn: (state: ReturnType<typeof createMockStore>) => T) => {
      if (selectorFn === selector) {
        return returnValue;
      }
      return selectorFn(createMockStore());
    }
  );
};

// Wait for async updates
export const waitForAsync = () =>
  new Promise((resolve) => setTimeout(resolve, 0));

// Mock window.matchMedia with specific query
export const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

// Assert functions
export const expectToBeInDocument = (element: HTMLElement | null) => {
  expect(element).toBeInTheDocument();
};

export const expectNotToBeInDocument = (element: HTMLElement | null) => {
  expect(element).not.toBeInTheDocument();
};

// Re-export everything from React Testing Library
export * from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";
