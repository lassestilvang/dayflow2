import { useCalendar } from "@/hooks/useCalendar";
import { CalendarGrid } from "./CalendarGrid";

export function WeekView() {
  const { scrollRef, renderedDays, visibleDays, timeBlocks, isScrolling } =
    useCalendar();

  

  return (
    <CalendarGrid
      timeBlocks={timeBlocks}
      scrollRef={scrollRef}
      renderedDays={renderedDays}
      visibleDays={visibleDays}
      isScrolling={isScrolling}
    />
  );
}
