import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
  typographer: false,
})

export const renderMarkdown = (input) => md.render(String(input ?? ''))

export function noteTitle(note) {
  const first = String(note.markdown || '').split(/\r?\n/).find((line) => line.trim()) || ''
  return note.title || note.bookmark_title || first.replace(/^[#>*\s-]+/, '').slice(0, 160) || '隨筆'
}
