CREATE TABLE `files` (
	`id` integer PRIMARY KEY,
	`key` text NOT NULL,
	`filename` text NOT NULL,
	`mimetype` text NOT NULL,
	`content` text NOT NULL,
	`size` integer NOT NULL,
	`uid` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`uid`) REFERENCES `users` (`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `files_key_idx` ON `files` (`key`);
--> statement-breakpoint
CREATE INDEX `files_uid_idx` ON `files` (`uid`);
--> statement-breakpoint
UPDATE `info` SET `value` = '10' WHERE `key` = 'migration_version';