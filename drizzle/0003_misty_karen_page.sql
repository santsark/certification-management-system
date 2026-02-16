ALTER TABLE "certification_assignments" ADD COLUMN "level" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "certification_assignments" ADD COLUMN "level_group_id" uuid;