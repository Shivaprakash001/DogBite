CREATE TYPE "public"."avatar" AS ENUM('boy', 'girl');--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN "player_avatar" "avatar";--> statement-breakpoint
ALTER TABLE "creators" ADD COLUMN "avatar" "avatar";