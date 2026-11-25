import { homeView, globeRadius, projectRoute } from './geometry'

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const ENTER_SECONDS = 2.4
const IDLE_DEGREES_PER_SECOND = 3.4

// Draw imperatively: React never re-renders the contact form or particle buffer on a frame.
export function mountGlobe(host, route) {
  const canvas = host.querySelector('canvas'), path = host.querySelector('.globe-route')
  const surface = host.querySelector('.globe-surface')
  const pins = [...host.querySelectorAll('.globe-marker')], labels = [...host.querySelectorAll('.globe-label')]
  const toggle = host.querySelector('.globe-toggle')
  const media = matchMedia('(prefers-reduced-motion: reduce)')
  const abort = new AbortController(), opt = { signal: abort.signal }
  const view = { ...homeView }, hover = { x: 0, y: 0, z: 1, strength: 0 }
  let target = 0, field, request, frame = 0, then = 0, clock = 0, progress = media.matches ? 1 : 0
  let visible = false, paused = media.matches, drag = null, size = 0, dpr = 1, coast = 0
  let lastLat = NaN, lastLon = NaN, lastReveal = -1
  const isLight = () => document.documentElement.dataset.theme === 'light'
  let light = isLight()

  function overlay(reveal) {
    if (view.lat !== lastLat || view.lon !== lastLon) {
      const pose = projectRoute(view, route)
      path.setAttribute('d', pose.route)
      pose.pins.forEach(({ x, y, z }, i) => {
        const g = pins[i], label = labels[i]
        g.setAttribute('transform', `translate(${x.toFixed(3)} ${y.toFixed(3)})`)
        g.style.visibility = label.style.visibility = z > .03 ? 'visible' : 'hidden'
        label.style.left = `${x/2}%`; label.style.top = `${y/2}%`
      })
      lastLat = view.lat; lastLon = view.lon
    }
    if (reveal !== lastReveal) {
      host.style.setProperty('--annotations', reveal)
      path.style.strokeDashoffset = String(1 - reveal)
      lastReveal = reveal
    }
  }
  function draw() {
    field.draw({ ...view, progress, time: clock, hover, light })
    overlay(clamp((progress - .55) / .45, 0, 1))
  }
  function schedule() {
    if (!frame && field && visible && !document.hidden && !abort.signal.aborted) frame = requestAnimationFrame(tick)
  }
  function stop() { cancelAnimationFrame(frame); frame = 0; then = 0 }
  function tick(now) {
    frame = 0
    const dt = then ? Math.min((now - then)/1000, .08) : 0
    then = now
    const animating = !paused && !media.matches
    if (animating) {
      clock += dt
      if (progress < 1) progress = Math.min(1, progress + dt/ENTER_SECONDS)
      else if (!drag) {
        view.lon = (view.lon + (IDLE_DEGREES_PER_SECOND + coast)*dt) % 360
        coast *= Math.exp(-4.8*dt)
      }
    }
    hover.strength += (target - hover.strength) * Math.min(1, dt*12)
    if (Math.abs(hover.strength - target) < .006) hover.strength = target
    host.dataset.phase = progress >= 1 ? 'settled' : 'assembling'
    draw()
    if (animating || hover.strength !== target) schedule(); else then = 0
  }
  function syncToggle() {
    toggle.setAttribute('aria-label', paused ? 'Resume globe rotation' : 'Pause globe rotation')
    toggle.title = toggle.getAttribute('aria-label'); toggle.dataset.paused = String(paused)
  }
  function resize() {
    size = surface.getBoundingClientRect().width
    dpr = Math.min(2, window.devicePixelRatio || 1)
    if (field && size > 0) { field.resize(size, dpr, canvas.getBoundingClientRect().width); schedule() }
  }
  function fallback() {
    stop(); field?.dispose(); field = null
    host.dataset.renderer = 'poster'; host.dataset.phase = 'settled'
    Object.assign(view, homeView); overlay(1); surface.tabIndex = -1
  }
  async function load() {
    try {
      const { createParticleField } = await import('./particle-field')
      if (abort.signal.aborted) return
      field = createParticleField(canvas); resize(); draw()
      host.dataset.renderer = 'particles'; surface.tabIndex = 0; syncToggle(); schedule()
    } catch { if (!abort.signal.aborted) fallback() }
  }
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    if (visible) { request ??= load(); schedule() } else { target = hover.strength = 0; stop() }
  })
  io.observe(host)
  const ro = new ResizeObserver(resize); ro.observe(canvas)
  const theme = new MutationObserver(() => { light = isLight(); schedule() })
  theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else schedule() }, opt)
  canvas.addEventListener('webglcontextlost', () => { if (!abort.signal.aborted) fallback() }, opt)
  media.addEventListener('change', () => {
    paused = media.matches; if (paused) { progress = 1; coast = 0; target = hover.strength = 0 }
    syncToggle(); schedule()
  }, opt)
  toggle.addEventListener('click', () => {
    paused = !paused; progress = 1; coast = 0; syncToggle(); schedule()
  }, opt)
  function aim(e) {
    if (e.pointerType !== 'mouse' || drag) { target = 0; return }
    const rect = surface.getBoundingClientRect(), radius = size*globeRadius/200
    const x = (e.clientX - rect.left - size/2)/radius, y = (rect.top + size/2 - e.clientY)/radius
    const d = x*x + y*y
    if (d > 1) { target = 0; return }
    hover.x = x; hover.y = y; hover.z = Math.sqrt(1-d); target = 1
  }
  surface.addEventListener('pointerdown', e => {
    if (!field || !e.isPrimary || e.button !== 0) return
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp }
    surface.setPointerCapture(e.pointerId); target = 0; coast = 0; host.dataset.dragging = 'true'
  }, opt)
  surface.addEventListener('pointermove', e => {
    if (!field) return
    if (drag && e.pointerId === drag.id) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y, angle = -360*dx/size
      view.lon = (view.lon + angle) % 360
      view.lat = clamp(view.lat + 150*dy/size, -89, 89)
      coast = clamp(angle*1000/Math.max(12, e.timeStamp - drag.t), -105, 105)
      Object.assign(drag, { x: e.clientX, y: e.clientY, t: e.timeStamp })
    } else aim(e)
    schedule()
  }, opt)
  const end = e => {
    if (drag?.id !== e.pointerId) return
    if (paused || e.timeStamp - drag.t > 90 || e.type === 'pointercancel') coast = 0
    drag = null; delete host.dataset.dragging; aim(e); schedule()
  }
  for (const ev of ['pointerup','pointercancel','lostpointercapture']) surface.addEventListener(ev, end, opt)
  surface.addEventListener('pointerleave', () => { target = 0; schedule() }, opt)
  surface.addEventListener('keydown', e => {
    if (e.key === 'Home') Object.assign(view, homeView)
    else if (e.key === 'ArrowLeft') view.lon -= 15
    else if (e.key === 'ArrowRight') view.lon += 15
    else if (e.key === 'ArrowUp') view.lat = clamp(view.lat+12,-89,89)
    else if (e.key === 'ArrowDown') view.lat = clamp(view.lat-12,-89,89)
    else return
    e.preventDefault(); coast = 0; schedule()
  }, opt)
  return () => { abort.abort(); stop(); io.disconnect(); ro.disconnect(); theme.disconnect(); field?.dispose() }
}
