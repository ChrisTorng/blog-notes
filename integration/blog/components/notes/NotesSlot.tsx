'use client'
import { useEffect, useState } from 'react'

// The injected HTML is an opaque island; React owns the surrounding site shell.
export default function NotesSlot() {
  const [html] = useState(() =>
    typeof document === 'undefined'
      ? ''
      : document.getElementById('notes-content')?.innerHTML || ''
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
  return (
    <div
      id="notes-content"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
