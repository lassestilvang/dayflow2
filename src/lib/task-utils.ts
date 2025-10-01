import type { Task, Subtask, CategoryType } from "@/types";
import {
  isBefore,
  startOfDay,
  isToday,
  isTomorrow,
  isThisWeek,
  format,
} from "date-fns";

/**
 * Check if a task is overdue
 */
export function isTaskOverdue(task: Task): boolean {
  if (!task.dueDate || task.isCompleted) return false;
  const today = startOfDay(new Date());
  return isBefore(startOfDay(task.dueDate), today);
}

/**
 * Calculate subtask progress percentage
 */
export function calculateSubtaskProgress(subtasks: Subtask[]): number {
  if (subtasks.length === 0) return 0;
  const completed = subtasks.filter((st) => st.completed).length;
  return Math.round((completed / subtasks.length) * 100);
}

/**
 * Get subtask completion text (e.g., "2/5 completed")
 */
export function getSubtaskProgressText(subtasks: Subtask[]): string {
  const completed = subtasks.filter((st) => st.completed).length;
  return `${completed}/${subtasks.length} completed`;
}

/**
 * Sort tasks by priority (high > medium > low) and then by due date
 */
export function sortTasksByPriority(tasks: Task[]): Task[] {
  const priorityOrder = { high: 0, medium: 1, low: 2 };

  return [...tasks].sort((a, b) => {
    // First sort by priority
    const aPriority = a.priority ? priorityOrder[a.priority] : 3;
    const bPriority = b.priority ? priorityOrder[b.priority] : 3;

    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    // Then sort by due date
    if (a.dueDate && b.dueDate) {
      return a.dueDate.getTime() - b.dueDate.getTime();
    }
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;

    return 0;
  });
}

/**
 * Sort tasks by due date
 */
export function sortTasksByDueDate(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.dueDate && b.dueDate) {
      return a.dueDate.getTime() - b.dueDate.getTime();
    }
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });
}

/**
 * Filter tasks by category
 */
export function filterTasksByCategory(
  tasks: Task[],
  category: CategoryType | null
): Task[] {
  if (!category) return tasks;
  return tasks.filter((task) => task.category === category);
}

/**
 * Filter tasks by completion status
 */
export function filterTasksByCompletion(
  tasks: Task[],
  showCompleted: boolean
): Task[] {
  if (showCompleted) return tasks;
  return tasks.filter((task) => !task.isCompleted);
}

/**
 * Get tasks that are overdue
 */
export function getOverdueTasks(tasks: Task[]): Task[] {
  return tasks.filter((task) => isTaskOverdue(task));
}

/**
 * Get tasks that are due today
 */
export function getTodayTasks(tasks: Task[]): Task[] {
  return tasks.filter((task) => {
    if (!task.dueDate || task.isCompleted) return false;
    return isToday(task.dueDate);
  });
}

/**
 * Get tasks that are due tomorrow
 */
export function getTomorrowTasks(tasks: Task[]): Task[] {
  return tasks.filter((task) => {
    if (!task.dueDate || task.isCompleted) return false;
    return isTomorrow(task.dueDate);
  });
}

/**
 * Get tasks that are due this week
 */
export function getThisWeekTasks(tasks: Task[]): Task[] {
  return tasks.filter((task) => {
    if (!task.dueDate || task.isCompleted) return false;
    return isThisWeek(task.dueDate, { weekStartsOn: 1 }); // Week starts on Monday
  });
}

/**
 * Get unscheduled tasks (inbox)
 */
export function getUnscheduledTasks(tasks: Task[]): Task[] {
  return tasks.filter((task) => !task.scheduledTime && !task.isCompleted);
}

/**
 * Group tasks by date (Today, Tomorrow, This Week, Later, Overdue)
 */
export function groupTasksByDate(tasks: Task[]): Record<string, Task[]> {
  const groups: Record<string, Task[]> = {
    overdue: [],
    today: [],
    tomorrow: [],
    thisWeek: [],
    later: [],
    noDate: [],
  };

  tasks.forEach((task) => {
    if (isTaskOverdue(task)) {
      groups.overdue?.push(task);
    } else if (!task.dueDate) {
      groups.noDate?.push(task);
    } else if (isToday(task.dueDate)) {
      groups.today?.push(task);
    } else if (isTomorrow(task.dueDate)) {
      groups.tomorrow?.push(task);
    } else if (isThisWeek(task.dueDate, { weekStartsOn: 1 })) {
      groups.thisWeek?.push(task);
    } else {
      groups.later?.push(task);
    }
  });

  return groups;
}

/**
 * Get category counts for tasks
 */
export function getCategoryCounts(tasks: Task[]): Record<CategoryType, number> {
  const counts: Record<CategoryType, number> = {
    work: 0,
    family: 0,
    personal: 0,
    travel: 0,
  };

  tasks
    .filter((task) => !task.isCompleted)
    .forEach((task) => {
      counts[task.category]++;
    });

  return counts;
}

/**
 * Generate a unique task ID
 */
export function generateTaskId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a unique subtask ID
 */
export function generateSubtaskId(): string {
  return `subtask-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Format task due date in a human-readable way
 */
export function formatTaskDueDate(dueDate: Date): string {
  if (isToday(dueDate)) return "Today";
  if (isTomorrow(dueDate)) return "Tomorrow";
  if (isThisWeek(dueDate, { weekStartsOn: 1 })) return format(dueDate, "EEEE"); // Day name
  return format(dueDate, "MMM d"); // e.g., "Jan 15"
}

/**
 * Get priority color class
 */
export function getPriorityColor(priority?: "low" | "medium" | "high"): string {
  switch (priority) {
    case "high":
      return "text-red-500 bg-red-500/10";
    case "medium":
      return "text-yellow-500 bg-yellow-500/10";
    case "low":
      return "text-blue-500 bg-blue-500/10";
    default:
      return "text-muted-foreground bg-accent";
  }
}

/**
 * Get category color class
 */
export function getCategoryColor(category: CategoryType): string {
  switch (category) {
    case "work":
      return "bg-blue-500";
    case "family":
      return "bg-green-500";
    case "personal":
      return "bg-orange-500";
    case "travel":
      return "bg-purple-500";
  }
}
