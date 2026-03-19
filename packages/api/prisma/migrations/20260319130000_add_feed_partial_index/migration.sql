-- Migration: add_feed_partial_index
-- Speeds up feed query: find all public clips from a set of users ordered by savedAt.
-- This is a partial index — only covers non-deleted clips.
-- See schema.prisma: searchVector comment for context on manual migration pattern.

CREATE INDEX clips_user_public_saved_idx ON clips(user_id, is_public, saved_at DESC)
WHERE deleted_at IS NULL;
