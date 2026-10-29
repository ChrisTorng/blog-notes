import PublicTimeline from '@/components/notes/PublicTimeline'
import ArticlesHome from '@/components/notes/ArticlesHome'
import { notesDiscoveryEnabled } from '@/data/notesSettings'
export default function Main({ posts }) {
  return notesDiscoveryEnabled ? (
    <PublicTimeline articles={posts} />
  ) : (
    <ArticlesHome posts={posts} />
  )
}
