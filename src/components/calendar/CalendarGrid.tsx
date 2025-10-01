"use client";

import { useState, useEffect, useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { format, isToday } from "date-fns";
import { motion } from "framer-motion";
import type { TimeBlock as TimeBlockType, Event } from "@/types";
import { TimeBlock } from "./TimeBlock";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import {
  getWeekDays,
  getHourSlots,
  calculateEventPosition,
  getBlocksForDay,
  getCurrentTimePosition,
  createTimeOnDay,
  groupOverlappingBlocks,
} from "@/lib/calendar-utils";

interface CalendarGridProps {
  date: Date;
  timeBlocks: TimeBlockType[];
  onTimeSlotClick?: (date: Date) => void;
  onBlockClick?: (block: TimeBlockType) => void;
}

// Individual time slot component with droppable functionality
function TimeSlot({
  day,
  hour,
  hasBlocks,
  onClick,
}: {
  day: Date;
  hour: number;
  hasBlocks: boolean;
  onClick: () => void;
}) {
  const isDragging = useAppStore((state) => state.drag.isDragging);

  const { setNodeRef, isOver } = useDroppable({
    id: `timeslot-${day.toISOString()}-${hour}`,
    data: {
      type: "timeslot",
      date: day,
      hour,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative flex-1 border-r last:border-r-0",
        "min-h-[60px] cursor-pointer transition-all",
        isToday(day) && "bg-primary/[0.02]",
        // Visual feedback during drag
        isDragging && !isOver && "hover:bg-accent/30",
        // Highlight when dragging over
        isOver && "bg-primary/10 ring-2 ring-primary ring-inset",
        // Show subtle indicator if slot has conflicts
        hasBlocks && isDragging && "bg-orange-500/5"
      )}
      onClick={onClick}
    >
      {/* Drop zone indicator when dragging over */}
      {isOver && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute inset-0 pointer-events-none flex items-center justify-center"
        >
          <div className="bg-primary/20 border-2 border-dashed border-primary rounded-lg w-[90%] h-[90%] flex items-center justify-center">
            <span className="text-xs font-medium text-primary">Drop here</span>
          </div>
        </motion.div>
      )}

      {/* Conflict indicator */}
      {hasBlocks && isDragging && !isOver && (
        <div className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full opacity-50" />
      )}
    </div>
  );
}

export function CalendarGrid({
  date,
  timeBlocks,
  onTimeSlotClick,
  onBlockClick,
}: CalendarGridProps) {
  const [mounted, setMounted] = useState(false);
  const [currentTimePosition, setCurrentTimePosition] = useState(0);
  const weekDays = useMemo(() => getWeekDays(date), [date]);
  const hourSlots = useMemo(() => getHourSlots(), []);

  const openEventModal = useAppStore((state) => state.openEventModal);

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

  // Get blocks for each day and handle positioning
  const dayBlocks = useMemo(() => {
    return weekDays.map((day) => {
      const blocks = getBlocksForDay(timeBlocks, day);
      const groups = groupOverlappingBlocks(blocks);

      // Calculate positions for overlapping blocks
      return blocks.map((block) => {
        const eventData: Event | { startTime: Date; endTime: Date } =
          "startTime" in block.data
            ? block.data
            : {
                startTime: block.startTime,
                endTime: block.endTime,
              };

        const position = calculateEventPosition(eventData as Event);

        // Find which group this block belongs to
        const groupIndex = groups.findIndex((group) =>
          group.some((b) => b.id === block.id)
        );

        if (groupIndex !== -1) {
          const group = groups[groupIndex];
          if (!group) {
            return {
              block,
              top: position.top,
              height: position.height,
              left: 0,
              width: 100,
            };
          }
          const blockIndexInGroup = group.findIndex((b) => b.id === block.id);
          const groupSize = group.length;

          return {
            block,
            top: position.top,
            height: position.height,
            left: (blockIndexInGroup / groupSize) * 100,
            width: 100 / groupSize,
          };
        }

        return {
          block,
          top: position.top,
          height: position.height,
          left: 0,
          width: 100,
        };
      });
    });
  }, [weekDays, timeBlocks]);

  // Check if a time slot has any blocks
  const hasBlocksInSlot = (dayIndex: number, hour: number): boolean => {
    const blocks = dayBlocks[dayIndex] || [];
    return blocks.some(({ block }) => {
      const startHour = block.startTime.getHours();
      const endHour = block.endTime.getHours();
      return hour >= startHour && hour < endHour;
    });
  };

  const handleTimeSlotClick = (day: Date, hour: number) => {
    const clickedTime = createTimeOnDay(day, hour);

    // Open event modal with prefilled date/time
    const endTime = new Date(clickedTime.getTime() + 60 * 60 * 1000); // 1 hour duration
    openEventModal({
      startTime: clickedTime,
      endTime: endTime,
    });

    onTimeSlotClick?.(clickedTime);
  };

  const todayIndex = weekDays.findIndex((day) => isToday(day));
  const showCurrentTimeIndicator =
    mounted && todayIndex !== -1 && currentTimePosition >= 0;

  // Static reference date for consistent time formatting (server & client)
  const referenceDate = new Date(2024, 0, 1); // Jan 1, 2024

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="min-w-[900px]">
        {/* Day headers */}
        <div className="sticky top-0 z-20 flex border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="w-20 flex-shrink-0 border-r" />
          {weekDays.map((day, _dayIndex) => (
            <div
              key={day.toISOString()}
              className={cn(
                "flex-1 border-r px-4 py-3 text-center last:border-r-0",
                isToday(day) && "bg-primary/5"
              )}
            >
              <div className="text-xs font-medium text-muted-foreground uppercase">
                {format(day, "EEE")}
              </div>
              <div
                className={cn(
                  "mt-1 text-2xl font-bold",
                  isToday(day) && "text-primary"
                )}
              >
                {format(day, "d")}
              </div>
            </div>
          ))}
        </div>

        {/* Time grid */}
        <div className="relative">
          {hourSlots.map((hour) => (
            <div key={hour} className="flex border-b border-border/50">
              {/* Time label */}
              <div className="w-20 flex-shrink-0 border-r px-2 py-2 text-right">
                <span className="text-xs text-muted-foreground">
                  {format(new Date(referenceDate).setHours(hour, 0), "h:mm a")}
                </span>
              </div>

              {/* Day columns */}
              {weekDays.map((day, dayIndex) => (
                <TimeSlot
                  key={`${day.toISOString()}-${hour}`}
                  day={day}
                  hour={hour}
                  hasBlocks={hasBlocksInSlot(dayIndex, hour)}
                  onClick={() => handleTimeSlotClick(day, hour)}
                />
              ))}
            </div>
          ))}

          {/* Render all time blocks positioned absolutely */}
          {weekDays.map((day, dayIndex) => (
            <div
              key={`blocks-${day.toISOString()}`}
              className="absolute top-0 left-20 right-0 pointer-events-none"
              style={{ height: `${hourSlots.length * 60}px` }}
            >
              <div className="relative h-full flex">
                {weekDays.map((_, colIndex) => (
                  <div
                    key={colIndex}
                    className={cn(
                      "relative flex-1",
                      colIndex === dayIndex && "pointer-events-auto"
                    )}
                  >
                    {colIndex === dayIndex &&
                      dayBlocks[dayIndex]?.map(
                        ({ block, top, height, left, width }) => (
                          <TimeBlock
                            key={block.id}
                            block={block}
                            top={top}
                            height={height}
                            left={left}
                            width={width}
                            onClick={() => onBlockClick?.(block)}
                          />
                        )
                      )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Current time indicator */}
          {showCurrentTimeIndicator && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute left-0 right-0 z-10 pointer-events-none"
              style={{ top: `${currentTimePosition}px` }}
            >
              <div className="flex items-center">
                <div className="w-20 flex-shrink-0 pr-2 text-right">
                  <div className="inline-block px-2 py-0.5 bg-primary text-primary-foreground text-[10px] font-semibold rounded">
                    {format(new Date(), "h:mm a")}
                  </div>
                </div>
                <div className="flex-1 h-0.5 bg-primary relative">
                  <div
                    className="absolute left-0 w-2 h-2 bg-primary rounded-full"
                    style={{ top: "-3px" }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
