# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start the Vite dev server with HMR
- `npm run build` — production build to `dist/`
- `npm run preview` — serve the production build locally
- `npm run lint` — run ESLint over the repo

There is no test setup in this project.

## What this is

A single-page personal portfolio for Marco Ng (a medical writer in Hong Kong), built on React 19 + Vite. It originated from the JS Mastery portfolio template, so `src/constants/index.js` still contains placeholder template data ("Adrian", fake testimonials, generic experience cards). When adding sections, replace the relevant placeholder data rather than treating it as real content.

## Architecture

The page is assembled in [src/App.jsx](src/App.jsx) by stacking section components (`NavBar`, `Hero`, `ShowcaseSection`). Adding a new region of the page means creating a section and slotting it here.

- **`src/sections/`** — full-width page sections (Hero, ShowcaseSection), each wrapping its own content and animations.
- **`src/components/`** — reusable pieces (Button, NavBar, AnimatedCounter).
- **`src/components/HeroModels/`** — the React Three Fiber 3D scene for the hero. `HeroExperience.jsx` is the `<Canvas>` root that composes `Room`, `Desk`, `HeroLights`, and `Particles`.
- **`src/constants/index.js`** — all content data (nav links, words, counters, testimonials, tech stack, etc.) lives here as exported arrays. Components import and `.map()` over these; edit copy/data here, not inline in JSX.
- **`public/images/`** and **`public/models/`** — static assets referenced by absolute paths (e.g. `/images/foo.png`, `/models/foo.glb`).

### Styling (Tailwind CSS v4 — important)

There is **no `tailwind.config.js`**. Tailwind v4 is wired through the `@tailwindcss/vite` plugin ([vite.config.js](vite.config.js)), and all configuration lives in [src/index.css](src/index.css):

- Theme tokens (custom colors like `black-100`, `white-50`, fonts) are defined in the `@theme` block. Reference them as normal Tailwind classes (`bg-black-100`, `text-white-50`).
- Most styling is done via **semantic component classes** defined in `@layer components` (`.navbar`, `.hero-layout`, `.app-showcase`, `.cta-button`, etc.), often using nested selectors and `@apply`. JSX uses these class names instead of long utility strings, so layout/visual changes usually belong in `index.css`, not the component.
- Keyframe animations (word slider, marquee, card glow) are plain CSS at the bottom of `index.css`.

### Animation

GSAP drives all motion via the `useGSAP` hook (`@gsap/react`). Components that animate on scroll must `gsap.registerPlugin(ScrollTrigger)` at module scope (see [AnimatedCounter.jsx](src/components/AnimatedCounter.jsx) and [ShowcaseSection.jsx](src/sections/ShowcaseSection.jsx)). ScrollTriggers are wired to element IDs/refs (e.g. `#counter`), so keep those IDs in sync when renaming.

### 3D models

Files under `src/components/HeroModels/` like `Room.jsx` and `Desk.jsx` are **auto-generated from `.glb` files via `gltfjsx`** (see the header comment in each). Regenerate them with gltfjsx rather than hand-editing node/mesh structure; custom material overrides applied after generation are the main thing worth editing by hand.
