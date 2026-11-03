import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'))

test('SPA rewrites never swallow API requests', () => {
  for (const rewrite of config.rewrites.filter((rule) => rule.destination === '/index.html')) {
    const pattern = new RegExp(`^${rewrite.source}$`)
    assert.equal(pattern.test('/medical-portfolio'), true)
    assert.equal(pattern.test('/fun'), true)
    assert.equal(pattern.test('/'), true)
    assert.equal(pattern.test('/api/medical-portfolio'), false)
    assert.equal(pattern.test('/api'), false)
  }
})

test('portfolio route is noindex and omitted from the public sitemap', () => {
  const rule = config.headers.find((rule) => rule.source.startsWith('/medical-portfolio'))
  assert.ok(rule?.headers.some((header) => header.key === 'X-Robots-Tag' && header.value.includes('noindex')))
  const pattern = new RegExp(`^${rule.source}$`)
  for (const path of ['/medical-portfolio', '/medical-portfolio/', '/medical-portfolio/sample']) {
    assert.equal(pattern.test(path), true, `${path} must receive noindex headers`)
  }
  assert.equal(pattern.test('/medical-portfolio-public'), false)
  assert.doesNotMatch(readFileSync(new URL('../public/sitemap.xml', import.meta.url), 'utf8'), /medical-portfolio/)
})
