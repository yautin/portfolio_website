import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { heroScene } from '../constants'

gsap.registerPlugin(ScrollTrigger)

export default function HeroBackground({ motion }) {
  const backgroundRef = useRef(null)
  const shadeRef = useRef(null)
  const videoRef = useRef(null)
  const [readySource, setReadySource] = useState(null)
  const source = motion.mobile ? heroScene.mobileVideo : heroScene.desktopVideo
  const { loadVideo, running, reportBlocked } = motion
  const showVideo = loadVideo && readySource === source && !motion.blocked

  // Scrub only the visible movie. The poster, helix and copy are separate layers.
  useGSAP(() => {
    if (!showVideo) return
    gsap.fromTo(shadeRef.current, { opacity: 0 }, {
      opacity: 0.2, ease: 'none',
      scrollTrigger: { trigger: backgroundRef.current, start: 'top top', end: 'bottom top', scrub: true },
    })
  }, { scope: backgroundRef, dependencies: [showVideo], revertOnUpdate: true })

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    let active = true
    if (running) {
      video.play().catch(error => {
        // Aborted plays are expected when pausing or changing media source.
        if (active && error.name !== 'AbortError') reportBlocked()
      })
    } else video.pause()
    return () => {
      active = false
      video.pause()
    }
  }, [source, loadVideo, running, reportBlocked])

  return (
    <div ref={backgroundRef} className="hero-background" aria-hidden="true" data-fallback={motion.blocked}>
      <picture>
        <source media="(max-width: 767px)" srcSet={heroScene.mobilePoster} />
        <img src={heroScene.desktopPoster} alt="" fetchPriority="high" width="2560" height="1440" />
      </picture>
      {loadVideo && (
        <video
          key={source}
          ref={videoRef}
          src={source}
          className={showVideo ? 'is-ready' : ''}
          muted loop playsInline preload="none"
          onPlaying={() => setReadySource(source)}
          onError={reportBlocked}
        />
      )}
      {showVideo && <span ref={shadeRef} className="hero-video-shade" />}
    </div>
  )
}
