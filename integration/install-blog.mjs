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
const route = 'app/articles-index.json/route.ts'
const target = path.join(blog, route),
  source = fs.readFileSync(path.join(here, 'blog', route), 'utf8')
if (fs.existsSync(target) && fs.readFileSync(target, 'utf8') !== source)
  throw Error(`Refusing to overwrite existing ${route}`)
fs.mkdirSync(path.dirname(target), { recursive: true })
fs.writeFileSync(target, source)
console.log(`Installed local Notes integration in ${blog}`)
