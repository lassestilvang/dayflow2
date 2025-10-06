"use client";

import { useState, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { isBefore, startOfDay } from "date-fns";

export function useTasks() {
  const { tasks, filters, selectedCategory } = useAppStore(
    (state) => state.tasks
  );
  const setTaskFilters = useAppStore((state) => state.setTaskFilters);
  const setSelectedCategory = useAppStore((state) => state.setSelectedCategory);

  const [_loading, _setLoading] = useState(false);

  // Performance logging for hook re-computation
  console.log(
    `[HOOK DEBUG] useTasks re-computed at ${Date.now()}, tasks length: ${
      tasks.length
    }, filters:`,
    filters,
    "selectedCategory:",
    selectedCategory
  );

  // Memoize today's date to avoid recalculating it
  const today = useMemo(() => startOfDay(new Date()), []);

  // Filter and compute tasks - optimize by memoizing filter functions
  const filteredTasks = useMemo(() => {
    const startTime = performance.now();

    // Pre-compute filter values to avoid repeated property access
    const hasCategoryFilter = filters.categories.length > 0;
    const hasPriorityFilter = filters.priorities.length > 0;
    const showCompleted = filters.showCompleted;
    const hasSelectedCategory = !!selectedCategory;
    const hasDateRange = !!filters.dateRange;

    let rangeStart: Date | null = null;
    let rangeEnd: Date | null = null;
    if (hasDateRange) {
      rangeStart = startOfDay(filters.dateRange!.start);
      rangeEnd = startOfDay(filters.dateRange!.end);
    }

    const result = tasks.filter((task) => {
      // Filter by category
      if (hasCategoryFilter && !filters.categories.includes(task.category)) {
        return false;
      }

      // Filter by priority
      if (
        hasPriorityFilter &&
        task.priority &&
        !filters.priorities.includes(task.priority)
      ) {
        return false;
      }

      // Filter by completed status
      if (!showCompleted && task.isCompleted) {
        return false;
      }

      // Filter by selected category
      if (hasSelectedCategory && task.category !== selectedCategory) {
        return false;
      }

      // Filter by date range
      if (hasDateRange && task.dueDate) {
        const taskDate = startOfDay(task.dueDate);
        if (taskDate < rangeStart! || taskDate > rangeEnd!) {
          return false;
        }
      }

      return true;
    });
    const endTime = performance.now();
    console.log(
      `[HOOK PERF] useTasks filteredTasks: ${endTime - startTime}ms for ${
        tasks.length
      } tasks -> ${result.length} filtered`
    );
    return result;
  }, [
    tasks,
    filters.categories,
    filters.priorities,
    filters.showCompleted,
    filters.dateRange,
    selectedCategory,
  ]);

  // Compute overdue tasks - optimize by using memoized today
  const overdueTasks = useMemo(() => {
    const startTime = performance.now();
    const result = filteredTasks.filter(
      (task) =>
        task.dueDate && !task.isCompleted && isBefore(task.dueDate, today)
    );
    const endTime = performance.now();
    console.log(
      `[HOOK PERF] useTasks overdueTasks: ${endTime - startTime}ms for ${
        filteredTasks.length
      } tasks -> ${result.length} overdue`
    );
    return result;
  }, [filteredTasks, today]);

  // Compute today's tasks - optimize by using memoized today
  const todayTasks = useMemo(() => {
    const startTime = performance.now();
    const result = filteredTasks.filter((task) => {
      if (!task.dueDate) return false;
      const taskDate = startOfDay(task.dueDate);
      return taskDate.getTime() === today.getTime();
    });
    const endTime = performance.now();
    console.log(
      `[HOOK PERF] useTasks todayTasks: ${endTime - startTime}ms for ${
        filteredTasks.length
      } tasks -> ${result.length} today`
    );
    return result;
  }, [filteredTasks, today]);

  // Compute upcoming tasks (next 7 days) - optimize by memoizing week calculation
  const upcomingTasks = useMemo(() => {
    const startTime = performance.now();
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    const result = filteredTasks.filter((task) => {
      if (!task.dueDate) return false;
      const taskDate = startOfDay(task.dueDate);
      return taskDate > today && taskDate <= weekFromNow;
    });
    const endTime = performance.now();
    console.log(
      `[HOOK PERF] useTasks upcomingTasks: ${endTime - startTime}ms for ${
        filteredTasks.length
      } tasks -> ${result.length} upcoming`
    );
    return result;
  }, [filteredTasks, today]);

  // Compute task statistics - optimize by memoizing completed count
  const stats = useMemo(() => {
    const startTime = performance.now();
    const total = tasks.length;
    const completed = tasks.filter((t) => t.isCompleted).length;
    const overdue = overdueTasks.length;
    const todayCount = todayTasks.length;

    const result = {
      total,
      completed,
      overdue,
      today: todayCount,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
    const endTime = performance.now();
    console.log(
      `[HOOK PERF] useTasks stats: ${endTime - startTime}ms, stats:`,
      result
    );
    return result;
  }, [tasks, overdueTasks.length, todayTasks.length]);

  return {
    tasks: filteredTasks,
    overdueTasks,
    todayTasks,
    upcomingTasks,
    stats,
    filters,
    selectedCategory,
    setTaskFilters,
    setSelectedCategory,
  };
}
