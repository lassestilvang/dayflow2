import React, { useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { format, isToday } from "date-fns";
import { motion } from "framer-motion";
import type { TimeBlock as TimeBlockType } from "@/types";
import { TimeBlock } from "./TimeBlock";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import {
  getHourSlots,
  calculateEventPosition,
  getBlocksForDay,
  createTimeOnDay,
} from "@/lib/calendar-utils";

interface DayColumnProps {
  date: Date;
  timeBlocks: TimeBlockType[][];
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
        "relative border-b border-border/50",
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

export const DayColumn = React.memo(function DayColumn({
  date,
  timeBlocks,
  onTimeSlotClick,
  onBlockClick,
}: DayColumnProps) {
  const hourSlots = useMemo(() => getHourSlots(), []);
  const openEventModal = useAppStore((state) => state.openEventModal);

  // Get blocks for this specific day and calculate positions
  const dayBlocks = useMemo(() => {
    const startTime = performance.now();
    const blocks = getBlocksForDay(timeBlocks.flat(), date);

    const result = blocks.map((block) => {
      const position = calculateEventPosition(block.data);

      // Find which group this block belongs to
      const groupIndex = timeBlocks.findIndex((group) =>
        group.some((b) => b.id === block.id)
      );

      if (groupIndex !== -1) {
        const group = timeBlocks[groupIndex];
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
    const endTime = performance.now();
    console.log(
      `[PERF] DayColumn ${format(date, "yyyy-MM-dd")} dayBlocks: ${endTime - startTime}ms for ${blocks.length} blocks`
    );
    return result;
  }, [date, timeBlocks]);

  // Check if a time slot has any blocks
  const hasBlocksInSlot = (hour: number): boolean => {
    return dayBlocks.some(({ block }) => {
      const startHour = block.startTime.getHours();
      const endHour = block.endTime.getHours();
      return hour >= startHour && hour < endHour;
    });
  };

  const handleTimeSlotClick = (hour: number) => {
    const clickedTime = createTimeOnDay(date, hour);

    // Open event modal with prefilled date/time
    const endTime = new Date(clickedTime.getTime() + 60 * 60 * 1000); // 1 hour duration
    openEventModal({
      startTime: clickedTime,
      endTime: endTime,
    });

    onTimeSlotClick?.(clickedTime);
  };

  return (
    <div
      className="relative flex flex-col"
      style={{ minWidth: "200px", width: "200px" }}
    >
      {/* Day header */}
      <div
        className={cn(
          "sticky top-0 z-20 border-b border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
          "px-4 py-3 text-center",
          isToday(date) && "bg-primary/5"
        )}
      >
        <div className="text-xs font-medium text-muted-foreground uppercase">
          {format(date, "EEE")}
        </div>
        <div
          className={cn(
            "mt-1 text-2xl font-bold",
            isToday(date) && "text-primary"
          )}
        >
          {format(date, "d")}
        </div>
      </div>

      {/* Time slots */}
      <div className="relative flex-1">
        {hourSlots.map((hour) => (
          <TimeSlot
            key={`${date.toISOString()}-${hour}`}
            day={date}
            hour={hour}
            hasBlocks={hasBlocksInSlot(hour)}
            onClick={() => handleTimeSlotClick(hour)}
          />
        ))}

        {/* Time blocks positioned absolutely */}
        <div
          className="absolute top-0 left-0 right-0 pointer-events-none"
          style={{ height: `${hourSlots.length * 60}px` }}
        >
          <div className="relative h-full pointer-events-auto">
            {dayBlocks.map(({ block, top, height, left, width }) => (
              <TimeBlock
                key={block.id}
                block={block}
                top={top}
                height={height}
                left={left}
                width={width}
                onClick={() => onBlockClick?.(block)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});
