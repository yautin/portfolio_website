import { test, expect } from '@playwright/test'

const sections = ['Work', 'Drug Product Experience', 'Data Distilled']

test('closed mobile rail follows screen width and returns to it after closing', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Mobile layout')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const rail = page.locator('.fluid-main'), panel = page.locator('.fluid-panel')
  for (const width of [320, 390, 430, 600, 768, 831]) {
    await page.setViewportSize({ width, height: 844 })
    const expected = Math.min(width - 32, 640)
    await expect(rail).toHaveCSS('width', `${expected}px`)
    const rect = await rail.boundingBox()
    expect(Math.abs(rect.x - (width - expected) / 2)).toBeLessThan(1)
    // The middle belongs to Menu, not to an empty stretch of glass.
    await page.touchscreen.tap(width / 2, rect.y + rect.height / 2)
    await expect(page.getByRole('button', { name: 'Close menu' })).toBeInViewport()
    await expect(rail).toHaveCSS('width', '80px')
    const open = await panel.boundingBox()
    expect(open.width).toBeLessThanOrEqual(368)
    expect(Math.abs(open.x - (width-open.width)/2)).toBeLessThan(1)
    await page.getByRole('button', { name: 'Close menu' }).tap()
    await expect(rail).toHaveCSS('width', `${expected}px`)
  }
  await page.setViewportSize({ width: 832, height: 844 })
  await expect(rail).toBeHidden()
  await expect(page.locator('.desktop-glass')).toBeVisible()
})

test('mobile bar and dropdown omit the name and use smaller section labels', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Mobile navigation only')
  await page.setViewportSize({ width:390, height:844 })
  await page.goto('/')
  const nav = page.locator('.mobile-fluid-nav')
  await expect(nav.getByRole('button', { name: 'Menu', exact:true })).toBeVisible()
  await expect(nav.getByText(/Marco Ng/)).toHaveCount(0)
  await nav.getByRole('button', { name: 'Menu', exact:true }).tap()
  const links = nav.getByRole('navigation', { name:'Sections' }).getByRole('link')
  await expect(links).toHaveText(sections)
  for (const link of await links.all()) {
    expect(await link.evaluate(e => parseFloat(getComputedStyle(e).fontSize))).toBeLessThanOrEqual(34)
    expect((await link.boundingBox()).height).toBeGreaterThanOrEqual(44)
  }
})

test('mobile separates the close control, navigation panel and contact pill', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'The fluid morph is mobile only')
  await page.goto('/')
  const nav = page.getByRole('banner')
  const contact = nav.getByRole('link', { name: 'Contact', exact: true })
  const closedContact = await contact.boundingBox()
  await nav.getByRole('button', { name: /menu/i }).click()
  const last = nav.getByRole('link', { name: 'Data Distilled', exact: true })
  await expect(last).toBeInViewport()
  await expect.poll(async () => {
    const c = await contact.boundingBox(), l = await last.boundingBox()
    return c.y > l.y + l.height && c.y - closedContact.y > 100
  }).toBe(true)
  const dismiss = nav.getByRole('button', { name: /close/i })
  await expect(dismiss).toBeInViewport()
  await dismiss.click()
  await expect(last).toHaveCount(0)
  await expect.poll(async () => Math.abs((await contact.boundingBox()).y - closedContact.y)).toBeLessThan(2)
})

test('each mobile dropdown control lights on hover and clears on exit', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Use a narrow viewport with a hover-capable pointer')
  await page.setViewportSize({ width:390, height:844 })
  await page.goto('/')
  const nav = page.getByRole('banner')
  const menu = nav.getByRole('button', { name:'Menu', exact:true })
  await menu.click()
  const close = nav.getByRole('button', { name:'Close menu' })
  const links = sections.map(name => nav.getByRole('link', { name, exact:true }))
  const contact = nav.getByRole('link', { name:'Contact', exact:true })
  const light = loc => loc.evaluate(e => {
    const s = getComputedStyle(e, '::after'); return s.content === 'none' ? 0 : Number(s.opacity)
  })
  for (const control of [...links, contact, close]) {
    await control.hover(); await expect.poll(() => light(control)).toBe(1)
    await page.mouse.move(2, 550); await expect.poll(() => light(control)).toBe(0)
  }
  await page.keyboard.press('Tab'); await expect(links[0]).toBeFocused()
  await expect.poll(() => light(links[0])).toBe(1)
  await page.keyboard.press('Escape'); await expect(menu).toBeFocused()
})

test('touch press lights the row immediately and clears on cancellation or release', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Touch input only')
  await page.setViewportSize({ width:320, height:700 })
  await page.emulateMedia({ reducedMotion:'reduce' })
  await page.goto('/')
  const menu = page.getByRole('button', { name:'Menu', exact:true })
  await menu.tap()
  const work = page.getByRole('navigation', { name:'Sections' }).getByRole('link', { name:'Work', exact:true })
  const { x,y,width,height } = await work.boundingBox()
  const touch = await page.context().newCDPSession(page)
  const down = () => touch.send('Input.dispatchTouchEvent', {type:'touchStart', touchPoints:[{x:x+width/2,y:y+height/2}]})
  const light = () => work.evaluate(e => getComputedStyle(e, '::after').opacity)
  await down(); await expect.poll(light).toBe('1')
  await touch.send('Input.dispatchTouchEvent', {type:'touchCancel', touchPoints:[]}); await expect.poll(light).toBe('0')
  await down(); await touch.send('Input.dispatchTouchEvent', {type:'touchEnd', touchPoints:[]})
  await expect(page).toHaveURL(/#work$/); await menu.tap(); await expect.poll(light).toBe('0')
})

test('desktop uses the reference dark CTA with light type instead of the white button', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Desktop material only')
  await page.goto('/')
  const contact = page.getByRole('banner').getByRole('link', { name: 'Contact me', exact: true })
  const ink = await contact.evaluate(el => getComputedStyle(el).color.match(/[\d.]+/g).slice(0,3).map(Number))
  expect(Math.min(...ink)).toBeGreaterThan(205)
})

test('floating navigation keeps Contact in reach without a theme switch', async ({ page, isMobile }) => {
  if (isMobile) await page.setViewportSize({ width: 320, height: 750 })
  await page.goto('/')
  const nav = page.getByRole('banner')
  await expect(nav.getByRole('switch', { includeHidden: true })).toHaveCount(0)
  const contact = nav.getByRole('link', { name: isMobile ? 'Contact' : 'Contact me', exact: true })
  await expect(contact).toBeInViewport()
  const bounds = await nav.boundingBox()
  expect(bounds.x).toBeGreaterThan(8)
  expect(bounds.y).toBeGreaterThan(0)
  expect(bounds.height).toBeLessThan(76)
  expect((await contact.boundingBox()).height).toBeGreaterThanOrEqual(44)
  await contact.click()
  await expect(page).toHaveURL(/#contact$/)
  await expect(contact).toHaveAttribute('aria-current', 'location')
})

test('glass highlight follows the current section without clicking', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Desktop highlight')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#work')
  const nav = page.getByRole('banner')
  const light = nav.locator('.nav-lens')
  for (const [i,id] of ['work','drugs','distill'].entries()) {
    await page.locator(`#${id}`).evaluate(el => el.scrollIntoView({ behavior: 'instant' }))
    const link = nav.getByRole('link', { name: sections[i], exact: true })
    await expect(link).toHaveAttribute('aria-current','location')
    await expect(light).toHaveCSS('opacity','1')
    const box = await link.boundingBox(), lens = await light.boundingBox()
    expect(Math.abs(box.x - lens.x)).toBeLessThan(2)
    expect(Math.abs(box.width - lens.width)).toBeLessThan(2)
    await expect(light).toHaveCSS('transition-duration','0s')
  }
})

test('mobile pill expands in place, dismisses by keyboard and navigates', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Mobile disclosure')
  await page.goto('/')
  const nav = page.getByRole('banner'), menu = nav.getByRole('button', { name: /menu/i })
  const contact = nav.getByRole('link', { name: 'Contact', exact: true })
  const work = nav.getByRole('link', { name: 'Work', exact: true })
  await expect(menu).toHaveText(/Menu/)
  await expect(work).toHaveCount(0)
  const closed = await nav.boundingBox()
  await menu.focus(); await page.keyboard.press('Enter')
  await expect(menu).toHaveAttribute('aria-expanded','true')
  await expect(contact).toBeInViewport()
  await expect.poll(async () => (await nav.boundingBox()).height).toBeGreaterThan(closed.height + 130)
  for (const name of sections) {
    const box = await nav.getByRole('link', { name, exact: true }).boundingBox()
    expect(box.height).toBeGreaterThanOrEqual(44)
    expect(box.width).toBeGreaterThan(closed.width * .7)
  }
  await work.focus(); await page.keyboard.press('Escape')
  await expect(menu).toBeFocused()
  await expect(work).toHaveCount(0)
  await menu.click(); await page.touchscreen.tap(6, 490)
  await expect(menu).toHaveAttribute('aria-expanded','false')
  await menu.click(); await work.click()
  await expect(page).toHaveURL(/#work$/)
  await expect(menu).toHaveAttribute('aria-expanded','false')
  await expect(page.locator('#work h2')).toBeInViewport()
})
