import { test, expect } from '@playwright/test'

test('Selected work follows the hero closely with a decorative circuit trace', async ({ page, isMobile }) => {
  const width = isMobile ? 390 : 1440
  await page.setViewportSize({ width, height: isMobile ? 844 : 900 })
  await page.goto('/#work')
  const work = page.locator('#work')
  const label = work.locator('.section-eyebrow')
  await expect(work).toHaveCSS('padding-top', isMobile ? '40px' : '64px')
  await expect(label).toHaveText('Selected work')
  await expect(work.getByRole('heading', { level: 2 })).toBeInViewport()
  const trace = label.locator('svg')
  await expect(trace).toHaveAttribute('aria-hidden', 'true')
  await expect(trace).toHaveCSS('pointer-events', 'none')
  await expect(trace).toBeVisible()
  const [text, mark] = await Promise.all([label.boundingBox(), trace.boundingBox()])
  expect(mark.x).toBeCloseTo(text.x + text.width + 12, 0)
  expect(mark.width).toBe(44)
  expect(mark.x + mark.width).toBeLessThanOrEqual(width)
})
