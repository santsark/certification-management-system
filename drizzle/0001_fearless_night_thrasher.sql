CREATE TYPE "public"."attestation_status" AS ENUM('in_progress', 'submitted');--> statement-breakpoint
CREATE TYPE "public"."certification_status" AS ENUM('draft', 'open', 'closed');--> statement-breakpoint
CREATE TABLE "attestation_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"certification_id" uuid NOT NULL,
	"attester_id" uuid NOT NULL,
	"responses" jsonb NOT NULL,
	"status" "attestation_status" DEFAULT 'in_progress' NOT NULL,
	"last_saved_at" timestamp DEFAULT now() NOT NULL,
	"submitted_at" timestamp,
	CONSTRAINT "unique_certification_attester_response" UNIQUE("certification_id","attester_id")
);
--> statement-breakpoint
CREATE TABLE "certification_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"certification_id" uuid NOT NULL,
	"attester_id" uuid NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_certification_attester" UNIQUE("certification_id","attester_id")
);
--> statement-breakpoint
CREATE TABLE "certifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandate_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"status" "certification_status" DEFAULT 'draft' NOT NULL,
	"questions" jsonb NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"published_at" timestamp,
	"closed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"link" varchar(255),
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attestation_responses" ADD CONSTRAINT "attestation_responses_certification_id_certifications_id_fk" FOREIGN KEY ("certification_id") REFERENCES "public"."certifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attestation_responses" ADD CONSTRAINT "attestation_responses_attester_id_users_id_fk" FOREIGN KEY ("attester_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certification_assignments" ADD CONSTRAINT "certification_assignments_certification_id_certifications_id_fk" FOREIGN KEY ("certification_id") REFERENCES "public"."certifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certification_assignments" ADD CONSTRAINT "certification_assignments_attester_id_users_id_fk" FOREIGN KEY ("attester_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_mandate_id_mandates_id_fk" FOREIGN KEY ("mandate_id") REFERENCES "public"."mandates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attestation_responses_certification_id_idx" ON "attestation_responses" USING btree ("certification_id");--> statement-breakpoint
CREATE INDEX "attestation_responses_attester_id_idx" ON "attestation_responses" USING btree ("attester_id");--> statement-breakpoint
CREATE INDEX "attestation_responses_status_idx" ON "attestation_responses" USING btree ("status");--> statement-breakpoint
CREATE INDEX "cert_assignments_certification_id_idx" ON "certification_assignments" USING btree ("certification_id");--> statement-breakpoint
CREATE INDEX "cert_assignments_attester_id_idx" ON "certification_assignments" USING btree ("attester_id");--> statement-breakpoint
CREATE INDEX "certifications_mandate_id_idx" ON "certifications" USING btree ("mandate_id");--> statement-breakpoint
CREATE INDEX "certifications_created_by_idx" ON "certifications" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "certifications_status_idx" ON "certifications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_read_idx" ON "notifications" USING btree ("read");--> statement-breakpoint
CREATE INDEX "notifications_user_read_created_idx" ON "notifications" USING btree ("user_id","read","created_at");