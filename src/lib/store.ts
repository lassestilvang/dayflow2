import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type {
  Task,
  Event,
  CategoryType,
  ViewMode,
  TaskFilters,
  Subtask,
} from "@/types";
import { checkTimeConflict, type ConflictInfo } from "./conflict-detection";

interface UIState {
  theme: "light" | "dark" | "system";
  sidebarOpen: boolean;
  taskSidebarOpen: boolean;
  loading: boolean;
  error: string | null;
  selectedTaskId: string | null;
}

interface ModalState {
  taskModalOpen: boolean;
  eventModalOpen: boolean;
  quickAddModalOpen: boolean;
  editingItemId: string | null;
  prefilledData: Partial<Task | Event> | null;
}

interface TaskState {
  tasks: Task[];
  filters: TaskFilters;
  selectedCategory: CategoryType | null;
}

interface EventState {
  events: Event[];
  selectedDate: Date;
  viewMode: ViewMode;
}

interface DragState {
  isDragging: boolean;
  draggedItem: { id: string; type: "task" | "event" } | null;
  dragOverSlot: { date: Date; hour: number } | null;
}

interface AppState {
  // UI State
  ui: UIState;
  setTheme: (theme: "light" | "dark" | "system") => void;
  toggleSidebar: () => void;
  toggleTaskSidebar: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedTaskId: (taskId: string | null) => void;

  // Modal State
  modals: ModalState;
  openTaskModal: (data?: Partial<Task>) => void;
  openEventModal: (data?: Partial<Event>) => void;
  openQuickAddModal: () => void;
  closeModals: () => void;
  setEditingItemId: (id: string | null) => void;

  // Task State
  tasks: TaskState;
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTaskComplete: (id: string) => void;
  updateSubtask: (
    taskId: string,
    subtaskId: string,
    updates: Partial<Subtask>
  ) => void;
  scheduleTask: (
    taskId: string,
    scheduledTime: Date,
    dueDate?: Date
  ) => { success: boolean; conflict?: ConflictInfo };
  setTaskFilters: (filters: Partial<TaskFilters>) => void;
  setSelectedCategory: (category: CategoryType | null) => void;

  // Event State
  events: EventState;
  setEvents: (events: Event[]) => void;
  addEvent: (event: Event) => void;
  updateEvent: (id: string, updates: Partial<Event>) => void;
  deleteEvent: (id: string) => void;
  setSelectedDate: (date: Date) => void;
  setViewMode: (viewMode: ViewMode) => void;
  moveEvent: (
    eventId: string,
    newStartTime: Date,
    newEndTime: Date
  ) => { success: boolean; conflict?: ConflictInfo };

  // Drag State
  drag: DragState;
  setDragging: (isDragging: boolean) => void;
  setDraggedItem: (item: { id: string; type: "task" | "event" } | null) => void;
  setDragOverSlot: (slot: { date: Date; hour: number } | null) => void;

  // Conflict Detection
  checkConflicts: (
    startTime: Date,
    endTime: Date,
    excludeId?: string
  ) => ConflictInfo;
}

// Helper function to create dates relative to today
const today = new Date();
const getDate = (dayOffset: number, hour: number, minute: number = 0) => {
  const date = new Date(today);
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date;
};

// Sample Events
const sampleEvents: Event[] = [
  {
    id: "event-1",
    title: "Team Standup",
    description: "Daily team sync meeting",
    startTime: getDate(0, 9, 0),
    endTime: getDate(0, 9, 30),
    category: "work",
    location: "Zoom",
    attendees: [
      {
        id: "att-1",
        name: "John Doe",
        email: "john@example.com",
        status: "accepted",
      },
      {
        id: "att-2",
        name: "Sara Smith",
        email: "sara@example.com",
        status: "accepted",
      },
    ],
    isShared: true,
    calendarSource: "google",
    userId: "user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "event-2",
    title: "Product Review",
    description: "Q4 product roadmap discussion",
    startTime: getDate(0, 14, 0),
    endTime: getDate(0, 15, 30),
    category: "work",
    location: "Conference Room B",
    attendees: [
      {
        id: "att-3",
        name: "Mike Johnson",
        email: "mike@example.com",
        status: "pending",
      },
    ],
    isShared: true,
    calendarSource: "google",
    userId: "user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "event-3",
    title: "Lunch with Sarah",
    description: "Catch up over lunch",
    startTime: getDate(1, 12, 0),
    endTime: getDate(1, 13, 0),
    category: "personal",
    location: "Downtown Cafe",
    attendees: [],
    isShared: false,
    calendarSource: "manual",
    userId: "user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "event-4",
    title: "Family Dinner",
    description: "Weekly family gathering",
    startTime: getDate(2, 18, 0),
    endTime: getDate(2, 20, 0),
    category: "family",
    location: "Home",
    attendees: [],
    isShared: false,
    calendarSource: "manual",
    userId: "user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "event-5",
    title: "Gym Session",
    description: "Personal training",
    startTime: getDate(3, 7, 0),
    endTime: getDate(3, 8, 0),
    category: "personal",
    location: "Fitness Center",
    attendees: [],
    isShared: false,
    calendarSource: "manual",
    userId: "user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "event-6",
    title: "Client Presentation",
    description: "Present new designs to client",
    startTime: getDate(4, 10, 0),
    endTime: getDate(4, 11, 30),
    category: "work",
    location: "Client Office",
    attendees: [
      {
        id: "att-4",
        name: "Client Team",
        email: "client@example.com",
        status: "accepted",
      },
    ],
    isShared: true,
    calendarSource: "google",
    userId: "user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "event-7",
    title: "Flight to NYC",
    description: "Business trip to New York",
    startTime: getDate(5, 15, 0),
    endTime: getDate(5, 18, 0),
    category: "travel",
    location: "Airport",
    attendees: [],
    isShared: false,
    calendarSource: "manual",
    userId: "user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "event-8",
    title: "Kids Soccer Game",
    description: "Weekend soccer match",
    startTime: getDate(6, 10, 0),
    endTime: getDate(6, 11, 30),
    category: "family",
    location: "Community Park",
    attendees: [],
    isShared: false,
    calendarSource: "manual",
    userId: "user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Sample Tasks - Enhanced with more variety
const sampleTasks: Task[] = [
  {
    id: "task-1",
    title: "Complete Q4 Report",
    description: "Finalize quarterly business review",
    category: "work",
    dueDate: getDate(0, 17, 0),
    scheduledTime: getDate(0, 16, 0),
    subtasks: [
      { id: "sub-1", title: "Gather metrics", completed: true, order: 1 },
      { id: "sub-2", title: "Write summary", completed: false, order: 2 },
      { id: "sub-3", title: "Create slides", completed: false, order: 3 },
    ],
    isOverdue: false,
    isCompleted: false,
    priority: "high",
    userId: "user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "task-2",
    title: "Review Pull Requests",
    description: "Code review for team members",
    category: "work",
    dueDate: getDate(0, 23, 59),
    scheduledTime: getDate(0, 11, 0),
    subtasks: [],
    isOverdue: false,
    isCompleted: false,
    priority: "medium",
    userId: "user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "task-3",
    title: "Buy Groceries",
    description: "Weekly grocery shopping",
    category: "personal",
    dueDate: getDate(1, 23, 59),
    subtasks: [
      { id: "sub-4", title: "Make shopping list", completed: true, order: 1 },
      { id: "sub-5", title: "Go to store", completed: false, order: 2 },
    ],
    isOverdue: false,
    isCompleted: false,
    priority: "low",
    userId: "user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "task-4",
    title: "Plan Birthday Party",
    description: "Organize daughter's birthday celebration",
    category: "family",
    dueDate: getDate(3, 23, 59),
    subtasks: [
      { id: "sub-6", title: "Book venue", completed: false, order: 1 },
      { id: "sub-7", title: "Send invitations", completed: false, order: 2 },
      { id: "sub-8", title: "Order cake", completed: false, order: 3 },
    ],
    isOverdue: false,
    isCompleted: false,
    priority: "high",
    userId: "user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "task-5",
    title: "Submit Expense Report",
    description: "Business expenses from last month",
    category: "work",
    dueDate: getDate(-2, 23, 59),
    subtasks: [],
    isOverdue: true,
    isCompleted: false,
    priority: "high",
    userId: "user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "task-6",
    title: "Update Portfolio",
    description: "Add recent projects to portfolio website",
    category: "personal",
    dueDate: getDate(7, 23, 59),
    subtasks: [
      { id: "sub-9", title: "Select projects", completed: true, order: 1 },
      { id: "sub-10", title: "Write descriptions", completed: false, order: 2 },
      { id: "sub-11", title: "Update website", completed: false, order: 3 },
    ],
    isOverdue: false,
    isCompleted: false,
    priority: "medium",
    userId: "user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "task-7",
    title: "Book Hotel for NYC",
    description: "Reserve accommodation for business trip",
    category: "travel",
    dueDate: getDate(2, 23, 59),
    scheduledTime: getDate(2, 15, 0),
    subtasks: [],
    isOverdue: false,
    isCompleted: false,
    priority: "high",
    userId: "user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "task-8",
    title: "Call Mom",
    description: "Weekly check-in call",
    category: "family",
    dueDate: getDate(0, 23, 59),
    subtasks: [],
    isOverdue: false,
    isCompleted: false,
    priority: "medium",
    userId: "user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "task-9",
    title: "Renew Passport",
    description: "Passport expires next month - renew before trip",
    category: "travel",
    dueDate: getDate(4, 23, 59),
    subtasks: [
      { id: "sub-12", title: "Get passport photos", completed: true, order: 1 },
      {
        id: "sub-13",
        title: "Fill out application",
        completed: false,
        order: 2,
      },
      {
        id: "sub-14",
        title: "Submit at post office",
        completed: false,
        order: 3,
      },
    ],
    isOverdue: false,
    isCompleted: false,
    priority: "high",
    userId: "user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "task-10",
    title: "Design New Feature",
    description: "Create mockups for the new dashboard feature",
    category: "work",
    dueDate: getDate(5, 23, 59),
    subtasks: [
      {
        id: "sub-15",
        title: "Research competitors",
        completed: true,
        order: 1,
      },
      { id: "sub-16", title: "Sketch wireframes", completed: true, order: 2 },
      {
        id: "sub-17",
        title: "Create high-fidelity mockups",
        completed: false,
        order: 3,
      },
      {
        id: "sub-18",
        title: "Get stakeholder feedback",
        completed: false,
        order: 4,
      },
    ],
    isOverdue: false,
    isCompleted: false,
    priority: "medium",
    userId: "user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "task-11",
    title: "Gym Membership Renewal",
    description: "Renew annual gym membership",
    category: "personal",
    dueDate: getDate(-1, 23, 59),
    subtasks: [],
    isOverdue: true,
    isCompleted: false,
    priority: "low",
    userId: "user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "task-12",
    title: "Organize Family Photos",
    description: "Sort and back up family photos from vacation",
    category: "family",
    dueDate: getDate(6, 23, 59),
    subtasks: [
      {
        id: "sub-19",
        title: "Download photos from camera",
        completed: false,
        order: 1,
      },
      {
        id: "sub-20",
        title: "Organize into albums",
        completed: false,
        order: 2,
      },
      {
        id: "sub-21",
        title: "Upload to cloud storage",
        completed: false,
        order: 3,
      },
    ],
    isOverdue: false,
    isCompleted: false,
    priority: "low",
    userId: "user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "task-13",
    title: "Prepare Tax Documents",
    description: "Gather documents for tax filing (recurring annually)",
    category: "personal",
    dueDate: getDate(10, 23, 59),
    subtasks: [
      { id: "sub-22", title: "Collect W-2 forms", completed: false, order: 1 },
      { id: "sub-23", title: "Gather receipts", completed: false, order: 2 },
      {
        id: "sub-24",
        title: "Schedule accountant meeting",
        completed: false,
        order: 3,
      },
    ],
    isOverdue: false,
    isCompleted: false,
    priority: "medium",
    userId: "user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "task-14",
    title: "Weekly Team Lunch",
    description: "Organize team lunch this Friday (recurring weekly)",
    category: "work",
    dueDate: getDate(4, 23, 59),
    subtasks: [],
    isOverdue: false,
    isCompleted: false,
    priority: "low",
    userId: "user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "task-15",
    title: "Research Flight Options",
    description: "Compare flights for NYC business trip",
    category: "travel",
    dueDate: getDate(1, 23, 59),
    scheduledTime: getDate(1, 14, 0),
    subtasks: [],
    isOverdue: false,
    isCompleted: false,
    priority: "high",
    userId: "user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "task-16",
    title: "Completed Task Example",
    description: "This task is already completed",
    category: "work",
    dueDate: getDate(-3, 23, 59),
    subtasks: [
      { id: "sub-25", title: "First step", completed: true, order: 1 },
      { id: "sub-26", title: "Second step", completed: true, order: 2 },
    ],
    isOverdue: false,
    isCompleted: true,
    priority: "medium",
    userId: "user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial UI State
        ui: {
          theme: "system",
          sidebarOpen: true,
          taskSidebarOpen: true,
          loading: false,
          error: null,
          selectedTaskId: null,
        },
        setTheme: (theme) =>
          set((state) => ({
            ui: { ...state.ui, theme },
          })),
        toggleSidebar: () =>
          set((state) => ({
            ui: { ...state.ui, sidebarOpen: !state.ui.sidebarOpen },
          })),
        toggleTaskSidebar: () =>
          set((state) => ({
            ui: { ...state.ui, taskSidebarOpen: !state.ui.taskSidebarOpen },
          })),
        setLoading: (loading) =>
          set((state) => ({
            ui: { ...state.ui, loading },
          })),
        setError: (error) =>
          set((state) => ({
            ui: { ...state.ui, error },
          })),
        setSelectedTaskId: (taskId) =>
          set((state) => ({
            ui: { ...state.ui, selectedTaskId: taskId },
          })),

        // Initial Modal State
        modals: {
          taskModalOpen: false,
          eventModalOpen: false,
          quickAddModalOpen: false,
          editingItemId: null,
          prefilledData: null,
        },
        openTaskModal: (data) =>
          set((state) => ({
            modals: {
              ...state.modals,
              taskModalOpen: true,
              eventModalOpen: false,
              quickAddModalOpen: false,
              prefilledData: data || null,
              editingItemId: null,
            },
          })),
        openEventModal: (data) =>
          set((state) => ({
            modals: {
              ...state.modals,
              eventModalOpen: true,
              taskModalOpen: false,
              quickAddModalOpen: false,
              prefilledData: data || null,
              editingItemId: null,
            },
          })),
        openQuickAddModal: () =>
          set((state) => ({
            modals: {
              ...state.modals,
              quickAddModalOpen: true,
              taskModalOpen: false,
              eventModalOpen: false,
              prefilledData: null,
              editingItemId: null,
            },
          })),
        closeModals: () =>
          set((state) => ({
            modals: {
              ...state.modals,
              taskModalOpen: false,
              eventModalOpen: false,
              quickAddModalOpen: false,
              prefilledData: null,
              editingItemId: null,
            },
          })),
        setEditingItemId: (id) =>
          set((state) => ({
            modals: {
              ...state.modals,
              editingItemId: id,
            },
          })),

        // Initial Task State with sample data
        tasks: {
          tasks: sampleTasks,
          filters: {
            categories: [],
            priorities: [],
            showCompleted: false,
          },
          selectedCategory: null,
        },
        setTasks: (tasks) =>
          set((state) => ({
            tasks: { ...state.tasks, tasks },
          })),
        addTask: (task) =>
          set((state) => ({
            tasks: {
              ...state.tasks,
              tasks: [...state.tasks.tasks, task],
            },
          })),
        updateTask: (id, updates) =>
          set((state) => ({
            tasks: {
              ...state.tasks,
              tasks: state.tasks.tasks.map((task) =>
                task.id === id
                  ? { ...task, ...updates, updatedAt: new Date() }
                  : task
              ),
            },
          })),
        deleteTask: (id) =>
          set((state) => ({
            tasks: {
              ...state.tasks,
              tasks: state.tasks.tasks.filter((task) => task.id !== id),
            },
          })),
        toggleTaskComplete: (id) =>
          set((state) => ({
            tasks: {
              ...state.tasks,
              tasks: state.tasks.tasks.map((task) =>
                task.id === id
                  ? {
                      ...task,
                      isCompleted: !task.isCompleted,
                      updatedAt: new Date(),
                    }
                  : task
              ),
            },
          })),
        updateSubtask: (taskId, subtaskId, updates) =>
          set((state) => ({
            tasks: {
              ...state.tasks,
              tasks: state.tasks.tasks.map((task) =>
                task.id === taskId
                  ? {
                      ...task,
                      subtasks: task.subtasks.map((subtask) =>
                        subtask.id === subtaskId
                          ? { ...subtask, ...updates }
                          : subtask
                      ),
                      updatedAt: new Date(),
                    }
                  : task
              ),
            },
          })),
        scheduleTask: (taskId, scheduledTime, dueDate) => {
          const state = get();
          const task = state.tasks.tasks.find((t) => t.id === taskId);

          if (!task) {
            return { success: false };
          }

          // Calculate end time (use dueDate or default to 1 hour)
          const endTime =
            dueDate || new Date(scheduledTime.getTime() + 60 * 60 * 1000);

          // Check for conflicts
          const conflict = state.checkConflicts(scheduledTime, endTime, taskId);

          // Always allow scheduling but return conflict info
          set((state) => ({
            tasks: {
              ...state.tasks,
              tasks: state.tasks.tasks.map((t) =>
                t.id === taskId
                  ? {
                      ...t,
                      scheduledTime,
                      dueDate: dueDate || t.dueDate,
                      updatedAt: new Date(),
                    }
                  : t
              ),
            },
          }));

          return {
            success: true,
            conflict: conflict.hasConflict ? conflict : undefined,
          };
        },
        setTaskFilters: (filters) =>
          set((state) => ({
            tasks: {
              ...state.tasks,
              filters: { ...state.tasks.filters, ...filters },
            },
          })),
        setSelectedCategory: (category) =>
          set((state) => ({
            tasks: { ...state.tasks, selectedCategory: category },
          })),

        // Initial Event State with sample data
        events: {
          events: sampleEvents,
          selectedDate: new Date(),
          viewMode: "week",
        },
        setEvents: (events) =>
          set((state) => ({
            events: { ...state.events, events },
          })),
        addEvent: (event) =>
          set((state) => ({
            events: {
              ...state.events,
              events: [...state.events.events, event],
            },
          })),
        updateEvent: (id, updates) =>
          set((state) => ({
            events: {
              ...state.events,
              events: state.events.events.map((event) =>
                event.id === id ? { ...event, ...updates } : event
              ),
            },
          })),
        deleteEvent: (id) =>
          set((state) => ({
            events: {
              ...state.events,
              events: state.events.events.filter((event) => event.id !== id),
            },
          })),
        setSelectedDate: (date) =>
          set((state) => ({
            events: { ...state.events, selectedDate: date },
          })),
        setViewMode: (viewMode) =>
          set((state) => ({
            events: { ...state.events, viewMode },
          })),
        moveEvent: (eventId, newStartTime, newEndTime) => {
          const state = get();
          const event = state.events.events.find((e) => e.id === eventId);

          if (!event) {
            return { success: false };
          }

          // Check for conflicts
          const conflict = state.checkConflicts(
            newStartTime,
            newEndTime,
            eventId
          );

          // Always allow moving but return conflict info
          set((state) => ({
            events: {
              ...state.events,
              events: state.events.events.map((e) =>
                e.id === eventId
                  ? {
                      ...e,
                      startTime: newStartTime,
                      endTime: newEndTime,
                      updatedAt: new Date(),
                    }
                  : e
              ),
            },
          }));

          return {
            success: true,
            conflict: conflict.hasConflict ? conflict : undefined,
          };
        },

        // Drag State
        drag: {
          isDragging: false,
          draggedItem: null,
          dragOverSlot: null,
        },
        setDragging: (isDragging) =>
          set((state) => ({
            drag: { ...state.drag, isDragging },
          })),
        setDraggedItem: (item) =>
          set((state) => ({
            drag: { ...state.drag, draggedItem: item },
          })),
        setDragOverSlot: (slot) =>
          set((state) => ({
            drag: { ...state.drag, dragOverSlot: slot },
          })),

        // Conflict Detection
        checkConflicts: (startTime, endTime, excludeId) => {
          const state = get();
          return checkTimeConflict(
            startTime,
            endTime,
            state.events.events,
            state.tasks.tasks,
            excludeId
          );
        },
      }),
      {
        name: "dayflow-storage",
        partialize: (state) => ({
          ui: { theme: state.ui.theme, sidebarOpen: state.ui.sidebarOpen },
          events: { viewMode: state.events.viewMode },
        }),
      }
    )
  )
);
