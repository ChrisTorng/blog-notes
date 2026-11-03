-- Cross-service bookmark references are stable UUIDs, not cross-D1 foreign keys.
ALTER TABLE notes ADD COLUMN bookmark_id TEXT;
ALTER TABLE notes ADD COLUMN bookmark_title TEXT;
ALTER TABLE notes ADD COLUMN bookmark_url TEXT;
CREATE INDEX IF NOT EXISTS idx_notes_bookmark ON notes(bookmark_id);
