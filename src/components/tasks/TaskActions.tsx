"use client";

import { useState } from "react";
import {
  MoreVertical,
  Edit,
  Trash2,
  Clock,
  Tag,
  Flag,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Task, CategoryType } from "@/types";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface TaskActionsProps {
  task: Task;
  onClose?: () => void;
}

const categories: Array<{ id: CategoryType; label: string; color: string }> = [
  { id: "work", label: "Work", color: "bg-blue-500" },
  { id: "family", label: "Family", color: "bg-green-500" },
  { id: "personal", label: "Personal", color: "bg-orange-500" },
  { id: "travel", label: "Travel", color: "bg-purple-500" },
];

const priorities: Array<{ id: "low" | "medium" | "high"; label: string }> = [
  { id: "high", label: "High" },
  { id: "medium", label: "Medium" },
  { id: "low", label: "Low" },
];

export function TaskActions({ task, onClose }: TaskActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);

  const updateTask = useAppStore((state) => state.updateTask);
  const deleteTask = useAppStore((state) => state.deleteTask);
  const setSelectedTaskId = useAppStore((state) => state.setSelectedTaskId);

  const handleDelete = () => {
    if (confirm(`Delete task "${task.title}"?`)) {
      deleteTask(task.id);
      setIsOpen(false);
      onClose?.();
    }
  };

  const handleEdit = () => {
    setSelectedTaskId(task.id);
    setIsOpen(false);
    onClose?.();
    // TODO: Open edit modal
  };

  const handleSchedule = () => {
    // TODO: Open time picker
    setIsOpen(false);
    onClose?.();
  };

  const handleChangeCategory = (category: CategoryType) => {
    updateTask(task.id, { category });
    setShowCategoryMenu(false);
    setIsOpen(false);
    onClose?.();
  };

  const handleChangePriority = (priority: "low" | "medium" | "high") => {
    updateTask(task.id, { priority });
    setShowPriorityMenu(false);
    setIsOpen(false);
    onClose?.();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 rounded hover:bg-accent transition-colors"
        aria-label="Task actions"
      >
        <MoreVertical className="h-4 w-4 text-muted-foreground" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => {
                setIsOpen(false);
                setShowCategoryMenu(false);
                setShowPriorityMenu(false);
              }}
            />

            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-1 w-48 rounded-md border bg-popover shadow-lg z-50"
            >
              <div className="p-1">
                {/* Edit */}
                <button
                  onClick={handleEdit}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-accent transition-colors"
                >
                  <Edit className="h-4 w-4" />
                  <span>Edit</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    E
                  </span>
                </button>

                {/* Schedule */}
                <button
                  onClick={handleSchedule}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-accent transition-colors"
                >
                  <Clock className="h-4 w-4" />
                  <span>Schedule</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    S
                  </span>
                </button>

                <div className="my-1 border-t" />

                {/* Change Category */}
                <div className="relative">
                  <button
                    onClick={() => setShowCategoryMenu(!showCategoryMenu)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-accent transition-colors"
                  >
                    <Tag className="h-4 w-4" />
                    <span>Category</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      C
                    </span>
                  </button>

                  <AnimatePresence>
                    {showCategoryMenu && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-full top-0 ml-1 w-40 rounded-md border bg-popover shadow-lg z-50"
                      >
                        <div className="p-1">
                          {categories.map((category) => (
                            <button
                              key={category.id}
                              onClick={() => handleChangeCategory(category.id)}
                              className={cn(
                                "w-full flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-accent transition-colors",
                                task.category === category.id && "bg-accent"
                              )}
                            >
                              <div
                                className={cn(
                                  "h-3 w-3 rounded-full",
                                  category.color
                                )}
                              />
                              <span>{category.label}</span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Change Priority */}
                <div className="relative">
                  <button
                    onClick={() => setShowPriorityMenu(!showPriorityMenu)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-accent transition-colors"
                  >
                    <Flag className="h-4 w-4" />
                    <span>Priority</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      P
                    </span>
                  </button>

                  <AnimatePresence>
                    {showPriorityMenu && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-full top-0 ml-1 w-32 rounded-md border bg-popover shadow-lg z-50"
                      >
                        <div className="p-1">
                          {priorities.map((priority) => (
                            <button
                              key={priority.id}
                              onClick={() => handleChangePriority(priority.id)}
                              className={cn(
                                "w-full flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-accent transition-colors",
                                task.priority === priority.id && "bg-accent"
                              )}
                            >
                              <Flag
                                className={cn(
                                  "h-3 w-3",
                                  priority.id === "high" && "text-red-500",
                                  priority.id === "medium" && "text-yellow-500",
                                  priority.id === "low" && "text-blue-500"
                                )}
                              />
                              <span>{priority.label}</span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="my-1 border-t" />

                {/* Delete */}
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-destructive hover:text-destructive-foreground transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    D
                  </span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
