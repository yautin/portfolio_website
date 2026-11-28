import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { counterItems } from '../constants'

gsap.registerPlugin(ScrollTrigger)

const HeroStats = ({ animate }) => {
  const strip = useRef(null)
  const settled = useRef(false)

  useGSAP(() => {
    if (!animate) {
      settled.current = true
      return
    }
    if (settled.current) return
    const digits = strip.current.querySelectorAll('.hero-stat-digits')
    const clock = { progress: 0 }
    const paint = progress => digits.forEach((el, i) => {
      const next = String(Math.round(counterItems[i].value * progress))
      if (el.textContent !== next) el.textContent = next
    })

    gsap.to(clock, {
      progress: 1, duration: 1, ease: 'power2.out',
      scrollTrigger: { trigger: strip.current, start: 'top 95%', once: true },
      onUpdate: () => paint(clock.progress),
      onComplete: () => { settled.current = true },
    })
    // Toggling hero motion off during the count must not leave a partial figure.
    return () => paint(1)
  }, { scope: strip, dependencies: [animate], revertOnUpdate: true })

  return (
    <ul ref={strip} id="counter" className="hero-stats" role="list" aria-label="Medical writing experience">
      {counterItems.map(({ value, suffix, label }) => (
        <li key={label}>
          <span className="sr-only">{value}{suffix} </span>
          <strong aria-hidden="true"><span className="hero-stat-digits" style={{ minWidth: `${String(value).length}ch` }}>{value}</span><small>{suffix}</small></strong>{' '}
          <span className="hero-stat-label">{label}</span>
        </li>
      ))}
    </ul>
  )
}

export default HeroStats
