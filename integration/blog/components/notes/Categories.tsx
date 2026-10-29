'use client'
import { notesDiscoveryEnabled } from '@/data/notesSettings'
import { useEffect, useState } from 'react'
import Link from '@/components/Link'
import { tagDefinitions } from '@/data/tagDefinitions'

export default function Categories({ articleCounts }: { articleCounts: Record<string, number> }) {
  const [counts, setCounts] = useState<Record<string, number>>({})
  useEffect(() => {
    if (!notesDiscoveryEnabled) return
    const controller = new AbortController()
    fetch('/notes/api/categories', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Unavailable')
        return response.json()
      })
      .then((result) => {
        if (!controller.signal.aborted)
          setCounts(
            Object.fromEntries(
              result.map((item: { id: string; noteCount: number }) => [item.id, item.noteCount])
            )
          )
      })
      .catch(() => {})
    return () => controller.abort()
  }, [])
  return (
    <div className="flex flex-col items-start gap-5 pt-6 pb-8 md:mt-24 md:flex-row md:items-center md:justify-center md:gap-6">
      <h1 className="heading-accent shrink-0 text-3xl leading-9 font-extrabold tracking-tight sm:text-4xl sm:leading-10 md:border-r-2 md:px-6 md:text-6xl md:leading-14">
        類別
      </h1>
      <ul className="flex max-w-3xl flex-wrap items-center gap-x-6 gap-y-3">
        {tagDefinitions.map((tag) => (
          <li key={tag.id}>
            <Link
              href={`/tags/${tag.id}/`}
              className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-1"
              aria-label={`檢視類別 ${tag.displayName} 的文章與隨筆`}
            >
              <span className="text-primary-500 text-sm font-semibold">{tag.displayName}</span>
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                文章 {articleCounts[tag.id] || 0}
                {notesDiscoveryEnabled ? <> · 隨筆 {counts[tag.id] ?? '…'}</> : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
