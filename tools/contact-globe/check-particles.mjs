// Paint-level regression on the real Contact globe. Requires a running preview.
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { chromium } from 'playwright'
import { PNG } from 'pngjs'

const out = process.env.GLOBE_PROOF_DIR && resolve(process.env.GLOBE_PROOF_DIR)
if (out) await mkdir(out, { recursive: true })
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' })
const base = process.env.GLOBE_BASE || 'http://127.0.0.1:4185/'
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'no-preference', deviceScaleFactor: 1 })
  const page = await context.newPage(), errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(base)
  await page.locator('.contact-globe').evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' }))
  const g = page.locator('.contact-globe'), disc = g.getByRole('group', { name: 'Rotate globe' })
  await page.waitForFunction(() => document.querySelector('.contact-globe')?.dataset.renderer === 'particles')
  await page.waitForFunction(() => document.querySelector('.contact-globe')?.dataset.phase === 'assembling')
  if (out) await g.locator('canvas').screenshot({ path: join(out, 'assembling.png'), scale: 'css' })
  await page.waitForFunction(() => document.querySelector('.contact-globe')?.dataset.phase === 'settled')
  await g.getByRole('button', { name: 'Pause globe rotation' }).click()
  await disc.focus(); await page.keyboard.press('Home'); await disc.evaluate(e => e.blur())
  await page.mouse.move(1, 1); await page.waitForTimeout(250)
  const save = name => out ? join(out, name) : undefined
  const snap = async name => PNG.sync.read(await g.screenshot({ path: save(name), scale: 'css' }))
  const baseShot = await snap('rest.png')
  // A geometrically correct path can still paint short when a normalized dash
  // is combined with non-scaling-stroke. Sample its painted length at rest.
  const line = g.locator('.globe-route')
  const samples = await line.evaluate(el => {
    const host = el.closest('.contact-globe').getBoundingClientRect(), matrix = el.getScreenCTM()
    return Array.from({ length: 17 }, (_, i) => {
      const p = el.getPointAtLength(el.getTotalLength() * (.1 + .05*i)).matrixTransform(matrix)
      return [Math.round(p.x-host.left), Math.round(p.y-host.top)]
    })
  })
  await line.evaluate(el => { el.style.visibility = 'hidden' })
  const noLine = PNG.sync.read(await g.screenshot({ scale: 'css' }))
  await line.evaluate(el => { el.style.visibility = '' })
  const painted = samples.filter(([x,y]) => {
    for (let j=-2; j<=2; j++) for (let k=-2; k<=2; k++) {
      const i = 4*((y+j)*baseShot.width+x+k)
      if (Math.abs(baseShot.data[i+1]-noLine.data[i+1]) > 12) return true
    }
    return false
  }).length
  assert.equal(painted, samples.length, `route painted at ${painted}/${samples.length} locations`)
  const box = await disc.boundingBox(), w = baseShot.width, h = baseShot.height
  // Aim at the Siberian land field above Hong Kong, away from the route and labels.
  const u = .31, v = .48
  await page.mouse.move(box.x + box.width*u, box.y + box.height*v)
  await page.waitForTimeout(450)
  const lit = await snap('hover.png'); let near = 0, far = 0, n = 0, f = 0
  for (let y = 2; y < h-2; y++) for (let x = 2; x < w-2; x++) {
    const i = 4*(y*w+x), r = Math.hypot(x-u*w,y-v*h) / w
    const delta = Math.max(...[0,1,2].map(c => Math.abs(lit.data[i+c] - baseShot.data[i+c])))
    if (r < .095) { near += delta; n++ } else if (r > .31) { far += delta; f++ }
  }
  near /= n; far /= f
  assert.ok(near > 2 && near > far*4, `local particle response near=${near}, far=${far}`)
  // Changing the section underneath must show through the empty ocean, not just the corners.
  await page.mouse.move(1, 1); await page.waitForTimeout(600)
  const paint = c => g.evaluate((e,color) => e.style.backgroundColor = color, c)
  await paint('rgb(60,0,25)'); const red = await snap('transmission-a.png')
  await paint('rgb(0,0,95)'); const blue = await snap('transmission-b.png')
  let sampled = 0, transmitted = 0
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (Math.hypot(x-w/2,y-h/2) > w*.37) continue
    const i = 4*(w*y+x); sampled++
    if (red.data[i]-blue.data[i] > 30 && blue.data[i+2]-red.data[i+2] > 35) transmitted++
  }
  assert.ok(transmitted/sampled > .20, `inside the globe, only ${transmitted/sampled} transmitted`)
  await paint(''); await g.getByRole('button', { name: 'Resume globe rotation' }).click()
  await page.mouse.move(box.x + w*.35, box.y+h*.48); await page.mouse.down()
  await page.mouse.move(box.x+w*.89,box.y+h*.43,{steps:48});await page.mouse.up()
  await page.waitForTimeout(450); await disc.focus(); await page.keyboard.press('Home'); await disc.evaluate(e => e.blur())
  await page.mouse.move(1, 1)
  if (out) await page.screenshot({ path: join(out, 'contact.png') })
  assert.deepEqual(errors, [])
  await context.close()
  console.log(JSON.stringify({ routeSamplesPainted:painted, localHoverMean:near, remoteHoverMean:far, transmissionInside:transmitted/sampled, errors }))
} finally { await browser.close() }
