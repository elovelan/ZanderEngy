PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_comment_threads` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` integer,
	`document_path` text NOT NULL,
	`resolved` integer DEFAULT false NOT NULL,
	`resolved_by` text,
	`resolved_at` text,
	`metadata` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_comment_threads`("id", "workspace_id", "document_path", "resolved", "resolved_by", "resolved_at", "metadata", "created_at", "updated_at") SELECT "id", "workspace_id", "document_path", "resolved", "resolved_by", "resolved_at", "metadata", "created_at", "updated_at" FROM `comment_threads`;--> statement-breakpoint
DROP TABLE `comment_threads`;--> statement-breakpoint
ALTER TABLE `__new_comment_threads` RENAME TO `comment_threads`;--> statement-breakpoint
PRAGMA foreign_keys=ON;