import { addDays, differenceInDays, startOfDay } from "date-fns";

// Configuration constants for infinite scrolling
export const SCROLL_CONFIG = {
  VISIBLE_DAYS: 7,
  BUFFER_DAYS: 7,
  TOTAL_RENDERED: 21, // 7 visible + 7 buffer on each side
  DAY_WIDTH: 200,
  SCROLL_THRESHOLD: 0.3, // 30% into buffer triggers expansion
  SCROLL_THROTTLE_MS: 16, // 60fps
  DAYS_TO_ADD: 7,
} as const;

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Calculate the date range to render based on an anchor date
 * @param anchorDate The center date (usually today or selected date)
 * @param totalDays Total number of days to render (default: 21)
 * @returns DateRange with start and end dates
 */
export function calculateRenderedRange(
  anchorDate: Date,
  totalDays: number = SCROLL_CONFIG.TOTAL_RENDERED
): DateRange {
  const anchor = startOfDay(anchorDate);
  const daysBeforeAnchor = Math.floor((totalDays - 1) / 2);
  const daysAfterAnchor = totalDays - 1 - daysBeforeAnchor;

  return {
    startDate: addDays(anchor, -daysBeforeAnchor),
    endDate: addDays(anchor, daysAfterAnchor),
  };
}

/**
 * Calculate which days are currently visible in the viewport
 * @param scrollLeft Current scroll position
 * @param startDate The first rendered date
 * @param visibleDays Number of days that should be visible (default: 7)
 * @param dayWidth Width of each day column in pixels (default: 200)
 * @returns Array of visible dates
 */
export function calculateVisibleDays(
  scrollLeft: number,
  startDate: Date,
  visibleDays: number = SCROLL_CONFIG.VISIBLE_DAYS,
  dayWidth: number = SCROLL_CONFIG.DAY_WIDTH
): Date[] {
  const firstVisibleDayOffset = Math.floor(scrollLeft / dayWidth);
  const dates: Date[] = [];

  for (let i = 0; i < visibleDays; i++) {
    dates.push(addDays(startDate, firstVisibleDayOffset + i));
  }

  return dates;
}

/**
 * Calculate the scroll position needed to show a specific date
 * @param targetDate The date to scroll to
 * @param renderedStartDate The first rendered date
 * @param visibleDays Number of visible days (default: 7)
 * @param dayWidth Width of each day column in pixels (default: 200)
 * @returns Scroll position in pixels
 */
export function calculateScrollPosition(
  targetDate: Date,
  renderedStartDate: Date,
  visibleDays: number = SCROLL_CONFIG.VISIBLE_DAYS,
  dayWidth: number = SCROLL_CONFIG.DAY_WIDTH
): number {
  const target = startOfDay(targetDate);
  const startDate = startOfDay(renderedStartDate);
  const dayOffset = differenceInDays(target, startDate);

  // Center the target date in the visible area
  const centerOffset = Math.floor((visibleDays - 1) / 2);
  return (dayOffset - centerOffset) * dayWidth;
}

/**
 * Check if we should expand the date range to the left
 * @param scrollLeft Current scroll position
 * @param threshold Threshold percentage (0.3 = 30% into buffer)
 * @returns True if should expand left
 */
export function shouldExpandLeft(
  scrollLeft: number,
  threshold: number = SCROLL_CONFIG.SCROLL_THRESHOLD
): boolean {
  const bufferWidth = SCROLL_CONFIG.BUFFER_DAYS * SCROLL_CONFIG.DAY_WIDTH;
  const triggerPoint = bufferWidth * threshold;
  return scrollLeft < triggerPoint;
}

/**
 * Check if we should expand the date range to the right
 * @param scrollLeft Current scroll position
 * @param totalWidth Total width of scrollable content
 * @param containerWidth Width of the visible container
 * @param threshold Threshold percentage (0.3 = 30% into buffer)
 * @returns True if should expand right
 */
export function shouldExpandRight(
  scrollLeft: number,
  totalWidth: number,
  containerWidth: number,
  threshold: number = SCROLL_CONFIG.SCROLL_THRESHOLD
): boolean {
  const bufferWidth = SCROLL_CONFIG.BUFFER_DAYS * SCROLL_CONFIG.DAY_WIDTH;
  const triggerPoint = bufferWidth * threshold;
  const distanceFromRight = totalWidth - scrollLeft - containerWidth;
  return distanceFromRight < triggerPoint;
}
