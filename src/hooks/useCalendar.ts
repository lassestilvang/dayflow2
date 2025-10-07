import { useMemo, useRef } from "react";
import { useAppStore } from "@/lib/store";
import type { TimeBlock, Event, Task } from "@/types";
import { startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { useInfiniteScroll } from "./useInfiniteScroll";
import { groupOverlappingBlocks } from "@/lib/calendar-utils";

export function useCalendar() {
  const { events, selectedDate, viewMode } = useAppStore(
    (state) => state.events
  );
  const tasks = useAppStore((state) => state.tasks.tasks);
  const setSelectedDate = useAppStore((state) => state.setSelectedDate);
  const setViewMode = useAppStore((state) => state.setViewMode);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { renderedDays, visibleDays, scrollToDate } =
    useInfiniteScroll(scrollRef);

  // Memoize time block creation functions to avoid recreating them
  const createEventBlock = (event: Event): TimeBlock => ({
    id: event.id,
    type: "event" as const,
    data: event,
    startTime: event.startTime,
    endTime: event.endTime,
    duration:
      (event.endTime.getTime() - event.startTime.getTime()) / (1000 * 60),
  });

  const createTaskBlock = (task: Task): TimeBlock => {
    const startTime = task.scheduledTime!;
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // Default 1 hour duration
    return {
      id: task.id,
      type: "task" as const,
      data: task,
      startTime,
      endTime,
      duration: 60,
    };
  };

  // Memoize timeBlocks computation to prevent re-conversion on every state change
  const timeBlocks = useMemo(() => {
    const startTime = performance.now();
    // Defensive check: ensure events is an array
    if (!Array.isArray(events)) {
      console.warn(
        "Events is not an array during hydration, skipping time block conversion"
      );
      return [];
    }

    // Defensive check: ensure tasks is an array
    if (!Array.isArray(tasks)) {
      console.warn(
        "Tasks is not an array during hydration, skipping time block conversion"
      );
      return [];
    }

    // Convert events to time blocks
    const eventBlocks: TimeBlock[] = events.map(createEventBlock);

    // Convert tasks with scheduled times to time blocks - filter first for performance
    const scheduledTasks = tasks.filter(
      (task) => task.scheduledTime && !task.isCompleted
    );
    const taskBlocks: TimeBlock[] = scheduledTasks.map(createTaskBlock);

    const result = [...eventBlocks, ...taskBlocks];
    const endTime = performance.now();
    console.log(
      `[HOOK PERF] useCalendar timeBlocks: ${endTime - startTime}ms for ${
        events.length
      } events + ${tasks.length} tasks -> ${
        eventBlocks.length + taskBlocks.length
      } blocks`
    );
    return result;
  }, [events, tasks]);

  const groupedTimeBlocks = useMemo(() => {
    return groupOverlappingBlocks(timeBlocks);
  }, [timeBlocks]);

  // Performance logging for hook re-computation
  console.log(
    `[HOOK DEBUG] useCalendar re-computed at ${Date.now()}, events length: ${
      events.length
    }, tasks length: ${
      tasks.length
    }, selectedDate: ${selectedDate}, viewMode: ${viewMode}`
  );

  // Memoize week days calculation
  const getWeekDays = useMemo(() => {
    return () => {
      const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    };
  }, [selectedDate]);

  const navigateDate = (direction: "prev" | "next") => {
    const currentDate = new Date(selectedDate);

    if (viewMode === "day") {
      currentDate.setDate(
        currentDate.getDate() + (direction === "next" ? 1 : -1)
      );
    } else if (viewMode === "week") {
      currentDate.setDate(
        currentDate.getDate() + (direction === "next" ? 7 : -7)
      );
    } else {
      currentDate.setMonth(
        currentDate.getMonth() + (direction === "next" ? 1 : -1)
      );
    }

    setSelectedDate(currentDate);
  };

  return {
    selectedDate,
    viewMode,
    timeBlocks: groupedTimeBlocks,
    setSelectedDate,
    setViewMode,
    getWeekDays,
    navigateDate,
    scrollRef,
    renderedDays,
    visibleDays,
    scrollToDate,
  };
}
