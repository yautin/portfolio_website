import { expect, test } from '@playwright/test'

const cities = ['Hong Kong', 'Toronto']

test('the Contact globe has two readable city pins joined on the visible face', async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const contact = page.locator('#contact')
  const globe = contact.getByRole('group', { name: 'Globe showing Hong Kong connected to Toronto', exact: true })
  await expect(globe).toHaveCount(1, { timeout: 2500 })
  await globe.scrollIntoViewIfNeeded()
  await expect(globe).toHaveAttribute('data-phase', 'settled')
  for (const width of isMobile ? [320, 390] : [810, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await expect(globe.locator('.globe-label')).toHaveText(cities)
    const geometry = await globe.evaluate(el => {
      const rect = n => n.getBoundingClientRect()
      const route = el.querySelector('.globe-route')
      const markers = [...el.querySelectorAll('.globe-marker')].map(g => g.transform.baseVal.consolidate().matrix)
      const length = route.getTotalLength()
      const anchors = [route.getPointAtLength(0), route.getPointAtLength(length)]
      return {
        pinCount: markers.length, routes: el.querySelectorAll('.globe-route').length,
        ends: markers.map((m, i) => Math.hypot(m.e - anchors[i].x, m.f - anchors[i].y)),
        length, paint: getComputedStyle(route).stroke,

        labelsFit: [...el.querySelectorAll('.globe-label')].every(n => rect(n).left >= 0 && rect(n).right <= innerWidth && parseFloat(getComputedStyle(n).fontSize) >= 11),
        settled: el.dataset.phase,
      }
    })
    expect(geometry.pinCount).toBe(2)
    expect(geometry.routes).toBe(1)
    expect(Math.max(...geometry.ends)).toBeLessThan(0.2)
    expect(geometry.length).toBeGreaterThan(100)
    expect(geometry.paint).not.toBe('none')
    expect(geometry.labelsFit).toBe(true)
    expect(geometry.settled).toBe('settled')
  }
  await contact.getByLabel('Name', { exact: true }).fill('Globe layout test')
  await expect(contact.getByLabel('Name', { exact: true })).toHaveValue('Globe layout test')
})

test('Contact leads with the invitation and form, not the globe', async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const width of isMobile ? [320, 390] : [768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    const section = page.locator('#contact')
    await section.evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }))
    await expect(section.locator('.contact-form')).toHaveCSS('opacity', '1')
    const layout = await section.evaluate(el => {
      const rect = s => el.querySelector(s).getBoundingClientRect()
      const form = rect('form'), globe = rect('.contact-globe'), links = rect('.contact-links')
      return {
        formOffset: form.top - el.getBoundingClientRect().top,
        formIntroGap: form.top - rect('.contact-intro').bottom,
        eyebrowAlignment: Math.abs(form.top - rect('.section-eyebrow').top),
        followsForm: links.top >= form.bottom && globe.top >= form.bottom,
        closesStack: globe.top >= links.bottom,
        besideLinks: globe.left >= links.right && globe.top < links.bottom && globe.bottom > links.top,
        underIntro: globe.top >= rect('.contact-intro').bottom,
        leftOfForm: globe.right <= form.left,
        diameter: globe.width,
      }
    })
    if (width < 1024) {
      expect(layout.formOffset).toBeLessThan(400)
      expect(layout.formIntroGap).toBeGreaterThanOrEqual(16)
      expect(layout.formIntroGap).toBeLessThanOrEqual(40)
      expect(layout.followsForm).toBe(true)
      expect(width < 540 ? layout.closesStack : layout.besideLinks).toBe(true)
    } else {
      expect(layout.eyebrowAlignment).toBeLessThanOrEqual(2)
      expect(layout.underIntro && layout.besideLinks && layout.leftOfForm).toBe(true)
      expect(layout.diameter).toBeGreaterThanOrEqual(200)
      expect(layout.diameter).toBeLessThanOrEqual(270)
    }
  }
})

test('the first particle cloud paints beyond the globe with clear edges on every side', async ({ page, isMobile }) => {
  await page.setViewportSize({ width: isMobile ? 320 : 1440, height: 900 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.addInitScript(() => {
    // Read the real first point draw synchronously, before the browser clears the back buffer.
    const proto = WebGL2RenderingContext.prototype, draw = proto.drawElements
    proto.drawElements = function (...args) {
      const result = draw.apply(this, args)
      if (this.canvas.matches?.('.globe-canvas') && args[0] === this.POINTS && !window.firstCloud) {
        const w = this.drawingBufferWidth, h = this.drawingBufferHeight
        const rgba = new Uint8Array(w * h * 4)
        this.readPixels(0, 0, w, h, this.RGBA, this.UNSIGNED_BYTE, rgba)
        let x0 = w, x1 = -1, y0 = h, y1 = -1
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          if (rgba[(y*w+x)*4+3] === 0) continue
          x0 = Math.min(x0,x); x1 = Math.max(x1,x); y0 = Math.min(y0,y); y1 = Math.max(y1,y)
        }
        const c = this.canvas.getBoundingClientRect(), g = this.canvas.closest('.contact-globe').getBoundingClientRect()
        const left = x0*c.width/w, right = (w-1-x1)*c.width/w
        const top = (h-1-y1)*c.height/h, bottom = y0*c.height/h
        window.firstCloud = {
          edge: Math.min(left, right, top, bottom),
          beyond: Math.min(g.left-(c.left+left), c.right-right-g.right, g.top-(c.top+top), c.bottom-bottom-g.bottom),
          fitsViewport: c.left+left >= 0 && c.right-right <= innerWidth,
        }
      }
      return result
    }
  })
  await page.goto('/')
  await page.locator('.contact-globe').evaluate(g => g.scrollIntoView({ block: 'center', behavior: 'instant' }))
  await page.waitForFunction(() => window.firstCloud)
  const cloud = await page.evaluate(() => window.firstCloud)
  expect(cloud.edge).toBeGreaterThan(2)
  expect(cloud.beyond).toBeGreaterThan(2) // expanding the canvas, not shrinking the cloud
  expect(cloud.fitsViewport).toBe(true)
})

test('the live particle globe assembles once and spins without input', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  const globe = page.locator('#contact .contact-globe')
  await expect(globe).toHaveAttribute('data-phase', 'ready')
  await globe.scrollIntoViewIfNeeded()
  await expect(globe).toHaveAttribute('data-phase', 'assembling')
  await expect(globe).toHaveAttribute('data-phase', 'settled')
  await expect(globe.locator('canvas')).toBeVisible()
  const path = await globe.locator('.globe-route').getAttribute('d')
  await expect.poll(() => globe.locator('.globe-route').getAttribute('d')).not.toBe(path)
  await page.locator('#hero').evaluate(n => n.scrollIntoView({ behavior: 'instant' }))
  await globe.scrollIntoViewIfNeeded()
  await expect(globe).toHaveAttribute('data-phase', 'settled')
})

test('drag makes a full turn; markers occlude and Pause stops the idle spin', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Mouse drag; touch uses native vertical panning')
  await page.goto('/')
  const globe = page.locator('.contact-globe')
  await globe.scrollIntoViewIfNeeded()
  await expect(globe).toHaveAttribute('data-phase', 'settled')
  await globe.getByRole('button', { name: 'Pause globe rotation' }).click()
  const route = globe.locator('.globe-route')
  const stopped = await route.getAttribute('d')
  await page.waitForTimeout(220)
  await expect(route).toHaveAttribute('d', stopped)
  const surface = globe.getByRole('group', { name: 'Rotate globe' }), box = await surface.boundingBox()
  const x = box.x + box.width * .18, y = box.y + box.height * .5
  await page.mouse.move(x, y); await page.mouse.down()
  const pinX = () => globe.locator('.globe-marker').first().evaluate(g => g.transform.baseVal.consolidate().matrix.e)
  const before = await pinX()
  await page.mouse.move(x + box.width * .5, y, { steps: 15 })
  await expect.poll(async () => Math.abs(await pinX() - before)).toBeGreaterThan(75)
  await page.mouse.move(x + box.width, y, { steps: 15 }); await page.mouse.up()
  await expect.poll(async () => Math.abs(await pinX() - before)).toBeLessThan(1)
  await surface.focus(); for (let i = 0; i < 13; i++) await page.keyboard.press('ArrowDown')
  await expect(globe.locator('.globe-label:visible')).toHaveCount(0)
  await surface.focus(); await page.keyboard.press('Home')
  await expect(globe.locator('.globe-label:visible')).toHaveCount(2)
})

test('missing WebGL leaves both cities and the contact form usable', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (this.classList.contains('globe-canvas') && type.startsWith('webgl')) return null
      return original.call(this, type, ...args)
    }
  })
  await page.goto('/')
  const globe = page.locator('.contact-globe')
  await globe.scrollIntoViewIfNeeded()
  await expect(globe).toHaveAttribute('data-renderer', 'poster')
  await expect(globe.locator('.globe-poster')).toBeVisible()
  await expect(globe.locator('.globe-label:visible')).toHaveText(cities)
  await expect(globe.locator('.globe-toggle')).toBeHidden()
  await page.locator('#cf-name').fill('Contact fallback check')
  await expect(page.locator('#cf-name')).toHaveValue('Contact fallback check')
})

test('touch can turn the globe horizontally without trapping a vertical page swipe', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Touch input only')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const globe = page.locator('.contact-globe')
  await globe.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }))
  await expect(globe).toHaveAttribute('data-renderer', 'particles')
  const shape = globe.locator('.globe-route'), initial = await shape.getAttribute('d')
  const box = await globe.boundingBox(), cx = box.x + box.width/2, cy = box.y + box.height/2
  const client = await page.context().newCDPSession(page)
  const finger = (type, x, y) => client.send('Input.dispatchTouchEvent', {
    type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }],
  })
  try {
    await finger('touchStart', cx, cy)
    for (let i = 1; i <= 6; i++) await finger('touchMove', cx + i*8, cy)
    await finger('touchEnd')
    await expect.poll(() => shape.getAttribute('d')).not.toBe(initial)
    const before = await page.evaluate(() => scrollY)
    await finger('touchStart', cx, cy)
    for (let i = 1; i <= 8; i++) await finger('touchMove', cx, cy-i*12)
    await finger('touchEnd')
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before + 12)
  } finally { await client.detach() }
})
