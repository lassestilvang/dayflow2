"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  Inbox,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { useTasks } from "@/hooks/useTasks";
import { TaskList } from "./TaskList";
import {
  getCategoryCounts,
  getOverdueTasks,
  getUnscheduledTasks,
} from "@/lib/task-utils";
import { cn } from "@/lib/utils";
import type { CategoryType } from "@/types";

const categories: Array<{
  id: CategoryType;
  label: string;
  color: string;
  bgColor: string;
}> = [
  { id: "work", label: "Work", color: "text-blue-500", bgColor: "bg-blue-500" },
  {
    id: "family",
    label: "Family",
    color: "text-green-500",
    bgColor: "bg-green-500",
  },
  {
    id: "personal",
    label: "Personal",
    color: "text-orange-500",
    bgColor: "bg-orange-500",
  },
  {
    id: "travel",
    label: "Travel",
    color: "text-purple-500",
    bgColor: "bg-purple-500",
  },
];

export function TaskSidebar() {
  const [searchQuery, setSearchQuery] = useState("");
  const taskSidebarOpen = useAppStore((state) => state.ui.taskSidebarOpen);
  const toggleTaskSidebar = useAppStore((state) => state.toggleTaskSidebar);
  const selectedCategory = useAppStore((state) => state.tasks.selectedCategory);
  const setSelectedCategory = useAppStore((state) => state.setSelectedCategory);
  const allTasks = useAppStore((state) => state.tasks.tasks);
  const openTaskModal = useAppStore((state) => state.openTaskModal);
  const { tasks, stats } = useTasks();

  // Calculate counts for each section
  const unscheduledTasks = getUnscheduledTasks(allTasks);
  const overdueTasks = getOverdueTasks(allTasks);
  const categoryCounts = getCategoryCounts(allTasks);

  // Filter tasks based on search and selected category
  const displayTasks = tasks.filter((task) =>
    task.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCategorySelect = (
    category: CategoryType | "inbox" | "overdue" | null
  ) => {
    if (category === "inbox" || category === "overdue") {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(category);
    }
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <AnimatePresence>
        {taskSidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="hidden xl:flex h-full flex-col border-l bg-background overflow-hidden"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="border-b p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Tasks</h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openTaskModal()}
                      className="rounded-md p-2 hover:bg-accent transition-colors"
                      aria-label="Add task"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                    <button
                      onClick={toggleTaskSidebar}
                      className="rounded-md p-2 hover:bg-accent transition-colors"
                      aria-label="Close sidebar"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-md bg-accent p-2">
                    <div className="text-2xl font-bold">{stats.total}</div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </div>
                  <div className="rounded-md bg-accent p-2">
                    <div className="text-2xl font-bold">{stats.today}</div>
                    <div className="text-xs text-muted-foreground">Today</div>
                  </div>
                  <div className="rounded-md bg-accent p-2">
                    <div className="text-2xl font-bold text-destructive">
                      {stats.overdue}
                    </div>
                    <div className="text-xs text-muted-foreground">Overdue</div>
                  </div>
                </div>

                {/* Search */}
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Categories */}
              <div className="flex-shrink-0 border-b">
                <div className="p-4 space-y-1">
                  {/* Inbox */}
                  <button
                    onClick={() => handleCategorySelect("inbox")}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
                      !selectedCategory
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Inbox className="h-4 w-4" />
                      <span>Inbox</span>
                    </div>
                    {unscheduledTasks.length > 0 && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-background/20">
                        {unscheduledTasks.length}
                      </span>
                    )}
                  </button>

                  {/* Overdue */}
                  {overdueTasks.length > 0 && (
                    <button
                      onClick={() => handleCategorySelect("overdue")}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors hover:bg-accent"
                    >
                      <div className="flex items-center gap-3">
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        <span>Overdue</span>
                      </div>
                      <span className="px-2 py-0.5 text-xs rounded-full bg-destructive text-destructive-foreground">
                        {overdueTasks.length}
                      </span>
                    </button>
                  )}

                  {/* Category Divider */}
                  <div className="pt-2 pb-1">
                    <div className="text-xs font-semibold text-muted-foreground px-3">
                      Categories
                    </div>
                  </div>

                  {/* Categories */}
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => handleCategorySelect(category.id)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
                        selectedCategory === category.id
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-accent"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "h-3 w-3 rounded-full",
                            category.bgColor
                          )}
                        />
                        <span>{category.label}</span>
                      </div>
                      {categoryCounts[category.id] > 0 && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-background/20">
                          {categoryCounts[category.id]}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Task List */}
              <div className="flex-1 overflow-auto p-4">
                <TaskList tasks={displayTasks} />
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Collapsed Sidebar Toggle */}
      {!taskSidebarOpen && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={toggleTaskSidebar}
          className="hidden xl:flex fixed right-0 top-1/2 transform -translate-y-1/2 items-center justify-center w-6 h-16 bg-primary text-primary-foreground rounded-l-md hover:w-8 transition-all z-40"
          aria-label="Open task sidebar"
        >
          <ChevronLeft className="h-4 w-4" />
        </motion.button>
      )}

      {/* Mobile Overlay */}
      <AnimatePresence>
        {taskSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="xl:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            onClick={toggleTaskSidebar}
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-background border-l shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col h-full">
                {/* Mobile Header */}
                <div className="border-b p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Tasks</h2>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openTaskModal()}
                        className="rounded-md p-2 hover:bg-accent transition-colors"
                        aria-label="Add task"
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                      <button
                        onClick={toggleTaskSidebar}
                        className="rounded-md p-2 hover:bg-accent transition-colors"
                        aria-label="Close sidebar"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Stats Cards */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-md bg-accent p-2">
                      <div className="text-2xl font-bold">{stats.total}</div>
                      <div className="text-xs text-muted-foreground">Total</div>
                    </div>
                    <div className="rounded-md bg-accent p-2">
                      <div className="text-2xl font-bold">{stats.today}</div>
                      <div className="text-xs text-muted-foreground">Today</div>
                    </div>
                    <div className="rounded-md bg-accent p-2">
                      <div className="text-2xl font-bold text-destructive">
                        {stats.overdue}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Overdue
                      </div>
                    </div>
                  </div>

                  {/* Search */}
                  <div className="relative mt-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search tasks..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Categories */}
                <div className="flex-shrink-0 border-b">
                  <div className="p-4 space-y-1">
                    {/* Inbox */}
                    <button
                      onClick={() => handleCategorySelect("inbox")}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
                        !selectedCategory
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-accent"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Inbox className="h-4 w-4" />
                        <span>Inbox</span>
                      </div>
                      {unscheduledTasks.length > 0 && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-background/20">
                          {unscheduledTasks.length}
                        </span>
                      )}
                    </button>

                    {/* Overdue */}
                    {overdueTasks.length > 0 && (
                      <button
                        onClick={() => handleCategorySelect("overdue")}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors hover:bg-accent"
                      >
                        <div className="flex items-center gap-3">
                          <AlertCircle className="h-4 w-4 text-destructive" />
                          <span>Overdue</span>
                        </div>
                        <span className="px-2 py-0.5 text-xs rounded-full bg-destructive text-destructive-foreground">
                          {overdueTasks.length}
                        </span>
                      </button>
                    )}

                    {/* Category Divider */}
                    <div className="pt-2 pb-1">
                      <div className="text-xs font-semibold text-muted-foreground px-3">
                        Categories
                      </div>
                    </div>

                    {/* Categories */}
                    {categories.map((category) => (
                      <button
                        onClick={() => handleCategorySelect(category.id)}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
                          selectedCategory === category.id
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-accent"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "h-3 w-3 rounded-full",
                              category.bgColor
                            )}
                          />
                          <span>{category.label}</span>
                        </div>
                        {categoryCounts[category.id] > 0 && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-background/20">
                            {categoryCounts[category.id]}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Task List */}
                <div className="flex-1 overflow-auto p-4">
                  <TaskList tasks={displayTasks} />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
