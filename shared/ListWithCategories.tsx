import type { ElementType, AnchorHTMLAttributes } from 'react'

function NativeLink({ className, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a {...props} className={['break-words', className].filter(Boolean).join(' ')}>
      {children}
    </a>
  )
}

export function formatNoteDate(date: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('zh-Hant-TW', {
      timeZone: 'Asia/Taipei',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date(date))
      .map((part) => [part.type, part.value])
  )
  return `${parts.year}/${parts.month}/${parts.day} ${parts.hour}:${parts.minute}`
}

export type ListEntry = {
  path: string
  href: string
  date: string
  title: string
  subtitle?: string
  summary?: string
  html?: string
  tags: string[]
  noteId?: string
}
export type ListCategory = {
  id: string
  displayName: string
  count: number
  href: string
}
const formatDate = (date: string, locale: string) =>
  new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(date))

export interface PaginationProps {
  hrefForPage?: (page: number) => string
  totalPages: number
  currentPage: number
  basePath: string
}
interface ListLayoutProps {
  posts: ListEntry[]
  title: string
  initialDisplayPosts?: ListEntry[]
  pagination?: PaginationProps
  categories: ListCategory[]
  activeTag?: string
  rootHref: string
  rootLabel: string
  rootActive?: boolean
  rssHref: string
  rssTitle: string
  locale?: string
  LinkComponent?: ElementType
  TagComponent?: ElementType
}

function Pagination({ totalPages, currentPage, basePath, hrefForPage }: PaginationProps) {
  const Link = 'a'
  const pageHref =
    hrefForPage || ((page: number) => (page === 1 ? `/${basePath}/` : `/${basePath}/page/${page}`))
  const prevPage = currentPage - 1 > 0
  const nextPage = currentPage + 1 <= totalPages

  return (
    <div className="space-y-2 pt-6 pb-8 md:space-y-5">
      <nav className="flex justify-between">
        {!prevPage && (
          <button className="cursor-auto disabled:opacity-50" disabled={!prevPage}>
            上一頁
          </button>
        )}
        {prevPage && (
          <Link href={pageHref(currentPage - 1)} rel="prev">
            上一頁
          </Link>
        )}
        <span>
          {currentPage}/{totalPages}
        </span>
        {!nextPage && (
          <button className="cursor-auto disabled:opacity-50" disabled={!nextPage}>
            下一頁
          </button>
        )}
        {nextPage && (
          <Link href={pageHref(currentPage + 1)} rel="next">
            下一頁
          </Link>
        )}
      </nav>
    </div>
  )
}

export default function ListWithCategories({
  posts,
  title,
  initialDisplayPosts = [],
  pagination,
  categories,
  activeTag = '',
  rootHref,
  rootLabel,
  rootActive = false,
  rssHref,
  rssTitle,
  locale = 'zh-Hant-TW',
  LinkComponent = NativeLink,
  TagComponent,
}: ListLayoutProps) {
  const Link = LinkComponent
  const Tag =
    TagComponent ||
    (({ text }: { text: string }) => {
      const tag = categories.find((item) => item.displayName === text)
      return tag ? (
        <a
          href={tag.href}
          className="text-primary-500 hover:text-primary-600 dark:hover:text-primary-400 mr-3 text-sm font-medium uppercase"
        >
          {text}
        </a>
      ) : null
    })
  const displayPosts = initialDisplayPosts.length > 0 ? initialDisplayPosts : posts

  return (
    <>
      <div>
        <div className="flex items-center justify-between gap-4 pt-5 pb-6">
          <h1 className="heading-accent text-3xl leading-9 font-extrabold tracking-tight sm:text-4xl sm:leading-10 md:text-5xl md:leading-14">
            {title}
            <small className="ml-3 text-base font-normal tracking-normal text-gray-500 md:text-xl dark:text-gray-400">{title.startsWith('隨筆') ? 'Notes' : title.includes('文章') ? 'Articles' : ''}</small>
          </h1>
          <Link
            href={rssHref}
            type="application/rss+xml"
            className="hover:text-primary-500 dark:hover:text-primary-400 ml-auto inline-flex items-center gap-2 font-medium text-gray-600 transition-colors dark:text-gray-300"
            aria-label={rssTitle}
          >
            <svg
              className="h-5 w-5"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path fill="none" d="M4 11a9 9 0 0 1 9 9" />
              <path fill="none" d="M4 4a16 16 0 0 1 16 16" />
              <circle fill="none" cx="5" cy="19" r="1" />
            </svg>
            {rssTitle}
          </Link>
        </div>
        <div className="grid grid-cols-1 items-start gap-8 sm:grid-cols-[244px_minmax(0,1fr)] lg:gap-12">
          <aside className="hidden w-full rounded-xl border border-gray-200/70 bg-gray-100/60 p-4 sm:block dark:border-gray-700/50 dark:bg-gray-800/70">
            <div className="min-w-0">
              {rootActive ? (
                <h3 className="text-primary-500 rounded-md px-2 py-2 font-bold">{rootLabel}</h3>
              ) : (
                <Link
                  href={rootHref}
                  className="hover:text-primary-500 dark:hover:text-primary-500 block rounded-md px-2 py-2 font-bold text-gray-700 dark:text-gray-300"
                >
                  {rootLabel}
                </Link>
              )}
              <ul className="mt-2 border-t border-gray-200/70 pt-2 pl-3 dark:border-gray-700/60">
                {categories.map(({ id, displayName, count, href }) => {
                  return (
                    <li key={id} className="my-2">
                      {activeTag === id ? (
                        <h3 className="text-primary-500 inline-flex items-baseline rounded-md bg-blue-500/5 px-2 py-1.5 text-sm font-bold">
                          {displayName}<span className="ml-3 opacity-70">({count})</span>
                        </h3>
                      ) : (
                        <Link
                          href={href}
                          className="hover:text-primary-500 dark:hover:text-primary-500 inline-flex items-baseline rounded-md px-2 py-1.5 text-sm font-medium text-gray-500 dark:text-gray-300"
                          aria-label={`檢視類別 ${displayName}`}
                        >
                          {displayName}<span className="ml-3 opacity-70">({count})</span>
                        </Link>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          </aside>
          <div className="min-w-0">
            <ul>
              {displayPosts.map((post) => {
                const { path, href, date, title, subtitle, summary, html, tags, noteId } = post
                return (
                  <li key={path} className="border-b border-gray-200/60 py-4 last:border-0 dark:border-gray-700/60">
                    <article className="flex flex-col space-y-2 xl:space-y-0" data-note-id={noteId}>
                      <dl>
                        <dt className="sr-only">發佈於</dt>
                        <dd className="text-base leading-6 font-medium text-gray-500 dark:text-gray-400">
                          <time dateTime={date} suppressHydrationWarning>
                            {noteId ? formatNoteDate(date) : formatDate(date, locale)}
                          </time>
                        </dd>
                      </dl>
                      <div className="space-y-2">
                        <div>
                          <h2 className="text-2xl leading-8 font-bold tracking-tight">
                            <Link href={href} className="title-link">
                              {title}
                            </Link>
                          </h2>
                          {subtitle && (
                            <p className="mt-1 text-lg leading-7 font-semibold text-gray-700 dark:text-gray-300">
                              {subtitle}
                            </p>
                          )}
                          <div className="flex flex-wrap">
                            {tags?.map((tag) => (
                              <Tag key={tag} text={tag} />
                            ))}
                          </div>
                        </div>
                        {html !== undefined ? (
                          <div
                            className="prose dark:prose-invert max-w-none text-gray-500 dark:text-gray-400"
                            dangerouslySetInnerHTML={{ __html: html }}
                          />
                        ) : (
                          <div className="prose dark:prose-invert max-w-none text-gray-500 dark:text-gray-400">
                            {summary}
                          </div>
                        )}
                      </div>
                    </article>
                  </li>
                )
              })}
            </ul>
            {pagination && pagination.totalPages > 1 && (
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                basePath={pagination.basePath}
                hrefForPage={pagination.hrefForPage}
              />
            )}
          </div>
        </div>
      </div>
    </>
  )
}
