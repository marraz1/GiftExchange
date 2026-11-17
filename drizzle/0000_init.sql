CREATE TYPE "public"."event_status" AS ENUM('collecting', 'drawn');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('christmas', 'birthday', 'custom');--> statement-breakpoint
CREATE TYPE "public"."participant_role" AS ENUM('member', 'celebrant');--> statement-breakpoint
CREATE TABLE "assignments" (
	"event_id" uuid NOT NULL,
	"giver_id" uuid NOT NULL,
	"receiver_id" uuid NOT NULL,
	CONSTRAINT "assignments_event_id_giver_id_pk" PRIMARY KEY("event_id","giver_id"),
	CONSTRAINT "assignments_event_receiver_uq" UNIQUE("event_id","receiver_id"),
	CONSTRAINT "assignments_not_self_ck" CHECK ("assignments"."giver_id" <> "assignments"."receiver_id")
);
--> statement-breakpoint
CREATE TABLE "email_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid,
	"participant_id" uuid,
	"kind" text NOT NULL,
	"recipient" text NOT NULL,
	"status" text NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "event_type" NOT NULL,
	"title" text NOT NULL,
	"host_name" text NOT NULL,
	"host_email" text NOT NULL,
	"budget_amount" numeric(10, 2),
	"currency" varchar(3) DEFAULT 'EUR' NOT NULL,
	"exchange_date" date NOT NULL,
	"wishlist_deadline" date,
	"message" text,
	"status" "event_status" DEFAULT 'collecting' NOT NULL,
	"drawn_at" timestamp with time zone,
	"shared_at" timestamp with time zone,
	"all_done_notified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"role" "participant_role" DEFAULT 'member' NOT NULL,
	"is_host" boolean DEFAULT false NOT NULL,
	"invited_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wishes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant_id" uuid NOT NULL,
	"position" smallint NOT NULL,
	"title" text NOT NULL,
	"url" text,
	"note" text,
	"claimed_by_id" uuid,
	"claimed_at" timestamp with time zone,
	CONSTRAINT "wishes_participant_position_uq" UNIQUE("participant_id","position"),
	CONSTRAINT "wishes_position_ck" CHECK ("wishes"."position" between 1 and 10)
);
--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_giver_id_participants_id_fk" FOREIGN KEY ("giver_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_receiver_id_participants_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_log" ADD CONSTRAINT "email_log_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_log" ADD CONSTRAINT "email_log_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishes" ADD CONSTRAINT "wishes_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishes" ADD CONSTRAINT "wishes_claimed_by_id_participants_id_fk" FOREIGN KEY ("claimed_by_id") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_log_event_idx" ON "email_log" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "events_host_email_idx" ON "events" USING btree (lower("host_email"));--> statement-breakpoint
CREATE UNIQUE INDEX "participants_event_name_uq" ON "participants" USING btree ("event_id",lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "participants_event_email_uq" ON "participants" USING btree ("event_id",lower("email"));