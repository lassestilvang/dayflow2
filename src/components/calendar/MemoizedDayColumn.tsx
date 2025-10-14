import React, { memo, useMemo, useRef, useEffect, useCallback } from "react";
import { useDroppable } from "@dnd-kit/core";
import { format, isToday } from "date-fns";
import type { TimeBlock as TimeBlockType } from "@/types";
import { MemoizedTimeBlock } from "./MemoizedTimeBlock";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import {
  getHourSlots,
  getBlocksForDay,
  groupOverlappingBlocks,
  createTimeOnDay,
} from "@/lib/calendar-utils";
import { dragPerformanceMonitor } from "@/lib/performance-monitor";
import { positionCache } from "@/lib/position-cache";

interface MemoizedDayColumnProps {
  date: Date;
  timeBlocks: TimeBlockType[];
  onTimeSlotClick?: (date: Date) => void;
  onBlockClick?: (block: TimeBlockType) => void;
  containerHeight?: number;
  slotHeight?: number;
}

// Custom comparison function for day column memoization
const areDayColumnPropsEqual = (
  prevProps: MemoizedDayColumnProps,
  nextProps: MemoizedDayColumnProps
): boolean => {
  // Always re-render if date changed
  if (prevProps.date.getTime() !== nextProps.date.getTime()) {
    return false;
  }

  // Check if timeBlocks array length changed
  if (prevProps.timeBlocks.length !== nextProps.timeBlocks.length) {
    return false;
  }

  // For performance, only check critical fields of timeBlocks
  for (let i = 0; i < prevProps.timeBlocks.length; i++) {
    const prevBlock = prevProps.timeBlocks[i];
    const nextBlock = nextProps.timeBlocks[i];

    if (!prevBlock || !nextBlock) return false;

    if (
      prevBlock.id !== nextBlock.id ||
      prevBlock.startTime.getTime() !== nextBlock.startTime.getTime() ||
      prevBlock.endTime.getTime() !== nextBlock.endTime.getTime() ||
      prevBlock.data.title !== nextBlock.data.title ||
      prevBlock.data.category !== nextBlock.data.category
    ) {
      return false;
    }
  }

  // Check if container dimensions changed significantly
  if (
    Math.abs(
      (prevProps.containerHeight || 600) - (nextProps.containerHeight || 600)
    ) > 10 ||
    Math.abs((prevProps.slotHeight || 60) - (nextProps.slotHeight || 60)) > 5
  ) {
    return false;
  }

  return true;
};

// Memoized time slot component
const MemoizedTimeSlot = memo(function MemoizedTimeSlot({
  day,
  hour,
  hasBlocks,
  onClick,
  style,
  isVisible,
}: {
  day: Date;
  hour: number;
  hasBlocks: boolean;
  onClick: () => void;
  style: React.CSSProperties;
  isVisible: boolean;
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

  if (!isVisible) {
    return (
      <div
        style={{
          ...style,
          height: style.height || 60,
        }}
      />
    );
  }

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
      style={style}
      onClick={onClick}
    >
      {/* Drop zone indicator when dragging over */}
      {isOver && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="bg-primary/20 border-2 border-dashed border-primary rounded-lg w-[90%] h-[90%] flex items-center justify-center">
            <span className="text-xs font-medium text-primary">Drop here</span>
          </div>
        </div>
      )}

      {/* Conflict indicator */}
      {hasBlocks && isDragging && !isOver && (
        <div className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full opacity-50" />
      )}
    </div>
  );
});

export const MemoizedDayColumn = memo(function MemoizedDayColumn({
  date,
  timeBlocks,
  onTimeSlotClick,
  onBlockClick,
  // @ts-expect-error containerHeight is optional and defaults are applied below
  containerHeight = 600,
  slotHeight = 60,
}: MemoizedDayColumnProps) {
  const renderStartTime = useRef(performance.now());
  const hourSlots = useMemo(() => getHourSlots(), []);

  // Memoize day-specific blocks with smart dependency tracking
  const dayBlocksData = useMemo(() => {
    return getBlocksForDay(timeBlocks, date);
  }, [timeBlocks, date]);

  // Memoize overlapping groups calculation
  const overlappingGroups = useMemo(() => {
    return groupOverlappingBlocks(dayBlocksData);
  }, [dayBlocksData]);

  // Memoize position calculations using cached positions
  const blockPositions = useMemo(() => {
    const positions = new Map<string, { top: number; height: number }>();
    dayBlocksData.forEach((block) => {
      positions.set(block.id, positionCache.getPosition(block.data));
    });
    return positions;
  }, [dayBlocksData]);

  // Memoize final block layout with position and overlap calculations
  const dayBlocks = useMemo(() => {
    return dayBlocksData.map((block) => {
      const position = blockPositions.get(block.id)!;

      // Find which group this block belongs to
      const groupIndex = overlappingGroups.findIndex((group) =>
        group.some((b) => b.id === block.id)
      );

      if (groupIndex !== -1) {
        const group = overlappingGroups[groupIndex];
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
  }, [dayBlocksData, overlappingGroups, blockPositions]);

  // Memoize slot conflict detection
  const hasBlocksInSlot = useMemo(() => {
    const blockHourRanges = dayBlocks.map(({ block }) => ({
      start: block.startTime.getHours(),
      end: block.endTime.getHours(),
    }));

    return (hour: number): boolean => {
      return blockHourRanges.some(
        (range) => hour >= range.start && hour < range.end
      );
    };
  }, [dayBlocks]);

  // Memoize time slot click handler
  const handleTimeSlotClick = useCallback(
    (hour: number) => {
      const clickedTime = createTimeOnDay(date, hour);

      // Open event modal with prefilled date/time
      const endTime = new Date(clickedTime.getTime() + 60 * 60 * 1000); // 1 hour duration
      useAppStore.getState().openEventModal({
        startTime: clickedTime,
        endTime: endTime,
      });

      onTimeSlotClick?.(clickedTime);
    },
    [date, onTimeSlotClick]
  );

  // Performance monitoring
  useEffect(() => {
    const renderTime = performance.now() - renderStartTime.current;

    // Track slow renders for day column
    if (renderTime > 5) {
      // More than 5ms is considered slow for this component
      dragPerformanceMonitor.recordRender(`daycolumn-${date.toISOString()}`);
    }
  });

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
          <MemoizedTimeSlot
            key={`${date.toISOString()}-${hour}`}
            day={date}
            hour={hour}
            hasBlocks={hasBlocksInSlot(hour)}
            onClick={() => handleTimeSlotClick(hour)}
            style={{
              position: "absolute",
              top: hour * slotHeight,
              width: "100%",
              height: slotHeight,
            }}
            isVisible={true}
          />
        ))}

        {/* Time blocks positioned absolutely */}
        <div
          className="absolute top-0 left-0 right-0 pointer-events-none"
          style={{ height: `${hourSlots.length * slotHeight}px` }}
        >
          <div className="relative h-full pointer-events-auto">
            {dayBlocks.map(({ block, top, height, left, width }) => (
              <MemoizedTimeBlock
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
}, areDayColumnPropsEqual);
