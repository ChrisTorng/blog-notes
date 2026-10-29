import { Zip, ZipDeflate, strToU8 } from 'fflate'
import { allTags, exportNoteBatch } from './data.js'
import { noteTitle } from './views.js'

export function noteMarkdown(note) {
  const fields = {
    title: noteTitle(note),
    date: note.published_at || note.created_at,
    lastmod: note.updated_at,
    tags: note.tags.map(
      (id) => allTags.find((t) => t.id === id)?.displayName || id
    ),
    draft: note.status !== 'published',
    note_id: note.id,
    created_at: note.created_at,
    published_at: note.published_at,
  }
  return (
    '---\n' +
    Object.entries(fields)
      .map(([key, value]) => key + ': ' + JSON.stringify(value ?? null))
      .join('\n') +
    '\n---\n' +
    note.markdown
  )
}

// Pull one file at a time; only a database batch and a file's compressed chunks stay in memory.
export function notesExport(db) {
  let zip,
    controller,
    batch = [],
    afterId = '',
    offset = 0,
    ended = false
  const stream = new ReadableStream({
    start(value) {
      controller = value
      zip = new Zip((error, chunk, final) => {
        if (error) {
          controller.error(error)
          return
        }
        if (chunk.length) controller.enqueue(chunk)
        if (final) controller.close()
      })
    },
    async pull() {
      if (ended) return
      try {
        if (offset >= batch.length) {
          batch = await exportNoteBatch(db, afterId)
          offset = 0
        }
        if (!batch.length) {
          ended = true
          zip.end()
          return
        }
        const note = batch[offset++]
        if (!/^[0-9]{8}-[a-f0-9]{10}$/.test(note.id))
          throw new Error('Invalid note ID')
        afterId = note.id
        const file = new ZipDeflate(note.id + '.md', { level: 6 })
        zip.add(file)
        file.push(strToU8(noteMarkdown(note)), true)
      } catch (error) {
        ended = true
        zip.terminate()
        controller.error(error)
      }
    },
    cancel() {
      ended = true
      zip.terminate()
    },
  })
  return new Response(stream, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition':
        'attachment; filename="notes-export-' +
        new Date().toISOString().slice(0, 10) +
        '.zip"',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
