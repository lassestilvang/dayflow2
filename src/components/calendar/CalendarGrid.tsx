"use client";

import { useState, useEffect, useMemo, RefObject } from "react";
import { format, isToday } from "date-fns";
import { motion } from "framer-motion";
import type { TimeBlock as TimeBlockType } from "@/types";
import { DayColumn } from "./DayColumn";
import { cn } from "@/lib/utils";
import { getHourSlots, getCurrentTimePosition } from "@/lib/calendar-utils";
import { SCROLL_CONFIG } from "@/lib/scroll-utils";

interface CalendarGridProps {
  timeBlocks: TimeBlockType[];
  onTimeSlotClick?: (date: Date) => void;
  onBlockClick?: (block: TimeBlockType) => void;
  scrollRef: RefObject<HTMLDivElement>;
  renderedDays: Date[];
  visibleDays: Date[];
  isScrolling: boolean;
}

export function CalendarGrid({
  timeBlocks,
  onTimeSlotClick,
  onBlockClick,
  scrollRef,
  renderedDays,
  visibleDays,
  isScrolling,
}: CalendarGridProps) {
  const [mounted, setMounted] = useState(false);
  const [currentTimePosition, setCurrentTimePosition] = useState(0);
  const hourSlots = useMemo(() => getHourSlots(), []);

  // Initialize mounted state and current time position on client-side only
  useEffect(() => {
    setMounted(true);
    setCurrentTimePosition(getCurrentTimePosition());
  }, []);

  // Update current time indicator every minute
  useEffect(() => {
    if (!mounted) return;

    const interval = setInterval(() => {
      setCurrentTimePosition(getCurrentTimePosition());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [mounted]);

  // Find today's index in visible days for current time indicator
  const todayIndex = visibleDays.findIndex((day) => isToday(day));
  const showCurrentTimeIndicator =
    mounted && todayIndex !== -1 && currentTimePosition >= 0;

  // Static reference date for consistent time formatting (server & client)
  const referenceDate = new Date(2024, 0, 1); // Jan 1, 2024

  // Calculate the left position of the current time indicator
  const currentTimeLeft =
    todayIndex >= 0 ? 80 + todayIndex * SCROLL_CONFIG.DAY_WIDTH : 0;

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden relative" data-testid="calendar-grid">
      {/* Horizontal scroll container */}
      <div
        ref={scrollRef}
        className={cn(
          "flex-1 overflow-x-auto overflow-y-auto",
          "scroll-smooth"
        )}
        style={{
          scrollBehavior: isScrolling ? "auto" : "smooth",
        }}
      >
        <div className="flex" style={{ minHeight: `${88 + hourSlots.length * 60}px` }}>
          {/* Time labels column (fixed on left) */}
          <div className="sticky left-0 z-30 bg-background border-r">
            {/* Empty header space */}
            <div
              className="h-[88px] border-b bg-background/95 backdrop-blur"
              style={{ width: "80px" }}
            />

            {/* Time labels */}
            <div className="relative">
              {hourSlots.map((hour) => (
                <div
                  key={hour}
                  className="border-b border-border/50 px-2 py-2 text-right"
                  style={{ height: "60px", width: "80px" }}
                >
                  <span className="text-xs text-muted-foreground">
                    {format(
                      new Date(referenceDate).setHours(hour, 0),
                      "h:mm a"
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Day columns */}
          <div className="flex relative">
            {renderedDays.map((day) => (
              <DayColumn
                key={day.toISOString()}
                date={day}
                timeBlocks={timeBlocks}
                onTimeSlotClick={onTimeSlotClick}
                onBlockClick={onBlockClick}
              />
            ))}

            {/* Current time indicator */}
            {showCurrentTimeIndicator && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute z-10 pointer-events-none"
                style={{
                  top: `${88 + currentTimePosition}px`,
                  left: `${currentTimeLeft}px`,
                  width: `${SCROLL_CONFIG.DAY_WIDTH}px`,
                }}
              >
                <div className="flex items-center h-0.5 bg-primary relative">
                  <div
                    className="absolute left-0 w-2 h-2 bg-primary rounded-full"
                    style={{ top: "-3px" }}
                  />
                  <div className="absolute left-2 top-[-12px] px-2 py-0.5 bg-primary text-primary-foreground text-[10px] font-semibold rounded whitespace-nowrap">
                    {format(new Date(), "h:mm a")}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
