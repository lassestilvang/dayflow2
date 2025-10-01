"use client";

import * as React from "react";
import { useAppStore } from "@/lib/store";
import { TaskModal } from "./TaskModal";
import { EventModal } from "./EventModal";
import { QuickAddModal } from "./QuickAddModal";
import type { Task, Event } from "@/types";

export function ModalManager() {
  const taskModalOpen = useAppStore((state) => state.modals.taskModalOpen);
  const eventModalOpen = useAppStore((state) => state.modals.eventModalOpen);
  const quickAddModalOpen = useAppStore(
    (state) => state.modals.quickAddModalOpen
  );
  const editingItemId = useAppStore((state) => state.modals.editingItemId);
  const prefilledData = useAppStore((state) => state.modals.prefilledData);

  const closeModals = useAppStore((state) => state.closeModals);
  const openTaskModal = useAppStore((state) => state.openTaskModal);
  const openEventModal = useAppStore((state) => state.openEventModal);

  const tasks = useAppStore((state) => state.tasks.tasks);
  const events = useAppStore((state) => state.events.events);

  // Get the task or event being edited
  const editingTask = editingItemId
    ? tasks.find((t) => t.id === editingItemId)
    : null;
  const editingEvent = editingItemId
    ? events.find((e) => e.id === editingItemId)
    : null;

  // Handler for quick add modal to open full modals
  const handleOpenFullModal = (type: "task" | "event", data: Partial<Task> | Partial<Event>) => {
    if (type === "task") {
      openTaskModal(data);
    } else {
      openEventModal(data);
    }
  };

  return (
    <>
      {/* Task Modal */}
      <TaskModal
        open={taskModalOpen}
        onOpenChange={(open) => {
          if (!open) closeModals();
        }}
        task={editingTask}
        prefilledData={prefilledData as Partial<Task>}
      />

      {/* Event Modal */}
      <EventModal
        open={eventModalOpen}
        onOpenChange={(open) => {
          if (!open) closeModals();
        }}
        event={editingEvent}
        prefilledData={prefilledData as Partial<Event>}
      />

      {/* Quick Add Modal */}
      <QuickAddModal
        open={quickAddModalOpen}
        onOpenChange={(open) => {
          if (!open) closeModals();
        }}
        onOpenFullModal={handleOpenFullModal}
      />
    </>
  );
}
