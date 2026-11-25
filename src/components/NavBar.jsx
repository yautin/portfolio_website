import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { navLinks } from '../constants'
import DesktopGlass from './nav/DesktopGlass.jsx'
import MobileFluidNav from './nav/MobileFluidNav.jsx'
import GlassOptics from './nav/GlassOptics.jsx'

const sectionIds = ['hero', ...navLinks.map(({ link }) => link.slice(1)), 'contact']
// WebKit accepts the URL syntax even where it does not filter the backdrop.
// Positive Blink opt-in; iOS browsers using WebKit retain the native frost.
const refracts = typeof navigator !== 'undefined' &&
  (navigator.userAgentData?.brands?.some(({ brand }) => brand === 'Chromium') || /(?:Chrome|Chromium)\//.test(navigator.userAgent))

function useCurrentSection() {
  const [current, setCurrent] = useState('hero')
  useEffect(() => {
    const sections = sectionIds.map(id => document.getElementById(id)).filter(Boolean)
    // Use pixels for the reading line: keep its height independent of viewport width.
    let observer
    function observe() {
      observer?.disconnect()
      const line = Math.round(window.innerHeight * 0.38)
      observer = new IntersectionObserver(entries => {
        const entry = entries.findLast(item => item.isIntersecting)
        if (entry) setCurrent(entry.target.id)
      }, { rootMargin: `-${line}px 0px -${window.innerHeight - line - 2}px 0px` })
      sections.forEach(el => observer.observe(el))
    }
    observe()
    window.addEventListener('resize', observe)
    return () => { observer.disconnect(); window.removeEventListener('resize', observe) }
  }, [])
  return current
}

function SectionLinks({ current }) {
  return navLinks.map(({ name, link }) => (
    <li key={link}>
      <a href={link} aria-current={link === `#${current}` ? 'location' : undefined}>{name}</a>
    </li>
  ))
}

function DesktopLinks({ current }) {
  const track = useRef(null)
  // Measure the links themselves so the same lens fits every label, including after a font swap.
  useLayoutEffect(() => {
    const rail = track.current
    const active = rail.querySelector('[aria-current]')
    if (!active) return
    const place = () => {
      rail.style.setProperty('--lens-x', `${active.getBoundingClientRect().left - rail.getBoundingClientRect().left}px`)
      rail.style.setProperty('--lens-width', `${active.getBoundingClientRect().width}px`)
    }
    place()
    const observer = new ResizeObserver(place)
    rail.querySelectorAll('a').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [current])

  return <nav className="nav-sections" aria-label="Sections" ref={track}>
    <span className="nav-lens" aria-hidden="true" />
    <ul><SectionLinks current={current} /></ul>
  </nav>
}

export default function NavBar() {
  const current = useCurrentSection()
  return <header className="navbar" data-refracts={refracts ? '' : undefined}>
    <GlassOptics />
    <DesktopGlass>
      <div className="nav-row">
        <a className="nav-name" href="#hero" aria-current={current === 'hero' ? 'location' : undefined}>Marco Ng.</a>
        <DesktopLinks current={current} />
        <a className="nav-contact" href="#contact" aria-current={current === 'contact' ? 'location' : undefined}><span>Contact me</span></a>
      </div>
    </DesktopGlass>
    <MobileFluidNav current={current} />
  </header>
}