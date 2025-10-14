import React, { useMemo, useRef, useState, useCallback } from "react";
import { useDroppable } from "@dnd-kit/core";
import { format, isToday } from "date-fns";
import type { TimeBlock as TimeBlockType } from "@/types";
import { MemoizedTimeBlock } from "./MemoizedTimeBlock";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import {
  getHourSlots,
  calculateEventPosition,
  getBlocksForDay,
  groupOverlappingBlocks,
  createTimeOnDay,
} from "@/lib/calendar-utils";
import { DragMemoizationProvider } from "./DragMemoizationContext";
import { DragStateBoundary, createBoundaryConfig } from "./DragStateBoundary";

interface VirtualTimeGridProps {
  date: Date;
  timeBlocks: TimeBlockType[];
  onTimeSlotClick?: (date: Date) => void;
  onBlockClick?: (block: TimeBlockType) => void;
  containerHeight?: number;
  slotHeight?: number;
  overscan?: number;
}

// Individual virtual time slot component with droppable functionality
const VirtualTimeSlot = React.memo(function VirtualTimeSlot({
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

export const VirtualTimeGrid = React.memo(function VirtualTimeGrid({
  date,
  timeBlocks,
  onTimeSlotClick,
  onBlockClick,
  containerHeight = 600,
  slotHeight = 60,
  overscan = 5,
}: VirtualTimeGridProps) {
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const hourSlots = useMemo(() => getHourSlots(), []);
  const openEventModal = useAppStore((state) => state.openEventModal);

  // Use render optimization
  // const _optimizer = useRenderOptimizer(`virtual-grid-${date.toISOString()}`, {
  //   throttleMs: 16,
  //   priority: 3,
  //   enableProfiling: true,
  // });

  // Memoize day-specific blocks to avoid recalculating on every render
  const dayBlocksData = useMemo(
    () => getBlocksForDay(timeBlocks, date),
    [timeBlocks, date]
  );

  // Memoize overlapping groups calculation
  const overlappingGroups = useMemo(
    () => groupOverlappingBlocks(dayBlocksData),
    [dayBlocksData]
  );

  // Memoize position calculations for each block using cached positions
  const blockPositions = useMemo(() => {
    const positions = new Map<string, { top: number; height: number }>();
    dayBlocksData.forEach((block) => {
      positions.set(block.id, calculateEventPosition(block.data));
    });
    return positions;
  }, [dayBlocksData]);

  // Get blocks for this specific day and calculate positions
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

  // Check if a time slot has any blocks - memoized for performance
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

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / slotHeight) - overscan);
    const endIndex = Math.min(
      hourSlots.length - 1,
      Math.floor((scrollTop + containerHeight) / slotHeight) + overscan
    );
    return { startIndex, endIndex };
  }, [scrollTop, containerHeight, slotHeight, hourSlots.length, overscan]);

  // Get visible slots
  const visibleSlots = useMemo(() => {
    const slots = [];
    for (let i = visibleRange.startIndex; i <= visibleRange.endIndex; i++) {
      const hour = hourSlots[i];
      if (hour !== undefined) {
        slots.push({
          index: i,
          hour,
          hasBlocks: hasBlocksInSlot(hour),
        });
      }
    }
    return slots;
  }, [visibleRange, hourSlots, hasBlocksInSlot]);

  // Handle scroll events
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  // Handle time slot click
  const handleTimeSlotClick = useCallback((hour: number) => {
    const clickedTime = createTimeOnDay(date, hour);

    // Open event modal with prefilled date/time
    const endTime = new Date(clickedTime.getTime() + 60 * 60 * 1000); // 1 hour duration
    openEventModal({
      startTime: clickedTime,
      endTime: endTime,
    });

    onTimeSlotClick?.(clickedTime);
  }, [date, openEventModal, onTimeSlotClick]);

  // Calculate total content height
  const totalHeight = hourSlots.length * slotHeight;

  return (
    <DragMemoizationProvider optimizationLevel="moderate">
      <DragStateBoundary
        boundaryId={`virtual-grid-${date.toISOString()}`}
        {...createBoundaryConfig.calendarGrid()}
      >
        <div className="relative flex flex-col" style={{ minWidth: "200px", width: "200px" }}>
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

          {/* Virtual scrolling container */}
          <div
            ref={scrollElementRef}
            className="relative flex-1 overflow-auto"
            style={{ height: containerHeight }}
            onScroll={handleScroll}
          >
            <div style={{ height: totalHeight, position: "relative" }}>
              {/* Render only visible slots */}
              {visibleSlots.map(({ index, hour, hasBlocks }) => (
                <VirtualTimeSlot
                  key={`${date.toISOString()}-${hour}`}
                  day={date}
                  hour={hour}
                  hasBlocks={hasBlocks}
                  onClick={() => handleTimeSlotClick(hour)}
                  style={{
                    position: "absolute",
                    top: index * slotHeight,
                    width: "100%",
                    height: slotHeight,
                  }}
                  isVisible={true}
                />
              ))}

              {/* Time blocks positioned absolutely */}
              <div
                className="absolute top-0 left-0 right-0 pointer-events-none"
                style={{ height: totalHeight }}
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
        </div>
      </DragStateBoundary>
    </DragMemoizationProvider>
  );
});