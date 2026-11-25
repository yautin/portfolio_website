import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { CustomEase } from 'gsap/CustomEase'
import m from './desktopGlassMaterial.json'


// Liquid Glass Navbar — Matthias Ölschlegel. Source pin, child-module hashes
// and reproducible extraction are documented in tools/nav-desktop-glass/README.md.
gsap.registerPlugin(useGSAP, CustomEase)
const shineEase = CustomEase.create('desktopGlassShine', m.shineTransition.ease.join(','))
// Motion's duration/bounce spring sampled at 10 ms, normalized 0 → 1.
const spring = [0,.02877,.10014,.19591,.30269,.41102,.51455,.60932,.69318,.76528,.82572,.87517,.91467,.94545,.96879,.98594,.99807,1.00621,1.01127,1.01402,1.01509,1.01499,1.01411,1.01277,1.01119,1.00954,1.00794,1.00645,1.00511,1.00395,1.00297,1.00216,1.0015,1.00099,1.00059,1]
const surfaceEase = t => {
  const n = t * (spring.length - 1), i = Math.floor(n)
  return spring[i] + ((spring[i + 1] ?? 1) - spring[i]) * (n - i)
}
const material = {

  '--dg-gem': m.gem.background, '--dg-gem-shadow': m.gem.boxShadow,
  '--dg-gem-angle': `${m.gem.rotate}deg`, '--dg-facet': m.facet.backgroundColor,
  '--dg-link': m.link.rest.backgroundColor, '--dg-link-shadow': m.link.rest.boxShadow,

  '--dg-cta': m.cta.rest.background, '--dg-cta-shadow': m.cta.rest.boxShadow,
  '--dg-cta-hover': m.cta.hover.background, '--dg-cta-hover-shadow': m.cta.hover.boxShadow,
  '--dg-shine': m.shine.background, '--dg-shine-angle': `${m.shine.rotate}deg`,
  '--dg-surface-time': `${m.surfaceTransition.duration}s`, '--dg-spring': `linear(${spring.join(',')})`,
}

/** Wrap the existing .nav-row only. The parent owns links, section state, focus and mobile disclosure. */
export default function DesktopGlass({ children }) {
  const shell = useRef(null)
  useGSAP(() => {
    const media = gsap.matchMedia()
    media.add('(min-width: 52rem) and (prefers-reduced-motion: no-preference) and (forced-colors: none)', () => {
      const cta = shell.current.querySelector('.nav-contact')
      const face = cta?.querySelector(':scope > span')
      if (!face) return
      cta.dataset.animatedSurface = ''
      let lit = false, sweep, surface
      const update = () => {
        const next = cta.matches(':hover, :focus-visible')
        if (next === lit) return
        lit = next
        const target = next ? m.cta.hover : m.cta.rest
        surface?.kill(); sweep?.kill()
        surface = gsap.to(face, { backgroundImage: target.background, boxShadow: target.boxShadow,
          duration: m.surfaceTransition.duration, ease: surfaceEase })
        // Original layout projection: left:-70 → right:-70. Percentage travel
        // is resolved by the browser so a font swap cannot strand the highlight.
        sweep = gsap.to(face, { '--dg-glint': next ? 1 : 0,
          duration: m.shineTransition.duration, ease: shineEase })
      }
      const events = ['pointerenter', 'pointerleave', 'focus', 'blur']
      events.forEach(name => cta.addEventListener(name, update))
      update()
      return () => {
        events.forEach(name => cta.removeEventListener(name, update))
        surface?.kill(); sweep?.kill()
        for (const p of ['--dg-glint', 'background-image', 'box-shadow']) face.style.removeProperty(p)
        delete cta.dataset.animatedSurface
      }
    })
    return () => media.revert()
  }, { scope: shell })
  return <div className="desktop-glass" ref={shell} style={material}>{children}</div>
}
