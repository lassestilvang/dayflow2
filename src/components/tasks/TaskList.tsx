"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Task } from "@/types";
import { TaskItem } from "./TaskItem";
import { groupTasksByDate } from "@/lib/task-utils";

interface TaskListProps {
  tasks: Task[];
}

const groupLabels: Record<string, string> = {
  overdue: "Overdue",
  today: "Today",
  tomorrow: "Tomorrow",
  thisWeek: "This Week",
  later: "Later",
  noDate: "No Due Date",
};

export function TaskList({ tasks }: TaskListProps) {
  // Group tasks by date
  const groupedTasks = useMemo(() => {
    // Separate completed and incomplete tasks
    const incompleteTasks = tasks.filter((task) => !task.isCompleted);
    const completedTasks = tasks.filter((task) => task.isCompleted);

    // Group incomplete tasks by date
    const groups = groupTasksByDate(incompleteTasks);

    return {
      groups,
      completed: completedTasks,
    };
  }, [tasks]);

  // Check if there are any tasks
  const hasAnyTasks = tasks.length > 0;
  const hasIncompleteTasks = Object.values(groupedTasks.groups).some(
    (group) => group.length > 0
  );

  if (!hasAnyTasks) {
    return (
      <div className="py-12 text-center">
        <div className="text-muted-foreground">
          <p className="text-sm">No tasks found</p>
          <p className="text-xs mt-1">Create your first task to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Incomplete Tasks Groups */}
      {hasIncompleteTasks ? (
        <>
          {(
            [
              "overdue",
              "today",
              "tomorrow",
              "thisWeek",
              "later",
              "noDate",
            ] as const
          ).map((groupKey) => {
            const groupTasks = groupedTasks.groups[groupKey];
            if (!groupTasks || groupTasks.length === 0) return null;

            return (
              <motion.div
                key={groupKey}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-2"
              >
                {/* Group Header */}
                <div className="flex items-center justify-between">
                  <h3
                    className={`text-sm font-semibold ${
                      groupKey === "overdue"
                        ? "text-destructive"
                        : "text-foreground"
                    }`}
                  >
                    {groupLabels[groupKey]}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {groupTasks.length}
                  </span>
                </div>

                {/* Tasks in Group */}
                <AnimatePresence mode="popLayout">
                  {groupTasks.map((task, index) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20, height: 0 }}
                      transition={{
                        duration: 0.2,
                        delay: index * 0.05,
                      }}
                      layout
                    >
                      <TaskItem task={task} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </>
      ) : (
        <div className="py-8 text-center text-sm text-muted-foreground">
          All tasks completed! 🎉
        </div>
      )}

      {/* Completed Tasks */}
      {groupedTasks.completed.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          className="space-y-2"
        >
          {/* Completed Header */}
          <div className="flex items-center justify-between pt-4 border-t">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Completed
            </h3>
            <span className="text-xs text-muted-foreground">
              {groupedTasks.completed.length}
            </span>
          </div>

          {/* Completed Tasks */}
          <AnimatePresence mode="popLayout">
            {groupedTasks.completed.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, height: 0 }}
                transition={{
                  duration: 0.2,
                  delay: index * 0.05,
                }}
                layout
              >
                <TaskItem task={task} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
