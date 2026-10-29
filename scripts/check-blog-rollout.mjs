import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
const blog = path.resolve(process.argv[2] || '../christorng.github.io')
const require = createRequire(path.join(blog, 'package.json'))
const { build } = require('esbuild')
const stubNames = new Map([
  ['@/components/notes/ArticlesHome', 'ArticlesHome'],
  ['@/components/notes/ArticleCategories', 'ArticleCategories'],
  ['@/components/notes/PublicTimeline', 'PublicTimeline'],
  ['@/components/notes/Categories', 'Categories'],
  ['@/components/notes/DraftTimeline', 'DraftTimeline'],
  ['@/components/notes/NotesSlot', 'NotesSlot'],
  ['@/layouts/ListLayoutWithTags', 'ListLayout'],
])
const sample = [
  {
    path: 'blog/article',
    slug: 'article',
    title: 'Article',
    date: '2026-01-01',
    tags: ['AI'],
    draft: false,
  },
  {
    path: 'blog/draft',
    slug: 'draft',
    title: 'Draft',
    date: '2026-01-02',
    tags: ['AI'],
    draft: true,
  },
]
for (const mode of ['production', 'development']) {
  const entry = `
import assert from 'node:assert/strict'
import Main from './app/Main'
import CategoriesPage,{metadata} from './app/tags/page'
import TagPage from './app/tags/[tag]/page'
import TagPagination from './app/tags/[tag]/page/[page]/page'
import DraftPage from './app/draft/page'
import NotesShell from './app/notes-shell/page'
import navigation from './data/headerNavLinks'
import {notesDiscoveryEnabled,productionNotesDiscoveryEnabled} from './data/notesSettings'
import ArticlesHome from '@/components/notes/ArticlesHome'
import ArticleCategories from '@/components/notes/ArticleCategories'
import PublicTimeline from '@/components/notes/PublicTimeline'
import Categories from '@/components/notes/Categories'
import ListLayout from '@/layouts/ListLayoutWithTags'
import DraftTimeline from '@/components/notes/DraftTimeline'
import NotesSlot from '@/components/notes/NotesSlot'
const production=${JSON.stringify(mode)}==='production'
assert.equal(productionNotesDiscoveryEnabled,false)
assert.equal(notesDiscoveryEnabled,!production)
assert.equal(Main({posts:[]}).type,production?ArticlesHome:PublicTimeline)
assert.equal(CategoriesPage().type,production?ArticleCategories:Categories)
assert.equal((await TagPage({params:Promise.resolve({tag:'ai'})})).type,production?ListLayout:PublicTimeline)
assert.equal((await TagPagination({params:Promise.resolve({tag:'ai',page:'1'})})).type,production?ListLayout:PublicTimeline)
assert.equal(navigation.some(item=>item.href==='/notes/'),!production)
assert.equal(navigation.some(item=>item.href==='/draft'),!production)
assert.equal(metadata.description.includes('隨筆'),!production)
assert.equal((await DraftPage()).type,DraftTimeline)
assert.equal(NotesShell().type,NotesSlot)
console.log('PASS '+${JSON.stringify(mode)}+': homepage/categories/navigation gated; direct shell and draft view retained')
`
  const result = await build({
    absWorkingDir: blog,
    stdin: {
      contents: entry,
      resolveDir: blog,
      sourcefile: 'notes-rollout-check.tsx',
      loader: 'tsx',
    },
    bundle: true,
    write: false,
    platform: 'node',
    format: 'esm',
    jsxFactory: '__testJsx',
    jsxFragment: '__testFragment',
    define: { 'process.env.NODE_ENV': JSON.stringify(mode) },
    banner: {
      js: 'const __testJsx=(type,props,...children)=>({type,props:{...props,children}});const __testFragment=Symbol("fragment");',
    },
    plugins: [
      {
        name: 'route-selection-test',
        setup(build) {
          build.onResolve({ filter: /.*/ }, (args) => {
            if (
              stubNames.has(args.path) ||
              [
                'pliny/utils/contentlayer',
                'contentlayer/generated',
                'app/seo',
                'next/navigation',
              ].includes(args.path)
            )
              return { path: args.path, namespace: 'test-leaf' }
            if (args.path.startsWith('@/') || args.path.startsWith('app/')) {
              const base = path.join(
                blog,
                args.path.startsWith('@/') ? args.path.slice(2) : args.path
              )
              for (const file of [
                base,
                base + '.tsx',
                base + '.ts',
                base + '.json',
                base + '.js',
              ])
                if (fs.existsSync(file) && fs.statSync(file).isFile())
                  return { path: file }
            }
          })
          build.onLoad({ filter: /.*/, namespace: 'test-leaf' }, (args) => {
            let contents
            if (stubNames.has(args.path))
              contents = `export default function ${stubNames.get(args.path)}(){return null}`
            if (args.path === 'pliny/utils/contentlayer')
              contents =
                'export const sortPosts=x=>x;export const allCoreContent=x=>x;'
            if (args.path === 'contentlayer/generated')
              contents = `export const allBlogs=${JSON.stringify(sample)}`
            if (args.path === 'app/seo')
              contents = 'export const genPageMetadata=x=>x;'
            if (args.path === 'next/navigation')
              contents = 'export const notFound=()=>{throw Error("404")};'
            return { contents, loader: 'js' }
          })
        },
      },
    ],
  })
  await import(
    'data:text/javascript;base64,' +
      Buffer.from(result.outputFiles[0].text).toString('base64')
  )
}
