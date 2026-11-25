import { lazy, Suspense, useRef, useState } from 'react'
import { heroScene, words } from '../constants/index.js'
import Button from '../components/Button.jsx'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import AnimatedCounter from '../components/AnimatedCounter.jsx'
import HeroBackground from '../components/HeroBackground.jsx'
import { useHeroMotion } from '../hooks/useHeroMotion.js'

// Code-split the 3D scene: three.js/R3F only load in an async chunk, so the
// hero copy (the LCP) paints immediately and the helix streams in after.
const HeroExperience = lazy(() => import('../components/HeroModels/HeroExperience.jsx'))

const Hero = () => {
    const stageRef = useRef(null)
    const motion = useHeroMotion(stageRef)
    const [resetKey, setResetKey] = useState(0)
    useGSAP(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
        gsap.fromTo('.hero-line',
            { y: 50, opacity: 0 },
            { y: 0, opacity: 1, stagger: 0.2, duration: 1, ease: 'power2.inOut' },
        )
    })

    return (
        <section id="hero" className="relative overflow-hidden" data-motion={motion.running ? 'playing' : 'paused'}>
          <div className="hero-stage" ref={stageRef}>
            <HeroBackground motion={motion} />
            <div className="hero-layout">
                {/* {LEFT: HERO CONTENT} */}
                <header className="flex flex-col justify-center md:w-full w-screen md:px-20 px-5">
                    <div className="flex flex-col gap-7">
                        <h1 className="hero-text" aria-label="Shaping science, data and evidence into clear, accurate medical communications">
                            <span className="hero-line">
                                Shaping
                                <span className="slide" aria-hidden="true">
                                    <span className="wrapper">
                                        {words.map((word, index) => (
                                            <span key={`${word.text}-${index}`} className="flex items-center md:gap-3 gap-1 pb-2">
                                                <img
                                                    src={word.imgPath}
                                                    alt=""
                                                    className="xl:size-12 md:size-10 size-7 md:p-2 p-1 rounded-full"
                                                    style={{ background: `color-mix(in srgb, ${word.accent} 32%, white)` }} />
                                                <span>{word.text}</span>
                                            </span>
                                        ))}

                                    </span>
                                </span>
                            </span>
                            <span className="hero-line">into Clear, Accurate</span>
                            <span className="hero-line">Medical Communications</span>
                        </h1>
                        <p className="text-white-50 md:text-xl relative z-10 pointer-events-none xl:max-w-xl">
                            Hi! I'm Marco, a medical writer with a passion for transforming complex medical information.
                        </p>
                        <Button
                            className="md:w-80 md:h-16 w-60 h-12"
                            id="button"
                            text="See my Work"
                        />
                    </div>
                </header>
                {/* {RIGHT: 3D MODEL} */}
                <figure aria-label="Interactive 3D DNA helix animation">
                    <div className="hero-3d-layout">
                        <Suspense fallback={null}>
                            <HeroExperience paused={!motion.running} resetKey={resetKey} darkBackdrop />
                        </Suspense>
                    </div>
                </figure>
            </div>
            <div className="hero-scene-controls" aria-label="Hero animation controls">
                <button type="button" className="hero-reset" aria-label={heroScene.reset} onClick={() => setResetKey(key => key + 1)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M3 4v6h6M3.7 9a8.5 8.5 0 1 1 .3 7" />
                    </svg>
                </button>
                <button
                    type="button"
                    onClick={motion.toggle}
                    disabled={!motion.allowed}
                    title={motion.reduced ? heroScene.reducedHint : motion.saveData ? heroScene.saveDataHint : undefined}
                >
                    <svg viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
                        {motion.userPaused || motion.blocked || !motion.allowed
                            ? <path d="M5 3v10l8-5z" />
                            : <path d="M4 3h3v10H4zm5 0h3v10H9z" />}
                    </svg>
                    {!motion.allowed ? heroScene.off : motion.userPaused || motion.blocked ? heroScene.play : heroScene.pause}
                </button>
            </div>
          </div>
            <AnimatedCounter />
        </section>
    )
}

export default Hero