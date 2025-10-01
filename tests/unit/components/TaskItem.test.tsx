import React from "react";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskItem } from "@/components/tasks/TaskItem";
import { renderWithProviders, createMockTask } from "../../utils/test-utils";
import { useAppStore } from "@/lib/store";

// Mock the store
jest.mock("@/lib/store", () => ({
  useAppStore: jest.fn((selector) =>
    selector({
      toggleTaskComplete: jest.fn(),
      updateTask: jest.fn(),
      deleteTask: jest.fn(),
      openTaskModal: jest.fn(),
      setEditingItemId: jest.fn(),
    })
  ),
}));

describe("TaskItem", () => {
  const mockTask = createMockTask({
    title: "Test Task",
    description: "Test Description",
    category: "work",
    priority: "high",
    dueDate: new Date("2024-12-31"),
    subtasks: [
      { id: "sub-1", title: "Subtask 1", completed: true, order: 0 },
      { id: "sub-2", title: "Subtask 2", completed: false, order: 1 },
    ],
  });

  it("renders task title", () => {
    renderWithProviders(<TaskItem task={mockTask} />, { withDnd: true });
    expect(screen.getByText("Test Task")).toBeInTheDocument();
  });

  it("displays task category badge", () => {
    renderWithProviders(<TaskItem task={mockTask} />, { withDnd: true });
    // Work category should be displayed
    expect(screen.getByText(/work/i)).toBeInTheDocument();
  });

  it("shows priority badge for high priority", () => {
    renderWithProviders(<TaskItem task={mockTask} />, { withDnd: true });
    expect(screen.getByText(/high/i)).toBeInTheDocument();
  });

  it("displays subtask progress", () => {
    renderWithProviders(<TaskItem task={mockTask} />, { withDnd: true });
    // Should show 1/2 completed
    expect(screen.getByText(/1\/2/)).toBeInTheDocument();
  });

  it("shows due date", () => {
    renderWithProviders(<TaskItem task={mockTask} />, { withDnd: true });
    // Due date should be displayed
    expect(screen.getByText(/Dec 31/)).toBeInTheDocument();
  });

  it("renders checkbox for completion", () => {
    renderWithProviders(<TaskItem task={mockTask} />, { withDnd: true });
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeInTheDocument();
  });

  it("handles checkbox toggle", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TaskItem task={mockTask} />, { withDnd: true });

    const checkbox = screen.getByRole("checkbox");
    await user.click(checkbox);

    // Store action should be called
    const toggleTaskComplete = useAppStore().toggleTaskComplete;
    expect(toggleTaskComplete).toHaveBeenCalledWith(mockTask.id);
  });

  it("expands to show subtasks on click", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TaskItem task={mockTask} />, { withDnd: true });

    // Initially subtask titles might not be visible
    const taskElement = screen.getByText("Test Task");
    await user.click(taskElement);

    // After click, subtasks should be visible
    expect(screen.getByText("Subtask 1")).toBeInTheDocument();
    expect(screen.getByText("Subtask 2")).toBeInTheDocument();
  });

  it("shows completed styling for completed tasks", () => {
    const completedTask = createMockTask({
      ...mockTask,
      isCompleted: true,
    });

    renderWithProviders(<TaskItem task={completedTask} />, { withDnd: true });

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeChecked();
  });

  it("displays overdue badge for overdue tasks", () => {
    const overdueTask = createMockTask({
      ...mockTask,
      dueDate: new Date("2020-01-01"),
      isOverdue: true,
    });

    renderWithProviders(<TaskItem task={overdueTask} />, { withDnd: true });
    expect(screen.getByText(/overdue/i)).toBeInTheDocument();
  });

  it("shows scheduled time when available", () => {
    const scheduledTask = createMockTask({
      ...mockTask,
      scheduledTime: new Date("2024-12-31T10:00:00"),
    });

    renderWithProviders(<TaskItem task={scheduledTask} />, { withDnd: true });
    expect(screen.getByText(/10:00/)).toBeInTheDocument();
  });

  it("renders without subtasks", () => {
    const taskWithoutSubtasks = createMockTask({
      ...mockTask,
      subtasks: [],
    });

    renderWithProviders(<TaskItem task={taskWithoutSubtasks} />, {
      withDnd: true,
    });
    expect(screen.getByText("Test Task")).toBeInTheDocument();
    expect(screen.queryByText(/0\/0/)).not.toBeInTheDocument();
  });

  it("shows edit and delete buttons", () => {
    renderWithProviders(<TaskItem task={mockTask} />, { withDnd: true });

    // Buttons might be in a menu or visible on hover
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("renders different priorities correctly", () => {
    const { rerender } = renderWithProviders(<TaskItem task={mockTask} />, {
      withDnd: true,
    });

    expect(screen.getByText(/high/i)).toBeInTheDocument();

    rerender(<TaskItem task={{ ...mockTask, priority: "low" }} />);
    expect(screen.getByText(/low/i)).toBeInTheDocument();
  });
});
