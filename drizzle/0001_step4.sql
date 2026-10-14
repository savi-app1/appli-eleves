CREATE TABLE "document_outputs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"content" text NOT NULL,
	"model" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quizzes" ADD COLUMN "topic" text;--> statement-breakpoint
ALTER TABLE "quizzes" ADD COLUMN "level" text;--> statement-breakpoint
ALTER TABLE "quizzes" ADD COLUMN "minutes" integer;--> statement-breakpoint
ALTER TABLE "document_outputs" ADD CONSTRAINT "document_outputs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_outputs" ADD CONSTRAINT "document_outputs_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "document_outputs_doc_idx" ON "document_outputs" USING btree ("document_id","kind","created_at");