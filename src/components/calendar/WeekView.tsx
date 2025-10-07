"use client";

import { useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useCalendar } from "@/hooks/useCalendar";
import { CalendarGrid } from "./CalendarGrid";
import { TimeBlock } from "@/types";

export function WeekView() {
  const { scrollRef, renderedDays, visibleDays, timeBlocks, scrollToDate } =
    useCalendar();

  const handleTimeSlotClick = (date: Date) => {
    // Logic to handle time slot click
  };

  const handleBlockClick = (block: TimeBlock) => {
    // Logic to handle block click
  };

  return (
    <CalendarGrid
      timeBlocks={timeBlocks}
      onTimeSlotClick={handleTimeSlotClick}
      onBlockClick={handleBlockClick}
      scrollRef={scrollRef}
      renderedDays={renderedDays}
      visibleDays={visibleDays}
    />
  );
}
