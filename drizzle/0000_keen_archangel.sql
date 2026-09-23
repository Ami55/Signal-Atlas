CREATE TABLE `captures` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`created_at` text NOT NULL,
	`query` text NOT NULL,
	`google_url` text NOT NULL,
	`ai_text` text NOT NULL,
	`tbl_mention` text DEFAULT '' NOT NULL,
	`tbl_mentioned` integer DEFAULT 0 NOT NULL,
	`contributor` text NOT NULL,
	`location` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`screenshot_key` text
);
