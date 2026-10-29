export function editableSnapshot(entry) {
  return JSON.stringify({
    title: String(entry.title || '').trim() || null,
    markdown: String(entry.markdown || ''),
    tags: [...(entry.tags || [])].sort(),
  })
}

export function historyGroups(items) {
  const timestamp = (item) =>
    item.status === 'draft'
      ? item.updated_at || item.created_at
      : item.published_at || item.created_at
  const sort = (entries) =>
    entries.sort(
      (a, b) =>
        timestamp(b).localeCompare(timestamp(a)) ||
        b.created_at.localeCompare(a.created_at) ||
        b.id.localeCompare(a.id)
    )
  return [
    {
      label: '草稿',
      items: sort(items.filter((item) => item.status === 'draft')),
    },
    {
      label: '已發佈',
      items: sort(items.filter((item) => item.status === 'published')),
    },
  ].filter((group) => group.items.length)
}

export function historyLabel(item) {
  const date =
    item.status === 'draft'
      ? item.updated_at || item.created_at
      : item.published_at || item.created_at
  const time = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(date))
  return `${time}　${item.title || item.markdown.replace(/\s+/g, ' ').slice(0, 50)}`
}
