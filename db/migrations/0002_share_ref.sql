ALTER TABLE "sessions" ADD COLUMN "share_ref" text;--> statement-breakpoint
UPDATE "sessions" SET "share_ref" = substr(md5(random()::text || "id"::text), 1, 10) WHERE "share_ref" IS NULL;--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "share_ref" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_share_ref_uq" ON "sessions" USING btree ("share_ref");
