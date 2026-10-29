'use client'
import { useEffect, useState } from 'react'

// The injected HTML is an opaque island; React owns the surrounding site shell.
export default function NotesSlot() {
  const [html] = useState(() =>
    typeof document === 'undefined' ? '' : document.getElementById('notes-content')?.innerHTML || ''
  )
  useEffect(() => {
    const encoded = document.getElementById('notes-page-meta')?.textContent
    if (!encoded) return
    const data = JSON.parse(encoded)
    const metadata = new DOMParser().parseFromString(data.head, 'text/html')
    document.title = metadata.title
    for (const selector of [
      'meta[name="description"]',
      'meta[name="robots"]',
      'link[rel="canonical"]',
      'meta[property^="og:"]',
    ]) {
      document.head.querySelectorAll(selector).forEach((node) => node.remove())
      metadata.head
        .querySelectorAll(selector)
        .forEach((node) => document.head.appendChild(node.cloneNode(true)))
    }
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    async function addEditLinks() {
      const headers: Record<string, string> = {}
      if (['localhost', '127.0.0.1'].includes(location.hostname)) {
        const token = sessionStorage.getItem('blog-notes-local-token')
        if (token) headers.Authorization = 'Bearer ' + token
      }
      const response = await fetch('/notes/api/session', {
        headers,
        credentials: 'same-origin',
        cache: 'no-store',
        signal: controller.signal,
      })
      if (!response.ok || !(await response.json()).admin || controller.signal.aborted) return
      document.querySelectorAll<HTMLElement>('#notes-content [data-note-id]').forEach((card) => {
        const id = card.dataset.noteId
        if (!id || !/^[0-9]{8}-[a-f0-9]{10}$/.test(id) || card.querySelector('[data-note-edit]'))
          return
        const link = document.createElement('a')
        link.href = '/notes/editor/?id=' + encodeURIComponent(id)
        link.textContent = '編輯'
        link.dataset.noteEdit = id
        link.className = 'admin-edit ml-3 align-middle text-sm font-normal'
        link.setAttribute('aria-label', '編輯這則隨筆')
        ;(card.querySelector('h2') || card.querySelector('.entry-meta') || card).appendChild(link)
      })
    }
    addEditLinks().catch(() => {})
    return () => controller.abort()
  }, [])
  return (
    <div id="notes-content" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: html }} />
  )
}
