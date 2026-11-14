import {
  editableSnapshot,
  historyGroups,
  historyLabel,
} from './editor-state.js'

const $ = (id) => document.getElementById(id)
const local = ['localhost', '127.0.0.1'].includes(location.hostname)
const tokenKey = 'blog-notes-local-token'
const draftKey = 'blog-notes-editor-unsaved'
const empty = { title: null, markdown: '', tags: [] }
let bookmarkRef = null
const pendingBookmark = new URLSearchParams(location.search).get('bookmark')
const state = {
  id: null,
  status: 'draft',
  authorized: false,
  busy: false,
  preview: 0,
  baseline: editableSnapshot(empty),
  pendingId: new URLSearchParams(location.search).get('id'),
}
let timer, previewRequest

function notice(text, error = false) {
  $('message').textContent = text
  $('message').classList.toggle('error', error)
}
function values(status = state.status) {
  return {
    title: $('title').value.trim() || null,
    markdown: $('markdown').value,
    status,
    tags: [...document.querySelectorAll('.tag-check:checked')].map(
      (el) => el.value
    ),
    bookmark_id: bookmarkRef?.id || null,
  }
}
function dirty() {
  return editableSnapshot(values()) !== state.baseline
}
async function confirmAction(title, message, label) {
  const dialog = $('unsavedDialog')
  if (dialog.open) return false
  $('unsavedHeading').textContent = title
  $('unsavedAction').textContent = message
  dialog.querySelector('button[value="cancel"]').textContent =
    title === '退回草稿' ? '取消' : '繼續編輯'
  dialog.querySelector('button[value="discard"]').textContent = label
  dialog.returnValue = 'cancel'
  dialog.showModal()
  return new Promise((resolve) =>
    dialog.addEventListener(
      'close',
      () => resolve(dialog.returnValue === 'discard'),
      { once: true }
    )
  )
}
async function mayLeave(action) {
  return (
    !dirty() ||
    confirmAction(
      '尚未儲存',
      '目前有尚未儲存的內容，確定放棄並' + action + '？',
      '放棄並繼續'
    )
  )
}
function actionLabels() {
  const published = Boolean(state.id && state.status === 'published')
  $('saveDraftBtn').textContent = published ? '退回草稿' : '儲存為草稿'
  $('publishBtn').textContent = published ? '更新發佈' : '立即發佈'
}
function remember() {
  if (!dirty()) {
    sessionStorage.removeItem(draftKey)
    return
  }
  sessionStorage.setItem(
    draftKey,
    JSON.stringify({ id: state.id, entry: values(), baseline: state.baseline })
  )
}
function updateUrl() {
  const url = new URL(location.href)
  if (state.id) url.searchParams.set('id', state.id)
  else url.searchParams.delete('id')
  history.replaceState(null, '', url.pathname + url.search + url.hash)
  state.pendingId = null
}
function busy(value) {
  state.busy = value
  $('workspace').setAttribute('aria-busy', String(value))
  for (const id of [
    'saveDraftBtn',
    'publishBtn',
    'newNote',
    'noteSelect',
    'title',
    'markdown',
  ])
    $(id).disabled = value
  document.querySelectorAll('.tag-check').forEach((el) => (el.disabled = value))
  $('noteSelect').disabled = value || !$('noteSelect').options.length
  $('deleteBtn').disabled = value || !state.id
  $('exportNotes').disabled = value || !state.authorized
}
function headers() {
  const result = { 'Content-Type': 'application/json' }
  const token = sessionStorage.getItem(tokenKey)
  if (local && token) result.Authorization = `Bearer ${token}`
  return result
}
async function api(path, method = 'GET', data, signal) {
  const response = await fetch(path, {
    method,
    headers: headers(),
    credentials: 'same-origin',
    signal,
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  })
  const value = await response.json()
  if (!response.ok) throw new Error(value.error || `HTTP ${response.status}`)
  return value
}
async function preview() {
  const version = ++state.preview
  previewRequest?.abort()
  $('previewTitle').textContent = $('title').value.trim() || '隨筆'
  if (!state.authorized) {
    $('preview').textContent = '登入後即可即時預覽。'
    return
  }
  previewRequest = new AbortController()
  try {
    const result = await api(
      '/notes/api/admin/preview',
      'POST',
      values(),
      previewRequest.signal
    )
    if (version !== state.preview) return
    $('previewTitle').textContent = result.title
    const pane = $('preview')
    pane.replaceChildren()
    if (bookmarkRef?.id) {
      const frame = document.createElement('aside')
      frame.className = 'bookmark-embed'
      frame.setAttribute('aria-label', '引用書籤')
      try {
        const bookmark = await api(
          '/notes/api/admin/bookmarks/' + encodeURIComponent(bookmarkRef.id),
          'GET',
          undefined,
          previewRequest.signal
        )
        const content = document.createElement('div')
        content.innerHTML = bookmark.html
        if (version !== state.preview) return
        frame.append(content)
      } catch (error) {
        if (error.name === 'AbortError' || version !== state.preview) return
        frame.textContent = error.message
      }
      pane.append(frame)
    }
    const text = document.createElement('div')
    text.innerHTML = result.html // Notes API disables raw HTML and unsafe links.
    pane.append(text);
  } catch (error) {
    if (error.name !== 'AbortError' && version === state.preview)
      notice(error.message, true)
  }
}
function schedulePreview() {
  clearTimeout(timer)
  timer = setTimeout(preview, 180)
}
function updateBookmarkRef() {
  let node = $('bookmarkReference')
  if (!node) {
    node = document.createElement('div')
    node.id = 'bookmarkReference'
    node.className = 'bookmark-reference'
    document.querySelector('.compose-pane .title-field')?.append(node)
  }
  node.replaceChildren()
  if (!bookmarkRef) return
  const link = document.createElement('a')
  link.href = '/bookmarks/view/?id=' + encodeURIComponent(bookmarkRef.id)
  link.target = '_blank'
  link.rel = 'noopener noreferrer'
  link.textContent = '引用書籤：查看最新內容'
  node.append(link)
}
function load(item = {}) {
  bookmarkRef = item.bookmark_id ? {id:item.bookmark_id} : null
  updateBookmarkRef()
  $('title').value = item.title || ''
  $('markdown').value = item.markdown || ''
  state.status = item.status || 'draft'
  document
    .querySelectorAll('.tag-check')
    .forEach((el) => (el.checked = (item.tags || []).includes(el.value)))
  actionLabels()
  state.baseline = editableSnapshot(values())
  $('deleteBtn').disabled = !state.id
  $('noteStatus').textContent = state.id
    ? state.status === 'published'
      ? '已發佈'
      : '草稿'
    : '新增'
  preview()
}
function selectCurrent() {
  if (state.id) $('noteSelect').value = state.id
  else $('noteSelect').selectedIndex = -1
}
async function openNote(id, guard = true) {
  if (state.busy) return false
  if (guard && !(await mayLeave(id ? '切換項目' : '新增'))) {
    selectCurrent()
    return false
  }
  if (!id) {
    state.id = null
    load()
    selectCurrent()
    updateUrl()
    sessionStorage.removeItem(draftKey)
    notice('新隨筆')
    $('title').focus()
    return true
  }
  busy(true)
  try {
    const item = await api(`/notes/api/admin/${id}/`)
    state.id = item.id
    load(item)
    selectCurrent()
    updateUrl()
    sessionStorage.removeItem(draftKey)
    notice('已載入')
    return true
  } catch (error) {
    selectCurrent()
    notice(error.message, true)
    return false
  } finally {
    busy(false)
  }
}
async function refreshList() {
  const result = await api('/notes/api/admin/')
  for (let page = 2; page <= result.pages; page++)
    result.items.push(...(await api(`/notes/api/admin/?page=${page}`)).items)
  $('noteSelect').replaceChildren()
  for (const group of historyGroups(result.items)) {
    const optgroup = document.createElement('optgroup')
    optgroup.label = group.label
    for (const item of group.items)
      optgroup.append(new Option(historyLabel(item), item.id))
    $('noteSelect').append(optgroup)
  }
  selectCurrent()
  $('noteSelect').disabled = state.busy || !result.items.length
  state.authorized = true
  $('exportNotes').disabled = state.busy
  $('authStatus').textContent = '已登入'
  $('auth').hidden = true
  $('toggleAuth').setAttribute('aria-expanded', 'false')
}
async function loadBookmarkIfRequested() {
  if (!pendingBookmark || state.id || bookmarkRef) return
  if (!/^[0-9a-f-]{36}$/.test(pendingBookmark)) return
  try {
    await api('/notes/api/admin/bookmarks/' + pendingBookmark)
    bookmarkRef = { id: pendingBookmark }
    updateBookmarkRef()
    schedulePreview()
    notice('已引用書籤；只儲存書籤 ID，請填寫心得。')
    $('markdown').focus()
  } catch (error) {
    notice(error.message, true)
  }
}
async function login() {
  if (local) {
    const token = $('localToken').value.trim()
    if (token) sessionStorage.setItem(tokenKey, token)
    else sessionStorage.removeItem(tokenKey)
  }
  try {
    await refreshList()
    if (state.pendingId) await openNote(state.pendingId)
    else await loadBookmarkIfRequested()
    await preview()
    if (!pendingBookmark) notice('已登入')
  } catch (error) {
    state.authorized = false
    $('exportNotes').disabled = true
    $('authStatus').textContent = '尚未登入'
    notice(error.message, true)
  }
}
async function save(status) {
  if (state.busy) return
  if (
    status === 'draft' &&
    state.id &&
    state.status === 'published' &&
    !(await confirmAction(
      '退回草稿',
      '這會將此隨筆從公開網站、RSS 與 Sitemap 移除，確定退回草稿？',
      '確定退回草稿'
    ))
  )
    return
  busy(true)
  notice(status === 'published' ? '正在發佈……' : '正在儲存草稿……')
  try {
    const item = await api(
      state.id ? `/notes/api/admin/${state.id}/` : '/notes/api/admin/',
      state.id ? 'PUT' : 'POST',
      values(status)
    )
    state.id = item.id
    state.status = item.status
    actionLabels()
    state.baseline = editableSnapshot(values())
    sessionStorage.removeItem(draftKey)
    updateUrl()
    $('noteStatus').textContent =
      item.status === 'published' ? '已發佈' : '草稿'
    await refreshList()
    await preview()
    notice(item.status === 'published' ? '已儲存並發佈' : '已儲存為草稿')
  } catch (error) {
    notice(error.message, true)
  } finally {
    busy(false)
  }
}
$('toggleAuth').hidden = !local
$('localToken').value = local ? sessionStorage.getItem(tokenKey) || '' : ''
$('toggleAuth').addEventListener('click', () => {
  $('auth').hidden = !$('auth').hidden
  $('toggleAuth').setAttribute('aria-expanded', String(!$('auth').hidden))
  if (!$('auth').hidden) $('localToken').focus()
})
$('saveToken').addEventListener('click', login)
$('localToken').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') login()
})
$('noteSelect').addEventListener('change', (event) =>
  openNote(event.target.value)
)
$('exportNotes').addEventListener('click', async () => {
  if (state.busy || !state.authorized) return
  busy(true)
  try {
    const response = await fetch('/notes/api/admin/export', {
      headers: headers(),
      credentials: 'same-origin',
      cache: 'no-store',
    })
    if (!response.ok)
      throw new Error((await response.json()).error || '匯出失敗')
    const url = URL.createObjectURL(await response.blob())
    const link = document.createElement('a')
    link.href = url
    link.download =
      response.headers
        .get('Content-Disposition')
        ?.match(/filename="([^"]+)"/)?.[1] || 'notes-export.zip'
    document.body.append(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 60000)
    notice(
      '已匯出所有已儲存的隨筆（包含草稿）。' +
        (dirty() ? '目前尚未儲存的編輯未包含在內。' : '')
    )
  } catch (error) {
    notice(error.message, true)
  } finally {
    busy(false)
  }
})
$('newNote').addEventListener('click', () => openNote(''))
for (const id of ['title', 'markdown'])
  $(id).addEventListener('input', () => {
    remember()
    schedulePreview()
  })
document
  .querySelectorAll('.tag-check')
  .forEach((el) => el.addEventListener('change', remember))
$('saveDraftBtn').addEventListener('click', () => save('draft'))
$('publishBtn').addEventListener('click', () => save('published'))
$('deleteBtn').addEventListener('click', async () => {
  if (state.busy || !state.id || !confirm('確定刪除此則隨筆？')) return
  busy(true)
  try {
    await api(`/notes/api/admin/${state.id}/`, 'DELETE')
    state.id = null
    load()
    sessionStorage.removeItem(draftKey)
    updateUrl()
    await refreshList()
    notice('已刪除')
  } catch (error) {
    notice(error.message, true)
  } finally {
    busy(false)
  }
})
document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 's') {
    event.preventDefault()
    save(state.status)
  }
})
window.addEventListener('beforeunload', (event) => {
  if (dirty()) {
    event.preventDefault()
    event.returnValue = ''
  }
})

load()
try {
  const prior = JSON.parse(sessionStorage.getItem(draftKey) || 'null')
  if (prior && !pendingBookmark && (!state.pendingId || state.pendingId === prior.id)) {
    state.id = prior.id
    load(prior.entry)
    state.baseline = prior.baseline || editableSnapshot(empty)
    notice('已回復未儲存內容')
  }
} catch {
  /* An invalid browser draft does not affect stored notes. */
}
try {
  await refreshList()
  if (state.pendingId && !(state.id === state.pendingId && dirty()))
    await openNote(state.pendingId, false)
  else {
    if (state.id) updateUrl()
    await loadBookmarkIfRequested()
    await preview()
  }
} catch {
  $('authStatus').textContent = '尚未登入'
  if (local) {
    $('auth').hidden = false
    $('toggleAuth').setAttribute('aria-expanded', 'true')
  }
  preview()
}
