"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import {
  eachDayOfInterval,
  startOfWeek,
  differenceInDays,
  addDays,
  startOfDay,
} from "date-fns";
import {
  SCROLL_CONFIG,
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
  const isInitialScrollingRef = useRef(false);
  const initialScrollAppliedRef = useRef(false);

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

  // Initialize with 21-day range starting from today
  useEffect(() => {
    // Guard against multiple initializations
    if (isInitializedRef.current) {
      return;
    }

    isInitializedRef.current = true;
    const today = new Date();
    const startDate = startOfDay(today);
    const endDate = addDays(startDate, SCROLL_CONFIG.TOTAL_RENDERED - 1);

    setRenderedDateRange(startDate, endDate);
    setAnchorDate(today);
  }, []); // Empty dependency array - run only once

  // Calculate rendered days array
  const renderedDays = eachDayOfInterval({
    start: renderedDateRange.startDate,
    end: renderedDateRange.endDate,
  });

  // Apply initial scroll position after DOM is ready
  useEffect(() => {
    // Only run once after initialization and if not already applied
    if (
      !isInitializedRef.current ||
      !scrollRef.current ||
      initialScrollAppliedRef.current
    ) {
      return;
    }

    // Check if we've already set the initial scroll
    const alreadyScrolled = scrollRef.current.scrollLeft > 0;
    if (alreadyScrolled) {
      initialScrollAppliedRef.current = true;
      return;
    }

    // Wait for the scrollable content to be fully rendered
    const checkAndScroll = () => {
      if (!scrollRef.current) return;

      const { scrollWidth, clientWidth, scrollLeft } = scrollRef.current;

      // Only proceed if scrollWidth is calculated and we haven't scrolled yet
      if (scrollWidth > clientWidth && scrollLeft === 0) {
        const today = new Date();
        const dayOffset = differenceInDays(today, renderedDateRange.startDate);
        const scrollPosition = dayOffset * SCROLL_CONFIG.DAY_WIDTH;

        // Set flag to prevent expansion during initial scroll
        isInitialScrollingRef.current = true;

        // Use scrollTo without behavior property to jump instantly
        scrollRef.current.scrollTo({
          left: scrollPosition,
        });

        const actualScrollLeft = scrollRef.current.scrollLeft;

        // If browser accepted the scroll, mark as applied
        if (actualScrollLeft > 0) {
          initialScrollAppliedRef.current = true;
        }

        // Clear flag after scroll settles
        setTimeout(() => {
          isInitialScrollingRef.current = false;
        }, 500);
      } else if (scrollWidth <= clientWidth) {
        // Content not ready yet, try again
        requestAnimationFrame(checkAndScroll);
      }
    };

    // Start checking after a few frames
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(checkAndScroll);
      });
    });
  }, [renderedDays.length, renderedDateRange.startDate]); // Run when days are rendered

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
    if (
      !scrollRef.current ||
      isExpandingRef.current ||
      isInitialScrollingRef.current
    ) {
      return;
    }

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
    const shouldExpandL = shouldExpandLeft(
      currentScrollLeft,
      SCROLL_CONFIG.SCROLL_THRESHOLD
    );
    if (shouldExpandL) {
      console.log(
        "[EXPAND LEFT] Triggered - adding",
        SCROLL_CONFIG.DAYS_TO_ADD,
        "days"
      );
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
    else {
      const shouldExpandR = shouldExpandRight(
        currentScrollLeft,
        totalWidth,
        containerWidth,
        SCROLL_CONFIG.SCROLL_THRESHOLD
      );

      if (shouldExpandR) {
        console.log(
          "[EXPAND RIGHT] Triggered - adding",
          SCROLL_CONFIG.DAYS_TO_ADD,
          "days"
        );
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
    }
  }, [scrollLeft, expandDateRangeLeft, expandDateRangeRight]);

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
