import { lazy, Suspense } from 'react'
import { words } from '../constants/index.js'
import Button from '../components/Button.jsx'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import AnimatedCounter from '../components/AnimatedCounter.jsx'

// Code-split the 3D scene: three.js/R3F only load in an async chunk, so the
// hero copy (the LCP) paints immediately and the helix streams in after.
const HeroExperience = lazy(() => import('../components/HeroModels/HeroExperience.jsx'))

const Hero = () => {
    useGSAP(() => {
        gsap.fromTo('.hero-line',
            { y: 50, opacity: 0 },
            { y: 0, opacity: 1, stagger: 0.2, duration: 1, ease: 'power2.inOut' },
        )
    })

    return (
        <section id="hero" className="relative overflow-hidden">
            <div className="hero-glow" />

            <div className="hero-layout">
                {/* {LEFT: HERO CONTENT} */}
                <header className="flex flex-col justify-center md:w-full w-screen md:px-20 px-5">
                    <div className="flex flex-col gap-7">
                        <h1 className="hero-text">
                            <span className="hero-line">
                                Shaping
                                <span className="slide">
                                    <span className="wrapper">
                                        {words.map((word, index) => (
                                            <span key={`${word.text}-${index}`} className="flex items-center md:gap-3 gap-1 pb-2">
                                                <img
                                                    src={word.imgPath}
                                                    alt={word.text}
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
                            Hi! I'm Marco, a medical writer based in Hong Kong with a passion for transforming complex medical information.
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
                            <HeroExperience />
                        </Suspense>
                    </div>
                </figure>
            </div>
            <AnimatedCounter />
        </section>
    )
}

export default Hero