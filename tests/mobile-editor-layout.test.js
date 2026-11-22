import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const stylesheet = readFileSync(new URL('../public/notes/editor.css', import.meta.url), 'utf8')
const start = stylesheet.indexOf('@media (max-width: 640px)')
const end = stylesheet.indexOf('\n\ndialog {', start)
const mobile = stylesheet.slice(start, end)
const declaration = (selector) => {
  const start = mobile.indexOf(selector + ' {')
  assert.ok(start >= 0, 'Mobile selector missing: ' + selector)
  return mobile.slice(start, mobile.indexOf('}', start))
}

test('mobile Markdown textarea uses a fixed 320px height, not viewport units', () => {
  const textarea = declaration('.compose-pane textarea')
  assert.match(textarea, /height: 320px;/)
  assert.match(textarea, /min-height: 320px;/)
  assert.match(textarea, /max-height: 320px;/)
  assert.match(textarea, /overflow-y: auto;/)
  assert.doesNotMatch(textarea, /dvh|vh|vw/)
})

test('mobile preview has no height cap or its own scrolling', () => {
  const preview = declaration('.preview-pane #preview')
  assert.match(preview, /height: auto;/)
  assert.match(preview, /max-height: none;/)
  assert.match(preview, /overflow: visible;/)
  assert.match(preview, /flex: none;/)
  for (const selector of ['.split-view', '.compose-pane,\n  .preview-pane']) {
    const block = declaration(selector)
    assert.match(block, /height: auto;/)
    assert.match(block, /max-height: none;/)
    assert.match(block, /overflow: visible;/)
  }
})

test('desktop split view remains a two-column constrained workspace', () => {
  const desktop = stylesheet.slice(0, start)
  assert.match(desktop, /grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1fr\);/)
  assert.match(desktop, /\.preview-pane \.prose \{[\s\S]*?overflow: auto;/)
})
