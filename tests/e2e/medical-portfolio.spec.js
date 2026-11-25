import { test, expect } from '@playwright/test'
import { fixtureTitles } from './fixtures.js'

const password = 'portfolio-e2e-fixture-only'

async function unlock(page) {
  await page.goto('/medical-portfolio')
  await page.getByLabel('Portfolio password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Unlock portfolio' }).click()
}

test('authenticated gallery displays every sample and filters by format group', async ({ page }) => {
  await unlock(page)
  await expect(page.getByRole('heading', { name: 'Selected writing samples' })).toBeVisible()
  await expect(page.locator('.sample-card')).toHaveCount(9)
  for (const title of fixtureTitles) {
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
  }
  await page.getByRole('button', { name: /Email communications/ }).click()
  await expect(page.locator('.sample-card')).toHaveCount(2)
  await expect(page.getByRole('status')).toContainText('2 of 9')
  await page.getByRole('button', { name: /All samples/ }).click()
  await expect(page.locator('.sample-card')).toHaveCount(9)
})

test('refresh preserves access and logout removes gallery and file access', async ({ page }) => {
  await unlock(page)
  await expect(page.locator('.sample-card')).toHaveCount(9)
  await page.reload()
  await expect(page.locator('.sample-card')).toHaveCount(9)
  await page.getByRole('button', { name: 'Lock / Log out' }).click()
  await expect(page.getByLabel('Portfolio password', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Portfolio password', { exact: true })).toBeVisible()
  expect((await page.request.get('/api/medical-portfolio?asset=sample-1&type=pdf')).status()).toBe(401)
})

test('wrong password is explained without revealing samples', async ({ page }) => {
  await page.goto('/medical-portfolio')
  await page.getByLabel('Portfolio password', { exact: true }).fill('incorrect-password')
  await page.getByRole('button', { name: 'Unlock portfolio' }).click()
  await expect(page.getByRole('alert')).toHaveText('Incorrect password. Please try again.')
  await expect(page.getByLabel('Portfolio password', { exact: true })).toHaveAttribute('aria-invalid', 'true')
  await expect(page.locator('.sample-card')).toHaveCount(0)
})

test('unavailable authentication fails closed with a useful message', async ({ page }) => {
  await page.route('**/api/medical-portfolio', (route) => route.fulfill({ status: 503, json: { error: 'Unavailable' } }))
  await page.goto('/medical-portfolio')
  await expect(page.getByRole('alert')).toHaveText('Portfolio access is temporarily unavailable. Please contact Marco.')
  await expect(page.locator('.sample-card')).toHaveCount(0)
})

test('failed logout hides content and offers a real retry', async ({ page }) => {
  await unlock(page)
  await expect(page.getByRole('button', { name: 'Lock / Log out' })).toBeVisible()
  await page.route('**/api/medical-portfolio', (route) => route.request().method() === 'DELETE'
    ? route.abort('failed') : route.continue())
  await page.getByRole('button', { name: 'Lock / Log out' }).click()
  await expect(page.locator('.sample-card')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Retry log out' })).toBeVisible()
  await page.unroute('**/api/medical-portfolio')
  await page.getByRole('button', { name: 'Retry log out' }).click()
  await expect(page.getByRole('button', { name: 'Unlock portfolio' })).toBeEnabled()
  await page.reload()
  await expect(page.getByLabel('Portfolio password', { exact: true })).toBeVisible()
})

test('PDF controls and protected cover images work', async ({ page }) => {
  await unlock(page)
  const card = page.locator('.sample-card').first()
  await expect(card).toBeVisible()
  const preview = card.locator('img')
  await expect(preview).toBeVisible()
  await expect.poll(() => preview.evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true)
  const view = card.getByRole('link', { name: /View PDF/ })
  await expect(view).toHaveAttribute('target', '_blank')
  const response = await page.request.get(await view.getAttribute('href'))
  expect(response.status()).toBe(200)
  expect(response.headers()['content-type']).toContain('application/pdf')
  expect((await response.body()).subarray(0, 5).toString()).toBe('%PDF-')
  const downloadEvent = page.waitForEvent('download')
  await card.getByRole('link', { name: /Download/ }).click()
  const download = await downloadEvent
  expect(download.suggestedFilename()).toMatch(/\.pdf$/)
})

test('gallery fits the viewport in both themes', async ({ page }, testInfo) => {
  await unlock(page)
  await expect(page.locator('.sample-card')).toHaveCount(9)
  for (const theme of ['dark', 'light']) {
    await page.evaluate((value) => { document.documentElement.dataset.theme = value }, theme)
    for (const card of await page.locator('.sample-card').all()) {
      const box = await card.boundingBox()
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize().width)
      const preview = await card.locator('.sample-preview').boundingBox()
      const image = await card.locator('img').boundingBox()
      expect(image.height).toBeLessThanOrEqual(preview.height + 1)
      expect(image.width).toBeLessThanOrEqual(preview.width + 1)
    }
    await page.screenshot({ path: testInfo.outputPath(`gallery-${theme}.png`), fullPage: true, animations: 'disabled' })
  }
})

for (const [label, response, message] of [
  ['rate limited', { status: 429, json: { error: 'Rate limited' } }, 'Too many attempts. Please wait 15 minutes before trying again.'],
  ['invalid server response', { status: 200, json: { samples: 'not-an-array' } }, 'Portfolio access is temporarily unavailable. Please contact Marco.'],
]) {
  test(`${label} does not unlock the page`, async ({ page }) => {
    await page.route('**/api/medical-portfolio', (route) => route.request().method() === 'POST'
      ? route.fulfill(response) : route.continue())
    await unlock(page)
    await expect(page.getByRole('alert')).toHaveText(message)
    await expect(page.locator('.sample-card')).toHaveCount(0)
  })
}

test('direct visit shows only the password gate', async ({ page }) => {
  await page.goto('/medical-portfolio')
  await expect(page.getByRole('heading', { name: 'Medical writing portfolio', exact: true })).toBeVisible()
  await expect(page.getByLabel('Portfolio password', { exact: true })).toHaveAttribute('type', 'password')
  await expect(page.getByRole('button', { name: 'Unlock portfolio' })).toBeVisible()
  await expect(page.locator('.sample-card, .sample-preview img')).toHaveCount(0)
  expect(await page.locator('input').count()).toBe(1)
})
