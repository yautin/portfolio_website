// Standalone, no shared Playwright config/server. Run: node tests/mobile-fluid-nav/choreography.mjs
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'

const root = fileURLToPath(new URL('../../', import.meta.url))
const cacheDir = await mkdtemp(join(tmpdir(), 'fluid-nav-test-'))
const server = await createServer({ root, configFile: false, plugins: [react()], cacheDir,
  logLevel: 'error', server: { host: '127.0.0.1', port: 0, hmr: false },
})
let browser
try {
  await server.listen()
  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' })
  const page = await browser.newPage({ viewport: { width: 390, height: 760 }, hasTouch: true })
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`
  await page.goto(origin + '/tests/mobile-fluid-nav/fixture.html')
  const menu = page.getByRole('button', { name: 'Menu', exact: true })
  await menu.waitFor({ timeout: 5000 })
  const box = locator => locator.boundingBox()
  const panel = page.locator('.fluid-panel'), main = page.locator('.fluid-main')
  const width = async locator => (await box(locator)).width
  const baseWidth = await width(main)
  assert.equal(await width(panel), 24)
  await menu.tap()
  await page.waitForTimeout(130)
  assert.equal(await width(panel), 24, 'bridge separates the seed without inflating it')
  assert.equal(await panel.locator('ul').isVisible(), false, 'no section letters on the bridge dot')
  assert.ok((await box(main)).y > (await box(panel)).y + 12, 'at 130ms seed is emerging, not fully detached yet')
  assert.equal(await width(main), baseWidth, 'Menu rail stays intact through Bridge')
  await page.waitForTimeout(260)
  const middle = await width(panel)
  assert.ok(middle > 30 && middle < 350, `opening: real intermediate width ${middle}`)
  await page.waitForTimeout(1400)
  const close = page.getByRole('button', { name: 'Close menu', exact: true })
  assert.ok((await box(close)).y < (await box(panel)).y)
  assert.ok((await box(main)).y >= (await box(panel)).y + (await box(panel)).height + 11)
  await close.tap()
  await page.waitForTimeout(120)
  assert.ok(await width(panel) < 320 && await width(panel) > 30, 'direct return, not a second Bridge')
  await page.waitForTimeout(1350)
  assert.equal(await width(panel), 24)
  assert.equal(await width(main), baseWidth)
  console.log('PASS base / detached bridge / intermediate expand / close-panel-contact stack / direct return')

  // Interrupt Bridge. Its timer must not reopen the panel after Escape or an outside tap.
  await menu.focus(); await page.keyboard.press('Enter'); await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
  assert.equal(await width(panel), 24)
  assert.ok(await menu.evaluate(el => el === document.activeElement))
  await menu.tap(); await page.touchscreen.tap(8, 470); await page.waitForTimeout(400)
  assert.equal(await page.locator('.mobile-fluid-nav').getAttribute('data-phase'), 'base', 'outside tap cancels pending expansion')
  assert.equal(await page.getByRole('navigation', { name: 'Sections' }).count(), 0)

  // Reduced motion skips Bridge and all travel, not just the opacity transition.
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 320, height: 700 })
  await menu.focus(); await page.keyboard.press('Space')
  assert.ok(await close.evaluate(el => el === document.activeElement))
  assert.equal(await page.locator('.mobile-fluid-nav').evaluate(el => el.getAnimations({subtree:true}).length), 0)
  const sections = page.getByRole('navigation', { name: 'Sections' })
  const work = sections.getByRole('link', { name: 'Work', exact: true })
  assert.equal(await work.getAttribute('aria-current'), 'location')
  assert.equal(await page.getByText(/Marco Ng/).count(), 0)
  for (const link of [work, sections.getByRole('link', { name: 'Drug Product Experience' }), sections.getByRole('link', { name: 'Data Distilled' }), page.getByRole('link', { name: 'Contact', exact: true }), close]) {
    const r = await box(link)
    assert.ok(r.height >= 44 && r.width >= 44 && r.x >= 0 && r.x + r.width <= 320)
    assert.ok(await link.evaluate(el => { const r = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)) }))
  }
  await page.keyboard.press('Tab'); assert.ok(await work.evaluate(el => el === document.activeElement))
  await page.keyboard.press('Escape'); assert.ok(await menu.evaluate(el => el === document.activeElement))
  await menu.tap(); await work.tap(); assert.match(page.url(), /#work$/)
  assert.equal(await sections.count(), 0)
  await menu.tap(); await page.getByRole('link', { name: 'Contact', exact: true }).tap()
  assert.match(page.url(), /#contact$/); assert.equal(await sections.count(), 0)
  await menu.tap(); await page.locator('#outside').focus(); assert.equal(await sections.count(), 0)

  // A genuine one-finger stroke (not synthetic DOM touch events).
  const touch = await page.context().newCDPSession(page)
  async function swipeUp() {
    const r = await box(panel), x = r.x + r.width / 2, y = r.y + Math.min(137, r.height - 15)
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{x,y}] })
    for (const d of [15,35,60,90]) {
      await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{x,y:y-d}] })
      await page.waitForTimeout(25)
    }
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await page.waitForTimeout(60)
  }
  await menu.tap(); await swipeUp(); assert.equal(await sections.count(), 0, 'swipe dismisses on a full-height phone')

  // A short landscape screen keeps the CTA fixed below a scrollable list.
  await page.setViewportSize({ width: 640, height: 320 }); await menu.tap()
  const scroller = page.locator('.fluid-content')
  assert.ok(await scroller.evaluate(el => el.scrollHeight > el.clientHeight))
  const contact = await box(page.getByRole('link', { name: 'Contact', exact: true }))
  assert.ok(contact.y + contact.height < 320)
  await swipeUp(); assert.ok(await scroller.evaluate(el => el.scrollTop > 0)); assert.equal(await sections.count(), 1)
  await page.setViewportSize({ width: 832, height: 700 }); await page.waitForTimeout(100)
  assert.equal(await page.locator('.mobile-fluid-nav').isVisible(), false)
  await page.setViewportSize({ width: 831, height: 700 }); assert.equal(await sections.count(), 0)
  assert.equal(await menu.getAttribute('aria-expanded'), 'false')
  console.log('PASS 320px hit targets / keyboard + focus return / interruption / outside tap / anchors / reduced motion / short viewport / 52rem boundary')
} finally {
  await browser?.close()
  await server.close()
  await rm(cacheDir, { recursive: true, force: true })
}
