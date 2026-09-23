ALTER TABLE `captures` ADD COLUMN `query_norm` text NOT NULL DEFAULT '';
--> statement-breakpoint
UPDATE `captures`
SET `query_norm` = LOWER(TRIM(REPLACE(REPLACE(REPLACE(REPLACE(`query`, '?', ' '), '!', ' '), '.', ' '), ',', ' ')));
--> statement-breakpoint
DELETE FROM `captures`
WHERE `id` NOT IN (
  SELECT MAX(`id`) FROM `captures` GROUP BY `query_norm`
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_captures_query_norm_unique` ON `captures` (`query_norm`);
