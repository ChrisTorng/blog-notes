import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const blog = path.resolve(
  process.argv[2] || path.join(here, '../../christorng.github.io')
)
function replaceOnce(file, marker, anchor, replacement) {
  const source = fs.readFileSync(path.join(blog, file), 'utf8')
  if (source.includes(marker)) return
  if (!source.includes(anchor))
    throw Error(`Cannot safely patch ${file}: expected anchor missing`)
  fs.writeFileSync(path.join(blog, file), source.replace(anchor, replacement))
}
replaceOnce(
  'next.config.js',
  "source: '/notes/:path*'",
  '          return [',
  `          return [
            {
              source: '/notes/:path*',
              destination: 'http://127.0.0.1:8787/notes/:path*',
            },`
)
replaceOnce(
  'data/headerNavLinks.ts',
  "href: '/notes/'",
  "  { href: '/blog', title: '文章' },",
  `  { href: '/blog', title: '文章' },
  ...(process.env.NODE_ENV !== 'production'
    ? [{ href: '/notes/', title: '隨筆' }, { href: '/notes/all/', title: '全部' }]
    : []),`
)

replaceOnce(
  'components/Link.tsx',
  '/^\\/notes(?:\\/|$)/',
  '  if (isInternalLink) {',
  `  if (isInternalLink && /^\\/notes(?:\\/|$)/.test(href)) {
    return <a className={linkClassName} href={href} {...rest} />
  }

  if (isInternalLink) {`
)
const css = fs.readFileSync(path.join(here, 'notes-public.css'), 'utf8')
const cssPath = path.join(blog, 'css/tailwind.css')
if (!fs.readFileSync(cssPath, 'utf8').includes('/* Notes public content.'))
  fs.appendFileSync(cssPath, css)
for (const route of [
  'app/articles-index.json/route.ts',
  'app/notes-shell/page.tsx',
  'components/notes/NotesSlot.tsx',
  'components/notes/DraftTimeline.tsx',
]) {
  const source = fs.readFileSync(path.join(here, 'blog', route), 'utf8')
  const target = path.join(blog, route)
  if (fs.existsSync(target) && fs.readFileSync(target, 'utf8') !== source)
    throw Error('Review existing integration file before replacing: ' + route)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, source)
}
const draftPath = path.join(blog, 'app/draft/page.tsx')
const draftSource = fs.readFileSync(
  path.join(here, 'blog/app/draft/page.tsx'),
  'utf8'
)
const previous = fs.readFileSync(draftPath, 'utf8')
if (
  previous !== draftSource &&
  !previous.includes('const draftBlogs = getDraftBlogs(allBlogs)')
)
  throw Error('Review existing draft page before replacing it')
fs.writeFileSync(draftPath, draftSource)
console.log('Installed Notes integration')
