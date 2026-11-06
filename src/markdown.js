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

export function noteTitle(note) {
  return note.title ||
    note.bookmark_title ||
    plainText(String(note.markdown || '').split(/\r?\n/).find((line) => line.trim()) || '').slice(0, 160) ||
    '隨筆'
}

export function notePath(id) {
  return '/notes/' + encodeURIComponent(id) + '/'
}

