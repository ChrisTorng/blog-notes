import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
  typographer: false,
})

export const renderMarkdown = (input) => md.render(String(input ?? ''))

export const htmlEscape = (value) =>
  String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[ch])


// Public pages and RSS resolve relative links identically against the site's
// root, never against the varying /notes/<slug>/ address.
export function renderPublicMarkdown(input, siteUrl) {
  const root = new URL('/', siteUrl).href
  return renderMarkdown(input).replace(/\b(href|src)="([^"]*)"/g, (full, attribute, encoded) => {
    try {
      const value = encoded.replaceAll('&amp;', '&')
      const url = new URL(value, root)
      if (!['https:', 'http:', 'mailto:'].includes(url.protocol)) return attribute + '="#"'
      // Main-site image/media paths are hosted on separate origins in production.
      // They do not exist at /blog-assets/ or /blog-media/ on GitHub Pages.
      if (url.origin === 'https://christorng.idv.tw' && url.pathname.startsWith('/blog-assets/'))
        return attribute + '="' + htmlEscape('https://assets.christorng.idv.tw/' + url.pathname.slice('/blog-assets/'.length) + url.search + url.hash) + '"'
      if (url.origin === 'https://christorng.idv.tw' && url.pathname.startsWith('/blog-media/'))
        return attribute + '="' + htmlEscape('https://media.christorng.idv.tw/' + url.pathname.slice('/blog-media/'.length) + url.search + url.hash) + '"'
      return attribute + '="' + htmlEscape(url.href) + '"'
    } catch {
      return attribute + '="#"'
    }
  })
}

export function plainText(markdown) {
  const text = []
  function visit(tokens) {
    for (const token of tokens) {
      if (token.children) visit(token.children)
      else if (['text', 'code_inline', 'code_block', 'fence'].includes(token.type))
        text.push(token.content)
      else if (token.type === 'image') text.push(token.content)
      else if (token.type === 'softbreak' || token.type === 'hardbreak' || token.block)
        text.push(' ')
    }
  }
  visit(md.parse(String(markdown ?? ''), {}))
  return text.join('').replace(/\s+/g, ' ').trim()
}

// Titles remain optional in storage. Derive a concise, deterministic
// presentation title for previews, public pages and RSS from the first
// non-empty source line; never alter user-supplied titles or persisted text.
export function automaticNoteTitle(markdown) {
  const first = String(markdown || '').split(/\r?\n/).find(line => line.trim()) || ''
  const value = plainText(first).replace(/\s+/g, ' ').trim()
  if (!value) return '隨筆'
  const chars = Array.from(value)
  const limit = 38
  const sentence = chars.findIndex(ch => /[。！？!?]/.test(ch))
  if (sentence >= 11 && sentence < limit)
    return chars.slice(0, sentence + 1).join('').replace(/[。！？!?]+$/, '')
  if (chars.length <= limit) return value
  const slice = chars.slice(0, limit).join('')
  // Prefer a nearby punctuation/word boundary, but avoid overly short labels.
  const cut = Math.max(
    slice.lastIndexOf('，'),
    slice.lastIndexOf('；'),
    slice.lastIndexOf('、'),
    slice.lastIndexOf(' '),
  )
  return (cut >= 26 ? slice.slice(0, cut) : slice).trimEnd() + '…'
}

export function noteTitle(note) {
  return note.title ||
    note.bookmark_title ||
    automaticNoteTitle(note.markdown)
}

export function notePath(note) {
  const key = typeof note === 'string' ? note : note.slug || note.id
  return '/notes/' + encodeURIComponent(key) + '/'
}

