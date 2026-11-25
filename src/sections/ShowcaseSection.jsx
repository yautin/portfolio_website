import { useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import WorkCoverFlow from '../components/WorkCoverFlow'

gsap.registerPlugin(ScrollTrigger)

const ShowcaseSection = () => {
  const sectionRef = useRef(null)

  useGSAP(() => {
    gsap.fromTo(
      '.work-head > *',
      { y: 30, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.8,
        stagger: 0.15,
        ease: 'power2.out',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 75%' },
      }
    )
    // On a cold SPA visit the browser can resolve the fragment before React
    // has created #work. Honour that link without overriding restored scroll.
    if (window.location.hash === '#work' && window.scrollY === 0) {
      sectionRef.current.scrollIntoView({ block: 'start', behavior: 'instant' })
    }
  }, { scope: sectionRef })

  return (
    <section id="work" ref={sectionRef} className="work-section section-band">
      <div className="work-head">
        <p className="section-eyebrow">Selected work</p>
        <h2 className="section-title">Turning clinical data into content HCPs act on</h2>
        <p className="section-lead">
          Client deliverables are confidential and shown here as summaries.
          Samples available on request.
        </p>
      </div>

      <WorkCoverFlow />
    </section>
  )
}

export default ShowcaseSection
