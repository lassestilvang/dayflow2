"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2, Loader2, AlertCircle, Save } from "lucide-react";
import { useAppStore } from "@/lib/store";
import {
  taskFormSchema,
  type TaskFormValues,
  calculateEndTime,
} from "@/lib/validations/task-event";
import type { Task } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { SubtaskList } from "./SubtaskList";
import { DeleteConfirmDialog } from "./ConfirmDialog";
import { toast } from "sonner";

interface TaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  prefilledData?: Partial<TaskFormValues>;
}

export function TaskModal({
  open,
  onOpenChange,
  task,
  prefilledData,
}: TaskModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const addTask = useAppStore((state) => state.addTask);
  const updateTask = useAppStore((state) => state.updateTask);
  const deleteTask = useAppStore((state) => state.deleteTask);
  const checkConflicts = useAppStore((state) => state.checkConflicts);

  const isEditMode = !!task;

  // Initialize form with default values
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "work",
      priority: "medium",
      dueDate: null,
      scheduledTime: null,
      duration: 60,
      subtasks: [],
    },
  });

  // Reset form when task or prefilledData changes
  React.useEffect(() => {
    if (task) {
      form.reset({
        title: task.title,
        description: task.description || "",
        category: task.category,
        priority: task.priority || "medium",
        dueDate: task.dueDate || null,
        scheduledTime: task.scheduledTime || null,
        duration: 60,
        subtasks: task.subtasks || [],
      });
    } else if (prefilledData) {
      form.reset({
        title: prefilledData.title || "",
        description: prefilledData.description || "",
        category: prefilledData.category || "work",
        priority: prefilledData.priority || "medium",
        dueDate: prefilledData.dueDate || null,
        scheduledTime: prefilledData.scheduledTime || null,
        duration: prefilledData.duration || 60,
        subtasks: prefilledData.subtasks || [],
      });
    } else {
      form.reset({
        title: "",
        description: "",
        category: "work",
        priority: "medium",
        dueDate: null,
        scheduledTime: null,
        duration: 60,
        subtasks: [],
      });
    }
  }, [task, prefilledData, open, form]);

  const onSubmit = async (values: TaskFormValues) => {
    try {
      setIsSaving(true);

      // Check for conflicts if scheduled time is set
      if (values.scheduledTime) {
        const endTime = calculateEndTime(values.scheduledTime, values.duration);
        const conflict = checkConflicts(
          values.scheduledTime,
          endTime,
          task?.id
        );

        if (conflict.hasConflict) {
          toast.warning("Time Conflict Detected", {
            description: `This task conflicts with ${
              conflict.conflictingEvents.length
            } existing ${
              conflict.conflictingEvents.length === 1 ? "item" : "items"
            }. You can still save it.`,
          });
        }
      }

      if (isEditMode && task) {
        // Update existing task
        updateTask(task.id, {
          ...values,
          dueDate: values.dueDate || undefined,
          scheduledTime: values.scheduledTime || undefined,
          updatedAt: new Date(),
        });
        toast.success("Task Updated", {
          description: "Your task has been updated successfully.",
        });
      } else {
        // Create new task
        const newTask: Task = {
          id: `task-${Date.now()}`,
          title: values.title,
          description: values.description,
          category: values.category,
          priority: values.priority,
          dueDate: values.dueDate || undefined,
          scheduledTime: values.scheduledTime || undefined,
          subtasks: values.subtasks,
          isOverdue: false,
          isCompleted: false,
          userId: "user-1", // TODO: Get from auth
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        addTask(newTask);
        toast.success("Task Created", {
          description: "Your task has been created successfully.",
        });
      }

      onOpenChange(false);
    } catch (error) {
      console.error("Error saving task:", error);
      toast.error("Error", {
        description: "Failed to save task. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!task) return;

    try {
      setIsDeleting(true);
      deleteTask(task.id);
      toast.success("Task Deleted", {
        description: "Your task has been deleted successfully.",
      });
      setShowDeleteConfirm(false);
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error("Error", {
        description: "Failed to delete task. Please try again.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (form.formState.isDirty) {
      const confirm = window.confirm(
        "You have unsaved changes. Are you sure you want to close?"
      );
      if (!confirm) return;
    }
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Edit Task" : "Create New Task"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? "Update the details of your task below."
                : "Fill in the details to create a new task."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Title */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter task title..."
                        {...field}
                        autoFocus
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add a description..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {field.value?.length || 0}/500 characters
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category and Priority */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="work">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-blue-500" />
                              Work
                            </div>
                          </SelectItem>
                          <SelectItem value="family">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-green-500" />
                              Family
                            </div>
                          </SelectItem>
                          <SelectItem value="personal">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-orange-500" />
                              Personal
                            </div>
                          </SelectItem>
                          <SelectItem value="travel">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-purple-500" />
                              Travel
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Due Date and Scheduled Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Due Date</FormLabel>
                      <DateTimePicker
                        value={field.value || undefined}
                        onChange={field.onChange}
                        placeholder="Select due date"
                        showTime={false}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="scheduledTime"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Scheduled Time</FormLabel>
                      <DateTimePicker
                        value={field.value || undefined}
                        onChange={field.onChange}
                        placeholder="Schedule for specific time"
                        showTime={true}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Duration (only if scheduled) */}
              {form.watch("scheduledTime") && (
                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (minutes)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="1440"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        How long will this task take?
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Subtasks */}
              <FormField
                control={form.control}
                name="subtasks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subtasks</FormLabel>
                    <FormControl>
                      <SubtaskList
                        subtasks={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Form Errors */}
              {Object.keys(form.formState.errors).length > 0 && (
                <div className="rounded-md bg-destructive/10 p-3 flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-destructive">
                      Please fix the following errors:
                    </p>
                    <ul className="text-sm text-destructive/80 mt-1 space-y-1">
                      {Object.entries(form.formState.errors).map(
                        ([key, error]) => (
                          <li key={key}>
                            • {(error as { message?: string })?.message}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                </div>
              )}

              <DialogFooter className="gap-2">
                {/* Delete Button (Edit Mode Only) */}
                {isEditMode && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isSaving}
                    className="mr-auto"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                )}

                {/* Cancel Button */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSaving}
                >
                  Cancel
                </Button>

                {/* Save Button */}
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {isEditMode ? "Update Task" : "Create Task"}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleDelete}
        itemType="task"
        itemName={task?.title}
        loading={isDeleting}
      />
    </>
  );
}
