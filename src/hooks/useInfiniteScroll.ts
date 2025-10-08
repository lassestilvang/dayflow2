import { useRef, useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import {
  eachDayOfInterval,
  startOfWeek,
} from "date-fns";
import {
  SCROLL_CONFIG,
  calculateRenderedRange,
  calculateVisibleDays,
  calculateScrollPosition,
  shouldExpandLeft,
  shouldExpandRight,
} from "@/lib/scroll-utils";

export function useInfiniteScroll(scrollRef: React.RefObject<HTMLDivElement>) {
  const [scrollLeft, setScrollLeft] = useState(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isExpandingRef = useRef(false);
  const isInitializedRef = useRef(false);
  const isInitialScrollingRef = useRef(false);
  const initialScrollAppliedRef = useRef(false);
  const lastExpansionTimeRef = useRef(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get scroll state and actions from store
  const { renderedDateRange, currentWeekStart } = useAppStore(
    (state) => state.scroll || {
      renderedDateRange: { startDate: new Date(), endDate: new Date() },
      currentWeekStart: new Date()
    }
  );
  const setRenderedDateRange = useAppStore(
    (state) => state.setRenderedDateRange || (() => {})
  );
  const setAnchorDate = useAppStore((state) => state.setAnchorDate || (() => {}));
  const setCurrentWeekStart = useAppStore((state) => state.setCurrentWeekStart || (() => {}));
  const expandDateRangeLeft = useAppStore((state) => state.expandDateRangeLeft || (() => {}));
  const expandDateRangeRight = useAppStore(
    (state) => state.expandDateRangeRight || (() => {})
  );

  // Initialize with proper buffer range centered around today
  useEffect(() => {
    // Guard against multiple initializations
    if (isInitializedRef.current) {
      return;
    }

    isInitializedRef.current = true;
    const today = new Date();
    const { startDate, endDate } = calculateRenderedRange(
      today,
      SCROLL_CONFIG.TOTAL_RENDERED
    );


    setRenderedDateRange(startDate, endDate);
    setAnchorDate(today);
  }, [setAnchorDate, setRenderedDateRange]); // Empty dependency array - run only once

  // Calculate rendered days array
  const renderedDays = eachDayOfInterval({
    start: renderedDateRange.startDate,
    end: renderedDateRange.endDate,
  });

  // Log rendered days and date range whenever it changes
  useEffect(() => {
    const daysCount = renderedDays.length;
    const startStr = renderedDateRange.startDate.toISOString().slice(0, 10);
    const endStr = renderedDateRange.endDate.toISOString().slice(0, 10);
    console.log(`[InfiniteScroll] Rendered days: ${daysCount} (from ${startStr} to ${endStr})`);
  }, [renderedDateRange, renderedDays.length]);

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
        const scrollPosition = calculateScrollPosition(
          today,
          renderedDateRange.startDate,
          SCROLL_CONFIG.VISIBLE_DAYS,
          SCROLL_CONFIG.DAY_WIDTH
        );


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
  }, [renderedDays.length, renderedDateRange.startDate, scrollRef]); // Run when days are rendered

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

    // Set scrolling state
    setIsScrolling(true);

    // Clear previous scrolling timeout
    if (scrollingTimeoutRef.current) {
      clearTimeout(scrollingTimeoutRef.current);
    }

    // Set timeout to reset scrolling state
    scrollingTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);

    // Clear previous timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Check if we need to expand left
    const shouldExpandL = shouldExpandLeft(
      currentScrollLeft,
      SCROLL_CONFIG.SCROLL_THRESHOLD
    ) && Date.now() - lastExpansionTimeRef.current > 500;


    if (shouldExpandL) {
      console.log(
        "[EXPAND LEFT] Triggered - adding",
        SCROLL_CONFIG.DAYS_TO_ADD,
        "days"
      );
      isExpandingRef.current = true;
      lastExpansionTimeRef.current = Date.now();

      // Expand the date range
      expandDateRangeLeft(SCROLL_CONFIG.DAYS_TO_ADD);

      // No scroll compensation for left expansion - scroll position remains unchanged
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          isExpandingRef.current = false;
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
      ) && Date.now() - lastExpansionTimeRef.current > 500;

      if (shouldExpandR) {
        console.log(
          "[EXPAND RIGHT] Triggered - adding",
          SCROLL_CONFIG.DAYS_TO_ADD,
          "days"
        );
        isExpandingRef.current = true;
        lastExpansionTimeRef.current = Date.now();
        const previousScrollLeft = currentScrollLeft;

        // Expand the date range
        expandDateRangeRight(SCROLL_CONFIG.DAYS_TO_ADD);

        // Restore scroll position after React renders new days
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (scrollRef.current) {
              scrollRef.current.scrollLeft = previousScrollLeft;
              isExpandingRef.current = false;
            }
          });
        });
      }
    }
  }, [expandDateRangeLeft, expandDateRangeRight, scrollRef]);

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
  }, [handleScroll, scrollRef]);

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
    [renderedDateRange.startDate, scrollRef]
  );

  return {
    renderedDays,
    visibleDays,
    scrollToDate,
    isScrolling,
  };
}
