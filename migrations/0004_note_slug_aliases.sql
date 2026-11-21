-- Old public permalinks keep redirecting after semantic English slug migration.
-- A per-note earliest alias is also the immutable RSS GUID for existing readers.
CREATE TABLE IF NOT EXISTS note_slug_aliases (
  slug TEXT PRIMARY KEY,
  note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_note_slug_aliases_note_id
  ON note_slug_aliases(note_id);
