import { MetadataRoute } from 'next'
import siteMetadata from '@/data/siteMetadata'
import { notesDiscoveryEnabled } from '@/data/notesSettings'

export const dynamic = 'force-static'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: [
      `${siteMetadata.siteUrl}/sitemap.xml`,
      ...(notesDiscoveryEnabled ? [`${siteMetadata.siteUrl}/notes/sitemap.xml`] : []),
    ],
    host: siteMetadata.siteUrl,
  }
}
