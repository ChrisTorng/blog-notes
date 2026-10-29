import Link from '@/components/Link'
import Tag from '@/components/Tag'
import tagData from 'app/tag-data.json'
import { tagDefinitions, type TagData } from '@/data/tagDefinitions'

export default function ArticleCategories() {
  const categories = tagData as TagData
  return (
    <>
      <div className="flex flex-col items-start justify-start divide-y divide-gray-200 md:mt-24 md:flex-row md:items-center md:justify-center md:space-x-6 md:divide-y-0 dark:divide-gray-700">
        <div className="space-x-2 pt-6 pb-8 md:space-y-5">
          <h1 className="heading-accent text-3xl leading-9 font-extrabold tracking-tight sm:text-4xl sm:leading-10 md:border-r-2 md:px-6 md:text-6xl md:leading-14">
            類別
          </h1>
        </div>
        <div className="flex max-w-lg flex-wrap">
          {tagDefinitions.map(({ id, displayName }) => {
            return (
              <div key={id} className="mt-2 mr-5 mb-2">
                <Tag text={displayName} />
                <Link
                  href={`/tags/${id}`}
                  className="-ml-2 text-sm font-semibold text-gray-600 uppercase dark:text-gray-300"
                  aria-label={`檢視類別 ${displayName} 的文章`}
                >
                  {` (${categories[id].count})`}
                </Link>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
