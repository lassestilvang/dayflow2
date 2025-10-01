import type { Event, Task } from "@/types";
import { isWithinInterval, areIntervalsOverlapping } from "date-fns";

export interface ConflictInfo {
  hasConflict: boolean;
  conflictingEvents: (Event | Task)[];
  suggestions: string[];
}

/**
 * Check if two time intervals overlap
 */
export function doIntervalsOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  try {
    return areIntervalsOverlapping(
      { start: start1, end: end1 },
      { start: start2, end: end2 },
      { inclusive: false } // Exclusive boundaries - events touching at edges don't conflict
    );
  } catch {
    return false;
  }
}

/**
 * Check if a new event/task would conflict with existing events
 */
export function checkTimeConflict(
  newStartTime: Date,
  newEndTime: Date,
  existingEvents: Event[],
  existingTasks: Task[],
  excludeId?: string // ID to exclude (for rescheduling existing items)
): ConflictInfo {
  const conflicts: (Event | Task)[] = [];

  // Safety check: handle undefined/null arrays
  const safeEvents = existingEvents || [];
  const safeTasks = existingTasks || [];

  // Check conflicts with events
  for (const event of safeEvents) {
    if (excludeId && event.id === excludeId) continue;

    if (
      doIntervalsOverlap(
        newStartTime,
        newEndTime,
        event.startTime,
        event.endTime
      )
    ) {
      conflicts.push(event);
    }
  }

  // Check conflicts with scheduled tasks
  for (const task of safeTasks) {
    if (excludeId && task.id === excludeId) continue;

    if (task.scheduledTime && task.dueDate) {
      const taskEnd = task.dueDate;
      if (
        doIntervalsOverlap(
          newStartTime,
          newEndTime,
          task.scheduledTime,
          taskEnd
        )
      ) {
        conflicts.push(task);
      }
    } else if (task.scheduledTime) {
      // Assume 1-hour duration if no end time
      const taskEnd = new Date(task.scheduledTime);
      taskEnd.setHours(taskEnd.getHours() + 1);
      if (
        doIntervalsOverlap(
          newStartTime,
          newEndTime,
          task.scheduledTime,
          taskEnd
        )
      ) {
        conflicts.push(task);
      }
    }
  }

  // Generate suggestions
  const suggestions = generateConflictSuggestions(
    conflicts,
    newStartTime,
    newEndTime
  );

  return {
    hasConflict: conflicts.length > 0,
    conflictingEvents: conflicts,
    suggestions,
  };
}

/**
 * Generate helpful suggestions for resolving conflicts
 */
function generateConflictSuggestions(
  conflicts: (Event | Task)[],
  _newStartTime: Date,
  _newEndTime: Date
): string[] {
  const suggestions: string[] = [];

  if (conflicts.length === 0) {
    return suggestions;
  }

  if (conflicts.length === 1) {
    const conflict = conflicts[0];
    if (conflict) {
      suggestions.push(`This time slot overlaps with "${conflict.title}"`);
    }
  } else {
    suggestions.push(`This time slot overlaps with ${conflicts.length} events`);
  }

  suggestions.push("You can:");
  suggestions.push("• Schedule anyway (allow overlap)");
  suggestions.push("• Find next available slot");
  suggestions.push("• Choose a different time");

  return suggestions;
}

/**
 * Find the next available time slot after a given time
 */
export function findNextAvailableSlot(
  afterTime: Date,
  durationMinutes: number,
  existingEvents: Event[],
  existingTasks: Task[],
  options?: {
    workingHoursStart?: number; // Hour (0-23)
    workingHoursEnd?: number; // Hour (0-23)
    maxDaysToSearch?: number;
  }
): Date | null {
  const {
    workingHoursStart = 8,
    workingHoursEnd = 18,
    maxDaysToSearch = 7,
  } = options || {};

  const currentTime = new Date(afterTime);
  const endTime = new Date(afterTime);
  endTime.setMinutes(endTime.getMinutes() + durationMinutes);

  // Try each hour for the next N days
  for (let day = 0; day < maxDaysToSearch; day++) {
    for (let hour = workingHoursStart; hour < workingHoursEnd; hour++) {
      const testStartTime = new Date(currentTime);
      testStartTime.setDate(testStartTime.getDate() + day);
      testStartTime.setHours(hour, 0, 0, 0);

      const testEndTime = new Date(testStartTime);
      testEndTime.setMinutes(testEndTime.getMinutes() + durationMinutes);

      // Check if this slot is free
      const conflict = checkTimeConflict(
        testStartTime,
        testEndTime,
        existingEvents,
        existingTasks
      );

      if (!conflict.hasConflict) {
        return testStartTime;
      }
    }
  }

  return null; // No available slot found
}

/**
 * Get all events that occur within a specific time range
 */
export function getEventsInRange(
  startTime: Date,
  endTime: Date,
  events: Event[],
  tasks: Task[]
): (Event | Task)[] {
  const itemsInRange: (Event | Task)[] = [];

  // Check events
  for (const event of events) {
    if (
      isWithinInterval(event.startTime, { start: startTime, end: endTime }) ||
      isWithinInterval(event.endTime, { start: startTime, end: endTime }) ||
      (event.startTime <= startTime && event.endTime >= endTime)
    ) {
      itemsInRange.push(event);
    }
  }

  // Check tasks
  for (const task of tasks) {
    if (task.scheduledTime) {
      const taskEnd =
        task.dueDate || new Date(task.scheduledTime.getTime() + 60 * 60 * 1000);
      if (
        isWithinInterval(task.scheduledTime, {
          start: startTime,
          end: endTime,
        }) ||
        isWithinInterval(taskEnd, { start: startTime, end: endTime }) ||
        (task.scheduledTime <= startTime && taskEnd >= endTime)
      ) {
        itemsInRange.push(task);
      }
    }
  }

  return itemsInRange;
}

/**
 * Calculate the duration of an event or task in minutes
 */
export function calculateDuration(startTime: Date, endTime: Date): number {
  return Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60));
}

/**
 * Format conflict information for display
 */
export function formatConflictMessage(conflict: ConflictInfo): string {
  if (!conflict.hasConflict) {
    return "No conflicts detected";
  }

  const count = conflict.conflictingEvents.length;
  const eventNames = conflict.conflictingEvents
    .slice(0, 3)
    .map((e) => `"${e.title}"`)
    .join(", ");

  if (count === 1) {
    return `Conflicts with ${eventNames}`;
  } else if (count <= 3) {
    return `Conflicts with ${eventNames}`;
  } else {
    return `Conflicts with ${eventNames} and ${count - 3} more`;
  }
}
