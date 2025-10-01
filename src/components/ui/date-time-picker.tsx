"use client";

import * as React from "react";
import { Calendar as CalendarIcon, Clock, X } from "lucide-react";
import { format, addDays, startOfDay, isValid } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DateTimePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  showTime?: boolean;
  showShortcuts?: boolean;
  className?: string;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Pick a date and time",
  disabled = false,
  minDate,
  maxDate,
  showTime = true,
  showShortcuts = true,
  className,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    value
  );
  const [hours, setHours] = React.useState<string>(
    value ? format(value, "HH") : "09"
  );
  const [minutes, setMinutes] = React.useState<string>(
    value ? format(value, "mm") : "00"
  );

  // Update internal state when value prop changes
  React.useEffect(() => {
    if (value && isValid(value)) {
      setSelectedDate(value);
      setHours(format(value, "HH"));
      setMinutes(format(value, "mm"));
    }
  }, [value]);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) {
      setSelectedDate(undefined);
      onChange(undefined);
      return;
    }

    // Combine date with current time
    const newDate = new Date(date);
    newDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    setSelectedDate(newDate);

    if (!showTime) {
      onChange(newDate);
      setOpen(false);
    }
  };

  const handleTimeChange = (newHours: string, newMinutes: string) => {
    setHours(newHours);
    setMinutes(newMinutes);

    if (selectedDate) {
      const newDate = new Date(selectedDate);
      newDate.setHours(parseInt(newHours), parseInt(newMinutes), 0, 0);
      setSelectedDate(newDate);
    }
  };

  const handleApply = () => {
    if (selectedDate) {
      const finalDate = new Date(selectedDate);
      finalDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      onChange(finalDate);
    } else {
      onChange(undefined);
    }
    setOpen(false);
  };

  const handleClear = () => {
    setSelectedDate(undefined);
    setHours("09");
    setMinutes("00");
    onChange(undefined);
  };

  const handleShortcut = (days: number) => {
    const date = addDays(startOfDay(new Date()), days);
    date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    setSelectedDate(date);
    handleDateSelect(date);
  };

  const shortcuts = [
    { label: "Today", days: 0 },
    { label: "Tomorrow", days: 1 },
    { label: "In 3 days", days: 3 },
    { label: "In a week", days: 7 },
  ];

  const hourOptions = Array.from({ length: 24 }, (_, i) =>
    i.toString().padStart(2, "0")
  );
  const minuteOptions = ["00", "15", "30", "45"];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value && isValid(value) ? (
            showTime ? (
              format(value, "PPp")
            ) : (
              format(value, "PP")
            )
          ) : (
            <span>{placeholder}</span>
          )}
          {value && (
            <X
              className="ml-auto h-4 w-4 opacity-50 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          {/* Shortcuts */}
          {showShortcuts && (
            <div className="flex flex-col gap-1 border-r p-3">
              <div className="text-xs font-semibold text-muted-foreground mb-2">
                Quick Select
              </div>
              {shortcuts.map((shortcut) => (
                <Button
                  key={shortcut.label}
                  variant="ghost"
                  size="sm"
                  className="justify-start"
                  onClick={() => handleShortcut(shortcut.days)}
                >
                  {shortcut.label}
                </Button>
              ))}
            </div>
          )}

          {/* Calendar and Time */}
          <div className="p-3">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              disabled={(date) =>
                (minDate && date < minDate) ||
                (maxDate && date > maxDate) ||
                false
              }
              initialFocus
            />

            {/* Time Selection */}
            {showTime && (
              <div className="border-t pt-3 mt-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div className="flex items-center gap-1">
                    <Select
                      value={hours}
                      onValueChange={(value) =>
                        handleTimeChange(value, minutes)
                      }
                    >
                      <SelectTrigger className="w-[70px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {hourOptions.map((hour) => (
                          <SelectItem key={hour} value={hour}>
                            {hour}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-muted-foreground">:</span>
                    <Select
                      value={minutes}
                      onValueChange={(value) => handleTimeChange(hours, value)}
                    >
                      <SelectTrigger className="w-[70px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {minuteOptions.map((minute) => (
                          <SelectItem key={minute} value={minute}>
                            {minute}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Timezone Display */}
                <div className="text-xs text-muted-foreground mt-2">
                  {Intl.DateTimeFormat().resolvedOptions().timeZone}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleApply}>
                Apply
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface DateRangePickerProps {
  startDate?: Date;
  endDate?: Date;
  onStartDateChange: (date: Date | undefined) => void;
  onEndDateChange: (date: Date | undefined) => void;
  disabled?: boolean;
  className?: string;
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  disabled = false,
  className,
}: DateRangePickerProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <DateTimePicker
        value={startDate}
        onChange={onStartDateChange}
        placeholder="Start date & time"
        disabled={disabled}
        maxDate={endDate}
      />
      <span className="text-muted-foreground">→</span>
      <DateTimePicker
        value={endDate}
        onChange={onEndDateChange}
        placeholder="End date & time"
        disabled={disabled}
        minDate={startDate}
      />
    </div>
  );
}
