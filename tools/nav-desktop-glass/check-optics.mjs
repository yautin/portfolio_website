// Screen-space test on the real navbar, not CSS-string assertions. The fixture sits
// UNDER the header. Its painted pattern moves; the navbar and text never move.
import assert from 'node:assert/strict'
import { PNG } from 'pngjs'

export async function checkOptics(page, selector, { expectBend = true } = {}) {
  const shell = page.locator(selector), { x, y, width, height } = await shell.boundingBox()
  await page.evaluate(() => {
    const paper = document.createElement('div'); paper.id = 'optical-test-paper'
    paper.style.cssText = 'position:fixed;inset:0;z-index:99;pointer-events:none;background:#ff2209'
    document.body.append(paper)
  })
  const paper = page.locator('#optical-test-paper')
  const paint = color => paper.evaluate((e, c) => { e.style.background = c }, color)
  const shot = async () => PNG.sync.read(await page.screenshot({ clip: { x: Math.ceil(x), y: Math.ceil(y), width: Math.floor(width)-1, height: Math.floor(height)-1 }, scale:'css' }))
  const value = (img, px, py, channel) => img.data[4 * (py * img.width + px) + channel]
  // A clear slit above the first control, below the bright lip; never sample glyphs.
  const px = Math.round(width * .43), py = Math.min(13, Math.floor(height*.2))
  try {
    const red = await shot(); await paint('#083eff'); const blue = await shot()
    const redDelta = value(red,px,py,0) - value(blue,px,py,0), blueDelta = value(blue,px,py,2) - value(red,px,py,2)
    assert(redDelta > 35 && blueDelta > 35, `${selector}: background did not transmit (${redDelta}, ${blueDelta})`)
    await paint('#fff'); const white = await shot()
    const luminance = [0,1,2].map(c=>value(white,px,py,c)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4)
    const contrast = 1.05 / (.05 + .2126*luminance[0] + .7152*luminance[1] + .0722*luminance[2])
    assert(contrast >= 4.5, `${selector}: white-ink contrast on white paper ${contrast.toFixed(2)}`)
    // Horizontal scan lines cross the long side. A displacement changes their phase
    // in the outer band but not in the flat core; blur alone changes amplitude only.
    if (!expectBend) return { redDelta, blueDelta, contrast }
    const setLines = async offset => paint(`repeating-linear-gradient(0deg,#222 ${offset}px,#222 ${offset+7}px,#eee ${offset+7}px,#eee ${offset+14}px)`)
    await setLines(0); const curved = await shot()
    const undistort = async scale => page.locator('header feDisplacementMap').evaluateAll((nodes,s) => nodes.forEach(n => {
      if (!n.hasAttribute('data-test-scale')) n.setAttribute('data-test-scale',n.getAttribute('scale'))
      n.setAttribute('scale',s ?? n.getAttribute('data-test-scale'))
    }),scale)
    const diff = (a,b,lo,hi) => {
      let total=0,n=0; for(let j=lo;j<hi;j++)for(let i=px-4;i<=px+4;i++){total+=Math.abs(value(a,i,j,0)-value(b,i,j,0));n++}return total/n
    }
    let edge,core,shift
    try {
      await undistort('0'); const flat = await shot(); await undistort(null)
      await setLines(4); const moved = await shot()
      edge=diff(curved,flat,3,10);core=diff(curved,flat,Math.floor(height/2)-3,Math.floor(height/2)+4);shift=diff(curved,moved,3,10)
    } finally { await undistort(null) }
    assert(edge > 9 && core < 4 && shift > 9, `${selector}: edge bend ${edge.toFixed(1)}, core ${core.toFixed(1)}, moving pattern ${shift.toFixed(1)}`)
    return { redDelta, blueDelta, contrast, edge, core, shift }
  } finally { await paper.evaluate(e => e.remove()) }
}
