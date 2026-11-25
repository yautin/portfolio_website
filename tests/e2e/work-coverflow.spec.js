import { test, expect } from '@playwright/test'

const title = 'Turning clinical data into content HCPs act on'
const subtitle = 'Client deliverables are confidential and shown here as summaries. Samples available on request.'

for (const poster of [false, true]) {
  test(`homepage project cover flow: ${poster ? 'asset-failure fallback' : 'live model'}`, async ({ page, isMobile }) => {
    if (poster) await page.route('**/work-capsules/case.glb', r => r.abort())
    await page.goto('/#work')
    const section = page.locator('#work')
    await expect(section.locator('.work-head h2')).toHaveText(title)
    await expect(section.locator('.work-head .section-lead')).toHaveText(subtitle)
    await expect(section.locator('.work-head h2')).toBeInViewport()
    const cards = section.getByRole('button', { name: /^Open project:/ })
    await expect(cards).toHaveCount(3)
    const gallery = section.locator('[data-case]')
    await expect(gallery).toHaveAttribute('data-case', poster ? 'poster' : 'blender', { timeout: 18000 })
    await expect(section.locator('iframe, .work-grid, h1')).toHaveCount(0)
    await expect(section.locator('h2')).toHaveCount(1)
    await expect(section.locator('.reveal-choice, input[name="reveal"], #pause-float, .flow-foot, footer')).toHaveCount(0)
    await expect(section.getByText(/^(Reveal|Projection|Original|Select a capsule|Project brief)$/)).toHaveCount(0)
    const note = section.locator('#structure-note')
    await expect(note).toBeHidden()
    const previous = section.getByRole('button', {name:'Previous project'})
    const next = section.getByRole('button', {name:'Next project'})
    const counter = section.locator('.bar #position')
    await expect(counter).toHaveText('02 / 03')
    const [left, right, art, stage] = await Promise.all([previous, next, section.locator('[data-project="1"] .hit'), section.locator('#stage')].map(el => el.boundingBox()))
    for (const b of [left,right]) {
      expect(b.width).toBeGreaterThanOrEqual(44)
      expect(b.height).toBeGreaterThanOrEqual(44)
      expect(Math.abs(b.y+b.height/2-art.y-art.height/2)).toBeLessThan(5)
    }
    expect(left.x+left.width).toBeLessThan(art.x)
    expect(right.x).toBeGreaterThan(art.x+art.width)
    expect(Math.abs(left.x+left.width/2-stage.x)).toBeLessThan(36)
    expect(Math.abs(right.x+right.width/2-stage.x-stage.width)).toBeLessThan(36)
    await previous.click()
    await expect(counter).toHaveText('01 / 03')
    await next.click()
    await expect(counter).toHaveText('02 / 03')
    if (!poster) {
      const visible = await section.locator('.case-view').nth(1).evaluate(c => c.getContext('2d').getImageData(Math.floor(c.width*.29), Math.floor(c.height*.48),1,1).data[3])
      expect(visible).toBeGreaterThan(127)
    }
    await section.getByRole('button', {name:'Next project'}).click()
    await expect(gallery).toHaveAttribute('data-centre','2')
    await section.locator('[data-project="2"] .caption').click()
    await expect(gallery).toHaveAttribute('data-phase','reading')
    await expect(previous).toBeHidden()
    await expect(next).toBeHidden()
    await expect(counter).toBeHidden()
    for (const [i, name] of [[2,'faricimab'],[0,'mavacamten'],[1,'capivasertib']]) {
      if (i !== 2) await section.locator(`[data-project="${i}"] .caption`).click()
      await expect(gallery).toHaveAttribute('data-phase','reading')
      await expect(section.locator('#project-name')).toHaveText(name)
      await expect(section.locator('#brief h3')).not.toBeEmpty()
      await expect(section.locator('#brief')).toHaveAttribute('data-hologram','on')
      await expect(section.locator('#projection')).not.toHaveCSS('opacity','0')
      if (name === 'faricimab') {
        await expect(note).toBeVisible()
        await expect(note).toHaveText('Inside the glass · Atomic close-up of three residues in faricimab’s VEGF-A-binding arm, not the whole antibody.')
      } else await expect(note).toBeHidden()
      if (isMobile) {
        const box = await section.locator('#brief').boundingBox(), line = await section.locator('#receiving-edge').boundingBox()
        expect(Math.abs(box.x-line.x) + Math.abs(box.width-line.width) + Math.abs(box.y-line.y)).toBeLessThan(1)
      }
    }
    await section.getByRole('button',{name:/back to all projects/i}).click()
    await expect(gallery).toHaveAttribute('data-phase','gallery')
    await expect(previous).toBeVisible()
    await expect(next).toBeVisible()
    await expect(note).toBeHidden()
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  })
}
