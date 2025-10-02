"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { useAppStore } from "@/lib/store";
import { TopBar } from "@/components/layout/TopBar";
import { Navigation } from "@/components/layout/Navigation";
import { TaskSidebar } from "@/components/tasks/TaskSidebar";
import { WeekView } from "@/components/calendar/WeekView";
import { cn } from "@/lib/utils";
import { TaskItem } from "@/components/tasks/TaskItem";
import { TimeBlock } from "@/components/calendar/TimeBlock";
import { motion, AnimatePresence } from "framer-motion";
import { formatConflictMessage } from "@/lib/conflict-detection";
import { toast } from "sonner";
import { ModalManager } from "@/components/modals/ModalManager";
import { Toaster } from "sonner";
import type { ConflictInfo } from "@/lib/conflict-detection";

export default function DashboardPage() {
  const sidebarOpen = useAppStore((state) => state.ui.sidebarOpen);
  const tasks = useAppStore((state) => state.tasks?.tasks || []);
  const events = useAppStore((state) => state.events?.events || []);
  const scheduleTask = useAppStore((state) => state.scheduleTask);
  const moveEvent = useAppStore((state) => state.moveEvent);
  const setDragging = useAppStore((state) => state.setDragging);
  const setDraggedItem = useAppStore((state) => state.setDraggedItem);
  const draggedItem = useAppStore((state) => state.drag.draggedItem);

  // Prevent DndContext from rendering during SSR to avoid hydration mismatch
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Diagnostic logging
    console.log("[DAYFLOW DEBUG] Dashboard mounted");
    console.log("[DAYFLOW DEBUG] Tasks:", tasks.length, "tasks loaded");
    console.log("[DAYFLOW DEBUG] Events:", events.length, "events loaded");
    if (tasks.length > 0) {
      console.log("[DAYFLOW DEBUG] Sample task dates:", {
        firstTask: tasks[0]?.title,
        scheduledTime: tasks[0]?.scheduledTime,
        dueDate: tasks[0]?.dueDate,
      });
    }
    if (events.length > 0) {
      console.log("[DAYFLOW DEBUG] Sample event dates:", {
        firstEvent: events[0]?.title,
        startTime: events[0]?.startTime,
        endTime: events[0]?.endTime,
      });
    }
  }, []);

  const [showConflictModal, setShowConflictModal] = useState(false);
  const [pendingDrop, setPendingDrop] = useState<{
    itemId: string;
    itemType: "task" | "event";
    startTime: Date;
    endTime: Date;
    conflict: ConflictInfo;
  } | null>(null);

  // Configure sensors for drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to start drag
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // 250ms touch duration required
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      // Keyboard navigation for accessibility
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const dragData = active.data.current;

    if (dragData) {
      setDragging(true);
      setDraggedItem({
        id: dragData.id,
        type: dragData.type,
      });
    }
  };

  const handleDragOver = (_event: DragOverEvent) => {
    // Optional: Add visual feedback while dragging over drop zones
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    setDragging(false);
    setDraggedItem(null);

    if (!over) {
      return;
    }

    const dragData = active.data.current;
    const dropData = over.data.current;

    if (!dragData || !dropData) {
      return;
    }

    // Safety check: ensure arrays are defined
    if (!tasks || !events) {
      console.error("Tasks or events array is undefined");
      return;
    }

    // Handle task from sidebar -> calendar
    if (dragData.type === "task" && dropData.type === "timeslot") {
      const task = tasks.find((t) => t.id === dragData.id);
      if (!task) return;

      const { date, hour } = dropData;
      const scheduledTime = new Date(date);
      scheduledTime.setHours(hour, 0, 0, 0);

      // Calculate end time (use task's dueDate or default 1 hour)
      const endTime =
        task.dueDate || new Date(scheduledTime.getTime() + 60 * 60 * 1000);

      const result = scheduleTask(dragData.id, scheduledTime, endTime);

      if (result.conflict) {
        // Store pending drop for conflict resolution
        setPendingDrop({
          itemId: dragData.id,
          itemType: "task",
          startTime: scheduledTime,
          endTime,
          conflict: result.conflict,
        });
        setShowConflictModal(true);
      } else {
        toast.success(`Task "${task.title}" scheduled successfully`);
      }
    }

    // Handle event on calendar -> different time slot
    if (dragData.type === "event" && dropData.type === "timeslot") {
      const event = events.find((e) => e.id === dragData.id);
      if (!event) return;

      const { date, hour } = dropData;
      const newStartTime = new Date(date);
      newStartTime.setHours(hour, 0, 0, 0);

      // Calculate duration to maintain event length
      const duration = event.endTime.getTime() - event.startTime.getTime();
      const newEndTime = new Date(newStartTime.getTime() + duration);

      const result = moveEvent(dragData.id, newStartTime, newEndTime);

      if (result.conflict) {
        setPendingDrop({
          itemId: dragData.id,
          itemType: "event",
          startTime: newStartTime,
          endTime: newEndTime,
          conflict: result.conflict,
        });
        setShowConflictModal(true);
      } else {
        toast.success(`Event "${event.title}" rescheduled successfully`);
      }
    }

    // Handle task on calendar -> different time slot
    if (
      dragData.type === "task" &&
      dragData.isScheduled &&
      dropData.type === "timeslot"
    ) {
      const task = tasks.find((t) => t.id === dragData.id);
      if (!task) return;

      const { date, hour } = dropData;
      const scheduledTime = new Date(date);
      scheduledTime.setHours(hour, 0, 0, 0);

      const endTime =
        task.dueDate || new Date(scheduledTime.getTime() + 60 * 60 * 1000);

      const result = scheduleTask(dragData.id, scheduledTime, endTime);

      if (result.conflict) {
        setPendingDrop({
          itemId: dragData.id,
          itemType: "task",
          startTime: scheduledTime,
          endTime,
          conflict: result.conflict,
        });
        setShowConflictModal(true);
      } else {
        toast.success(`Task "${task.title}" rescheduled successfully`);
      }
    }
  };

  const handleConflictResolve = (action: "schedule" | "cancel") => {
    if (action === "schedule") {
      // Conflict was already applied, just close modal and show toast
      if (pendingDrop && tasks && events) {
        const item =
          pendingDrop.itemType === "task"
            ? tasks.find((t) => t.id === pendingDrop.itemId)
            : events.find((e) => e.id === pendingDrop.itemId);

        if (item) {
          toast.warning(
            `"${item.title}" scheduled with conflicts: ${formatConflictMessage(
              pendingDrop.conflict
            )}`
          );
        }
      }
    }

    setShowConflictModal(false);
    setPendingDrop(null);
  };

  // Get the dragged item for overlay
  const getDraggedItem = () => {
    if (!draggedItem) return null;

    if (draggedItem.type === "task") {
      if (!tasks) return null;
      const task = tasks.find((t) => t.id === draggedItem.id);
      return task ? { type: "task" as const, data: task } : null;
    } else {
      if (!events) return null;
      const event = events.find((e) => e.id === draggedItem.id);
      return event ? { type: "event" as const, data: event } : null;
    }
  };

  const draggedItemData = getDraggedItem();

  // Show loading state during SSR to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="flex h-screen flex-col bg-background">
        <TopBar />
        <div className="flex flex-1 overflow-hidden">
          <aside
            className={cn(
              "hidden lg:block w-64 border-r bg-background transition-all duration-300",
              !sidebarOpen && "lg:w-0 lg:overflow-hidden"
            )}
          >
            <Navigation />
          </aside>
          <main className="flex-1 overflow-hidden">
            <WeekView />
          </main>
          <aside className="hidden xl:block w-80 border-l bg-background overflow-hidden">
            <TaskSidebar />
          </aside>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-screen flex-col bg-background">
        {/* Top Bar */}
        <TopBar />

        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - Navigation */}
          <aside
            className={cn(
              "hidden lg:block w-64 border-r bg-background transition-all duration-300",
              !sidebarOpen && "lg:w-0 lg:overflow-hidden"
            )}
          >
            <Navigation />
          </aside>

          {/* Main Content - Calendar */}
          <main className="flex-1 overflow-hidden">
            <WeekView />
          </main>

          {/* Right Sidebar - Tasks */}
          <aside className="hidden xl:block w-80 border-l bg-background overflow-hidden">
            <TaskSidebar />
          </aside>
        </div>

        {/* Mobile Task Sidebar Overlay */}
        <div className="xl:hidden">
          {/* This can be implemented as a slide-in panel for mobile */}
        </div>

        {/* Drag Overlay */}
        <DragOverlay dropAnimation={null}>
          {draggedItemData && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0.8 }}
              animate={{ scale: 1, opacity: 0.9 }}
              className="cursor-grabbing"
            >
              {draggedItemData.type === "task" ? (
                <div className="w-72 pointer-events-none">
                  <TaskItem task={draggedItemData.data} />
                </div>
              ) : (
                <div className="w-64 pointer-events-none">
                  <TimeBlock
                    block={{
                      id: draggedItemData.data.id,
                      type: "event",
                      data: draggedItemData.data,
                      startTime: draggedItemData.data.startTime,
                      endTime: draggedItemData.data.endTime,
                      duration:
                        (draggedItemData.data.endTime.getTime() -
                          draggedItemData.data.startTime.getTime()) /
                        60000,
                    }}
                    top={0}
                    height={80}
                  />
                </div>
              )}
            </motion.div>
          )}
        </DragOverlay>

        {/* Conflict Modal */}
        <AnimatePresence>
          {showConflictModal && pendingDrop && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
              onClick={() => handleConflictResolve("cancel")}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-background rounded-lg shadow-xl max-w-md w-full p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-xl font-semibold mb-4">
                  Scheduling Conflict Detected
                </h2>
                <p className="text-muted-foreground mb-4">
                  {formatConflictMessage(pendingDrop.conflict)}
                </p>
                {pendingDrop.conflict.suggestions.length > 0 && (
                  <div className="bg-accent rounded-lg p-4 mb-4">
                    <p className="text-sm font-medium mb-2">Suggestions:</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {pendingDrop.conflict.suggestions.map(
                        (suggestion: string, i: number) => (
                          <li key={i}>{suggestion}</li>
                        )
                      )}
                    </ul>
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleConflictResolve("cancel")}
                    className="flex-1 px-4 py-2 rounded-lg border hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleConflictResolve("schedule")}
                    className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Schedule Anyway
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modal Manager - handles all modals */}
      <ModalManager />

      {/* Toast Notifications */}
      <Toaster position="top-right" richColors closeButton />
    </DndContext>
  );
}
