-- Migration: add_clips_search_vector_trigger
-- Populates search_vector on clips using title + description for fast full-text search.
-- Using pg_catalog.english dictionary for stemming.
-- Raw SQL required: Prisma does not support tsvector GIN indexes or trigger management.

CREATE INDEX clips_search_vector_idx ON clips USING GIN(search_vector);

CREATE OR REPLACE FUNCTION clips_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('pg_catalog.english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('pg_catalog.english', coalesce(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clips_search_vector_trigger
BEFORE INSERT OR UPDATE ON clips
FOR EACH ROW EXECUTE FUNCTION clips_search_vector_update();
