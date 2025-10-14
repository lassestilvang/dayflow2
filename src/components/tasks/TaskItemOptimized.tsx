"use client";

import React from "react";

import { useState, useCallback, useMemo } from "react";
import { useDraggable } from "@dnd-kit/core";
import {
  Check,
  Circle,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Clock,
  Calendar,
  Edit,
  Trash2,
} from "lucide-react";

import { format } from "date-fns";
import type { Task } from "@/types";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  formatTaskDueDate,
  getPriorityColor,
  getCategoryColor,
  calculateSubtaskProgress,
} from "@/lib/task-utils";
import { useDragPerformanceTracking } from "@/lib/performance-monitor";
import { PerformanceProfiler } from "@/components/devtools/PerformanceProfiler";

interface TaskItemProps {
  task: Task;
}

export const TaskItemOptimized = React.memo(function TaskItemOptimized({
  task,
}: TaskItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const toggleTaskComplete = useAppStore((state) => state.toggleTaskComplete);
  const updateSubtask = useAppStore((state) => state.updateSubtask);
  const deleteTask = useAppStore((state) => state.deleteTask);
  const setSelectedTaskId = useAppStore((state) => state.setSelectedTaskId);

  // Performance tracking for drag operations
  const { recordConflictCheck } = useDragPerformanceTracking(`task-${task.id}`);

  // Memoize draggable setup to avoid recreating on every render
  const draggableConfig = useMemo(
    () => ({
      id: `task-${task.id}`,
      data: {
        id: task.id,
        type: "task",
        isScheduled: !!task.scheduledTime,
      },
      disabled: task.isCompleted,
    }),
    [task.id, task.scheduledTime, task.isCompleted]
  );

  // Setup draggable for unscheduled tasks from sidebar
  const { attributes, listeners, setNodeRef, isDragging } =
    useDraggable(draggableConfig);

  // Memoize category colors to avoid recalculation
  const categoryColors = useMemo(
    () => ({
      work: "border-l-blue-500",
      family: "border-l-green-500",
      personal: "border-l-orange-500",
      travel: "border-l-purple-500",
    }),
    []
  );

  // Memoize subtask progress calculation
  const subtaskProgress = useMemo(
    () => calculateSubtaskProgress(task.subtasks),
    [task.subtasks]
  );

  // Optimized event handlers with useCallback
  const handleToggleComplete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      toggleTaskComplete(task.id);
    },
    [toggleTaskComplete, task.id]
  );

  const handleToggleSubtask = useCallback(
    (subtaskId: string, completed: boolean) => {
      updateSubtask(task.id, subtaskId, { completed: !completed });
    },
    [updateSubtask, task.id]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (confirm(`Delete task "${task.title}"?`)) {
        deleteTask(task.id);
      }
    },
    [deleteTask, task.id, task.title]
  );

  const handleEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedTaskId(task.id);
    },
    [setSelectedTaskId, task.id]
  );

  const handleExpandToggle = useCallback(() => {
    setIsExpanded(!isExpanded);
  }, [isExpanded]);

  // Record performance metrics during drag state changes
  React.useEffect(() => {
    if (isDragging) {
      recordConflictCheck();
    }
  }, [isDragging, recordConflictCheck]);

  return (
    <PerformanceProfiler name={`TaskItem-${task.id}`}>
      <div
        ref={setNodeRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "rounded-lg border-l-4 bg-card shadow-sm transition-all group",
          categoryColors[task.category],
          task.isCompleted && "opacity-60",
          isHovered && "shadow-md",
          task.isOverdue &&
            !task.isCompleted &&
            "border-r-2 border-r-destructive",
          isDragging && "opacity-50 cursor-grabbing"
        )}
      >
        <div onClick={handleExpandToggle} className="p-3 cursor-pointer">
          <div className="flex items-start gap-3">
            {/* Drag Handle */}
            <button
              {...listeners}
              {...attributes}
              className={cn(
                "mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors",
                task.isCompleted && "cursor-not-allowed opacity-50",
                !task.isCompleted && "opacity-0 group-hover:opacity-100"
              )}
              aria-label="Drag task"
              onClick={(e) => e.stopPropagation()}
              disabled={task.isCompleted}
            >
              <GripVertical className="h-5 w-5" />
            </button>

            {/* Completion Checkbox */}
            <button
              onClick={handleToggleComplete}
              className="mt-0.5 rounded-full hover:bg-accent transition-colors p-1"
              aria-label={
                task.isCompleted ? "Mark incomplete" : "Mark complete"
              }
            >
              {task.isCompleted ? (
                <Check className="h-5 w-5 text-primary" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
            </button>

            {/* Task Content */}
            <div className="flex-1 space-y-2 min-w-0">
              {/* Title and Actions */}
              <div className="flex items-start justify-between gap-2">
                <h3
                  className={cn(
                    "font-medium text-sm leading-tight",
                    task.isCompleted && "line-through text-muted-foreground"
                  )}
                >
                  {task.title}
                </h3>

                {/* Action Buttons (visible on hover) */}
                {isHovered && !task.isCompleted && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleEdit}
                      className="p-1 rounded hover:bg-accent transition-colors"
                      aria-label="Edit task"
                    >
                      <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button
                      onClick={handleDelete}
                      className="p-1 rounded hover:bg-accent transition-colors"
                      aria-label="Delete task"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                )}
              </div>

              {/* Description (when collapsed) */}
              {!isExpanded && task.description && (
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {task.description}
                </p>
              )}

              {/* Metadata Row */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Due Date */}
                {task.dueDate && (
                  <div
                    className={cn(
                      "flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent",
                      task.isOverdue &&
                        !task.isCompleted &&
                        "bg-destructive/10 text-destructive"
                    )}
                  >
                    <Calendar className="h-3 w-3" />
                    <span>{formatTaskDueDate(task.dueDate)}</span>
                  </div>
                )}

                {/* Scheduled Time */}
                {task.scheduledTime && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                    <Clock className="h-3 w-3" />
                    <span>{format(task.scheduledTime, "HH:mm")}</span>
                  </div>
                )}

                {/* Priority */}
                {task.priority && (
                  <div
                    className={cn(
                      "px-2 py-0.5 rounded-md text-xs font-medium",
                      getPriorityColor(task.priority)
                    )}
                  >
                    {task.priority.charAt(0).toUpperCase() +
                      task.priority.slice(1)}
                  </div>
                )}

                {/* Subtask Progress */}
                {task.subtasks.length > 0 && !isExpanded && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <div className="w-12 h-1.5 bg-accent rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${subtaskProgress}%` }}
                        />
                      </div>
                      <span className="text-xs">
                        {task.subtasks.filter((st) => st.completed).length}/
                        {task.subtasks.length}
                      </span>
                    </div>
                  </div>
                )}

                {/* Category Indicator */}
                <div className="flex items-center gap-1">
                  <div
                    className={cn(
                      "h-2 w-2 rounded-full",
                      getCategoryColor(task.category)
                    )}
                  />
                  <span className="text-muted-foreground capitalize">
                    {task.category}
                  </span>
                </div>
              </div>

              {/* Expand/Collapse Indicator */}
              {(task.description || task.subtasks.length > 0) && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-3 w-3" />
                      <span>Show less</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3" />
                      <span>Show more</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="overflow-hidden">
            <div className="px-3 pb-3 space-y-3 border-t pt-3">
              {/* Full Description */}
              {task.description && (
                <div className="text-sm text-muted-foreground">
                  {task.description}
                </div>
              )}

              {/* Subtasks */}
              {task.subtasks.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-foreground">
                    Subtasks (
                    {task.subtasks.filter((st) => st.completed).length}/
                    {task.subtasks.length})
                  </div>
                  <div className="space-y-1">
                    {task.subtasks
                      .sort((a, b) => a.order - b.order)
                      .map((subtask) => (
                        <div
                          key={subtask.id}
                          className="flex items-center gap-2 group"
                        >
                          <button
                            onClick={() =>
                              handleToggleSubtask(subtask.id, subtask.completed)
                            }
                            className="flex-shrink-0 rounded hover:bg-accent transition-colors"
                            aria-label={
                              subtask.completed
                                ? "Mark subtask incomplete"
                                : "Mark subtask complete"
                            }
                          >
                            {subtask.completed ? (
                              <Check className="h-4 w-4 text-primary" />
                            ) : (
                              <Circle className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                          <span
                            className={cn(
                              "text-sm flex-1",
                              subtask.completed &&
                                "line-through text-muted-foreground"
                            )}
                          >
                            {subtask.title}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Task Metadata */}
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Created: {format(task.createdAt, "MMM d, yyyy")}</div>
                {task.updatedAt.getTime() !== task.createdAt.getTime() && (
                  <div>
                    Updated: {format(task.updatedAt, "MMM d, yyyy HH:mm")}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </PerformanceProfiler>
  );
});
