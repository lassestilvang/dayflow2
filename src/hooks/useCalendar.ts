"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import type { TimeBlock } from "@/types";
import { startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";

export function useCalendar() {
  const { events, selectedDate, viewMode } = useAppStore(
    (state) => state.events
  );
  const tasks = useAppStore((state) => state.tasks.tasks);
  const setSelectedDate = useAppStore((state) => state.setSelectedDate);
  const setViewMode = useAppStore((state) => state.setViewMode);

  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);

  useEffect(() => {
    // Defensive check: ensure events is an array
    if (!Array.isArray(events)) {
      console.warn("Events is not an array during hydration, skipping time block conversion");
      return;
    }

    // Defensive check: ensure tasks is an array
    if (!Array.isArray(tasks)) {
      console.warn("Tasks is not an array during hydration, skipping time block conversion");
      return;
    }

    // Convert events to time blocks
    const eventBlocks: TimeBlock[] = events.map((event) => ({
      id: event.id,
      type: "event" as const,
      data: event,
      startTime: event.startTime,
      endTime: event.endTime,
      duration:
        (event.endTime.getTime() - event.startTime.getTime()) / (1000 * 60),
    }));

    // Convert tasks with scheduled times to time blocks
    const taskBlocks: TimeBlock[] = tasks
      .filter((task) => task.scheduledTime && !task.isCompleted)
      .map((task) => {
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
      });

    setTimeBlocks([...eventBlocks, ...taskBlocks]);
  }, [events, tasks]);

  const getWeekDays = () => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  };

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
    timeBlocks,
    setSelectedDate,
    setViewMode,
    getWeekDays,
    navigateDate,
  };
}
