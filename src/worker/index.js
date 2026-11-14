import { WorkerEntrypoint } from 'cloudflare:workers'
import { hasBookmarkReference, publishedNotesByBookmark } from '../data.js'
import { noteArticleHtml } from '../public-content.js'

export { default } from '../index.js'

export class BookmarkReferences extends WorkerEntrypoint {
  hasReference(id) {
    return hasBookmarkReference(this.env.DB, id)
  }

  async publishedHtml(ids) {
    const notes = await publishedNotesByBookmark(this.env.DB, ids)
    const site = this.env.SITE_URL || 'https://christorng.idv.tw'
    const html = {}
    for (const note of notes) {
      html[note.bookmark_id] ??= ''
      html[note.bookmark_id] += noteArticleHtml(note, site, '', { asReference: true })
    }
    return html
  }
}
