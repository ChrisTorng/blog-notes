import { allCoreContent, sortPosts } from 'pliny/utils/contentlayer'
import { allBlogs } from 'contentlayer/generated'
import tagData from 'app/tag-data.json'
import { notFound } from 'next/navigation'
import { getPublishedBlogs } from 'app/blog-utils'
import { tagDefinitions, getTagDefinitionById } from '@/data/tagDefinitions'
import PublicTimeline from '@/components/notes/PublicTimeline'
import ListLayout from '@/layouts/ListLayoutWithTags'
import { notesDiscoveryEnabled } from '@/data/notesSettings'
export const generateStaticParams = async () =>
  tagDefinitions.flatMap(({ id }) =>
    Array.from({ length: Math.max(1, Math.ceil(tagData[id].count / 20)) }, (_, i) => ({
      tag: id,
      page: String(i + 1),
    }))
  )
export default async function TagPage({
  params,
}: {
  params: Promise<{ tag: string; page: string }>
}) {
  const { tag: id, page } = await params
  const tag = getTagDefinitionById(id),
    current = Number(page)
  if (!tag || !Number.isSafeInteger(current) || current < 1) return notFound()
  const articles = allCoreContent(
    sortPosts(getPublishedBlogs(allBlogs).filter((post) => post.tags?.includes(tag.displayName)))
  )
  if (!notesDiscoveryEnabled) {
    const totalPages = Math.max(1, Math.ceil(articles.length / 20))
    if (current > totalPages) return notFound()
    return (
      <ListLayout
        posts={articles}
        initialDisplayPosts={articles.slice((current - 1) * 20, current * 20)}
        pagination={{
          currentPage: current,
          totalPages,
          basePath: 'tags/' + id,
        }}
        title={tag.displayName}
        activePath={'/tags/' + id}
      />
    )
  }
  return (
    <PublicTimeline
      articles={articles}
      title={tag.displayName}
      description="此類別的文章與隨筆，依發布時間排列。"
      tag={id}
      initialPage={current}
    />
  )
}
