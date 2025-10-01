import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameDay,
  isToday,
  startOfDay,
  differenceInMinutes,
  addDays,
  addWeeks,
  subWeeks,
  isBefore,
  isAfter,
  areIntervalsOverlapping,
} from "date-fns";
import type { Event, Task, TimeBlock } from "@/types";

/**
 * Get all days in a week starting from Monday
 */
export function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(date, { weekStartsOn: 1 }); // 1 = Monday
  const end = endOfWeek(date, { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end });
}

/**
 * Format time in 12-hour format (e.g., "9:00 AM", "2:30 PM")
 */
export function formatTime(date: Date): string {
  return format(date, "h:mm a");
}

/**
 * Format time in 24-hour format (e.g., "09:00", "14:30")
 */
export function formatTime24(date: Date): string {
  return format(date, "HH:mm");
}

/**
 * Get week range string (e.g., "January 20 - 26" or "Dec 28 - Jan 3")
 */
export function getWeekRangeString(date: Date): string {
  const weekDays = getWeekDays(date);
  const firstDay = weekDays[0];
  const lastDay = weekDays[6];

  const firstMonth = format(firstDay, "MMM");
  const lastMonth = format(lastDay, "MMM");
  const firstDate = format(firstDay, "d");
  const lastDate = format(lastDay, "d");

  if (firstMonth === lastMonth) {
    return `${firstMonth} ${firstDate} - ${lastDate}`;
  } else {
    return `${firstMonth} ${firstDate} - ${lastMonth} ${lastDate}`;
  }
}

/**
 * Calculate position and height for an event in the calendar grid
 * Grid starts at 6 AM and each hour is 60px
 */
export function calculateEventPosition(event: Event | Task): {
  top: number;
  height: number;
} {
  const startTime =
    "startTime" in event ? event.startTime : event.scheduledTime;
  const endTime =
    "endTime" in event
      ? event.endTime
      : event.scheduledTime
      ? new Date(event.scheduledTime.getTime() + 60 * 60 * 1000)
      : new Date();

  if (!startTime || !endTime) {
    return { top: 0, height: 60 };
  }

  const gridStartHour = 6; // 6 AM
  const pixelsPerHour = 60;

  const startHour = startTime.getHours() + startTime.getMinutes() / 60;
  const endHour = endTime.getHours() + endTime.getMinutes() / 60;

  const top = (startHour - gridStartHour) * pixelsPerHour;
  const height = (endHour - startHour) * pixelsPerHour;

  return {
    top: Math.max(0, top),
    height: Math.max(30, height), // Minimum height of 30px
  };
}

/**
 * Check if two time blocks overlap
 */
export function doBlocksOverlap(block1: TimeBlock, block2: TimeBlock): boolean {
  return areIntervalsOverlapping(
    { start: block1.startTime, end: block1.endTime },
    { start: block2.startTime, end: block2.endTime }
  );
}

/**
 * Group overlapping events for proper positioning
 */
export function groupOverlappingBlocks(blocks: TimeBlock[]): TimeBlock[][] {
  if (blocks.length === 0) return [];

  const sorted = [...blocks].sort(
    (a, b) => a.startTime.getTime() - b.startTime.getTime()
  );

  const groups: TimeBlock[][] = [];
  let currentGroup: TimeBlock[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const block = sorted[i];
    const overlaps = currentGroup.some((b) => doBlocksOverlap(b, block));

    if (overlaps) {
      currentGroup.push(block);
    } else {
      groups.push(currentGroup);
      currentGroup = [block];
    }
  }

  groups.push(currentGroup);
  return groups;
}

/**
 * Calculate current time position in the grid (in pixels from top)
 */
export function getCurrentTimePosition(): number {
  const now = new Date();
  const gridStartHour = 6; // 6 AM
  const pixelsPerHour = 60;

  const currentHour = now.getHours() + now.getMinutes() / 60;
  return (currentHour - gridStartHour) * pixelsPerHour;
}

/**
 * Check if a time is in the past
 */
export function isTimePast(date: Date): boolean {
  return isBefore(date, new Date());
}

/**
 * Check if a date is today
 */
export function isDateToday(date: Date): boolean {
  return isToday(date);
}

/**
 * Get time blocks for a specific day
 */
export function getBlocksForDay(blocks: TimeBlock[], day: Date): TimeBlock[] {
  return blocks.filter((block) => isSameDay(block.startTime, day));
}

/**
 * Navigate to next/previous week
 */
export function navigateWeek(
  currentDate: Date,
  direction: "next" | "prev"
): Date {
  return direction === "next"
    ? addWeeks(currentDate, 1)
    : subWeeks(currentDate, 1);
}

/**
 * Navigate to next/previous day
 */
export function navigateDay(
  currentDate: Date,
  direction: "next" | "prev"
): Date {
  return direction === "next"
    ? addDays(currentDate, 1)
    : addDays(currentDate, -1);
}

/**
 * Check if time is within business hours (6 AM - 11 PM)
 */
export function isWithinBusinessHours(date: Date): boolean {
  const hour = date.getHours();
  return hour >= 6 && hour < 23;
}

/**
 * Get hour slots for the calendar (6 AM - 11 PM)
 */
export function getHourSlots(): number[] {
  return Array.from({ length: 17 }, (_, i) => i + 6); // 6 AM to 10 PM (17 hours)
}

/**
 * Create a date at a specific hour on a given day
 */
export function createTimeOnDay(day: Date, hour: number): Date {
  const newDate = new Date(day);
  newDate.setHours(hour, 0, 0, 0);
  return newDate;
}
