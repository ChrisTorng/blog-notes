import { WorkerEntrypoint } from 'cloudflare:workers'
import { hasBookmarkReference, publishedNotesByBookmark } from '../data.js'
import { noteArticleHtml } from '../public-content.js'

import worker from '../index.js'

export default worker

// Dynamic public documents are cached independently of all admin/API traffic.
export class PublicCache extends WorkerEntrypoint {
  fetch(request) {
    return worker.fetch(request, this.env, this.ctx, true)
  }

  async purgePublic() {
    const result = await this.ctx.cache.purge({ purgeEverything: true })
    if (!result.success) throw new Error('Notes Workers Cache purge failed: ' + JSON.stringify(result.errors || []))
    return true
  }
}

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
