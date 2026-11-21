-- Preserve RSS identities before changing any published Notes slugs.
ALTER TABLE notes ADD COLUMN rss_guid TEXT;
UPDATE notes SET rss_guid='https://christorng.idv.tw/notes/' || slug || '/'
 WHERE slug IS NOT NULL AND status='published' AND rss_guid IS NULL;
-- Legacy URLs must remain permanent redirects, including after title edits.
CREATE TABLE IF NOT EXISTS note_slug_redirects (
  slug TEXT PRIMARY KEY,
  note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_note_slug_redirect_note_id ON note_slug_redirects(note_id);
