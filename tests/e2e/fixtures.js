import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const fixtureCategories = [
  { id: 'print', label: 'Detail aids & print' },
  { id: 'editorial', label: 'Features & highlights' },
  { id: 'reference', label: 'Clinical reference' },
  { id: 'email', label: 'Email communications' },
]
export const fixtureTitles = Array.from({ length: 9 }, (_, index) => `Writing sample ${index + 1}`)

export function createBrowserLibrary() {
  const hermesScratch = join(homedir(), '.hermes/cache/scratch')
  const scratch = process.env.PORTFOLIO_TEST_TMPDIR || (existsSync(hermesScratch) ? hermesScratch : tmpdir())
  mkdirSync(scratch, { recursive: true })
  const directory = mkdtempSync(join(scratch, 'portfolio-browser-fixtures-'))
  const pdf = fileURLToPath(new URL('../fixtures/sample.pdf', import.meta.url))
  const thumbnail = fileURLToPath(new URL('../fixtures/sample-cover.webp', import.meta.url))
  const content = readFileSync(pdf)
  const samples = fixtureTitles.map((title, index) => {
    const id = `sample-${index + 1}`
    copyFileSync(pdf, join(directory, `${id}.pdf`))
    copyFileSync(thumbnail, join(directory, `${id}.webp`))
    return {
      id, title, category: fixtureCategories[index % fixtureCategories.length].id,
      format: index === 8 ? 'Detail aid' : 'Writing sample', language: '',
      description: 'Synthetic sample for browser verification; no client material.',
      pages: 1, pageLabel: '1 PDF page', bytes: content.length,
      pdfFile: `${id}.pdf`, thumbnailFile: `${id}.webp`,
      sha256: createHash('sha256').update(content).digest('hex'),
    }
  })
  writeFileSync(join(directory, 'catalog.json'), JSON.stringify({ version: 1, categories: fixtureCategories, samples }))
  return directory
}
