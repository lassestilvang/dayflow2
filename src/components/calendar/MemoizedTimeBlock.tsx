"use client";

import React, { memo, useMemo, useRef, useEffect } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Clock, Users, MapPin, GripVertical } from "lucide-react";
import type { TimeBlock as TimeBlockType, Event } from "@/types";
import { cn } from "@/lib/utils";
import { formatTime, isTimePast } from "@/lib/calendar-utils";
import { useAppStore } from "@/lib/store";
import { dragPerformanceMonitor } from "@/lib/performance-monitor";

interface MemoizedTimeBlockProps {
  block: TimeBlockType;
  top: number;
  height: number;
  left?: number;
  width?: number;
  onClick?: () => void;
  isDragging?: boolean;
  dragTransform?: { x: number; y: number };
}

// Custom comparison function for selective memoization
const arePropsEqual = (
  prevProps: MemoizedTimeBlockProps,
  nextProps: MemoizedTimeBlockProps
): boolean => {
  // Always re-render if dragging state changed
  if (prevProps.isDragging !== nextProps.isDragging) {
    return false;
  }

  // Always re-render if drag transform changed
  if (
    prevProps.dragTransform?.x !== nextProps.dragTransform?.x ||
    prevProps.dragTransform?.y !== nextProps.dragTransform?.y
  ) {
    return false;
  }

  // Re-render if position changed significantly (more than 1px)
  if (
    Math.abs(prevProps.top - nextProps.top) > 1 ||
    Math.abs(prevProps.height - nextProps.height) > 1 ||
    Math.abs((prevProps.left || 0) - (nextProps.left || 0)) > 1 ||
    Math.abs((prevProps.width || 0) - (nextProps.width || 0)) > 1
  ) {
    return false;
  }

  // Re-render if block data changed
  if (prevProps.block.id !== nextProps.block.id) {
    return false;
  }

  // For performance, only check critical time fields
  const prevData = prevProps.block.data;
  const nextData = nextProps.block.data;

  if (
    prevData.title !== nextData.title ||
    prevData.category !== nextData.category ||
    ("startTime" in prevData && "startTime" in nextData &&
     prevData.startTime.getTime() !== nextData.startTime.getTime()) ||
    ("endTime" in prevData && "endTime" in nextData &&
     prevData.endTime.getTime() !== nextData.endTime.getTime())
  ) {
    return false;
  }

  return true;
};

export const MemoizedTimeBlock = memo(function MemoizedTimeBlock({
  block,
  top,
  height,
  left = 0,
  width = 100,
  onClick,
  isDragging: externalIsDragging,
  dragTransform,
}: MemoizedTimeBlockProps) {
  const { data, type } = block;
  const renderStartTime = useRef(performance.now());

  // Use global drag state if not provided externally
  const globalIsDragging = useAppStore((state) => state.drag.isDragging);
  const isDragging = externalIsDragging ?? globalIsDragging;

  // Setup draggable for events/tasks on calendar
  const {
    attributes,
    listeners,
    setNodeRef,
    transform: dndTransform,
  } = useDraggable({
    id: `block-${block.id}`,
    data: {
      id: block.id,
      type: type,
      isScheduled: true,
    },
  });

  // Use external transform if provided, otherwise use DnD transform
  const finalTransform = dragTransform || dndTransform;

  // Memoize expensive calculations
  const computedStyles = useMemo(() => {
    const baseStyle = {
      top: `${top}px`,
      height: `${height}px`,
      left: `${left}%`,
      width: `${width}%`,
      minHeight: "30px",
    };

    if (finalTransform) {
      return {
        ...baseStyle,
        transform: `translate3d(${finalTransform.x}px, ${finalTransform.y}px, 0)`,
        transition: "none",
      };
    }

    return baseStyle;
  }, [top, height, left, width, finalTransform]);

  // Memoize category styling
  const categoryStyling = useMemo(() => {
    const categoryColors = {
      work: "bg-blue-500 hover:bg-blue-600",
      family: "bg-green-500 hover:bg-green-600",
      personal: "bg-orange-500 hover:bg-orange-600",
      travel: "bg-purple-500 hover:bg-purple-600",
    };

    const categoryBorders = {
      work: "border-blue-600",
      family: "border-green-600",
      personal: "border-orange-600",
      travel: "border-purple-600",
    };

    return {
      colors: categoryColors[data.category] || "bg-gray-500 hover:bg-gray-600",
      borders: categoryBorders[data.category] || "border-gray-600",
    };
  }, [data.category]);

  // Memoize attendee calculations for events
  const attendeeInfo = useMemo(() => {
    if (type === "event") {
      const event = data as Event;
      if (event.isShared && event.attendees.length > 0) {
        return {
          names: event.attendees.map((a) => a.name.split(" ")[0]).join(", "),
          count: event.attendees.length,
        };
      }
    }
    return null;
  }, [data, type]);

  // Memoize location for events
  const location = useMemo(() => {
    return type === "event" ? (data as Event).location : undefined;
  }, [data, type]);

  // Memoize time formatting
  const formattedTime = useMemo(() => {
    return {
      start: formatTime(block.startTime),
      end: formatTime(block.endTime),
    };
  }, [block.startTime, block.endTime]);

  // Memoize past state
  const isPast = useMemo(() => {
    return isTimePast(block.endTime);
  }, [block.endTime]);

  // Memoize details visibility
  const showDetails = useMemo(() => {
    return height > 60;
  }, [height]);

  // Performance monitoring
  useEffect(() => {
    const renderTime = performance.now() - renderStartTime.current;

    // Track slow renders
    if (renderTime > 2) { // More than 2ms is considered slow for this component
      dragPerformanceMonitor.recordRender(`timeblock-${block.id}`);
    }
  });

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={cn(
        "absolute rounded-lg border-l-4 shadow-sm cursor-pointer overflow-hidden",
        "transition-all duration-200",
        categoryStyling.colors,
        categoryStyling.borders,
        isPast && "opacity-60",
        isDragging && "opacity-40 cursor-grabbing z-50",
        "group"
      )}
      style={computedStyles}
    >
      <div className="h-full flex flex-col p-2 text-white text-xs overflow-hidden">
        {/* Header: Drag Handle, Title and Type Badge */}
        <div className="flex items-start justify-between gap-1 mb-1">
          <div className="flex items-start gap-1 flex-1 min-w-0">
            {/* Drag Handle - Visible on hover */}
            <button
              {...listeners}
              {...attributes}
              className="flex-shrink-0 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
              aria-label="Drag to reschedule"
            >
              <GripVertical className="w-3 h-3" />
            </button>
            <div className="font-semibold truncate flex-1 leading-tight">
              {data.title}
            </div>
          </div>
          {type === "task" && (
            <div className="flex-shrink-0 px-1.5 py-0.5 bg-white/20 rounded text-[10px] font-medium">
              Task
            </div>
          )}
        </div>

        {/* Time */}
        <div className="flex items-center gap-1 opacity-90">
          <Clock className="w-3 h-3 flex-shrink-0" />
          <span className="text-[10px] truncate">
            {formattedTime.start} - {formattedTime.end}
          </span>
        </div>

        {/* Additional details for taller blocks */}
        {showDetails && (
          <div className="mt-1 space-y-1 flex-1 overflow-hidden">
            {/* Location */}
            {location && (
              <div className="flex items-center gap-1 opacity-90">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="text-[10px] truncate">{location}</span>
              </div>
            )}

            {/* Attendees */}
            {attendeeInfo && (
              <div className="flex items-center gap-1 opacity-90">
                <Users className="w-3 h-3 flex-shrink-0" />
                <span className="text-[10px] truncate">{attendeeInfo.names}</span>
              </div>
            )}

            {/* Description for very tall blocks */}
            {height > 100 && data.description && (
              <div className="text-[10px] opacity-80 mt-1 line-clamp-2">
                {data.description}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hover effect overlay */}
      <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none" />
    </div>
  );
}, arePropsEqual);