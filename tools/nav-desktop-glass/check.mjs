// Standalone desktop checks; no Playwright project, shared port or app entry edits.
// Build a temporary production page with the real NavBar + Hero; serve it
// under the site's unchanged production CSP.
import assert from 'node:assert/strict'
import { mkdtemp, readFile, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build, preview } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'
import { chromium, expect } from '@playwright/test'
import { checkOptics } from './check-optics.mjs'

const root = fileURLToPath(new URL('../..', import.meta.url))
const scratch = await mkdtemp(join(tmpdir(), 'desktop-glass-'))
const proof = process.env.GLASS_PROOF_DIR
if (proof) await mkdir(proof, { recursive: true })
const entry = 'virtual:desktop-glass-check'
const policy = JSON.parse(await readFile(join(root, 'vercel.json'))).headers.flatMap(h => h.headers).find(h => h.key === 'Content-Security-Policy')
let server, browser
try {
  const config = {
    root, configFile: false, logLevel: 'warn', cacheDir: join(scratch, 'cache'),
    build: { outDir: join(scratch, 'dist'), copyPublicDir: false, rollupOptions: { input: entry, output: { entryFileNames: 'desktop.js' } } },
    plugins: [{
      name: 'desktop-only-test-page', enforce: 'pre',
      resolveId(id) { if (id === entry) return '\0' + entry },
      load(id) { if (id === '\0' + entry) return `import React from 'react'; import {createRoot} from 'react-dom/client'; import '/src/index.css'; import Nav from '/src/components/NavBar.jsx'; import Hero from '/src/sections/Hero.jsx'; createRoot(document.getElementById('root')).render(React.createElement(React.Fragment,null, React.createElement(Nav),React.createElement(Hero), ...['work','drugs','distill','contact'].map(id => React.createElement('section',{id,key:id,style:{minHeight:'100vh'}},id))))` },

    }, react(), tailwind()],
  }
  await build(config)
  // Only symlink the public asset directories needed by this hero, in the temp output.
  const { symlink, readdir, writeFile } = await import('node:fs/promises')
  for (const dir of ['images', 'fonts']) await symlink(join(root, 'public', dir), join(scratch, 'dist', dir))
  const css = (await readdir(join(scratch, 'dist/assets'))).filter(f => f.endsWith('.css'))
  await writeFile(join(scratch, 'dist/index.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Desktop glass proof</title>${css.map(f=>`<link rel="stylesheet" href="/assets/${f}">`).join('')}<div id="root"></div><script type="module" src="/desktop.js"></script></html>`)
  server = await preview({ ...config, plugins: [], preview: { host: '127.0.0.1', port: 0, headers: { [policy.key]: policy.value } } })
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`
  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = [], external = []
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(() => { window.violations=[]; document.addEventListener('securitypolicyviolation', e=>window.violations.push(e.violatedDirective+': '+e.blockedURI)) })
  await page.route(/^https?:/, route => { if (new URL(route.request().url()).origin === origin) return route.continue(); external.push(route.request().url()); return route.abort() })
  await page.goto(origin)
  const shell = page.locator('.desktop-glass'), rail = page.locator('.nav-sections'), cta = page.locator('.nav-contact'), face = cta.locator(':scope > span').first()
  await expect(page.locator('.navbar')).toHaveCSS('backdrop-filter', 'none')
  await expect(page.locator('.hero-background video')).toHaveClass('is-ready', { timeout: 30000 })
  const box = await shell.boundingBox(); assert.equal(box.height,58); assert.equal(box.width,800)
  assert.deepEqual(await shell.locator('a').evaluateAll(a=>a.map(e=>e.hash)), ['#hero','#work','#drugs','#distill','#contact'])
  for (const a of await shell.locator('a:visible').all()) assert((await a.boundingBox()).height >= 44)
  console.log('Desktop optical response:', await checkOptics(page,'.desktop-glass'))
  if (proof) {
    await expect(page.locator('.hero-line').last()).toHaveCSS('opacity', '1')
    await page.screenshot({ path: resolve(proof, 'hero.png') })
  }
  const work = rail.getByRole('link', { name: 'Work', exact: true })
  await work.hover(); await expect(work).toHaveCSS('color', 'rgb(255, 255, 255)')
  const glint = () => face.evaluate(e => { const s=getComputedStyle(e,'::before');return {x:parseFloat(s.left)+70, opacity:+s.opacity} })
  const start = await glint(); assert.equal(start.opacity,0)
  await cta.hover(); await expect.poll(async()=> (await glint()).opacity).toBeGreaterThan(.01)
  const middle=await glint(); assert(middle.opacity<1 && middle.x>0)
  if (proof) await page.screenshot({ path: resolve(proof, 'sweep.png'), clip:{x:box.x-6,y:box.y-6,width:box.width+12,height:box.height+20} })
  await expect.poll(async()=> (await glint()).opacity).toBe(1)
  assert(Math.abs((await glint()).x - (await face.boundingBox()).width - 70) < 1)
  await page.mouse.move(10,100); await expect.poll(async()=> (await glint()).opacity).toBe(0)
  await page.emulateMedia({ reducedMotion: 'reduce' }); await cta.focus(); await expect(cta).toBeFocused(); await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#contact$/); await expect(cta).toHaveAttribute('aria-current','location'); assert.equal((await glint()).opacity,0)
  await work.focus(); await page.keyboard.press('Enter'); await expect(work).toHaveAttribute('aria-current','location'); const lens=await rail.locator('.nav-lens').boundingBox(), link=await work.boundingBox(); assert(Math.abs(lens.x-link.x)<2 && Math.abs(lens.width-link.width)<2)
  await page.setViewportSize({ width:832, height:850 }); await expect(cta).toBeInViewport(); assert((await rail.boundingBox()).x + (await rail.boundingBox()).width <= (await cta.boundingBox()).x)
  await page.setViewportSize({ width:390, height:800 }); await expect(shell).toBeHidden(); await expect(page.getByRole('button',{name:'Menu',exact:true})).toBeVisible(); await expect(rail).toBeHidden()
  console.log('Mobile rail:', await checkOptics(page,'.fluid-main'))
  await page.getByRole('button',{name:'Menu',exact:true}).click()
  console.log('Mobile panel:', await checkOptics(page,'.fluid-panel'))
  assert.deepEqual(errors,[]); assert.deepEqual(external,[]); assert.deepEqual(await page.evaluate(()=>window.violations),[])
  console.log('PASS: production CSP / all-local, real playing hero, 800×58 shell, 44px targets, reversible CTA travel + link hover, reduced motion, keyboard hash navigation, section lens, desktop threshold and mobile pass-through.')
} finally { await browser?.close(); await server?.close(); await rm(scratch,{recursive:true,force:true}) }
