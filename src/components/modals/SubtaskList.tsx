"use client";

import * as React from "react";
import { X, Plus, GripVertical, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import type { SubtaskFormValues } from "@/lib/validations/task-event";

interface SubtaskListProps {
  subtasks: SubtaskFormValues[];
  onChange: (subtasks: SubtaskFormValues[]) => void;
  disabled?: boolean;
  maxSubtasks?: number;
}

export function SubtaskList({
  subtasks,
  onChange,
  disabled = false,
  maxSubtasks = 20,
}: SubtaskListProps) {
  const [newSubtaskTitle, setNewSubtaskTitle] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleAddSubtask = () => {
    const trimmedTitle = newSubtaskTitle.trim();

    // Validation
    if (!trimmedTitle) {
      setError("Subtask cannot be empty");
      return;
    }

    if (trimmedTitle.length > 100) {
      setError("Subtask must be less than 100 characters");
      return;
    }

    if (subtasks.length >= maxSubtasks) {
      setError(`Cannot add more than ${maxSubtasks} subtasks`);
      return;
    }

    // Create new subtask
    const newSubtask: SubtaskFormValues = {
      id: `temp-${Date.now()}`, // Temporary ID for new subtasks
      title: trimmedTitle,
      completed: false,
      order: subtasks.length,
    };

    onChange([...subtasks, newSubtask]);
    setNewSubtaskTitle("");
    setError(null);

    // Focus input for adding another subtask
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleRemoveSubtask = (index: number) => {
    const updatedSubtasks = subtasks.filter((_, i) => i !== index);
    // Reorder remaining subtasks
    const reorderedSubtasks = updatedSubtasks.map((subtask, i) => ({
      ...subtask,
      order: i,
    }));
    onChange(reorderedSubtasks);
  };

  const handleToggleSubtask = (index: number) => {
    const updatedSubtasks = subtasks.map((subtask, i) =>
      i === index ? { ...subtask, completed: !subtask.completed } : subtask
    );
    onChange(updatedSubtasks);
  };

  const handleUpdateSubtaskTitle = (index: number, newTitle: string) => {
    if (newTitle.length > 100) {
      return; // Prevent exceeding max length
    }

    const updatedSubtasks = subtasks.map((subtask, i) =>
      i === index ? { ...subtask, title: newTitle } : subtask
    );
    onChange(updatedSubtasks);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddSubtask();
    }
  };

  const completedCount = subtasks.filter((s) => s.completed).length;
  const totalCount = subtasks.length;

  return (
    <div className="space-y-3">
      {/* Header with Progress */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Subtasks ({completedCount}/{totalCount})
          </span>
          {completedCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {Math.round((completedCount / totalCount) * 100)}% complete
            </span>
          )}
        </div>
      )}

      {/* Subtask List */}
      {subtasks.map((subtask, index) => (
        <div
          key={subtask.id || index}
          className={cn(
            "flex items-start gap-2 p-2 rounded-md border bg-background",
            disabled && "opacity-50"
          )}
        >
            {/* Drag Handle */}
            <button
              type="button"
              className="mt-2 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
              disabled={disabled}
              aria-label="Reorder subtask"
            >
              <GripVertical className="h-4 w-4" />
            </button>

            {/* Checkbox */}
            <div className="mt-2">
              <Checkbox
                checked={subtask.completed}
                onCheckedChange={() => handleToggleSubtask(index)}
                disabled={disabled}
              />
            </div>

            {/* Subtask Title */}
            <div className="flex-1 min-w-0">
              <Input
                value={subtask.title}
                onChange={(e) =>
                  handleUpdateSubtaskTitle(index, e.target.value)
                }
                disabled={disabled}
                className={cn(
                  "border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-1",
                  subtask.completed && "line-through text-muted-foreground"
                )}
                placeholder="Subtask title"
              />
              <div className="text-xs text-muted-foreground px-1 mt-0.5">
                {subtask.title.length}/100
              </div>
            </div>

            {/* Remove Button */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleRemoveSubtask(index)}
              disabled={disabled}
              className="mt-1 h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Remove subtask</span>
            </Button>
        </div>
      ))}

      {/* Add New Subtask */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={newSubtaskTitle}
            onChange={(e) => {
              setNewSubtaskTitle(e.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            disabled={disabled || subtasks.length >= maxSubtasks}
            placeholder="Add a subtask..."
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddSubtask}
            disabled={
              disabled ||
              !newSubtaskTitle.trim() ||
              subtasks.length >= maxSubtasks
            }
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <p className="text-sm text-destructive">
            {error}
          </p>
        )}

        {/* Character Count */}
        {newSubtaskTitle && (
          <p className="text-xs text-muted-foreground">
            {newSubtaskTitle.length}/100 characters
          </p>
        )}

        {/* Max Subtasks Warning */}
        {subtasks.length >= maxSubtasks && (
          <p className="text-xs text-muted-foreground">
            Maximum of {maxSubtasks} subtasks reached
          </p>
        )}
      </div>

      {/* Empty State */}
      {subtasks.length === 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          <Check className="h-8 w-8 mx-auto mb-2 opacity-20" />
          <p>No subtasks yet. Add one to break down this task.</p>
        </div>
      )}
    </div>
  );
}
