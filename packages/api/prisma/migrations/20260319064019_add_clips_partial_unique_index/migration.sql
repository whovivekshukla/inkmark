-- Partial unique index: enforces uniqueness only on active (non-deleted) clips.
-- Allows the same user to re-save a URL after soft-deleting it.
-- Raw SQL required: Prisma does not support partial unique indexes natively.
CREATE UNIQUE INDEX clips_user_url_active_idx ON clips(user_id, url)
WHERE deleted_at IS NULL;

-- Restore GIN index for full-text search — dropped by Prisma in previous migration
-- because it cannot manage manually created indexes on Unsupported columns.
CREATE INDEX clips_search_vector_idx ON clips USING GIN(search_vector);
