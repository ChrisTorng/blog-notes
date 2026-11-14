'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from '@/components/Link'
import { formatDate } from '@/utils/formatDate'
import siteMetadata from '@/data/siteMetadata'

type Entry = {
  id: string
  kind: 'blog' | 'note'
  title: string
  date: string
  summary: string
  url: string
}
type DraftNote = {
  id: string
  title: string | null
  markdown: string
  status: string
  created_at: string
  updated_at: string
}

export default function DraftTimeline({ articles }: { articles: Entry[] }) {
  const [notes, setNotes] = useState<Entry[]>([])
  const [notice, setNotice] = useState('正在讀取隨筆草稿……')
  const [query, setQuery] = useState('')
  const [retry, setRetry] = useState(0)
  const [loadError, setLoadError] = useState(false)
  useEffect(() => {
    const resume = () => {
      if (document.visibilityState === 'visible') setRetry((n) => n + 1)
    }
    document.addEventListener('visibilitychange', resume)
    return () => document.removeEventListener('visibilitychange', resume)
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      const headers: Record<string, string> = {}
      if (['localhost', '127.0.0.1'].includes(location.hostname)) {
        const token = sessionStorage.getItem('blog-notes-local-token')
        if (token) headers.Authorization = `Bearer ${token}`
      }
      setLoadError(false)
      const items: DraftNote[] = []
      for (let page = 1, pages = 1; page <= pages; page++) {
        const response = await fetch(`/notes/api/admin/?page=${page}`, {
          headers,
          credentials: 'same-origin',
          signal: controller.signal,
        })
        if (!response.ok || !response.headers.get('content-type')?.includes('application/json'))
          throw new Error('尚未取得隨筆管理授權，請先開啟隨筆編輯器完成登入。')
        const result = await response.json()
        pages = result.pages
        items.push(...result.items)
      }
      if (controller.signal.aborted) return
      setNotes(
        items
          .filter((note) => note.status === 'draft')
          .map((note) => ({
            id: note.id,
            kind: 'note',
            title:
              note.title || note.markdown.split('\n').find((line) => line.trim()) || '未命名隨筆',
            date: note.updated_at || note.created_at,
            summary: note.markdown,
            url: `/notes/editor/?id=${encodeURIComponent(note.id)}`,
          }))
      )
      setNotice('')
    }
    load().catch((error) => {
      if (!controller.signal.aborted) {
        setLoadError(true)
        setNotice(error instanceof TypeError
          ? '無法連接隨筆管理 API；可能尚未登入 Cloudflare Access，或登入頁轉址被瀏覽器封鎖。'
          : error instanceof Error ? error.message : '隨筆草稿載入失敗。')
      }
    })
    return () => controller.abort()
  }, [retry])
  const entries = useMemo(
    () =>
      [...articles, ...notes]
        .filter((entry) =>
          `${entry.title} ${entry.summary}`.toLowerCase().includes(query.toLowerCase())
        )
        .sort((a, b) => b.date.localeCompare(a.date)),
    [articles, notes, query]
  )
  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      <div className="space-y-4 pt-6 pb-8">
        <h1 className="heading-accent text-3xl font-extrabold tracking-tight sm:text-4xl md:text-6xl">
          草稿
        </h1>
        <p className="text-gray-500 dark:text-gray-400">文章與隨筆草稿，依更新時間排列。</p>
        <label className="block max-w-lg">
          <span className="sr-only">搜尋草稿</span>
          <input
            aria-label="搜尋草稿"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜尋草稿"
            className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 dark:border-gray-700 dark:bg-gray-800"
          />
        </label>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <Link href="/notes/editor/" target="_blank" rel="noopener noreferrer"
            className="text-primary-500 hover:text-primary-600">
            開啟隨筆編輯器（新增／登入）
          </Link>
          {loadError && (
            <button type="button" className="text-primary-500 underline"
              onClick={() => { setNotice('正在重新讀取隨筆草稿……'); setRetry((n) => n + 1) }}>
              重新載入草稿
            </button>
          )}
        </div>
        {notice && <p role="status" className="text-sm text-gray-500 dark:text-gray-400">
          {notice}
        </p>}
      </div>
      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
        {entries.map((entry) => (
          <li key={`${entry.kind}:${entry.id}`} className="py-8">
            <div className="mb-2 text-sm text-gray-500 dark:text-gray-400">
              <time dateTime={entry.date}>{formatDate(entry.date, siteMetadata.locale)}</time>
              <span className="ml-3">{entry.kind === 'note' ? '隨筆草稿' : '文章草稿'}</span>
            </div>
            <h2 className="text-2xl font-bold">
              <Link href={entry.url} className="title-link">
                {entry.title}
              </Link>
            </h2>
            <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-gray-500 dark:text-gray-400">
              {entry.summary}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
