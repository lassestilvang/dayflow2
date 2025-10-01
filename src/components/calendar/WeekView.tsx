"use client";

import { useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useCalendar } from "@/hooks/useCalendar";
import { CalendarGrid } from "./CalendarGrid";
import { getWeekRangeString } from "@/lib/calendar-utils";
import { cn } from "@/lib/utils";
import type { TimeBlock } from "@/types";

export function WeekView() {
  const { selectedDate, timeBlocks, setSelectedDate, navigateDate } =
    useCalendar();

  const weekRange = getWeekRangeString(selectedDate);

  const handlePrevWeek = useCallback(() => {
    navigateDate("prev");
  }, [navigateDate]);

  const handleNextWeek = useCallback(() => {
    navigateDate("next");
  }, [navigateDate]);

  const handleToday = useCallback(() => {
    setSelectedDate(new Date());
  }, [setSelectedDate]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handlePrevWeek();
      } else if (e.key === "ArrowRight" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleNextWeek();
      } else if (e.key === "t" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleToday();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePrevWeek, handleNextWeek, handleToday]);

  const handleTimeSlotClick = (date: Date) => {
    console.log("Time slot clicked:", date);
    // TODO: Open modal/dialog to create new event
  };

  const handleBlockClick = (block: TimeBlock) => {
    console.log("Block clicked:", block);
    // TODO: Open modal/dialog to view/edit event
  };

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Navigation Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-4">
          {/* Today Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleToday}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
              "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            Today
          </motion.button>

          {/* Navigation Arrows */}
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handlePrevWeek}
              className={cn(
                "p-2 rounded-lg transition-colors",
                "hover:bg-accent text-muted-foreground hover:text-foreground"
              )}
              aria-label="Previous week"
            >
              <ChevronLeft className="w-5 h-5" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleNextWeek}
              className={cn(
                "p-2 rounded-lg transition-colors",
                "hover:bg-accent text-muted-foreground hover:text-foreground"
              )}
              aria-label="Next week"
            >
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          </div>

          {/* Week Range Display */}
          <div className="text-xl font-semibold text-foreground">
            {weekRange}
          </div>
        </div>

        {/* Keyboard Shortcuts Info */}
        <div className="hidden lg:flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <kbd className="px-2 py-1 bg-accent rounded border">⌘/Ctrl</kbd>
            <span>+</span>
            <kbd className="px-2 py-1 bg-accent rounded border">←</kbd>
            <kbd className="px-2 py-1 bg-accent rounded border">→</kbd>
            <span className="ml-1">Navigate</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-2 py-1 bg-accent rounded border">⌘/Ctrl</kbd>
            <span>+</span>
            <kbd className="px-2 py-1 bg-accent rounded border">T</kbd>
            <span className="ml-1">Today</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <CalendarGrid
        date={selectedDate}
        timeBlocks={timeBlocks}
        onTimeSlotClick={handleTimeSlotClick}
        onBlockClick={handleBlockClick}
      />
    </div>
  );
}
