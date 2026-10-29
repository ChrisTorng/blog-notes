import fs from 'node:fs'
import { transformSync } from 'esbuild'
const input = new URL('../shared/ListWithCategories.tsx', import.meta.url)
const output = new URL('../shared/list-with-categories.js', import.meta.url)
const result = transformSync(fs.readFileSync(input, 'utf8'), {
  loader: 'tsx',
  format: 'esm',
  jsx: 'automatic',
  target: 'es2022',
}).code
const generated =
  '// Generated from ListWithCategories.tsx. Run npm run build:shared after editing.\n' +
  result
if (!fs.existsSync(output) || fs.readFileSync(output, 'utf8') !== generated)
  fs.writeFileSync(output, generated)
