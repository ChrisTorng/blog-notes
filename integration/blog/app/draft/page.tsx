import { sortPosts } from 'pliny/utils/contentlayer'
import { allBlogs } from 'contentlayer/generated'
import { genPageMetadata } from 'app/seo'
import { getDraftBlogs } from 'app/blog-utils'
import DraftTimeline from '@/components/notes/DraftTimeline'

export const metadata = genPageMetadata({
  title: '草稿',
  description: '尚未公開發佈的文章與隨筆草稿',
  robots: { index: false, follow: false },
})

export default function DraftPage() {
  const articles = sortPosts(getDraftBlogs(allBlogs)).map((post) => ({
    id: post.path,
    kind: 'blog' as const,
    title: post.title,
    date: new Date(post.date).toISOString(),
    summary: post.summary || '',
    url: `/${post.path}/`,
  }))
  return <DraftTimeline articles={articles} />
}
