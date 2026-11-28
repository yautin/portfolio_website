import { expect, test } from '@playwright/test'

test('the three experience figures share one strip just above See my work', async ({ page, isMobile }) => {
  const sizes = isMobile ? [[320, 568], [390, 844]] : [[768, 1024], [1440, 900]]
  await page.setViewportSize({ width: sizes[0][0], height: sizes[0][1] })
  await page.goto('/')
  const hero = page.locator('#hero')
  const strip = hero.getByRole('list', { name: 'Medical writing experience' })
  const items = strip.getByRole('listitem')
  const link = hero.getByRole('link', { name: 'See my work', exact: true })
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height })
    await expect(strip).toBeVisible()
    await expect(items).toHaveText([/80\+\s*Promotional pieces$/, /9\+\s*Therapeutic areas$/, /2\+\s*Years in medical writing$/])
    const [row, button, cells] = await Promise.all([
      strip.boundingBox(), link.boundingBox(),
      items.evaluateAll(els => els.map(el => {
        const { x, y, right } = el.getBoundingClientRect()
        return { x, y, right, fits: el.scrollWidth <= el.clientWidth + 1 }
      })),
    ])
    expect(row.x).toBeGreaterThanOrEqual(0)
    expect(row.x + row.width).toBeLessThanOrEqual(width)
    expect(cells.every(c => c.fits && Math.abs(c.y - cells[0].y) < 1)).toBe(true)
    expect(cells[1].x).toBeGreaterThanOrEqual(cells[0].right - 1)
    expect(cells[2].x).toBeGreaterThanOrEqual(cells[1].right - 1)
    const gap = button.y - row.y - row.height
    expect(gap).toBeGreaterThan(0)
    expect(gap).toBeLessThanOrEqual(20)
    expect(Math.abs(row.x - button.x)).toBeLessThan(1)
  }
  await expect(hero.locator('.counter-card')).toHaveCount(0)
  await expect(link).toHaveAttribute('href', '#work')
})

// Record what is actually painted, even when the first frames happen during navigation.
async function recordCounts(page) {
  await page.addInitScript(() => {
    const samples = window.heroCountSamples = []
    function sample() {
      const number = document.querySelector('#counter strong')
      if (number && number.textContent !== samples.at(-1)) samples.push(number.textContent)
      requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
  })
}

test('experience figures count up on entry but do not restart on return', async ({ page }) => {
  await recordCounts(page)
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const strip = page.getByRole('list', { name: 'Medical writing experience' })
  await strip.scrollIntoViewIfNeeded()
  await expect.poll(() => page.evaluate(() => window.heroCountSamples.some(s => parseInt(s) > 0 && parseInt(s) < 80))).toBe(true)
  await expect(strip.locator('strong')).toHaveText(['80+', '9+', '2+'])
  const history = await page.evaluate(() => window.heroCountSamples.slice())
  await page.locator('#contact').scrollIntoViewIfNeeded()
  await expect(strip).not.toBeInViewport()
  await strip.scrollIntoViewIfNeeded()
  // Give a replay enough time to produce a different number.
  await page.waitForTimeout(350)
  expect(await page.evaluate(() => window.heroCountSamples)).toEqual(history)
})

test('reduced motion shows the final figures without counting', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await recordCounts(page)
  await page.goto('/')
  const strip = page.getByRole('list', { name: 'Medical writing experience' })
  await strip.scrollIntoViewIfNeeded()
  await expect(strip.locator('strong')).toHaveText(['80+', '9+', '2+'])
  await page.waitForTimeout(400)
  expect(await page.evaluate(() => window.heroCountSamples)).toEqual(['80+'])
})
