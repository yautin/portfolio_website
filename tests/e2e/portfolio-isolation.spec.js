import { test, expect } from '@playwright/test'

for (const path of ['/', '/fun']) {
  test(`${path} has no link to the medical portfolio`, async ({ page }) => {
    const requests = []
    page.on('request', (request) => requests.push(request.url()))
    await page.goto(path)
    await expect(page.locator('main, .fun-page').first()).toBeVisible()
    await expect(page.locator('a[href*="medical-portfolio"]')).toHaveCount(0)
    expect(requests.some((url) => url.includes('/api/medical-portfolio'))).toBe(false)
  })
}

test('private filesystem URLs cannot bypass the gate', async ({ page }) => {
  const root = process.env.PORTFOLIO_E2E_ASSET_DIR
  expect(root).toBeTruthy()
  for (const filename of ['catalog.json', 'sample-1.pdf', 'sample-1.webp']) {
    const response = await page.request.get(`/@fs${root}/${filename}`)
    expect(response.status()).toBe(403)
  }
  expect((await page.request.get('/api/medical-portfolio?asset=sample-1&type=thumbnail')).status()).toBe(401)
})

test('browser storage cannot manufacture access', async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('portfolioUnlocked', 'true')
    localStorage.setItem('portfolioUnlocked', 'true')
  })
  await page.goto('/medical-portfolio')
  await expect(page.getByLabel('Portfolio password', { exact: true })).toBeVisible()
  const response = await page.request.get('/api/medical-portfolio')
  expect(response.status()).toBe(401)
  expect(await response.text()).not.toContain('Core Visual Aids')
  await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(1)
})
