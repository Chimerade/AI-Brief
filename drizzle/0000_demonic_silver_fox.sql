CREATE TABLE `prospects` (
	`id` text PRIMARY KEY NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`role` text NOT NULL,
	`company` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`needs` text NOT NULL,
	`notes` text NOT NULL,
	`priority` text NOT NULL,
	`status` text NOT NULL,
	`maturity` text NOT NULL,
	`timeline` text NOT NULL,
	`budget` text NOT NULL,
	`next_action` text NOT NULL,
	`follow_up_date` text NOT NULL,
	`search_text` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`last_visit_at` text NOT NULL,
	`visit_count` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_prospects_last_visit` ON `prospects` (`last_visit_at`);--> statement-breakpoint
CREATE INDEX `idx_prospects_status_last_visit` ON `prospects` (`status`,`last_visit_at`);--> statement-breakpoint
CREATE INDEX `idx_prospects_priority_last_visit` ON `prospects` (`priority`,`last_visit_at`);--> statement-breakpoint
CREATE TABLE `visits` (
	`id` text PRIMARY KEY NOT NULL,
	`prospect_id` text NOT NULL,
	`visited_at` text NOT NULL,
	`note` text NOT NULL,
	FOREIGN KEY (`prospect_id`) REFERENCES `prospects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_visits_prospect_date` ON `visits` (`prospect_id`,`visited_at`);