// Bake the normal fields once. These images encode directions, never scenery.
import { mkdir, writeFile } from 'node:fs/promises'
import { PNG } from 'pngjs'
const out = new URL('../../src/components/nav/lenses/', import.meta.url)
await mkdir(out, { recursive: true })
for (const [name, w, h, r, lip] of [
  ['rail',800,58,29,13], ['pill',332,57,28.5,12], ['panel',366,342,76,19], ['disc',44,44,22,9],
]) {
  const png = new PNG({ width:w, height:h })
  for(let y=0;y<h;y++) for(let x=0;x<w;x++) {
    const cx=x+.5-w/2, cy=y+.5-h/2
    const dx=Math.abs(cx)-(w/2-r), dy=Math.abs(cy)-(h/2-r)
    const nx=Math.max(dx,0), ny=Math.max(dy,0), n=Math.hypot(nx,ny)
    const depth=r-(n+Math.min(Math.max(dx,dy),0))
    // Only the rounded lip transmits from an offset location. Convex section
    // falls smoothly to a flat core. Orient samples toward the inside of the rim.
    const t=Math.min(1,Math.max(0,depth/lip)), slope=(1-t)**1.45
    const vx=n?nx/n:Number(dx>dy), vy=n?ny/n:Number(dy>=dx)
    const p=4*(y*w+x)
    png.data[p]=Math.round(127.5-127.5*Math.sign(cx)*vx*slope)
    png.data[p+1]=Math.round(127.5-127.5*Math.sign(cy)*vy*slope)
    png.data[p+2]=128;png.data[p+3]=255
  }
  await writeFile(new URL(`${name}.png`,out),PNG.sync.write(png,{colorType:2}))
}
