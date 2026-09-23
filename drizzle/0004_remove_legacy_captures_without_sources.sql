DELETE FROM `captures`
WHERE `id` BETWEEN 4 AND 18
  AND (`cited_sources` IS NULL OR TRIM(`cited_sources`) = '');
