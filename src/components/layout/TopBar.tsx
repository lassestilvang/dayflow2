"use client";

import { useState } from "react";
import { Menu, Bell, User, Plus, Search, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function TopBar() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const toggleSidebar = useAppStore((state) => state.toggleSidebar);
  const toggleTaskSidebar = useAppStore((state) => state.toggleTaskSidebar);
  const theme = useAppStore((state) => state.ui.theme);
  const openQuickAddModal = useAppStore((state) => state.openQuickAddModal);

  // Mock notifications
  const notifications = [
    {
      id: "1",
      title: "Task overdue",
      message: "Submit Expense Report is overdue",
      time: "5m ago",
      unread: true,
    },
    {
      id: "2",
      title: "Event reminder",
      message: "Team Standup in 30 minutes",
      time: "25m ago",
      unread: true,
    },
    {
      id: "3",
      title: "Task completed",
      message: "Review Pull Requests was completed",
      time: "1h ago",
      unread: false,
    },
  ];

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4 gap-4">
        {/* Left Section */}
        <div className="flex items-center gap-3">
          {/* Sidebar Toggle */}
          <button
            onClick={toggleSidebar}
            className="rounded-md p-2 hover:bg-accent transition-colors lg:inline-flex hidden"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Logo and Branding */}
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Calendar className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                DayFlow
              </h1>
              <p className="text-xs text-muted-foreground leading-none">
                Daily Planner
              </p>
            </div>
          </div>
        </div>

        {/* Center Section - Search */}
        <div className="flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tasks and events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Mobile Search Toggle */}
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="md:hidden rounded-md p-2 hover:bg-accent transition-colors"
            aria-label="Toggle search"
          >
            <Search className="h-5 w-5" />
          </button>

          {/* Quick Add Button */}
          <button
            onClick={openQuickAddModal}
            className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
            aria-label="Quick add"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden lg:inline">Add</span>
          </button>

          {/* Mobile Quick Add */}
          <button
            onClick={openQuickAddModal}
            className="sm:hidden rounded-md p-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            aria-label="Quick add"
          >
            <Plus className="h-5 w-5" />
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => {
                setNotificationsOpen(!notificationsOpen);
                setUserMenuOpen(false);
              }}
              className="relative rounded-md p-2 hover:bg-accent transition-colors"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
              )}
            </button>

            <AnimatePresence>
              {notificationsOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setNotificationsOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-80 rounded-lg border bg-popover shadow-lg z-50"
                  >
                    <div className="p-3 border-b">
                      <h3 className="font-semibold">Notifications</h3>
                      {unreadCount > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {unreadCount} unread
                        </p>
                      )}
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.map((notification) => (
                        <button
                          key={notification.id}
                          className={cn(
                            "w-full text-left px-3 py-3 hover:bg-accent transition-colors border-b last:border-b-0",
                            notification.unread && "bg-accent/50"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {notification.title}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {notification.message}
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {notification.time}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="p-2 border-t">
                      <button className="w-full text-center text-sm text-primary hover:underline">
                        View all notifications
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => {
                setUserMenuOpen(!userMenuOpen);
                setNotificationsOpen(false);
              }}
              className="flex items-center gap-2 rounded-md p-2 hover:bg-accent transition-colors"
              aria-label="User menu"
            >
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                DU
              </div>
              <span className="hidden lg:inline text-sm font-medium">
                Demo User
              </span>
            </button>

            <AnimatePresence>
              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-56 rounded-lg border bg-popover shadow-lg z-50"
                  >
                    <div className="p-3 border-b">
                      <p className="font-medium">Demo User</p>
                      <p className="text-xs text-muted-foreground">
                        demo@dayflow.app
                      </p>
                    </div>
                    <div className="p-1">
                      <button className="w-full text-left px-3 py-2 text-sm rounded hover:bg-accent transition-colors">
                        Profile
                      </button>
                      <button className="w-full text-left px-3 py-2 text-sm rounded hover:bg-accent transition-colors">
                        Settings
                      </button>
                      <button className="w-full text-left px-3 py-2 text-sm rounded hover:bg-accent transition-colors">
                        Preferences
                      </button>
                    </div>
                    <div className="p-1 border-t">
                      <button className="w-full text-left px-3 py-2 text-sm rounded hover:bg-accent transition-colors text-destructive">
                        Sign out
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Task Sidebar Toggle (mobile) */}
          <button
            onClick={toggleTaskSidebar}
            className="xl:hidden rounded-md p-2 hover:bg-accent transition-colors"
            aria-label="Toggle task sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Mobile Search Bar */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden border-t overflow-hidden"
          >
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search tasks and events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
