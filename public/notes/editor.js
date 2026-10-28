const $ = (id) => document.getElementById(id)
const state = { id: null, entries: [] }
const localTokenKey = 'blog-notes-local-token'
const draftKey = 'blog-notes-editor-unsaved'
const localToken = sessionStorage.getItem(localTokenKey) || ''
$('localToken').value = localToken
$('localToken').closest('.auth-bar').hidden = ![
  'localhost',
  '127.0.0.1',
].includes(location.hostname)

function headers() {
  const result = { 'Content-Type': 'application/json' }
  const token = sessionStorage.getItem(localTokenKey)
  if (token && ['localhost', '127.0.0.1'].includes(location.hostname))
    result.Authorization = `Bearer ${token}`
  return result
}
function notice(message, error = false) {
  $('message').textContent = message
  $('message').classList.toggle('error', error)
}
async function api(url, method = 'GET', data) {
  const response = await fetch(url, {
    method,
    credentials: 'same-origin',
    headers: headers(),
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  })
  let result
  try {
    result = await response.json()
  } catch {
    throw new Error(`HTTP ${response.status}`)
  }
  if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`)
  return result
}
function getDraft() {
  return {
    title: $('title').value.trim() || null,
    markdown: $('markdown').value,
    status: $('status').value,
    tags: [...document.querySelectorAll('.tag-check:checked')].map(
      (el) => el.value
    ),
  }
}
function loadDraft(data = {}) {
  $('title').value = data.title || ''
  $('markdown').value = data.markdown || ''
  $('status').value = data.status || 'draft'
  document
    .querySelectorAll('.tag-check')
    .forEach((el) => (el.checked = (data.tags || []).includes(el.value)))
  $('deleteBtn').disabled = !state.id
  $('preview').replaceChildren()
}
function rememberDraft() {
  sessionStorage.setItem(
    draftKey,
    JSON.stringify({ id: state.id, entry: getDraft() })
  )
}
for (const id of ['title', 'markdown', 'status'])
  $(id).addEventListener('input', rememberDraft)
document
  .querySelectorAll('.tag-check')
  .forEach((el) => el.addEventListener('change', rememberDraft))

async function refreshList() {
  try {
    const response = await api('/notes/api/admin/')
    for (let page = 2; page <= response.pages; page++) {
      const next = await api(`/notes/api/admin/?page=${page}`)
      response.items.push(...next.items)
    }
    state.entries = response.items
    const sel = $('noteSelect')
    sel.replaceChildren(new Option('新增隨筆', ''))
    for (const item of response.items)
      sel.add(
        new Option(
          `${item.status === 'draft' ? '[草稿] ' : ''}${item.title || item.markdown.replace(/\s+/g, ' ').slice(0, 32)} (${item.id})`,
          item.id
        )
      )
    if (state.id) sel.value = state.id
    $('authStatus').textContent = '已驗證'
  } catch (e) {
    $('authStatus').textContent = '尚未登入或授權失效'
    notice(e.message, true)
  }
}
$('saveToken').addEventListener('click', () => {
  const value = $('localToken').value.trim()
  if (value) sessionStorage.setItem(localTokenKey, value)
  else sessionStorage.removeItem(localTokenKey)
  refreshList()
})
$('noteSelect').addEventListener('change', async (e) => {
  state.id = e.target.value || null
  if (!state.id) {
    loadDraft()
    rememberDraft()
    return
  }
  try {
    loadDraft(await api(`/notes/api/admin/${state.id}`))
    rememberDraft()
  } catch (err) {
    notice(err.message, true)
  }
})
$('newNote').addEventListener('click', () => {
  state.id = null
  $('noteSelect').value = ''
  loadDraft()
  rememberDraft()
  notice('新草稿')
})
$('previewBtn').addEventListener('click', async () => {
  try {
    const { html } = await api('/notes/api/admin/preview', 'POST', {
      markdown: $('markdown').value,
    })
    $('preview').innerHTML = html // Server renders HTML with Markdown raw HTML disabled.
    notice('預覽已更新')
  } catch (e) {
    notice(e.message, true)
  }
})
$('saveBtn').addEventListener('click', async () => {
  try {
    const input = getDraft()
    const result = await api(
      state.id ? `/notes/api/admin/${state.id}` : '/notes/api/admin/',
      state.id ? 'PUT' : 'POST',
      input
    )
    state.id = result.id
    $('deleteBtn').disabled = false
    sessionStorage.removeItem(draftKey)
    await refreshList()
    notice(
      `已儲存${result.status === 'published' ? '並發布' : '草稿'}：${result.id}`
    )
  } catch (e) {
    notice(e.message, true)
  }
})
$('deleteBtn').addEventListener('click', async () => {
  if (!state.id || !confirm('確定刪除此則隨筆？此操作無法復原。')) return
  try {
    await api(`/notes/api/admin/${state.id}`, 'DELETE')
    state.id = null
    loadDraft()
    $('noteSelect').value = ''
    sessionStorage.removeItem(draftKey)
    await refreshList()
    notice('已刪除')
  } catch (e) {
    notice(e.message, true)
  }
})

const prior = sessionStorage.getItem(draftKey)
if (prior) {
  try {
    const draft = JSON.parse(prior)
    state.id = draft.id
    loadDraft(draft.entry)
    notice('已回復此瀏覽器的未儲存草稿')
  } catch {}
}
refreshList()
