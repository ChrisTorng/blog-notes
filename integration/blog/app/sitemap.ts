import { MetadataRoute } from 'next'
import { allAuthors, allBlogs } from 'contentlayer/generated'
import siteMetadata from '@/data/siteMetadata'
import { notesDiscoveryEnabled } from '@/data/notesSettings'

export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = siteMetadata.siteUrl

  const blogRoutes = allBlogs
    .filter((post) => !post.draft)
    .map((post) => ({
      url: `${siteUrl}/${post.path}/`,
      lastModified: post.lastmod || post.date,
    }))

  const routes = [
    '',
    'about',
    'blog',
    'projects',
    'tags',
    ...(notesDiscoveryEnabled ? ['notes/'] : []),
  ].map((route) => ({
    url: `${siteUrl}/${route}`,
    lastModified: new Date().toISOString().split('T')[0],
  }))

  const aboutRoutes = allAuthors
    .filter((author) => author.slug !== 'default')
    .map((author) => ({
      url: `${siteUrl}/about/${author.slug}`,
      lastModified: new Date().toISOString().split('T')[0],
    }))

  return [...routes, ...aboutRoutes, ...blogRoutes]
}
