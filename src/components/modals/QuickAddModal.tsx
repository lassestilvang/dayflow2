"use client";

import * as React from "react";
import {
  Calendar,
  Clock,
  Zap,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { addDays, addWeeks, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import type { CategoryType, Task, Event } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface QuickAddModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenFullModal?: (
    type: "task" | "event",
    data: Partial<Task> | Partial<Event>
  ) => void;
}

interface ParsedResult {
  type: "task" | "event";
  title: string;
  category: CategoryType;
  priority: "low" | "medium" | "high";
  date?: Date;
  time?: Date;
  confidence: number;
}

export function QuickAddModal({
  open,
  onOpenChange,
  onOpenFullModal,
}: QuickAddModalProps) {
  const [input, setInput] = React.useState("");
  const [parsed, setParsed] = React.useState<ParsedResult | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const addTask = useAppStore((state) => state.addTask);
  const addEvent = useAppStore((state) => state.addEvent);

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (!open) {
      setInput("");
      setParsed(null);
      setIsProcessing(false);
    }
  }, [open]);

  // Parse input in real-time
  React.useEffect(() => {
    if (!input.trim()) {
      setParsed(null);
      return;
    }

    const result = parseNaturalLanguage(input);
    setParsed(result);
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || !parsed) {
      toast.error("Please enter a task or event");
      return;
    }

    setIsProcessing(true);

    try {
      if (parsed.type === "task") {
        const newTask: Task = {
          id: `task-${Date.now()}`,
          title: parsed.title,
          description: "",
          category: parsed.category,
          priority: parsed.priority,
          dueDate: parsed.date,
          scheduledTime: parsed.time,
          subtasks: [],
          isOverdue: false,
          isCompleted: false,
          userId: "user-1",
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        addTask(newTask);
        toast.success("Task Created", {
          description: `"${parsed.title}" has been added to your tasks.`,
        });
      } else {
        const startTime = parsed.time || new Date();
        const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour duration

        const newEvent: Event = {
          id: `event-${Date.now()}`,
          title: parsed.title,
          description: "",
          category: parsed.category,
          startTime,
          endTime,
          location: "",
          attendees: [],
          isShared: false,
          calendarSource: "manual",
          userId: "user-1",
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        addEvent(newEvent);
        toast.success("Event Created", {
          description: `"${parsed.title}" has been added to your calendar.`,
        });
      }

      onOpenChange(false);
    } catch (error) {
      console.error("Error creating item:", error);
      toast.error("Error", {
        description: "Failed to create item. Please try again.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenFullModal = () => {
    if (!parsed || !onOpenFullModal) return;

    const data = {
      title: parsed.title,
      category: parsed.category,
      priority: parsed.priority,
      ...(parsed.date && { dueDate: parsed.date }),
      ...(parsed.time && { scheduledTime: parsed.time }),
    };

    onOpenFullModal(parsed.type, data);
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Quick Add
          </DialogTitle>
          <DialogDescription>
            Type naturally - we&apos;ll figure out the details.
            <br />
            <span className="text-xs text-muted-foreground">
              Press Enter to create, Escape to cancel
            </span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Input Field */}
          <div className="relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder='Try "Meeting tomorrow at 2pm" or "Call Sarah"'
              className="text-lg py-6"
              autoFocus
            />
            {input && (
              <button
                type="button"
                onClick={() => setInput("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                ×
              </button>
            )}
          </div>

          {/* Parsed Preview */}
          {parsed && (
            <div className="space-y-3">
                {/* Detection Result */}
                <div
                  className={cn(
                    "rounded-lg border-2 p-4 space-y-3",
                    parsed.type === "event"
                      ? "border-primary/50 bg-primary/5"
                      : "border-accent"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        {parsed.type === "event" ? (
                          <Calendar className="h-4 w-4 text-primary" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-sm font-medium">
                          {parsed.type === "event" ? "Event" : "Task"}
                        </span>
                      </div>

                      <h3 className="text-lg font-semibold">{parsed.title}</h3>

                      <div className="flex flex-wrap gap-2">
                        {/* Category Badge */}
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium",
                            getCategoryColor(parsed.category)
                          )}
                        >
                          <div className="w-2 h-2 rounded-full bg-current" />
                          {parsed.category}
                        </span>

                        {/* Priority Badge */}
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-1 rounded-md text-xs font-medium",
                            parsed.priority === "high" &&
                              "bg-red-500/10 text-red-500",
                            parsed.priority === "medium" &&
                              "bg-yellow-500/10 text-yellow-500",
                            parsed.priority === "low" &&
                              "bg-green-500/10 text-green-500"
                          )}
                        >
                          {parsed.priority} priority
                        </span>

                        {/* Date/Time Badge */}
                        {(parsed.date || parsed.time) && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-accent">
                            <Clock className="h-3 w-3" />
                            {formatDateTime(parsed.date || parsed.time)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Confidence Indicator */}
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1">
                        {parsed.confidence >= 0.8 ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(parsed.confidence * 100)}% confident
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleOpenFullModal}
                    disabled={!onOpenFullModal}
                  >
                    Edit Details
                  </Button>

                  <Button
                    type="submit"
                    disabled={isProcessing}
                    className="min-w-[120px]"
                  >
                    {isProcessing ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                        Creating...
                      </>
                    ) : (
                      <>
                        Create
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Examples */}
          {!input && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Examples:</p>
              <div className="grid gap-2">
                {[
                  "Meeting tomorrow at 2pm",
                  "Call Sarah high priority",
                  "Family dinner next week",
                  "Work on presentation",
                  "Urgent: Submit report today",
                ].map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => setInput(example)}
                    className="text-sm text-left px-3 py-2 rounded-md hover:bg-accent transition-colors"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Natural language parsing logic
function parseNaturalLanguage(input: string): ParsedResult {
  const lowerInput = input.toLowerCase();
  let confidence = 0.5;

  // Detect type (event vs task)
  const eventKeywords = [
    "meeting",
    "appointment",
    "call",
    "lunch",
    "dinner",
    "event",
  ];
  const isEvent = eventKeywords.some((keyword) => lowerInput.includes(keyword));
  const type: "task" | "event" = isEvent ? "event" : "task";

  if (isEvent) confidence += 0.2;

  // Extract title (remove detected keywords)
  let title = input.trim();

  // Detect and extract category
  let category: CategoryType = "personal";
  const categoryMap: Record<string, CategoryType> = {
    work: "work",
    family: "family",
    personal: "personal",
    travel: "travel",
  };

  for (const [keyword, cat] of Object.entries(categoryMap)) {
    if (lowerInput.includes(keyword)) {
      category = cat;
      confidence += 0.1;
      // Remove category keyword from title
      title = title.replace(new RegExp(keyword, "gi"), "").trim();
      break;
    }
  }

  // Detect priority
  let priority: "low" | "medium" | "high" = "medium";
  if (
    lowerInput.includes("urgent") ||
    lowerInput.includes("high priority") ||
    lowerInput.includes("important")
  ) {
    priority = "high";
    confidence += 0.1;
    title = title.replace(/urgent|high priority|important/gi, "").trim();
  } else if (lowerInput.includes("low priority")) {
    priority = "low";
    confidence += 0.1;
    title = title.replace(/low priority/gi, "").trim();
  }

  // Detect time references
  let date: Date | undefined;
  let time: Date | undefined;

  const now = new Date();

  // Time patterns
  const timePattern = /(\d{1,2})(:\d{2})?\s*(am|pm)/i;
  const timeMatch = input.match(timePattern);

  if (timeMatch) {
    const hour = parseInt(timeMatch[1] || "0");
    const minute = timeMatch[2] ? parseInt(timeMatch[2].slice(1)) : 0;
    const isPM = (timeMatch[3] || "").toLowerCase() === "pm";

    const adjustedHour =
      isPM && hour !== 12 ? hour + 12 : hour === 12 && !isPM ? 0 : hour;

    time = new Date();
    time.setHours(adjustedHour, minute, 0, 0);

    confidence += 0.2;
    title = title.replace(timePattern, "").trim();
  }

  // Date patterns
  if (lowerInput.includes("today")) {
    date = startOfDay(now);
    confidence += 0.15;
    title = title.replace(/today/gi, "").trim();
  } else if (lowerInput.includes("tomorrow")) {
    date = addDays(startOfDay(now), 1);
    confidence += 0.15;
    title = title.replace(/tomorrow/gi, "").trim();
  } else if (lowerInput.includes("next week")) {
    date = addWeeks(startOfDay(now), 1);
    confidence += 0.1;
    title = title.replace(/next week/gi, "").trim();
  } else if (lowerInput.includes("in 3 days")) {
    date = addDays(startOfDay(now), 3);
    confidence += 0.1;
    title = title.replace(/in 3 days/gi, "").trim();
  }

  // Combine date and time if both exist
  if (date && time) {
    time = new Date(date);
    const hours = new Date(time).getHours();
    const minutes = new Date(time).getMinutes();
    time.setHours(hours, minutes, 0, 0);
  }

  // Clean up title
  title = title
    .replace(/\s+/g, " ")
    .replace(/^at\s+/i, "")
    .trim();

  // Ensure minimum confidence
  confidence = Math.min(confidence, 1);

  return {
    type,
    title: title || "Untitled",
    category,
    priority,
    date,
    time,
    confidence,
  };
}

function getCategoryColor(category: CategoryType): string {
  const colors: Record<CategoryType, string> = {
    work: "bg-blue-500/10 text-blue-500",
    family: "bg-green-500/10 text-green-500",
    personal: "bg-orange-500/10 text-orange-500",
    travel: "bg-purple-500/10 text-purple-500",
  };
  return colors[category];
}

function formatDateTime(date?: Date): string {
  if (!date) return "";

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isTomorrow = date.toDateString() === addDays(now, 1).toDateString();

  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (isToday) return `Today at ${timeStr}`;
  if (isTomorrow) return `Tomorrow at ${timeStr}`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
