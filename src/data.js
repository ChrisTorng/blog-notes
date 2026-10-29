import tagDefinitions from '../shared/tags.json' with { type: 'json' }

export const PAGE_SIZE = 20
const tagIds = new Set(tagDefinitions.map((tag) => tag.id))
export const allTags = tagDefinitions

export function cleanTags(value) {
  if (!Array.isArray(value)) throw new Error('tags 必須是陣列')
  const tags = [...new Set(value.map(String))]
  if (tags.some((id) => !tagIds.has(id))) throw new Error('包含未知的主題標籤')
  return tags
}

export function checkNoteInput(value) {
  if (!value || typeof value !== 'object') throw new Error('缺少 Note 資料')
  const markdown = value.markdown
  const title = value.title == null ? null : String(value.title).trim()
  const status = value.status ?? 'draft'
  if (
    typeof markdown !== 'string' ||
    !markdown.trim() ||
    markdown.length > 30000
  ) {
    throw new Error('Markdown 必須是 1～30,000 字元')
  }
  if (title && title.length > 160) throw new Error('標題不得超過 160 字元')
  if (!['draft', 'published'].includes(status))
    throw new Error('狀態必須是 draft 或 published')
  return { title, markdown, status, tags: cleanTags(value.tags ?? []) }
}

const fields = `n.id, n.title, n.markdown, n.status, n.created_at, n.updated_at, n.published_at,
  COALESCE((SELECT json_group_array(tag_id) FROM note_tags WHERE note_id=n.id), '[]') AS tags`

function decode(note) {
  return note ? { ...note, tags: JSON.parse(note.tags || '[]') } : null
}

export async function getNote(db, id, includeDraft = false) {
  const row = await db
    .prepare(
      `SELECT ${fields} FROM notes n WHERE n.id = ?${includeDraft ? '' : " AND n.status = 'published'"}`
    )
    .bind(id)
    .first()
  return decode(row)
}

export async function listNotes(
  db,
  { page = 1, pageSize = PAGE_SIZE, tag = '', includeDraft = false } = {}
) {
  const safePage = Math.max(1, Math.min(100000, Number(page) || 1))
  const size = Math.max(1, Math.min(100, Number(pageSize) || PAGE_SIZE))
  const where = [includeDraft ? '1 = 1' : "n.status = 'published'"]
  const params = []
  if (tag) {
    if (!tagIds.has(tag)) throw new Error('未知的 Tag')
    where.push(
      'EXISTS (SELECT 1 FROM note_tags nt WHERE nt.note_id = n.id AND nt.tag_id = ?)'
    )
    params.push(tag)
  }
  const filter = where.join(' AND ')
  const total = (
    await db
      .prepare(`SELECT COUNT(*) AS total FROM notes n WHERE ${filter}`)
      .bind(...params)
      .first()
  ).total
  const result = await db
    .prepare(
      `SELECT ${fields} FROM notes n WHERE ${filter}
    ORDER BY COALESCE(n.published_at, n.created_at) DESC, n.created_at DESC, n.id DESC LIMIT ? OFFSET ?`
    )
    .bind(...params, size, (safePage - 1) * size)
    .all()
  return {
    items: result.results.map(decode),
    page: safePage,
    pageSize: size,
    total,
    pages: Math.max(1, Math.ceil(total / size)),
  }
}

function newId(now) {
  const prefix = now.slice(0, 10).replaceAll('-', '')
  return `${prefix}-${crypto.randomUUID().replaceAll('-', '').slice(0, 10)}`
}

export async function createNote(db, raw) {
  const input = checkNoteInput(raw)
  const now = new Date().toISOString()
  const id = newId(now)
  const statements = [
    db
      .prepare(
        `INSERT INTO notes(id,title,markdown,status,created_at,published_at,updated_at)
    VALUES(?,?,?,?,?,?,?)`
      )
      .bind(
        id,
        input.title,
        input.markdown,
        input.status,
        now,
        input.status === 'published' ? now : null,
        now
      ),
  ]
  statements.push(
    ...input.tags.map((tag) =>
      db
        .prepare('INSERT INTO note_tags(note_id,tag_id) VALUES(?,?)')
        .bind(id, tag)
    )
  )
  await db.batch(statements)
  return getNote(db, id, true)
}

export async function updateNote(db, id, raw) {
  const input = checkNoteInput(raw)
  const current = await getNote(db, id, true)
  if (!current) return null
  const now = new Date().toISOString()
  const publishedAt =
    input.status === 'published' ? current.published_at || now : null
  const stmts = [
    db
      .prepare(
        'UPDATE notes SET title=?, markdown=?, status=?, published_at=?, updated_at=? WHERE id=?'
      )
      .bind(input.title, input.markdown, input.status, publishedAt, now, id),
    db.prepare('DELETE FROM note_tags WHERE note_id=?').bind(id),
    ...input.tags.map((tag) =>
      db
        .prepare('INSERT INTO note_tags(note_id,tag_id) VALUES(?,?)')
        .bind(id, tag)
    ),
  ]
  await db.batch(stmts)
  return getNote(db, id, true)
}

export async function deleteNote(db, id) {
  const current = await getNote(db, id, true)
  if (!current) return false
  await db.batch([
    db.prepare('DELETE FROM note_tags WHERE note_id=?').bind(id),
    db.prepare('DELETE FROM notes WHERE id=?').bind(id),
  ])
  return true
}

export function pageNumber(input) {
  const value = Number(input)
  return Number.isSafeInteger(value) && value > 0 && value <= 100000 ? value : 1
}

export async function noteTagCounts(db) {
  const rows = await db
    .prepare(
      "SELECT nt.tag_id, COUNT(*) AS count FROM note_tags nt JOIN notes n ON n.id=nt.note_id WHERE n.status='published' GROUP BY nt.tag_id"
    )
    .all()
  return Object.fromEntries(rows.results.map((row) => [row.tag_id, row.count]))
}
export async function exportNoteBatch(db, afterId = '') {
  const rows = await db
    .prepare(
      `SELECT ${fields} FROM notes n WHERE n.id > ? ORDER BY n.id LIMIT 100`
    )
    .bind(afterId)
    .all()
  return rows.results.map(decode)
}
