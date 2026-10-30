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
    ? [{ href: '/notes/', title: '隨筆' }]
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
  'components/ListWithCategories.tsx',
  'app/notes-shell/page.tsx',
  'components/notes/NotesSlot.tsx',
  'components/notes/DraftTimeline.tsx',
  'components/notes/PublicTimeline.tsx',
  'components/notes/Categories.tsx',
  'components/notes/ArticlesHome.tsx',
  'components/notes/ArticleCategories.tsx',
  'data/notesSettings.ts',
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

for (const file of [
  'app/Main.tsx',
  'app/tags/page.tsx',
  'app/tags/[tag]/page.tsx',
  'app/tags/[tag]/page/[page]/page.tsx',
]) {
  const source = fs.readFileSync(path.join(here, 'blog', file), 'utf8'),
    target = path.join(blog, file)
  const previous = fs.readFileSync(target, 'utf8')
  const known =
    previous.includes('const MAX_DISPLAY = 20') ||
    previous.includes('ListLayout') ||
    previous.includes('const categories = tagData as TagData')
  if (previous !== source && !known)
    throw Error('Review existing page before replacing: ' + file)
  fs.writeFileSync(target, source)
}
for (const file of ['app/robots.ts', 'app/sitemap.ts']) {
  const source = fs.readFileSync(path.join(here, 'blog', file), 'utf8')
  const target = path.join(blog, file)
  const previous = fs.readFileSync(target, 'utf8')
  const originalFunction = file.includes('robots') ? 'function robots()' : 'function sitemap()'
  if (previous !== source && (!previous.includes(originalFunction) || previous.includes('notesDiscoveryEnabled')))
    throw Error('Review existing SEO route before replacing: ' + file)
  fs.writeFileSync(target, source)
}

let header = fs.readFileSync(path.join(blog, 'components/Header.tsx'), 'utf8')
header = header
  .replace(
    'no-scrollbar hidden max-w-40 items-center gap-x-4 overflow-x-auto sm:flex md:max-w-72 lg:max-w-96',
    'no-scrollbar hidden flex-nowrap items-center gap-x-4 sm:flex'
  )
  .replace(
    'm-1 font-medium text-gray-700',
    'm-1 shrink-0 whitespace-nowrap font-medium text-gray-700'
  )
fs.writeFileSync(path.join(blog, 'components/Header.tsx'), header)
let navigation = fs
  .readFileSync(path.join(blog, 'data/headerNavLinks.ts'), 'utf8')
  .replace(", { href: '/notes/all/', title: '全部' }", '')
fs.writeFileSync(path.join(blog, 'data/headerNavLinks.ts'), navigation)

fs.writeFileSync(
  path.join(blog, 'data/headerNavLinks.ts'),
  fs.readFileSync(path.join(here, 'blog/data/headerNavLinks.ts'), 'utf8')
)

const listFile = 'layouts/ListLayoutWithTags.tsx'
const listTarget = path.join(blog, listFile)
const existingList = fs.readFileSync(listTarget, 'utf8')
if (!existingList.includes('function ListLayoutWithTags'))
  throw Error('Review existing list layout before replacing')
fs.writeFileSync(
  listTarget,
  fs.readFileSync(path.join(here, 'blog', listFile), 'utf8')
)
