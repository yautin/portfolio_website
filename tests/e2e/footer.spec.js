import { expect, test } from '@playwright/test'

test('footer pairs the rights notice with a single link to the games hub', async ({ page, isMobile }) => {
  if (isMobile) await page.setViewportSize({ width: 320, height: 640 })
  await page.goto('/')
  const footer = page.getByRole('contentinfo')
  const fun = footer.getByRole('link', { name: 'For Fun', exact: true })
  const copy = footer.getByText(/^© \d{4} Marco Ng\. All rights reserved\.$/)
  await expect(footer.getByRole('link')).toHaveCount(1)
  await expect(footer).toHaveText(/^© \d{4} Marco Ng\. All rights reserved\.\s*For Fun$/)
  await expect(fun).toHaveAttribute('href', '/fun')
  await footer.scrollIntoViewIfNeeded()
  const [left, right] = await Promise.all([copy.boundingBox(), fun.boundingBox()])
  expect(left.x + left.width).toBeLessThan(right.x)
  expect(Math.abs((left.y + left.height / 2) - (right.y + right.height / 2))).toBeLessThan(2)
  expect(right.x + right.width).toBeLessThanOrEqual(page.viewportSize().width)
  expect(right.height).toBeGreaterThanOrEqual(44)
  if (isMobile) await fun.tap()
  else await fun.press('Enter')
  await expect(page).toHaveURL(/\/fun\/?$/)
  await expect(page.getByRole('heading', { name: 'For fun', exact: true })).toBeVisible()
})

test('the etched footer ends above For Fun without growing or intercepting the link', async ({ page, isMobile }) => {
  const width = isMobile ? 390 : 1440
  await page.setViewportSize({ width, height: isMobile ? 844 : 900 })
  await page.goto('/')
  const footer = page.getByRole('contentinfo')
  await footer.scrollIntoViewIfNeeded()
  const edge = footer.locator('.footer-etch')
  await expect(edge).toHaveAttribute('aria-hidden', 'true')
  await expect(edge).toHaveCSS('pointer-events', 'none')
  const layout = await footer.evaluate(el => {
    const btn = el.querySelector('a').getBoundingClientRect()
    const pad = el.querySelector('.footer-etch-pad').getBoundingClientRect()
    const rect = el.getBoundingClientRect()
    return { height: rect.height, offset: (btn.left + btn.right - pad.left - pad.right) / 2,
      gap: btn.top - pad.bottom, overflow: document.documentElement.scrollWidth - innerWidth }
  })
  expect(Math.abs(layout.offset)).toBeLessThan(1)
  expect(layout.gap).toBeGreaterThan(2)
  expect(layout.height).toBeCloseTo(isMobile ? 80 : 100, 0)
  expect(layout.overflow).toBeLessThanOrEqual(0)
})
