// User types
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Category types
export type CategoryType = "work" | "family" | "personal" | "travel";

export interface Category {
  id: string;
  name: string;
  color: CategoryType;
  icon?: string;
  userId: string;
}

// Task types
export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  order: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  category: CategoryType;
  dueDate?: Date;
  scheduledTime?: Date;
  subtasks: Subtask[];
  isOverdue: boolean;
  isCompleted: boolean;
  priority?: "low" | "medium" | "high";
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Event types
export interface Attendee {
  id: string;
  name: string;
  email: string;
  status: "pending" | "accepted" | "declined";
}

export type CalendarSource = "google" | "outlook" | "apple" | "manual";

export interface Event {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  category: CategoryType;
  location?: string;
  attendees: Attendee[];
  isShared: boolean;
  calendarSource: CalendarSource;
  externalId?: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Integration types
export interface CalendarIntegration {
  id: string;
  userId: string;
  provider: "google" | "outlook" | "apple";
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskIntegration {
  id: string;
  userId: string;
  provider: "todoist" | "notion" | "asana";
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Shared event types
export interface SharedEvent {
  id: string;
  eventId: string;
  sharedWithUserId: string;
  permissions: "view" | "edit";
  createdAt: Date;
}

// View types
export type ViewMode = "day" | "week" | "month";

// Filter types
export interface TaskFilters {
  categories: CategoryType[];
  priorities: ("low" | "medium" | "high")[];
  showCompleted: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

// Time block types (for calendar view)
export interface TimeBlock {
  id: string;
  type: "task" | "event";
  data: Task | Event;
  startTime: Date;
  endTime: Date;
  duration: number; // in minutes
}
