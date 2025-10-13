"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Clock,
  Trash2,
  Loader2,
  AlertCircle,
  Save,
  MapPin,
  Users,
  X,
  Plus,
} from "lucide-react";
import { differenceInMinutes } from "date-fns";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  eventFormSchema,
  type EventFormValues,
} from "@/lib/validations/task-event";
import type { Event, Attendee } from "@/types";
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
import { Checkbox } from "@/components/ui/checkbox";
import { DateRangePicker } from "@/components/ui/date-time-picker";
import { DeleteConfirmDialog } from "./ConfirmDialog";
import { toast } from "sonner";

interface EventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: Event | null;
  prefilledData?: Partial<EventFormValues>;
}

export function EventModal({
  open,
  onOpenChange,
  event,
  prefilledData,
}: EventModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [newAttendeeEmail, setNewAttendeeEmail] = React.useState("");
  const [newAttendeeName, setNewAttendeeName] = React.useState("");

  const addEvent = useAppStore((state) => state.addEvent);
  const updateEvent = useAppStore((state) => state.updateEvent);
  const deleteEvent = useAppStore((state) => state.deleteEvent);
  const checkConflicts = useAppStore((state) => state.checkConflicts);

  const isEditMode = !!event;

  // Initialize form with default values
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "work",
      startTime: new Date(),
      endTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      location: "",
      attendees: [],
      calendarSource: "manual",
      isShared: false,
    },
  });

  // Reset form when event or prefilledData changes
  React.useEffect(() => {
    if (event) {
      form.reset({
        title: event.title,
        description: event.description || "",
        category: event.category,
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location || "",
        attendees: event.attendees || [],
        calendarSource: event.calendarSource,
        isShared: event.isShared,
      });
    } else if (prefilledData) {
      form.reset({
        title: prefilledData.title || "",
        description: prefilledData.description || "",
        category: prefilledData.category || "work",
        startTime: prefilledData.startTime || new Date(),
        endTime: prefilledData.endTime || new Date(Date.now() + 60 * 60 * 1000),
        location: prefilledData.location || "",
        attendees: prefilledData.attendees || [],
        calendarSource: prefilledData.calendarSource || "manual",
        isShared: prefilledData.isShared || false,
      });
    } else {
      form.reset({
        title: "",
        description: "",
        category: "work",
        startTime: new Date(),
        endTime: new Date(Date.now() + 60 * 60 * 1000),
        location: "",
        attendees: [],
        calendarSource: "manual",
        isShared: false,
      });
    }
  }, [event, prefilledData, open, form]);

  const onSubmit = async (values: EventFormValues) => {
    try {
      setIsSaving(true);

      // Check for conflicts
      const conflict = checkConflicts(
        values.startTime,
        values.endTime,
        event?.id
      );

      if (conflict.hasConflict) {
        toast.warning("Time Conflict Detected", {
          description: `This event conflicts with ${
            conflict.conflictingEvents.length
          } existing ${
            conflict.conflictingEvents.length === 1 ? "item" : "items"
          }. You can still save it.`,
        });
      }

      if (isEditMode && event) {
        // Update existing event
        updateEvent(event.id, {
          ...values,
          updatedAt: new Date(),
        });
        toast.success("Event Updated", {
          description: "Your event has been updated successfully.",
        });
      } else {
        // Create new event
        const newEvent: Event = {
          id: `event-${Date.now()}`,
          title: values.title,
          description: values.description,
          category: values.category,
          startTime: values.startTime,
          endTime: values.endTime,
          location: values.location,
          attendees: values.attendees,
          isShared: values.isShared,
          calendarSource: values.calendarSource,
          userId: "user-1", // TODO: Get from auth
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        addEvent(newEvent);
        toast.success("Event Created", {
          description: "Your event has been created successfully.",
        });
      }

      onOpenChange(false);
    } catch (error) {
      console.error("Error saving event:", error);
      toast.error("Error", {
        description: "Failed to save event. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!event) return;

    try {
      setIsDeleting(true);
      deleteEvent(event.id);
      toast.success("Event Deleted", {
        description: "Your event has been deleted successfully.",
      });
      setShowDeleteConfirm(false);
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("Error", {
        description: "Failed to delete event. Please try again.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddAttendee = () => {
    const email = newAttendeeEmail.trim();
    const name = newAttendeeName.trim();

    if (!email || !name) {
      toast.error("Invalid Attendee", {
        description: "Please provide both name and email.",
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Invalid Email", {
        description: "Please provide a valid email address.",
      });
      return;
    }

    const currentAttendees = form.getValues("attendees");

    // Check for duplicate email
    if (currentAttendees.some((a) => a.email === email)) {
      toast.error("Duplicate Attendee", {
        description: "This attendee is already added.",
      });
      return;
    }

    const newAttendee: Attendee = {
      id: `attendee-${Date.now()}`,
      name,
      email,
      status: "pending",
    };

    form.setValue("attendees", [...currentAttendees, newAttendee]);
    setNewAttendeeEmail("");
    setNewAttendeeName("");
  };

  const handleRemoveAttendee = (attendeeId: string) => {
    const currentAttendees = form.getValues("attendees");
    form.setValue(
      "attendees",
      currentAttendees.filter((a) => a.id !== attendeeId)
    );
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

  // Calculate and display event duration
  const startTime = form.watch("startTime");
  const endTime = form.watch("endTime");
  const durationMinutes =
    startTime && endTime ? differenceInMinutes(endTime, startTime) : 0;
  const durationHours = Math.floor(durationMinutes / 60);
  const durationMins = durationMinutes % 60;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Edit Event" : "Create New Event"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? "Update the details of your event below."
                : "Fill in the details to create a new event."}
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
                        placeholder="Enter event title..."
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

              {/* Category */}
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

              {/* Date & Time Range */}
              <div className="space-y-2">
                <FormLabel>Date & Time *</FormLabel>
                <div className="flex flex-col sm:flex-row gap-4">
                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <DateRangePicker
                          startDate={field.value}
                          endDate={form.getValues("endTime")}
                          onStartDateChange={field.onChange}
                          onEndDateChange={(date) =>
                            form.setValue("endTime", date || new Date())
                          }
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                {durationMinutes > 0 && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Duration: {durationHours > 0 && `${durationHours}h `}
                    {durationMins > 0 && `${durationMins}m`}
                  </p>
                )}
              </div>

              {/* Location */}
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Add location..."
                          className="pl-10"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Attendees */}
              <FormField
                control={form.control}
                name="attendees"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Attendees</FormLabel>
                    <div className="space-y-3">
                      {/* Attendee List */}
                      {field.value.length > 0 && (
                        <div className="space-y-2">
                          {field.value.map((attendee) => (
                            <div
                              key={attendee.id}
                              className="flex items-center justify-between p-2 rounded-md border bg-background"
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {attendee.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {attendee.email}
                                  </p>
                                </div>
                                <span
                                  className={cn(
                                    "text-xs px-2 py-1 rounded-full",
                                    attendee.status === "accepted" &&
                                      "bg-green-500/10 text-green-500",
                                    attendee.status === "declined" &&
                                      "bg-red-500/10 text-red-500",
                                    attendee.status === "pending" &&
                                      "bg-yellow-500/10 text-yellow-500"
                                  )}
                                >
                                  {attendee.status}
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  attendee.id &&
                                  handleRemoveAttendee(attendee.id)
                                }
                                className="ml-2 h-8 w-8 p-0"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Attendee Form */}
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Name"
                            value={newAttendeeName}
                            onChange={(e) => setNewAttendeeName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddAttendee();
                              }
                            }}
                          />
                          <Input
                            type="email"
                            placeholder="Email"
                            value={newAttendeeEmail}
                            onChange={(e) =>
                              setNewAttendeeEmail(e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddAttendee();
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAddAttendee}
                            disabled={!newAttendeeName || !newAttendeeEmail}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Calendar Source and Shared */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="calendarSource"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Calendar Source</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select source" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="manual">Manual</SelectItem>
                          <SelectItem value="google">
                            Google Calendar
                          </SelectItem>
                          <SelectItem value="outlook">Outlook</SelectItem>
                          <SelectItem value="apple">Apple Calendar</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isShared"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Shared Event</FormLabel>
                        <FormDescription>
                          Allow others to view this event
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

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
                          <li key={key}>• {error.message}</li>
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
                      {isEditMode ? "Update Event" : "Create Event"}
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
        itemType="event"
        itemName={event?.title}
        loading={isDeleting}
      />
    </>
  );
}
