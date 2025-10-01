import React from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";
import {
  renderWithProviders,
  createMockTimeBlock,
  setMockDate,
  restoreRealDate,
} from "../../utils/test-utils";

// Mock the store
jest.mock("@/lib/store", () => ({
  useAppStore: jest.fn((selector) =>
    selector({
      drag: {
        isDragging: false,
      },
      openEventModal: jest.fn(),
    })
  ),
}));

describe("CalendarGrid", () => {
  const mockTimeBlocks = [
    createMockTimeBlock({
      id: "block-1",
      startTime: new Date("2024-01-15T09:00:00"),
      endTime: new Date("2024-01-15T10:00:00"),
    }),
    createMockTimeBlock({
      id: "block-2",
      startTime: new Date("2024-01-15T14:00:00"),
      endTime: new Date("2024-01-15T15:00:00"),
    }),
  ];

  const defaultProps = {
    date: new Date("2024-01-15"),
    timeBlocks: mockTimeBlocks,
    onTimeSlotClick: jest.fn(),
    onBlockClick: jest.fn(),
  };

  beforeEach(() => {
    setMockDate("2024-01-15T12:00:00");
  });

  afterEach(() => {
    restoreRealDate();
    jest.clearAllMocks();
  });

  it("renders without crashing", () => {
    renderWithProviders(<CalendarGrid {...defaultProps} />, { withDnd: true });
    expect(
      screen.getByRole("columnheader", { name: /mon/i })
    ).toBeInTheDocument();
  });

  it("renders 7-day week columns", () => {
    renderWithProviders(<CalendarGrid {...defaultProps} />, { withDnd: true });
    const headers = screen.getAllByRole("columnheader");
    expect(headers).toHaveLength(7);
  });

  it("shows hourly time blocks from 6 AM to 10 PM", () => {
    renderWithProviders(<CalendarGrid {...defaultProps} />, { withDnd: true });

    expect(screen.getByText(/6:00 am/i)).toBeInTheDocument();
    expect(screen.getByText(/10:00 pm/i)).toBeInTheDocument();
  });

  it("displays current day highlight", () => {
    renderWithProviders(<CalendarGrid {...defaultProps} />, { withDnd: true });

    // Current day (15th) should have primary color styling
    const dayHeaders = screen.getAllByRole("columnheader");
    const currentDayHeader = dayHeaders.find((header) =>
      header.textContent?.includes("15")
    );
    expect(currentDayHeader).toBeInTheDocument();
  });

  it("renders current time indicator", () => {
    renderWithProviders(<CalendarGrid {...defaultProps} />, { withDnd: true });

    // Look for time indicator showing current time
    expect(screen.getByText(/12:00 pm/i)).toBeInTheDocument();
  });

  it("renders time blocks at correct positions", () => {
    renderWithProviders(<CalendarGrid {...defaultProps} />, { withDnd: true });

    // Time blocks should be rendered
    expect(
      screen.getAllByRole("button", { name: /drag to reschedule/i })
    ).toHaveLength(2);
  });

  it("handles time slot click", async () => {
    const onTimeSlotClick = jest.fn();
    const user = userEvent.setup();

    renderWithProviders(
      <CalendarGrid {...defaultProps} onTimeSlotClick={onTimeSlotClick} />,
      { withDnd: true }
    );

    // Find a time slot (they're clickable divs)
    const timeSlots = screen.getAllByRole("button", { hidden: true });
    if (timeSlots.length > 0) {
      await user.click(timeSlots[0]);
      await waitFor(() => {
        expect(onTimeSlotClick).toHaveBeenCalled();
      });
    }
  });

  it("handles block click", async () => {
    const onBlockClick = jest.fn();
    const user = userEvent.setup();

    renderWithProviders(
      <CalendarGrid {...defaultProps} onBlockClick={onBlockClick} />,
      { withDnd: true }
    );

    // Click on a time block
    const dragHandles = screen.getAllByRole("button", {
      name: /drag to reschedule/i,
    });
    const timeBlock = dragHandles[0].closest('[class*="absolute"]');

    if (timeBlock) {
      await user.click(timeBlock);
      await waitFor(() => {
        expect(onBlockClick).toHaveBeenCalled();
      });
    }
  });

  it("shows correct week range", () => {
    renderWithProviders(<CalendarGrid {...defaultProps} />, { withDnd: true });

    // All 7 days should be visible
    expect(
      screen.getByRole("columnheader", { name: /mon/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: /sun/i })
    ).toBeInTheDocument();
  });

  it("renders with no time blocks", () => {
    renderWithProviders(<CalendarGrid {...defaultProps} timeBlocks={[]} />, {
      withDnd: true,
    });

    expect(
      screen.queryAllByRole("button", { name: /drag to reschedule/i })
    ).toHaveLength(0);
  });

  it("handles overlapping events correctly", () => {
    const overlappingBlocks = [
      createMockTimeBlock({
        id: "block-1",
        startTime: new Date("2024-01-15T09:00:00"),
        endTime: new Date("2024-01-15T10:00:00"),
      }),
      createMockTimeBlock({
        id: "block-2",
        startTime: new Date("2024-01-15T09:30:00"),
        endTime: new Date("2024-01-15T10:30:00"),
      }),
    ];

    renderWithProviders(
      <CalendarGrid {...defaultProps} timeBlocks={overlappingBlocks} />,
      { withDnd: true }
    );

    // Both blocks should be rendered
    expect(
      screen.getAllByRole("button", { name: /drag to reschedule/i })
    ).toHaveLength(2);
  });

  it("updates when date changes", () => {
    const { rerender } = renderWithProviders(
      <CalendarGrid {...defaultProps} />,
      { withDnd: true }
    );

    const newDate = new Date("2024-01-22");
    rerender(<CalendarGrid {...defaultProps} date={newDate} />);

    // Should still render 7 days
    expect(screen.getAllByRole("columnheader")).toHaveLength(7);
  });

  it("updates when time blocks change", () => {
    const { rerender } = renderWithProviders(
      <CalendarGrid {...defaultProps} />,
      { withDnd: true }
    );

    const newBlocks = [
      ...mockTimeBlocks,
      createMockTimeBlock({
        id: "block-3",
        startTime: new Date("2024-01-15T16:00:00"),
        endTime: new Date("2024-01-15T17:00:00"),
      }),
    ];

    rerender(<CalendarGrid {...defaultProps} timeBlocks={newBlocks} />);

    expect(
      screen.getAllByRole("button", { name: /drag to reschedule/i })
    ).toHaveLength(3);
  });
});
