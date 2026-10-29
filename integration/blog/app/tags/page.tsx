import tagData from 'app/tag-data.json'
import { genPageMetadata } from 'app/seo'
import Categories from '@/components/notes/Categories'
import ArticleCategories from '@/components/notes/ArticleCategories'
import { notesDiscoveryEnabled } from '@/data/notesSettings'
export const metadata = genPageMetadata({
  title: '類別',
  description: notesDiscoveryEnabled ? '文章與隨筆主題分類' : '文章主題分類',
})
export default function Page() {
  if (!notesDiscoveryEnabled) return <ArticleCategories />
  return (
    <Categories
      articleCounts={Object.fromEntries(
        Object.entries(tagData).map(([id, value]) => [id, value.count])
      )}
    />
  )
}
