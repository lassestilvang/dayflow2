"use client";

import { useState, useEffect, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import type { Task } from "@/types";
import { isBefore, startOfDay } from "date-fns";

export function useTasks() {
  const { tasks, filters, selectedCategory } = useAppStore(
    (state) => state.tasks
  );
  const setTaskFilters = useAppStore((state) => state.setTaskFilters);
  const setSelectedCategory = useAppStore((state) => state.setSelectedCategory);

  const [loading, setLoading] = useState(false);

  // Filter and compute tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Filter by category
      if (
        filters.categories.length > 0 &&
        !filters.categories.includes(task.category)
      ) {
        return false;
      }

      // Filter by priority
      if (
        filters.priorities.length > 0 &&
        task.priority &&
        !filters.priorities.includes(task.priority)
      ) {
        return false;
      }

      // Filter by completed status
      if (!filters.showCompleted && task.isCompleted) {
        return false;
      }

      // Filter by selected category
      if (selectedCategory && task.category !== selectedCategory) {
        return false;
      }

      // Filter by date range
      if (filters.dateRange) {
        if (task.dueDate) {
          const taskDate = startOfDay(task.dueDate);
          const rangeStart = startOfDay(filters.dateRange.start);
          const rangeEnd = startOfDay(filters.dateRange.end);

          if (taskDate < rangeStart || taskDate > rangeEnd) {
            return false;
          }
        }
      }

      return true;
    });
  }, [tasks, filters, selectedCategory]);

  // Compute overdue tasks
  const overdueTasks = useMemo(() => {
    const today = startOfDay(new Date());
    return filteredTasks.filter(
      (task) =>
        task.dueDate && !task.isCompleted && isBefore(task.dueDate, today)
    );
  }, [filteredTasks]);

  // Compute today's tasks
  const todayTasks = useMemo(() => {
    const today = startOfDay(new Date());
    return filteredTasks.filter((task) => {
      if (!task.dueDate) return false;
      const taskDate = startOfDay(task.dueDate);
      return taskDate.getTime() === today.getTime();
    });
  }, [filteredTasks]);

  // Compute upcoming tasks (next 7 days)
  const upcomingTasks = useMemo(() => {
    const today = startOfDay(new Date());
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    return filteredTasks.filter((task) => {
      if (!task.dueDate) return false;
      const taskDate = startOfDay(task.dueDate);
      return taskDate > today && taskDate <= weekFromNow;
    });
  }, [filteredTasks]);

  // Compute task statistics
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.isCompleted).length;
    const overdue = overdueTasks.length;
    const today = todayTasks.length;

    return {
      total,
      completed,
      overdue,
      today,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [tasks, overdueTasks, todayTasks]);

  return {
    tasks: filteredTasks,
    overdueTasks,
    todayTasks,
    upcomingTasks,
    stats,
    filters,
    selectedCategory,
    loading,
    setTaskFilters,
    setSelectedCategory,
  };
}
