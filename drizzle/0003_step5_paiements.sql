ALTER TABLE "payments" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "reference" text NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "payer_note" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "declared_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "failure_reason" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "confirmed_by" uuid;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "period_end" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_reference_unique" UNIQUE("reference");