CREATE TABLE `attendance` (
	`id` text PRIMARY KEY NOT NULL,
	`scope` text NOT NULL,
	`worker_id` text NOT NULL,
	`date` text NOT NULL,
	`am_site_id` text,
	`pm_site_id` text,
	`am_wage` integer DEFAULT 0 NOT NULL,
	`pm_wage` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`last_operation` text,
	`updated_by` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`worker_id`) REFERENCES `workers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`am_site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`pm_site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "attendance_am" CHECK(("attendance"."am_site_id" IS NULL AND "attendance"."am_wage" = 0) OR ("attendance"."am_site_id" IS NOT NULL AND "attendance"."am_wage" > 0)),
	CONSTRAINT "attendance_pm" CHECK(("attendance"."pm_site_id" IS NULL AND "attendance"."pm_wage" = 0) OR ("attendance"."pm_site_id" IS NOT NULL AND "attendance"."pm_wage" > 0))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attendance_worker_date` ON `attendance` (`worker_id`,`date`);--> statement-breakpoint
CREATE INDEX `attendance_scope_date` ON `attendance` (`scope`,`date`);--> statement-breakpoint
CREATE TABLE `audit` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`id` text NOT NULL,
	`scope` text NOT NULL,
	`entity` text NOT NULL,
	`entity_id` text NOT NULL,
	`actor` text NOT NULL,
	`payload_hash` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `audit_idempotency` ON `audit` (`id`);--> statement-breakpoint
CREATE INDEX `audit_scope_seq` ON `audit` (`scope`,`seq`);--> statement-breakpoint
CREATE TABLE `media` (
	`id` text PRIMARY KEY NOT NULL,
	`scope` text NOT NULL,
	`mime` text NOT NULL,
	`bytes` integer NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `members` (
	`email` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	CONSTRAINT "members_role" CHECK("members"."role" IN ('admin','operator'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `members_user_id` ON `members` (`user_id`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`scope` text NOT NULL,
	`worker_id` text NOT NULL,
	`amount` integer NOT NULL,
	`kind` text NOT NULL,
	`date` text NOT NULL,
	`method` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`reversal_of` text,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`worker_id`) REFERENCES `workers`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "payments_amount" CHECK("payments"."amount" > 0 AND "payments"."amount" <= 100000000),
	CONSTRAINT "payments_kind" CHECK("payments"."kind" IN ('payment','advance','reversal'))
);
--> statement-breakpoint
CREATE INDEX `payments_scope_date` ON `payments` (`scope`,`date`);--> statement-breakpoint
CREATE INDEX `payments_worker` ON `payments` (`worker_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `payments_one_reversal` ON `payments` (`reversal_of`);--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sites` (
	`id` text PRIMARY KEY NOT NULL,
	`scope` text NOT NULL,
	`name` text NOT NULL,
	`owner` text NOT NULL,
	`address` text NOT NULL,
	`color` text NOT NULL,
	`photo_key` text,
	`active` integer DEFAULT 1 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`photo_key`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "sites_scope_check" CHECK("sites"."scope" IN ('demo','live'))
);
--> statement-breakpoint
CREATE INDEX `sites_scope` ON `sites` (`scope`,`active`);--> statement-breakpoint
CREATE TABLE `workers` (
	`id` text PRIMARY KEY NOT NULL,
	`scope` text NOT NULL,
	`name` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`daily_wage` integer NOT NULL,
	`opening_balance` integer DEFAULT 0 NOT NULL,
	`photo_key` text,
	`sample_photo` integer,
	`active` integer DEFAULT 1 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`photo_key`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "workers_wage" CHECK("workers"."daily_wage" > 0 AND "workers"."daily_wage" <= 10000000 AND "workers"."daily_wage" % 100 = 0),
	CONSTRAINT "workers_scope_check" CHECK("workers"."scope" IN ('demo','live'))
);
--> statement-breakpoint
CREATE INDEX `workers_scope` ON `workers` (`scope`,`active`);