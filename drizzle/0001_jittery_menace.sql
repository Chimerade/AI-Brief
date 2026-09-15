ALTER TABLE `prospects` ADD `motivations` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `prospects` ADD `motivation_notes` text DEFAULT '' NOT NULL;