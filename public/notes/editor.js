const $ = (id) => document.getElementById(id)
const local = ['localhost', '127.0.0.1'].includes(location.hostname)
const tokenKey = 'blog-notes-local-token'
const draftKey = 'blog-notes-editor-unsaved'
const state = {
  id: null,
  authorized: false,
  busy: false,
  selection: 0,
  preview: 0,
}
let timer, previewRequest

function notice(text, error = false) {
  $('message').textContent = text
  $('message').classList.toggle('error', error)
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
function values() {
  return {
    title: $('title').value.trim() || null,
    markdown: $('markdown').value,
    status: $('status').value,
    tags: [...document.querySelectorAll('.tag-check:checked')].map(
      (el) => el.value
    ),
  }
}
function remember() {
  sessionStorage.setItem(
    draftKey,
    JSON.stringify({ id: state.id, entry: values() })
  )
}
function busy(value) {
  state.busy = value
  for (const id of [
    'saveBtn',
    'newNote',
    'noteSelect',
    'title',
    'markdown',
    'status',
  ])
    $(id).disabled = value
  document.querySelectorAll('.tag-check').forEach((el) => (el.disabled = value))
  $('deleteBtn').disabled = value || !state.id
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
    $('preview').innerHTML = result.html // Server Markdown renderer disables raw HTML and unsafe links.
  } catch (error) {
    if (error.name !== 'AbortError' && version === state.preview)
      notice(error.message, true)
  }
}
function schedulePreview() {
  clearTimeout(timer)
  timer = setTimeout(preview, 180)
}
function load(data = {}) {
  $('title').value = data.title || ''
  $('markdown').value = data.markdown || ''
  $('status').value = data.status || 'draft'
  document
    .querySelectorAll('.tag-check')
    .forEach((el) => (el.checked = (data.tags || []).includes(el.value)))
  $('deleteBtn').disabled = !state.id
  preview()
}
async function selectNote(id) {
  const selection = ++state.selection
  busy(true)
  try {
    const item = id ? await api(`/notes/api/admin/${id}/`) : {}
    if (selection !== state.selection) return
    state.id = id || null
    $('noteSelect').value = id || ''
    load(item)
    remember()
    notice(id ? '已載入' : '新草稿')
  } catch (error) {
    notice(error.message, true)
  } finally {
    if (selection === state.selection) busy(false)
  }
}
async function refreshList() {
  const result = await api('/notes/api/admin/')
  for (let page = 2; page <= result.pages; page++)
    result.items.push(...(await api(`/notes/api/admin/?page=${page}`)).items)
  $('noteSelect').replaceChildren(new Option('新增隨筆', ''))
  for (const item of result.items)
    $('noteSelect').add(
      new Option(
        `${item.status === 'draft' ? '[草稿] ' : ''}${item.title || item.markdown.replace(/\s+/g, ' ').slice(0, 50)}`,
        item.id
      )
    )
  $('noteSelect').value = state.id || ''
  state.authorized = true
  $('authStatus').textContent = '已登入'
  $('auth').hidden = true
  $('toggleAuth').setAttribute('aria-expanded', 'false')
}
async function login() {
  if (local) {
    const token = $('localToken').value.trim()
    if (token) sessionStorage.setItem(tokenKey, token)
    else sessionStorage.removeItem(tokenKey)
  }
  try {
    await refreshList()
    await preview()
    notice('已登入')
  } catch (error) {
    state.authorized = false
    $('authStatus').textContent = '尚未登入'
    notice(error.message, true)
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
  selectNote(event.target.value)
)
$('newNote').addEventListener('click', () => selectNote(''))
for (const id of ['title', 'markdown', 'status'])
  $(id).addEventListener('input', () => {
    remember()
    schedulePreview()
  })
document
  .querySelectorAll('.tag-check')
  .forEach((el) => el.addEventListener('change', remember))
$('saveBtn').addEventListener('click', async () => {
  if (state.busy) return
  busy(true)
  try {
    const item = await api(
      state.id ? `/notes/api/admin/${state.id}/` : '/notes/api/admin/',
      state.id ? 'PUT' : 'POST',
      values()
    )
    state.id = item.id
    sessionStorage.removeItem(draftKey)
    history.replaceState(null, '', `?id=${encodeURIComponent(item.id)}`)
    await refreshList()
    await preview()
    notice(item.status === 'published' ? '已儲存並發布' : '已儲存草稿')
  } catch (error) {
    notice(error.message, true)
  } finally {
    busy(false)
  }
})
$('deleteBtn').addEventListener('click', async () => {
  if (state.busy || !state.id || !confirm('確定刪除此則隨筆？')) return
  busy(true)
  try {
    await api(`/notes/api/admin/${state.id}/`, 'DELETE')
    state.id = null
    load()
    sessionStorage.removeItem(draftKey)
    history.replaceState(null, '', location.pathname)
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
    $('saveBtn').click()
  }
})

const requestedId = new URLSearchParams(location.search).get('id')
try {
  const prior = JSON.parse(sessionStorage.getItem(draftKey) || 'null')
  if (prior && (!requestedId || requestedId === prior.id)) {
    state.id = prior.id
    load(prior.entry)
    notice('已回復未儲存草稿')
  }
} catch {
  /* Ignore an invalid browser draft; stored notes are unaffected. */
}
try {
  await refreshList()
  if (
    requestedId &&
    !(state.id === requestedId && sessionStorage.getItem(draftKey))
  )
    await selectNote(requestedId)
  else await preview()
} catch {
  $('authStatus').textContent = '尚未登入'
  if (local) {
    $('auth').hidden = false
    $('toggleAuth').setAttribute('aria-expanded', 'true')
  }
  preview()
}
