import { useCalendar } from "@/hooks/useCalendar";
import { CalendarGrid } from "./CalendarGrid";
import { TimeBlock } from "@/types";

export function WeekView() {
  const { scrollRef, renderedDays, visibleDays, timeBlocks, isScrolling } =
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
      isScrolling={isScrolling}
    />
  );
}
