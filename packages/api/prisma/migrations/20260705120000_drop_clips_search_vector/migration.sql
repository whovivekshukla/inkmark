-- Migration: drop_clips_search_vector
-- Search was simplified to a case-insensitive `contains` query (search.repository.ts).
-- The tsvector column, its BEFORE INSERT/UPDATE trigger, the trigger function, and the
-- GIN index are no longer read by anything — they are pure write overhead on every clip
-- mutation. Drop the whole dead machinery. Real full-text search returns in a later phase.
--
-- Raw SQL required: Prisma does not manage tsvector columns, triggers, functions, or GIN indexes.

DROP TRIGGER IF EXISTS clips_search_vector_trigger ON clips;
DROP FUNCTION IF EXISTS clips_search_vector_update();
DROP INDEX IF EXISTS clips_search_vector_idx;
ALTER TABLE clips DROP COLUMN IF EXISTS search_vector;
