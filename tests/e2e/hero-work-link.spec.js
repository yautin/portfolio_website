import { expect, test } from '@playwright/test'

test('the compact hero work link is still at rest and opens Selected work', async ({ page, isMobile }) => {
  await page.goto('/')
  const link = page.locator('#hero a[href="#work"]')
  await expect(link).toHaveText('See my work')
  await expect(link).toHaveAccessibleName('See my work')
  const state = await link.evaluate(el => {
    const box = el.getBoundingClientRect()
    return {
      width: box.width, height: box.height,
      pill: parseFloat(getComputedStyle(el).borderRadius) >= box.height / 2,
      animated: el.getAnimations({ subtree: true }).some(a => a.effect.getTiming().iterations === Infinity),
    }
  })
  expect(state.width).toBeLessThanOrEqual(208)
  expect(state.height).toBeGreaterThanOrEqual(50)
  expect(state.pill).toBe(true)
  expect(state.animated).toBe(false)
  await expect(link.locator('svg')).toBeVisible()
  if (isMobile) await link.tap()
  else {
    await page.keyboard.press('Tab'); await link.focus()
    await expect(link).toHaveCSS('outline-style', 'solid')
    await page.keyboard.press('Enter')
  }
  const heading = page.locator('#work h2')
  await expect(heading).toBeInViewport()
  await expect.poll(() => heading.evaluate(el => el.getBoundingClientRect().top)).toBeGreaterThan(60)
})

test('touch gives immediate press feedback and cancellation restores the link', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Touch input only')
  await page.goto('/')
  const link = page.getByRole('link', { name: 'See my work', exact: true })
  const box = await link.boundingBox()
  const client = await page.context().newCDPSession(page)
  try {
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width/2, y: box.y + box.height/2 }] })
    await expect(link).not.toHaveCSS('transform', 'none', { timeout: 1500 })
    await client.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] })
    await expect(link).toHaveCSS('transform', 'none')
    expect(await page.evaluate(() => scrollY)).toBe(0)
  } finally { await client.detach() }
})
