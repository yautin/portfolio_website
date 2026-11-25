import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { navLinks } from '../../constants'

// Fluid Pill Nav – Complete, ut9Wcl3vHU4i6qPd1u5z: Base → Bridge → Expand.
// Only the Bridge schedules another pose. Every dismissal targets Base directly.
const BRIDGE_MS = 300
const still = '(prefers-reduced-motion: reduce)'

// Some touch browsers don't apply :active until release. Paint on contact,
// but let the browser own scrolling, pointer capture and link activation.
function markPress(event) {
  const control = event.target.closest('a, button')
  if (event.pointerType !== 'mouse' && event.isPrimary && control && !control.closest('[inert]')) {
    control.setAttribute('data-pressed', '')
  }
}
function clearPress(event) {
  event.target.closest('a, button')?.removeAttribute('data-pressed')
}

export default function MobileFluidNav({ current }) {
  const [phase, setPhase] = useState('base')
  const expanded = phase === 'expand', disclosed = phase !== 'base'
  const root = useRef(null), menu = useRef(null), close = useRef(null)
  const content = useRef(null)
  const nextFocus = useRef(null), swipe = useRef(null)
  const panelId = useId()
  const location = id => id === current ? 'location' : undefined

  // Layout projection needs the full-size list even when its mask is a seed.
  // Measure only on intrinsic size changes (font, wraps, viewport), not per frame.
  useLayoutEffect(() => {
    const el = content.current, shell = root.current
    const measure = () => shell.style.setProperty('--fluid-content-h', `${el.offsetHeight}px`)
    const observer = new ResizeObserver(measure)
    measure(); observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const dismiss = useCallback((restore = false) => {
    nextFocus.current = restore ? 'menu' : null
    swipe.current = null
    setPhase('base')
  }, [])

  function open() {
    if (disclosed) return dismiss(true)
    nextFocus.current = 'close'
    setPhase(window.matchMedia(still).matches ? 'expand' : 'bridge')
  }

  useEffect(() => {
    if (phase !== 'bridge') return
    const reduced = window.matchMedia(still)
    const expand = () => setPhase(pose => pose === 'bridge' ? 'expand' : pose)
    const timer = window.setTimeout(expand, BRIDGE_MS)
    reduced.addEventListener('change', expand)
    return () => { window.clearTimeout(timer); reduced.removeEventListener('change', expand) }
  }, [phase])

  useLayoutEffect(() => {
    if (phase === 'bridge' || !nextFocus.current) return
    const target = nextFocus.current === 'close' ? close : menu
    nextFocus.current = null
    target.current?.focus({ preventScroll: true })
  }, [phase])

  useEffect(() => {
    if (!disclosed) return
    const outside = e => { if (!root.current?.contains(e.target)) dismiss() }
    const escape = e => { if (e.key === 'Escape') { e.preventDefault(); dismiss(true) } }
    const mobile = window.matchMedia('(width < 52rem)')
    const resize = () => { if (!mobile.matches) dismiss() }
    mobile.addEventListener('change', resize)
    document.addEventListener('pointerdown', outside)
    document.addEventListener('focusin', outside)
    document.addEventListener('keydown', escape)
    return () => {
      mobile.removeEventListener('change', resize)
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('focusin', outside)
      document.removeEventListener('keydown', escape)
    }
  }, [disclosed, dismiss])

  // Optional swipe-up alternative; never claim a scrollable panel or pinch gesture.
  function startSwipe(e) {
    const el = e.currentTarget
    swipe.current = e.touches.length === 1 && el.scrollHeight <= el.clientHeight + 1 ? e.touches[0] : null
  }
  function endSwipe(e) {
    const from = swipe.current, to = e.changedTouches[0]
    swipe.current = null
    if (!from || from.identifier !== to.identifier || e.touches.length) return
    const dy = from.clientY - to.clientY
    if (dy > 60 && dy > 2 * Math.abs(from.clientX - to.clientX)) dismiss(true)
  }

  return <div ref={root} className="mobile-fluid-nav" data-phase={phase}
    onPointerDown={markPress} onPointerUp={clearPress} onPointerCancel={clearPress} onLostPointerCapture={clearPress}>
    <button type="button" ref={close} className="fluid-close" aria-label="Close menu"
      inert={!expanded} aria-hidden={!expanded} aria-expanded={disclosed} aria-controls={panelId} onClick={() => dismiss(true)}>
      <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18" /></svg>
    </button>
    <nav id={panelId} className="fluid-panel" aria-label="Sections" inert={!expanded} aria-hidden={!expanded}>
      <div ref={content} className="fluid-content" onTouchStart={startSwipe}
        onTouchCancel={() => { swipe.current = null }} onTouchEnd={endSwipe}>
        <ul>{navLinks.map(({ link, name }) => <li key={link}>
          <a href={link} aria-current={location(link.slice(1))} onClick={() => dismiss()}>
            <span className="fluid-label">{name}</span>
            <svg className="fluid-arrow" aria-hidden="true" viewBox="0 0 20 20"><path d="M3 10h13m-5-5 5 5-5 5" /></svg>
          </a>
        </li>)}</ul>
      </div>
    </nav>
    <div className="fluid-main">
      <button type="button" ref={menu} className="fluid-menu" aria-expanded={disclosed}
        aria-controls={panelId} inert={expanded} aria-hidden={expanded} onClick={open}>
        <span className="fluid-bars" aria-hidden="true" />Menu
      </button>
      <a className="fluid-contact" href="#contact" aria-current={location('contact')}
        onClick={() => dismiss()} onFocus={() => { nextFocus.current = null }}><span>Contact</span></a>
    </div>
  </div>
}
