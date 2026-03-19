-- Migration: add_clips_partial_index
-- Speeds up the common getAll query: user's active clips ordered by savedAt.
-- Partial index covers only non-deleted clips, keeping the index small.
-- Raw SQL required: Prisma does not support partial indexes natively.

CREATE INDEX clips_user_active_saved_idx ON clips(user_id, saved_at DESC)
WHERE deleted_at IS NULL;
