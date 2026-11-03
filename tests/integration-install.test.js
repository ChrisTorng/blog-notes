import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const integration = fileURLToPath(new URL('../integration/', import.meta.url))

test('installation preserves Bookmarks navigation and upgrades Worker links idempotently', (t) => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'notes-install-'))
  t.after(() => {
    assert.equal(path.dirname(temporaryRoot), os.tmpdir())
    fs.rmSync(temporaryRoot, { recursive: true, force: true })
  })
  fs.cpSync(path.join(integration, 'blog'), temporaryRoot, { recursive: true })
  const write = (file, value) => {
    const target = path.join(temporaryRoot, file)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, value)
  }
  write('next.config.js', '          return [\n          ]')
  write('css/tailwind.css', '')
  write('components/Header.tsx', '')
  write(
    'components/Link.tsx',
    String.raw`  if (isInternalLink && /^\/notes(?:\/|$)/.test(href)) {
    return <a className={linkClassName} href={href} {...rest} />
  }
  if (isInternalLink) {
    return <Link href={href} />
  }`
  )
  const navigationPath = path.join(temporaryRoot, 'data/headerNavLinks.ts')
  const navigation = fs
    .readFileSync(navigationPath, 'utf8')
    .replace(
      'import { notesDiscoveryEnabled }',
      "import { bookmarksDiscoveryEnabled } from './bookmarksSettings'\nimport { notesDiscoveryEnabled }"
    )
    .replace(
      "  { href: '/blog', title: '文章' },",
      "  { href: '/blog', title: '文章' },\n  ...(bookmarksDiscoveryEnabled ? [{ href: '/bookmarks/', title: '書籤' }] : []),"
    )
  fs.writeFileSync(navigationPath, navigation)
  for (let run = 0; run < 2; run++) {
    execFileSync(process.execPath, [
      path.join(integration, 'install-blog.mjs'),
      temporaryRoot,
    ])
    assert.equal(fs.readFileSync(navigationPath, 'utf8'), navigation)
    const links = fs.readFileSync(
      path.join(temporaryRoot, 'components/Link.tsx'),
      'utf8'
    )
    assert.ok(links.includes(String.raw`/^\/(?:notes|bookmarks)(?:\/|$)/`))
    assert.equal((links.match(/return <a/g) || []).length, 1)
  }
})
