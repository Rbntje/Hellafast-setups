import { createHash } from 'node:crypto'
import { readFile, readdir, writeFile } from 'node:fs/promises'

const assets = (await readdir('dist', { recursive: true, withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name !== 'sw.js')
  .map((entry) => `./${entry.parentPath.replace(/^dist\/?/, '')}/${entry.name}`.replace(/^\.\/\//, './'))
  .sort()
const hash = createHash('sha256')
for (const asset of assets) hash.update(asset).update(await readFile(`dist/${asset}`))
const template = await readFile('scripts/sw-template.js', 'utf8')
await writeFile('dist/sw.js', template
  .replace('__VERSION__', hash.digest('hex').slice(0, 16))
  .replace('__ASSETS__', JSON.stringify(assets)))
