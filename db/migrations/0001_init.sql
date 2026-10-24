CREATE TYPE "public"."contact_relation" AS ENUM('owner', 'warden', 'manager', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."contact_status" AS ENUM('unverified', 'verified', 'opted_out');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('he', 'she', 'they');--> statement-breakpoint
CREATE TYPE "public"."hostel_status" AS ENUM('user_added', 'verified', 'claimed');--> statement-breakpoint
CREATE TYPE "public"."hostel_type" AS ENUM('boys', 'girls', 'coed', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."merge_status" AS ENUM('open', 'merged', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."question_kind" AS ENUM('fun', 'research', 'rating');--> statement-breakpoint
CREATE TYPE "public"."quiz_status" AS ENUM('draft', 'live', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."segment" AS ENUM('boys', 'girls', 'coed', 'all');--> statement-breakpoint
CREATE TABLE "attempt_answers" (
	"id" serial PRIMARY KEY NOT NULL,
	"attempt_id" uuid NOT NULL,
	"quiz_question_id" integer NOT NULL,
	"shown_option_ids" integer[] NOT NULL,
	"chosen_option_id" integer,
	"is_correct" boolean NOT NULL,
	"ms_to_answer" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quiz_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"player_name" text NOT NULL,
	"hostel_id" uuid,
	"hostel_skipped" boolean DEFAULT false NOT NULL,
	"score" integer,
	"total_ms" integer,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"device" text
);
--> statement-breakpoint
CREATE TABLE "colleges" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"city" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"gender" "gender",
	"hostel_id" uuid,
	"hostel_decided" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"session_id" uuid,
	"name" text NOT NULL,
	"props" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"page" text,
	"ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hostel_contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"hostel_id" uuid NOT NULL,
	"contact_name_enc" text,
	"phone_enc" text NOT NULL,
	"phone_hash" text NOT NULL,
	"relation" "contact_relation" DEFAULT 'unknown' NOT NULL,
	"source" text DEFAULT 'student_opt_in' NOT NULL,
	"submitted_by_session" uuid NOT NULL,
	"consent_at" timestamp with time zone NOT NULL,
	"status" "contact_status" DEFAULT 'unverified' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hostel_flags" (
	"id" serial PRIMARY KEY NOT NULL,
	"hostel_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hostel_merge_candidates" (
	"id" serial PRIMARY KEY NOT NULL,
	"hostel_id" uuid NOT NULL,
	"candidate_id" uuid NOT NULL,
	"similarity" real NOT NULL,
	"status" "merge_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hostels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"name_normalized" text NOT NULL,
	"area" text NOT NULL,
	"area_slug" text NOT NULL,
	"city" text NOT NULL,
	"college_id" integer,
	"type" "hostel_type" DEFAULT 'unknown' NOT NULL,
	"status" "hostel_status" DEFAULT 'user_added' NOT NULL,
	"lat" real,
	"lng" real,
	"created_by_session" uuid,
	"merged_into" uuid,
	"hidden" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "options" (
	"id" serial PRIMARY KEY NOT NULL,
	"question_id" integer NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"emoji" text NOT NULL,
	"image_asset" text,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_stats" (
	"question_id" integer PRIMARY KEY NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"picks" integer DEFAULT 0 NOT NULL,
	"skips" integer DEFAULT 0 NOT NULL,
	"successes" integer DEFAULT 0 NOT NULL,
	"failures" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"text_template" text NOT NULL,
	"objective_tag" text NOT NULL,
	"kind" "question_kind" NOT NULL,
	"segment" "segment" DEFAULT 'all' NOT NULL,
	"fun_score" real NOT NULL,
	"data_value" real NOT NULL,
	"sensitivity" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"quiz_id" uuid NOT NULL,
	"question_id" integer NOT NULL,
	"position" integer NOT NULL,
	"creator_option_id" integer,
	"skipped_from_question_id" integer,
	"answer_ms" integer
);
--> statement-breakpoint
CREATE TABLE "quizzes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"creator_id" uuid NOT NULL,
	"status" "quiz_status" DEFAULT 'draft' NOT NULL,
	"candidate_keys" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"shown_keys" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"shuffles_used" integer DEFAULT 0 NOT NULL,
	"picks_confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ua_hash" text,
	"locale" text DEFAULT 'en' NOT NULL,
	"consent_at" timestamp with time zone,
	"adult_confirmed_at" timestamp with time zone,
	"ref" text,
	"ref_session_id" uuid,
	"utm" text
);
--> statement-breakpoint
CREATE TABLE "shares" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"quiz_id" uuid,
	"hostel_id" uuid,
	"channel" text NOT NULL,
	"ref_session_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "waitlist_taps" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"feature_key" text NOT NULL,
	"hostel_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attempt_answers" ADD CONSTRAINT "attempt_answers_attempt_id_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempt_answers" ADD CONSTRAINT "attempt_answers_quiz_question_id_quiz_questions_id_fk" FOREIGN KEY ("quiz_question_id") REFERENCES "public"."quiz_questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_hostel_id_hostels_id_fk" FOREIGN KEY ("hostel_id") REFERENCES "public"."hostels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creators" ADD CONSTRAINT "creators_hostel_id_hostels_id_fk" FOREIGN KEY ("hostel_id") REFERENCES "public"."hostels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel_contacts" ADD CONSTRAINT "hostel_contacts_hostel_id_hostels_id_fk" FOREIGN KEY ("hostel_id") REFERENCES "public"."hostels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel_flags" ADD CONSTRAINT "hostel_flags_hostel_id_hostels_id_fk" FOREIGN KEY ("hostel_id") REFERENCES "public"."hostels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel_merge_candidates" ADD CONSTRAINT "hostel_merge_candidates_hostel_id_hostels_id_fk" FOREIGN KEY ("hostel_id") REFERENCES "public"."hostels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel_merge_candidates" ADD CONSTRAINT "hostel_merge_candidates_candidate_id_hostels_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."hostels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostels" ADD CONSTRAINT "hostels_college_id_colleges_id_fk" FOREIGN KEY ("college_id") REFERENCES "public"."colleges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "options" ADD CONSTRAINT "options_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_stats" ADD CONSTRAINT "question_stats_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_creator_option_id_options_id_fk" FOREIGN KEY ("creator_option_id") REFERENCES "public"."options"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_skipped_from_question_id_questions_id_fk" FOREIGN KEY ("skipped_from_question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shares" ADD CONSTRAINT "shares_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shares" ADD CONSTRAINT "shares_hostel_id_hostels_id_fk" FOREIGN KEY ("hostel_id") REFERENCES "public"."hostels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist_taps" ADD CONSTRAINT "waitlist_taps_hostel_id_hostels_id_fk" FOREIGN KEY ("hostel_id") REFERENCES "public"."hostels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "attempt_answers_uq" ON "attempt_answers" USING btree ("attempt_id","quiz_question_id");--> statement-breakpoint
CREATE INDEX "attempts_quiz_idx" ON "attempts" USING btree ("quiz_id");--> statement-breakpoint
CREATE INDEX "attempts_session_idx" ON "attempts" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "attempts_hostel_idx" ON "attempts" USING btree ("hostel_id");--> statement-breakpoint
CREATE UNIQUE INDEX "colleges_name_city_uq" ON "colleges" USING btree ("name","city");--> statement-breakpoint
CREATE INDEX "creators_session_idx" ON "creators" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "creators_hostel_idx" ON "creators" USING btree ("hostel_id");--> statement-breakpoint
CREATE INDEX "events_name_created_idx" ON "events" USING btree ("name","created_at");--> statement-breakpoint
CREATE INDEX "events_session_idx" ON "events" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hostel_flags_uq" ON "hostel_flags" USING btree ("hostel_id","session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "merge_pair_uq" ON "hostel_merge_candidates" USING btree ("hostel_id","candidate_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hostels_slug_uq" ON "hostels" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "hostels_area_idx" ON "hostels" USING btree ("city","area_slug");--> statement-breakpoint
CREATE INDEX "hostels_name_trgm_idx" ON "hostels" USING gin ("name_normalized" gin_trgm_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "options_question_key_uq" ON "options" USING btree ("question_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "questions_key_uq" ON "questions" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "quiz_questions_position_uq" ON "quiz_questions" USING btree ("quiz_id","position");--> statement-breakpoint
CREATE INDEX "quiz_questions_question_idx" ON "quiz_questions" USING btree ("question_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quizzes_slug_uq" ON "quizzes" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "quizzes_creator_idx" ON "quizzes" USING btree ("creator_id");--> statement-breakpoint
CREATE UNIQUE INDEX "waitlist_session_feature_uq" ON "waitlist_taps" USING btree ("session_id","feature_key");