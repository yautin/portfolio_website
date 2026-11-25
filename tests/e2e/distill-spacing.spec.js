import { test, expect } from '@playwright/test'

test('a first mobile menu jump keeps the section heading below the fixed rail', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Mobile menu only')
  for (const width of [320, 600]) {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/')
    await page.locator('#distill').waitFor()
    await page.evaluate(() => document.fonts.ready)
    const nav = page.getByRole('banner')
    await nav.getByRole('button', { name: 'Menu', exact: true }).tap()
    await page.evaluate(() => {
      window.distillScrollEnd = new Promise(resolve => document.addEventListener('scrollend', () => resolve(true), { once: true }))
    })
    await nav.getByRole('link', { name: 'Data Distilled', exact: true }).tap()
    await page.evaluate(() => window.distillScrollEnd)
    const clearance = await page.locator('.distill-head').evaluate(el =>
      el.getBoundingClientRect().top - document.querySelector('.navbar').getBoundingClientRect().bottom)
    expect(clearance).toBeGreaterThan(8)
    expect(clearance).toBeLessThanOrEqual(48)
  }
})

test('stacked trial readouts keep their results, chart arms and references together', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Stacked layout only')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const section = page.locator('#distill')
  await section.waitFor()
  await page.evaluate(() => document.fonts.ready)
  for (const width of [320, 390, 430, 767]) {
    await page.setViewportSize({ width, height: 844 })
    await section.evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'start' }))
    const gaps = await section.evaluate(el => {
      const box = e => e.getBoundingClientRect()
      const gap = (a,b) => box(b).top - box(a).bottom
      const q = s => el.querySelector(s)
      const rows = [...el.querySelectorAll('.distill-row')]
      return {
        intro: gap(q('.distill-head'), q('.distill-raw')),
        notes: gap(rows.at(-1).querySelector('.distill-bars'), q('.distill-refs')),
        clearance: gap(document.querySelector('.navbar'), q('.distill-head')),
        rows: rows.map(row => {
          const [first,second] = [...row.querySelectorAll('.distill-bar-track')].map(box)
          return {
            result: gap(row.querySelector('.distill-raw'), row.querySelector('.distill-result')),
            trackDifference: Math.max(Math.abs(first.left-second.left), Math.abs(first.right-second.right)),
          }
        }),
        clipped: [...el.querySelectorAll('.distill-bar-label, .distill-bar-value, .distill-refs, .distill-row')]
          .some(e => e.scrollWidth > e.clientWidth + 1 || box(e).right > innerWidth + 1),
      }
    })
    expect(gaps.intro).toBeGreaterThanOrEqual(24)
    expect(gaps.intro).toBeLessThanOrEqual(40)
    expect(gaps.clearance).toBeGreaterThan(8)
    expect(gaps.clearance).toBeLessThanOrEqual(48)
    expect(gaps.notes).toBeGreaterThanOrEqual(20)
    expect(gaps.notes).toBeLessThanOrEqual(36)
    expect(gaps.clipped).toBe(false)
    for (const row of gaps.rows) {
      expect(row.result).toBeGreaterThanOrEqual(28)
      expect(row.result).toBeLessThanOrEqual(56)
      expect(row.trackDifference).toBeLessThanOrEqual(1)
    }
  }
})
