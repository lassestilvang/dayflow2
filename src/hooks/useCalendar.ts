import { useMemo, useRef, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import type { TimeBlock, Event, Task } from "@/types";
import { startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { useInfiniteScroll } from "./useInfiniteScroll";
import { groupOverlappingBlocks } from "@/lib/calendar-utils";

export function useCalendar() {
  const events = useAppStore((state) => state.events.events);
  const selectedDate = useAppStore((state) => state.events.selectedDate);
  const viewMode = useAppStore((state) => state.events.viewMode);
  const tasks = useAppStore((state) => state.tasks.tasks);
  const setSelectedDate = useAppStore((state) => state.setSelectedDate);
  const setViewMode = useAppStore((state) => state.setViewMode);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { renderedDays, visibleDays, scrollToDate, isScrolling } =
    useInfiniteScroll(scrollRef);

  // Update refs
  const prevEventsRef = useRef(events);
  const prevTasksRef = useRef(tasks);
  const prevSelectedDateRef = useRef(selectedDate);
  const prevViewModeRef = useRef(viewMode);

  const selectedDateChanged = prevSelectedDateRef.current !== selectedDate;

  prevEventsRef.current = events;
  prevTasksRef.current = tasks;
  prevSelectedDateRef.current = selectedDate;
  prevViewModeRef.current = viewMode;

  // Auto-scroll to selected date when it changes
  useEffect(() => {
    if (selectedDateChanged) {
      scrollToDate(selectedDate);
    }
  }, [selectedDate, selectedDateChanged, scrollToDate, viewMode]);

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
    return result;
  }, [events, tasks]);

  

  return {
    selectedDate,
    viewMode,
    timeBlocks,
    setSelectedDate,
    setViewMode,
    getWeekDays: useMemo(() => {
      return () => {
        const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
        const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
        return eachDayOfInterval({ start, end });
      };
    }, [selectedDate]),
    navigateDate: (direction: "prev" | "next") => {
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
    },
    scrollRef,
    renderedDays,
    visibleDays,
    scrollToDate,
    isScrolling,
  };
}