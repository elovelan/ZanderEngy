ALTER TABLE `workspaces` ADD `container_enabled` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `container_config` text;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `max_concurrency` integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `auto_start` integer DEFAULT false;