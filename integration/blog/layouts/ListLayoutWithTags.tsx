import { CoreContent } from 'pliny/utils/contentlayer'
import type { Blog } from 'contentlayer/generated'
import Link from '@/components/Link'
import Tag from '@/components/Tag'
import siteMetadata from '@/data/siteMetadata'
import tagData from 'app/tag-data.json'
import { tagDefinitions, type TagData } from '@/data/tagDefinitions'
import ListWithCategories, { type PaginationProps } from '@/components/ListWithCategories'

interface ListLayoutProps {
  posts: CoreContent<Blog>[]
  title: string
  initialDisplayPosts?: CoreContent<Blog>[]
  pagination?: PaginationProps
  activePath: string
}
export default function ListLayoutWithTags({
  posts,
  title,
  initialDisplayPosts = [],
  pagination,
  activePath,
}: ListLayoutProps) {
  const counts = tagData as TagData
  const activeTag = decodeURI(activePath.split('/tags/')[1] || '')
  const displayed = initialDisplayPosts.length > 0 ? initialDisplayPosts : posts
  return (
    <ListWithCategories
      posts={displayed.map((post) => ({ ...post, href: `/${post.path}/` }))}
      title={title}
      pagination={pagination}
      categories={tagDefinitions.map((tag) => ({
        ...tag,
        count: counts[tag.id].count,
        href: `/tags/${tag.id}`,
      }))}
      activeTag={activeTag}
      rootHref="/blog"
      rootLabel="所有文章"
      rootActive={activePath.startsWith('/blog')}
      rssHref={activeTag ? `/tags/${activeTag}/feed.xml` : '/feed.xml'}
      rssTitle={`${title}${activeTag ? ' 類別' : ''} RSS`}
      locale={siteMetadata.locale}
      LinkComponent={Link}
      TagComponent={Tag}
    />
  )
}
