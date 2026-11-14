const bookmarkIdPattern = /^[0-9a-f-]{36}$/
// The service binding calls Bookmarks' public canonical HTML API directly.
// No stored snapshot or custom HTML renderer is kept by Notes.
export async function bookmarkEmbeds(notes, env, origin) {
  const ids = [...new Set(notes.map(note => note.bookmark_id)
    .filter(id => id && bookmarkIdPattern.test(id)))]
  if (!ids.length) return {}
  if (!env.BOOKMARKS) throw new Error('BOOKMARKS service binding is missing')
  const results = await Promise.all(ids.map(async id => {
    const response = await env.BOOKMARKS.fetch(
      new Request('https://bookmarks.internal/bookmarks/api/embed/' + id,
        {headers: {'Accept': 'text/html'}})
    )
    if (response.status === 404)
      return [id, '<p class="text-sm text-gray-500">引用書籤目前未公開或已移除。</p>']
    if (!response.ok) throw new Error('Cannot load referenced bookmark: ' + response.status)
    // RSS readers do not necessarily resolve relative paths against our website.
    const html = (await response.text()).replace(
      /\b(href|src)="\/(?!\/)/g, (match, attribute) => attribute + '="' + origin + '/'
    )
    return [id, html]
  }))
  return Object.fromEntries(results)
}

