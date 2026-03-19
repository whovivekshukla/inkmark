-- Restore GIN index on clips.search_vector — accidentally dropped by the PAT migration
CREATE INDEX clips_search_vector_idx ON clips USING GIN(search_vector);
