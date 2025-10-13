"use client";

import { useMemo } from "react";

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
              <div key={groupKey} className="space-y-2">
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
                {groupTasks.map((task, index) => (
                  <div key={task.id}>
                    <TaskItem task={task} />
                  </div>
                ))}
              </div>
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
        <div className="space-y-2">
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
          {groupedTasks.completed.map((task, index) => (
            <div key={task.id}>
              <TaskItem task={task} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
