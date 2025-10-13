"use client";

import { useDraggable } from "@dnd-kit/core";
import { Clock, Users, MapPin, GripVertical } from "lucide-react";
import type { TimeBlock as TimeBlockType, Event } from "@/types";
import { cn } from "@/lib/utils";
import { formatTime, isTimePast } from "@/lib/calendar-utils";

interface TimeBlockProps {
  block: TimeBlockType;
  top: number;
  height: number;
  left?: number;
  width?: number;
  onClick?: () => void;
}

export function TimeBlock({
  block,
  top,
  height,
  left = 0,
  width = 100,
  onClick,
}: TimeBlockProps) {
  const { data, type } = block;
  const isPast = isTimePast(block.endTime);

  // Setup draggable for events/tasks on calendar
  const { attributes, listeners, setNodeRef, isDragging, transform } =
    useDraggable({
      id: `block-${block.id}`,
      data: {
        id: block.id,
        type: type,
        isScheduled: true,
      },
    });

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

  // Get attendees for shared events
  const getAttendeeNames = () => {
    if (type === "event") {
      const event = data as Event;
      if (event.isShared && event.attendees.length > 0) {
        return event.attendees.map((a) => a.name.split(" ")[0]).join(", ");
      }
    }
    return null;
  };

  const attendeeNames = getAttendeeNames();
  const location = type === "event" ? (data as Event).location : undefined;
  const showDetails = height > 60; // Show more details for taller blocks

  // Apply transform during drag
  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        transition: "none",
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={cn(
        "absolute rounded-lg border-l-4 shadow-sm cursor-pointer overflow-hidden",
        "transition-all duration-200",
        categoryColors[data.category],
        categoryBorders[data.category],
        isPast && "opacity-60",
        isDragging && "opacity-40 cursor-grabbing z-50",
        "group"
      )}
      style={{
        top: `${top}px`,
        height: `${height}px`,
        left: `${left}%`,
        width: `${width}%`,
        minHeight: "30px",
        ...style,
      }}
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
            {formatTime(block.startTime)} - {formatTime(block.endTime)}
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
            {attendeeNames && (
              <div className="flex items-center gap-1 opacity-90">
                <Users className="w-3 h-3 flex-shrink-0" />
                <span className="text-[10px] truncate">{attendeeNames}</span>
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
}
