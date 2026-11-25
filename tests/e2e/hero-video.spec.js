import { test, expect } from '@playwright/test'

test('reset clears camera inertia even while the hero is paused', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Touch devices deliberately disable dragging')
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const canvas = page.locator('#hero canvas')
  await expect(canvas).toBeVisible()
  await expect.poll(() => page.locator('.hero-background video').evaluate(v => !v.paused && v.currentTime > 0)).toBe(true)
  const box = await canvas.boundingBox()
  await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.3)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.45, { steps: 4 })
  await page.mouse.up()
  await page.getByRole('button', { name: 'Pause animation', exact: true }).click()
  await page.getByRole('button', { name: 'Reset view', exact: true }).click()
  await expect.poll(() => page.evaluate(async () => {
    const entry = performance.getEntriesByType('resource').find(e => e.name.includes('/@react-three_fiber.js'))
    const { _roots } = await import(entry.name)
    const state = _roots.get(document.querySelector('#hero canvas')).store.getState()
    return state.camera.position.distanceTo({ x: 0, y: 0, z: 15 })
  })).toBeLessThan(0.000001)
})

test('hero combines the original interactive helix with controllable chip-flow video', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const pause = page.getByRole('button', { name: 'Pause animation', exact: true })
  await expect(pause).toBeVisible()
  const video = page.locator('.hero-background video')
  await expect.poll(() => video.evaluate(v => !v.paused && v.currentTime > 0)).toBe(true)
  await expect(page.locator('#hero h1')).toHaveAttribute('aria-label', 'Shaping science, data and evidence into clear, accurate medical communications')
  await expect(page.locator('#hero canvas')).toBeVisible()
  await pause.click()
  await expect.poll(() => video.evaluate(v => v.paused)).toBe(true)
  await expect(page.locator('#hero')).toHaveAttribute('data-motion', 'paused')
  await expect(page.locator('#hero .wrapper')).toHaveCSS('animation-name', 'none')
  await page.getByRole('button', { name: 'Play animation', exact: true }).click()
  await expect.poll(() => video.evaluate(v => !v.paused)).toBe(true)
})

test('rotation controls have no visible instructions or reset text', async ({ page, isMobile }) => {
  await page.goto('/')
  const controls = page.locator('.hero-scene-controls')
  await expect(controls).toBeVisible()
  expect(await controls.innerText()).not.toMatch(/drag to rotate|reset view/i)
  const reset = controls.getByRole('button', { name: 'Reset view', exact: true })
  if (isMobile) await expect(reset).toBeHidden()
  else await expect(reset.locator('svg')).toBeVisible()
})

test('scroll gradually dims only the hero video and reverses at the top', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.hero-background video')).toHaveClass(/is-ready/)
  const stage = page.locator('.hero-stage')
  const scrollToPart = part => stage.evaluate((el, t) => {
    const { top, height } = el.getBoundingClientRect()
    window.scrollTo({ top: scrollY + top + t * height, behavior: 'instant' })
  }, part)
  const shade = () => stage.evaluate(el => {
    const layer = el.querySelector('.hero-background .hero-video-shade')
    return layer && getComputedStyle(layer).visibility === 'visible' ? Number(getComputedStyle(layer).opacity) : 0
  })
  await expect.poll(shade).toBe(0)
  await scrollToPart(.5)
  await expect.poll(shade).toBeGreaterThan(.06)
  const midway = await shade()
  await scrollToPart(.9)
  await expect.poll(shade).toBeGreaterThan(midway + .04)
  expect(await shade()).toBeLessThan(.26)
  for (const foreground of [stage, stage.locator('.hero-layout'), stage.locator('.hero-scene-controls')]) {
    await expect(foreground).toHaveCSS('opacity', '1')
    await expect(foreground).toHaveCSS('filter', 'none')
  }
  await scrollToPart(0)
  await expect.poll(shade).toBe(0)
})

for (const preference of ['reduced motion', 'save data']) {
  test(`hero keeps a static poster without downloading video for ${preference}`, async ({ page }) => {
    if (preference === 'reduced motion') await page.emulateMedia({ reducedMotion: 'reduce' })
    else await page.addInitScript(() => {
      Object.defineProperty(navigator, 'connection', { configurable: true, value: {
        saveData: true, addEventListener() {}, removeEventListener() {},
      } })
    })
    const movies = []
    page.on('request', request => { if (/hero-background\/.*\.mp4/.test(request.url())) movies.push(request.url()) })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('button', { name: 'Motion off', exact: true })).toBeDisabled()
    await expect(page.locator('#hero canvas')).toBeVisible()
    await expect(page.locator('.hero-background video')).toHaveCount(0)
    await expect(page.locator('.hero-video-shade')).toBeHidden()
    expect(movies).toEqual([])
    await expect(page.locator('#hero')).toHaveAttribute('data-motion', 'paused')
  })
}

test('hero pauses offscreen and preserves an explicit pause on return', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const video = page.locator('.hero-background video')
  await expect.poll(() => video.evaluate(v => !v.paused && v.currentTime > 0)).toBe(true)
  await page.locator('#work').scrollIntoViewIfNeeded()
  await expect.poll(() => video.evaluate(v => v.paused)).toBe(true)
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0)
  await expect.poll(() => video.evaluate(v => !v.paused)).toBe(true)
  await page.getByRole('button', { name: 'Pause animation', exact: true }).click()
  await page.locator('#work').scrollIntoViewIfNeeded()
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
  await expect(page.getByRole('button', { name: 'Play animation', exact: true })).toBeVisible()
  await expect.poll(() => video.evaluate(v => v.paused)).toBe(true)
})

test('hero uses responsive media and remains readable with a previously saved light theme', async ({ page, isMobile }) => {
  await page.addInitScript(() => localStorage.setItem('theme', 'light'))
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const video = page.locator('.hero-background video')
  await expect(video).toHaveAttribute('src', new RegExp(isMobile ? 'mobile.mp4' : 'desktop.mp4'))

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  expect(await page.locator('#hero h1').evaluate(e => getComputedStyle(e).color)).toBe('rgb(232, 235, 242)')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await expect(page.locator('.hero-background img')).toBeVisible()
})

test('failed autoplay retains the poster and can be retried by keyboard', async ({ page }) => {
  await page.addInitScript(() => {
    const play = HTMLMediaElement.prototype.play
    let blocked = true
    HTMLMediaElement.prototype.play = function () {
      if (blocked) { blocked = false; return Promise.reject(new DOMException('blocked test', 'NotAllowedError')) }
      return play.call(this)
    }
  })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const retry = page.getByRole('button', { name: 'Play animation', exact: true })
  await expect(retry).toBeVisible()
  await expect(page.locator('.hero-background')).toHaveAttribute('data-fallback', 'true')
  await expect(page.locator('.hero-video-shade')).toBeHidden()
  await expect(page.locator('.hero-background img')).toBeVisible()
  await retry.focus()
  await page.keyboard.press('Enter')
  await expect.poll(() => page.locator('.hero-background video').evaluate(v => !v.paused && v.currentTime > 0)).toBe(true)
})

test('homepage renders without waiting for a stalled third-party font stylesheet', async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', () => new Promise(() => {}))
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 5000 })
  await expect(page.locator('#hero h1')).toBeVisible()
})
