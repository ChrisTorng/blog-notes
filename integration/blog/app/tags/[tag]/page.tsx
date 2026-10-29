import { allCoreContent, sortPosts } from 'pliny/utils/contentlayer'
import { allBlogs } from 'contentlayer/generated'
import { notFound } from 'next/navigation'
import { getPublishedBlogs } from 'app/blog-utils'
import { genPageMetadata } from 'app/seo'
import { tagDefinitions, getTagDefinitionById } from '@/data/tagDefinitions'
import PublicTimeline from '@/components/notes/PublicTimeline'
import ListLayout from '@/layouts/ListLayoutWithTags'
import { notesDiscoveryEnabled } from '@/data/notesSettings'
export const generateStaticParams = async () => tagDefinitions.map(({ id }) => ({ tag: id }))
export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params
  return genPageMetadata({
    title: getTagDefinitionById(tag)?.displayName || tag,
  })
}
export default async function TagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag: id } = await params
  const tag = getTagDefinitionById(id)
  if (!tag) return notFound()
  const posts = allCoreContent(
    sortPosts(getPublishedBlogs(allBlogs).filter((post) => post.tags?.includes(tag.displayName)))
  )
  if (!notesDiscoveryEnabled) {
    const totalPages = Math.max(1, Math.ceil(posts.length / 20))
    if (1 > totalPages) return notFound()
    return (
      <ListLayout
        posts={posts}
        initialDisplayPosts={posts.slice((1 - 1) * 20, 1 * 20)}
        pagination={{ currentPage: 1, totalPages, basePath: 'tags/' + id }}
        title={tag.displayName}
        activePath={'/tags/' + id}
      />
    )
  }
  return (
    <PublicTimeline
      articles={posts}
      title={tag.displayName}
      description="此類別的文章與隨筆，依發布時間排列。"
      tag={id}
    />
  )
}
