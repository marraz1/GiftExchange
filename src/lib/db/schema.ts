import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const eventType = pgEnum("event_type", ["christmas", "birthday", "custom"]);
export const eventStatus = pgEnum("event_status", ["collecting", "drawn"]);
export const participantRole = pgEnum("participant_role", ["member", "celebrant"]);

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: eventType("type").notNull(),
    title: text("title").notNull(),
    hostName: text("host_name").notNull(),
    hostEmail: text("host_email").notNull(),
    budgetAmount: numeric("budget_amount", { precision: 10, scale: 2 }),
    currency: varchar("currency", { length: 3 }).notNull().default("EUR"),
    exchangeDate: date("exchange_date", { mode: "string" }).notNull(),
    wishlistDeadline: date("wishlist_deadline", { mode: "string" }),
    message: text("message"),
    status: eventStatus("status").notNull().default("collecting"),
    drawnAt: timestamp("drawn_at", { withTimezone: true }),
    /** Birthday: when the celebrant's wishlist was shared with guests. */
    sharedAt: timestamp("shared_at", { withTimezone: true }),
    allDoneNotifiedAt: timestamp("all_done_notified_at", { withTimezone: true }),
    /** Christmas/custom: participants may keep editing wishes after the draw. */
    allowEditsAfterDraw: boolean("allow_edits_after_draw").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("events_host_email_idx").on(sql`lower(${t.hostEmail})`)],
);

export const participants = pgTable(
  "participants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    role: participantRole("role").notNull().default("member"),
    isHost: boolean("is_host").notNull().default(false),
    invitedAt: timestamp("invited_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("participants_event_name_uq").on(t.eventId, sql`lower(${t.name})`),
    uniqueIndex("participants_event_email_uq").on(t.eventId, sql`lower(${t.email})`),
  ],
);

export const wishes = pgTable(
  "wishes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    position: smallint("position").notNull(),
    title: text("title").notNull(),
    url: text("url"),
    note: text("note"),
    /** Birthday: guest who reserved this wish. */
    claimedById: uuid("claimed_by_id").references(() => participants.id, {
      onDelete: "set null",
    }),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
  },
  (t) => [
    unique("wishes_participant_position_uq").on(t.participantId, t.position),
    check("wishes_position_ck", sql`${t.position} between 1 and 10`),
  ],
);

export const assignments = pgTable(
  "assignments",
  {
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    giverId: uuid("giver_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    receiverId: uuid("receiver_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.eventId, t.giverId] }),
    unique("assignments_event_receiver_uq").on(t.eventId, t.receiverId),
    check("assignments_not_self_ck", sql`${t.giverId} <> ${t.receiverId}`),
  ],
);

export const emailLog = pgTable(
  "email_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id").references(() => events.id, { onDelete: "cascade" }),
    participantId: uuid("participant_id").references(() => participants.id, {
      onDelete: "cascade",
    }),
    kind: text("kind").notNull(),
    recipient: text("recipient").notNull(),
    status: text("status").notNull(),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("email_log_event_idx").on(t.eventId)],
);

export type Event = typeof events.$inferSelect;
export type Participant = typeof participants.$inferSelect;
export type Wish = typeof wishes.$inferSelect;
