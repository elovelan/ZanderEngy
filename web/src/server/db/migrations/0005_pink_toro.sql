CREATE TABLE `task_dependencies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`task_id` integer NOT NULL,
	`blocker_task_id` integer NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`blocker_task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `task_dep_unique` ON `task_dependencies` (`task_id`,`blocker_task_id`);
--> statement-breakpoint
ALTER TABLE `tasks` DROP COLUMN `dependencies`;
