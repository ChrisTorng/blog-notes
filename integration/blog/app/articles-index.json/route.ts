import { allBlogs } from 'contentlayer/generated'
import { sortPosts } from 'pliny/utils/contentlayer'
import siteMetadata from '@/data/siteMetadata'
import { getPublishedBlogs } from 'app/blog-utils'
import { tagDefinitions } from '@/data/tagDefinitions'

export const dynamic = 'force-static'

// Static JSON for the Notes timeline, including all published historical articles.
export async function GET() {
  const items = sortPosts(getPublishedBlogs(allBlogs)).map((post) => ({
    kind: 'blog',
    url: new URL('/blog/' + post.slug + '/', siteMetadata.siteUrl).href,
    title: post.title,
    summary: post.summary || '',
    tags: post.tags.map(
      (tag) =>
        tagDefinitions.find((entry) => entry.displayName === tag || entry.id === tag)?.id || tag
    ),
    date: new Date(post.date).toISOString(),
  }))
  return Response.json({ version: 1, items })
}
