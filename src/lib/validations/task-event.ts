import { z } from "zod";

// Category enum
export const categorySchema = z.enum(["work", "family", "personal", "travel"], {
  errorMap: () => ({ message: "Please select a valid category" }),
});

// Priority enum
export const prioritySchema = z.enum(["low", "medium", "high"], {
  errorMap: () => ({ message: "Please select a valid priority" }),
});

// Calendar source enum
export const calendarSourceSchema = z.enum(
  ["google", "outlook", "apple", "manual"],
  {
    errorMap: () => ({ message: "Please select a valid calendar source" }),
  }
);

// Subtask schema
export const subtaskSchema = z.object({
  id: z.string(),
  title: z
    .string()
    .min(1, "Subtask cannot be empty")
    .max(100, "Subtask must be less than 100 characters"),
  completed: z.boolean(),
  order: z.number().int().nonnegative(),
});

// Attendee schema
export const attendeeSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  status: z.enum(["pending", "accepted", "declined"]),
});

// Task creation/edit schema
export const taskFormSchema = z
  .object({
    title: z
      .string()
      .min(1, "Title is required")
      .max(100, "Title must be less than 100 characters"),
    description: z
      .string()
      .max(500, "Description must be less than 500 characters")
      .optional()
      .or(z.literal("")),
    category: categorySchema,
    priority: prioritySchema,
    dueDate: z.date().optional().nullable(),
    scheduledTime: z.date().optional().nullable(),
    duration: z
      .number()
      .int()
      .positive("Duration must be positive")
      .max(1440, "Duration cannot exceed 24 hours"),
    subtasks: z
      .array(subtaskSchema)
      .max(20, "Cannot have more than 20 subtasks"),
  })
  .refine(
    (data) => {
      // If scheduledTime is set, it should be before or same as dueDate
      if (data.scheduledTime && data.dueDate) {
        return data.scheduledTime <= data.dueDate;
      }
      return true;
    },
    {
      message: "Scheduled time must be before or same as due date",
      path: ["scheduledTime"],
    }
  )
  .refine(
    (data) => {
      // If both scheduledTime and duration are set, calculate end time
      if (data.scheduledTime && data.duration) {
        const endTime = new Date(
          data.scheduledTime.getTime() + data.duration * 60000
        );
        // End time should be reasonable (not more than 24 hours from start)
        const hoursDiff =
          (endTime.getTime() - data.scheduledTime.getTime()) / (1000 * 60 * 60);
        return hoursDiff <= 24;
      }
      return true;
    },
    {
      message: "Task duration is too long",
      path: ["duration"],
    }
  );

// Event creation/edit schema
export const eventFormSchema = z
  .object({
    title: z
      .string()
      .min(1, "Title is required")
      .max(100, "Title must be less than 100 characters"),
    description: z
      .string()
      .max(500, "Description must be less than 500 characters")
      .optional()
      .or(z.literal("")),
    category: categorySchema,
    startTime: z.date({
      required_error: "Start date and time is required",
      invalid_type_error: "Invalid start date",
    }),
    endTime: z.date({
      required_error: "End date and time is required",
      invalid_type_error: "Invalid end date",
    }),
    location: z
      .string()
      .max(200, "Location must be less than 200 characters")
      .optional()
      .or(z.literal("")),
    attendees: z.array(attendeeSchema),
    calendarSource: calendarSourceSchema,
    isShared: z.boolean(),
  })
  .refine(
    (data) => {
      // End time must be after start time
      return data.endTime > data.startTime;
    },
    {
      message: "End time must be after start time",
      path: ["endTime"],
    }
  )
  .refine(
    (data) => {
      // Event duration should be reasonable (not more than 7 days)
      const durationMs = data.endTime.getTime() - data.startTime.getTime();
      const durationDays = durationMs / (1000 * 60 * 60 * 24);
      return durationDays <= 7;
    },
    {
      message: "Event duration cannot exceed 7 days",
      path: ["endTime"],
    }
  )
  .refine(
    (data) => {
      // Minimum duration should be at least 1 minute
      const durationMs = data.endTime.getTime() - data.startTime.getTime();
      const durationMinutes = durationMs / (1000 * 60);
      return durationMinutes >= 1;
    },
    {
      message: "Event must be at least 1 minute long",
      path: ["endTime"],
    }
  );

// Quick add schema (simplified)
export const quickAddSchema = z.object({
  input: z
    .string()
    .min(1, "Please enter a task or event")
    .max(200, "Input is too long"),
});

// Export types inferred from schemas
export type TaskFormValues = z.infer<typeof taskFormSchema>;
export type EventFormValues = z.infer<typeof eventFormSchema>;
export type QuickAddValues = z.infer<typeof quickAddSchema>;
export type SubtaskFormValues = z.infer<typeof subtaskSchema>;
export type AttendeeFormValues = z.infer<typeof attendeeSchema>;

// Helper function to validate task data
export function validateTask(data: unknown) {
  return taskFormSchema.safeParse(data);
}

// Helper function to validate event data
export function validateEvent(data: unknown) {
  return eventFormSchema.safeParse(data);
}

// Helper function to calculate duration from start and end times
export function calculateDuration(startTime: Date, endTime: Date): number {
  const durationMs = endTime.getTime() - startTime.getTime();
  return Math.round(durationMs / (1000 * 60)); // Return duration in minutes
}

// Helper function to calculate end time from start time and duration
export function calculateEndTime(
  startTime: Date,
  durationMinutes: number
): Date {
  return new Date(startTime.getTime() + durationMinutes * 60000);
}
