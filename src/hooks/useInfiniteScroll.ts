"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { eachDayOfInterval, startOfWeek } from "date-fns";
import {
  SCROLL_CONFIG,
  calculateRenderedRange,
  calculateVisibleDays,
  calculateScrollPosition,
  shouldExpandLeft,
  shouldExpandRight,
} from "@/lib/scroll-utils";

export function useInfiniteScroll() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollLeft, setScrollLeft] = useState(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isExpandingRef = useRef(false);
  const isInitializedRef = useRef(false);

  // Get scroll state and actions from store
  const { renderedDateRange, currentWeekStart } = useAppStore(
    (state) => state.scroll
  );
  const setRenderedDateRange = useAppStore(
    (state) => state.setRenderedDateRange
  );
  const setAnchorDate = useAppStore((state) => state.setAnchorDate);
  const setCurrentWeekStart = useAppStore((state) => state.setCurrentWeekStart);
  const expandDateRangeLeft = useAppStore((state) => state.expandDateRangeLeft);
  const expandDateRangeRight = useAppStore(
    (state) => state.expandDateRangeRight
  );

  // Initialize with 21-day range centered on today
  useEffect(() => {
    // Guard against multiple initializations
    if (isInitializedRef.current) {
      console.log("[INFINITE SCROLL] Already initialized, skipping");
      return;
    }

    isInitializedRef.current = true;
    const today = new Date();
    const range = calculateRenderedRange(today, SCROLL_CONFIG.TOTAL_RENDERED);
    console.log("[INFINITE SCROLL] Initializing with:", {
      today: today.toISOString(),
      startDate: range.startDate.toISOString(),
      endDate: range.endDate.toISOString(),
      totalDays: SCROLL_CONFIG.TOTAL_RENDERED,
    });
    setRenderedDateRange(range.startDate, range.endDate);
    setAnchorDate(today);

    // Center the view on today after initialization
    if (scrollRef.current) {
      const scrollPosition = calculateScrollPosition(
        today,
        range.startDate,
        SCROLL_CONFIG.VISIBLE_DAYS,
        SCROLL_CONFIG.DAY_WIDTH
      );
      console.log(
        "[INFINITE SCROLL] Setting initial scroll position:",
        scrollPosition
      );
      scrollRef.current.scrollLeft = scrollPosition;
    }
  }, []); // Empty dependency array - run only once

  // Calculate rendered days array
  const renderedDays = eachDayOfInterval({
    start: renderedDateRange.startDate,
    end: renderedDateRange.endDate,
  });

  console.log(
    "[INFINITE SCROLL] Rendered days count:",
    renderedDays.length,
    "First:",
    renderedDays[0]?.toISOString(),
    "Last:",
    renderedDays[renderedDays.length - 1]?.toISOString()
  );

  // Calculate visible days based on scroll position
  const visibleDays = calculateVisibleDays(
    scrollLeft,
    renderedDateRange.startDate,
    SCROLL_CONFIG.VISIBLE_DAYS,
    SCROLL_CONFIG.DAY_WIDTH
  );

  // Update currentWeekStart in store when visible days change
  useEffect(() => {
    if (visibleDays.length > 0 && visibleDays[0]) {
      const firstVisibleDay = visibleDays[0];
      const weekStart = startOfWeek(firstVisibleDay, { weekStartsOn: 1 });
      if (currentWeekStart.getTime() !== weekStart.getTime()) {
        setCurrentWeekStart(weekStart);
      }
    }
  }, [visibleDays, currentWeekStart, setCurrentWeekStart]);

  // Throttled scroll handler
  const handleScroll = useCallback(() => {
    if (!scrollRef.current || isExpandingRef.current) return;

    const container = scrollRef.current;
    const currentScrollLeft = container.scrollLeft;
    const totalWidth = container.scrollWidth;
    const containerWidth = container.clientWidth;

    setScrollLeft(currentScrollLeft);
    setIsScrolling(true);

    // Clear previous timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Set scrolling to false after scrolling stops
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);

    // Check if we need to expand left
    if (shouldExpandLeft(currentScrollLeft, SCROLL_CONFIG.SCROLL_THRESHOLD)) {
      isExpandingRef.current = true;
      const previousScrollLeft = currentScrollLeft;

      // Expand the date range
      expandDateRangeLeft(SCROLL_CONFIG.DAYS_TO_ADD);

      // Compensate scroll position after React renders new days
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (scrollRef.current) {
            const compensation =
              SCROLL_CONFIG.DAYS_TO_ADD * SCROLL_CONFIG.DAY_WIDTH;
            scrollRef.current.scrollLeft = previousScrollLeft + compensation;
            isExpandingRef.current = false;
          }
        });
      });
    }
    // Check if we need to expand right
    else if (
      shouldExpandRight(
        currentScrollLeft,
        totalWidth,
        containerWidth,
        SCROLL_CONFIG.SCROLL_THRESHOLD
      )
    ) {
      isExpandingRef.current = true;
      // Expand the date range (no compensation needed for right expansion)
      expandDateRangeRight(SCROLL_CONFIG.DAYS_TO_ADD);

      // Reset expanding flag after a short delay
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          isExpandingRef.current = false;
        });
      });
    }
  }, [
    scrollLeft,
    renderedDateRange.startDate,
    expandDateRangeLeft,
    expandDateRangeRight,
  ]);

  // Set up scroll event listener with throttling
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    let rafId: number | null = null;
    let lastScrollTime = 0;

    const throttledScroll = () => {
      const now = Date.now();
      if (now - lastScrollTime >= SCROLL_CONFIG.SCROLL_THROTTLE_MS) {
        handleScroll();
        lastScrollTime = now;
      }

      rafId = requestAnimationFrame(throttledScroll);
    };

    const onScroll = () => {
      if (!rafId) {
        rafId = requestAnimationFrame(throttledScroll);
      }
    };

    container.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      container.removeEventListener("scroll", onScroll);
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [handleScroll]);

  // Function to scroll to a specific date
  const scrollToDate = useCallback(
    (targetDate: Date) => {
      if (!scrollRef.current) return;

      const scrollPosition = calculateScrollPosition(
        targetDate,
        renderedDateRange.startDate,
        SCROLL_CONFIG.VISIBLE_DAYS,
        SCROLL_CONFIG.DAY_WIDTH
      );

      scrollRef.current.scrollTo({
        left: scrollPosition,
        behavior: "smooth",
      });
    },
    [renderedDateRange.startDate]
  );

  return {
    scrollRef,
    renderedDays,
    visibleDays,
    scrollToDate,
    isScrolling,
  };
}
