import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";

// Enums
export const categoryEnum = pgEnum("category", [
  "work",
  "family",
  "personal",
  "travel",
]);

export const priorityEnum = pgEnum("priority", ["low", "medium", "high"]);

export const calendarSourceEnum = pgEnum("calendar_source", [
  "google",
  "outlook",
  "apple",
  "manual",
]);

export const attendeeStatusEnum = pgEnum("attendee_status", [
  "pending",
  "accepted",
  "declined",
]);

export const permissionEnum = pgEnum("permission", ["view", "edit"]);

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified"),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Categories table
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  color: categoryEnum("color").notNull(),
  icon: text("icon"),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tasks table
export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  category: categoryEnum("category").notNull(),
  dueDate: timestamp("due_date"),
  scheduledTime: timestamp("scheduled_time"),
  subtasks: jsonb("subtasks")
    .$type<
      Array<{ id: string; title: string; completed: boolean; order: number }>
    >()
    .default([]),
  isCompleted: boolean("is_completed").default(false).notNull(),
  priority: priorityEnum("priority"),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Events table
export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  category: categoryEnum("category").notNull(),
  location: text("location"),
  attendees: jsonb("attendees")
    .$type<
      Array<{
        id: string;
        name: string;
        email: string;
        status: "pending" | "accepted" | "declined";
      }>
    >()
    .default([]),
  isShared: boolean("is_shared").default(false).notNull(),
  calendarSource: calendarSourceEnum("calendar_source").notNull(),
  externalId: text("external_id"),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Calendar integrations table
export const calendarIntegrations = pgTable("calendar_integrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  provider: text("provider").notNull(), // google, outlook, apple
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Task integrations table
export const taskIntegrations = pgTable("task_integrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  provider: text("provider").notNull(), // todoist, notion, asana
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Shared events table
export const sharedEvents = pgTable("shared_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .references(() => events.id, { onDelete: "cascade" })
    .notNull(),
  sharedWithUserId: uuid("shared_with_user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  permissions: permissionEnum("permissions").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  tasks: many(tasks),
  events: many(events),
  categories: many(categories),
  calendarIntegrations: many(calendarIntegrations),
  taskIntegrations: many(taskIntegrations),
  sharedEvents: many(sharedEvents),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  user: one(users, {
    fields: [tasks.userId],
    references: [users.id],
  }),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  user: one(users, {
    fields: [events.userId],
    references: [users.id],
  }),
  sharedWith: many(sharedEvents),
}));

export const categoriesRelations = relations(categories, ({ one }) => ({
  user: one(users, {
    fields: [categories.userId],
    references: [users.id],
  }),
}));

export const sharedEventsRelations = relations(sharedEvents, ({ one }) => ({
  event: one(events, {
    fields: [sharedEvents.eventId],
    references: [events.id],
  }),
  sharedWithUser: one(users, {
    fields: [sharedEvents.sharedWithUserId],
    references: [users.id],
  }),
}));
