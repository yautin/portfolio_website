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

- **`src/sections/`** — full-width page sections (Hero, ShowcaseSection, DrugProducts, DataDistilled, Contact), each wrapping its own content and animations.
- **`src/components/`** — reusable pieces (Button, NavBar, AnimatedCounter, KinesinWalk).
- **`src/components/HeroModels/`** — the React Three Fiber 3D scene for the hero. `HeroExperience.jsx` is the `<Canvas>` root that composes `DnaHelix`, `HeroLights`, and `Particles` (a procedural DNA helix — there are no `.glb` models).
- **`src/games/<id>/`** — self-contained Phaser games (currently `immune-defense/`), each consumed only through its `index.js` facade; **`src/fun/`** is the `/fun` games hub (route in `Root.jsx`) with `GameShell` (generic modal) and `games.js` (registry). Adding a game = a `src/games/` folder + `public/games/<id>/` sprites + one registry entry. See the game section below.
- **`src/constants/index.js`** — all content data (nav links, words, counters, work projects, drug products, etc.) lives here as exported arrays. Components import and `.map()` over these; edit copy/data here, not inline in JSX.
- **`public/images/`** and **`public/games/`** — static assets referenced by absolute paths (e.g. `/images/foo.svg`, `/games/immune-defense/foo.svg`).

### Styling (Tailwind CSS v4 — important)

There is **no `tailwind.config.js`**. Tailwind v4 is wired through the `@tailwindcss/vite` plugin ([vite.config.js](vite.config.js)). [src/index.css](src/index.css) is the stylesheet **entry point**: it imports Tailwind, then the concern-split files under `src/styles/` — **import order is cascade order**, so keep new imports in page order and don't reorder them casually.

- **Theme tokens** (custom colors like `black-100`, `white-50`, fonts) live in the `@theme` block in [src/styles/theme.css](src/styles/theme.css), alongside the dark/light semantic tokens (`:root` / `[data-theme="light"]`), ambient wash/grain, band tints, and the game's dark-island token re-pin. Reference tokens as normal Tailwind classes (`bg-black-100`, `text-white-50`).
- Most styling is done via **semantic component classes** in `@layer components`, split **one file per page region** under `src/styles/components/` (`navbar.css`, `hero.css`, `work.css`, `fun.css`, `game.css`, …), often using nested selectors and `@apply`. JSX uses these class names instead of long utility strings, so layout/visual changes belong in the matching `src/styles/components/*.css` file, not the component. New page sections get a new file there, imported from `index.css` in page order.
- Keyframe animations (word slider, marquee, kinesin walk) plus the touch-device and reduced-motion rules live in [src/styles/animations.css](src/styles/animations.css) — imported **last** so they can override component defaults.
- Base element styles, focus/selection, and the scrollbar live in [src/styles/base.css](src/styles/base.css).

### Animation

GSAP drives all motion via the `useGSAP` hook (`@gsap/react`). Components that animate on scroll must `gsap.registerPlugin(ScrollTrigger)` at module scope (see [AnimatedCounter.jsx](src/components/AnimatedCounter.jsx) and [ShowcaseSection.jsx](src/sections/ShowcaseSection.jsx)). ScrollTriggers are wired to element IDs/refs (e.g. `#counter`), so keep those IDs in sync when renaming.

### 3D hero

The hero scene under `src/components/HeroModels/` is **procedural** (no `.glb` assets): `DnaHelix.jsx` builds the double helix from geometry, lit by `HeroLights.jsx`, with a `Particles.jsx` field. Theme-awareness comes from the `useTheme` hook — R3F components read it to swap colors/intensities for light vs dark.

### Games (`/fun` hub)

Each game is a **self-contained folder** under `src/games/<id>/`, framework-agnostic, exposed only through its `index.js` **facade**. Nothing outside the folder may import its internals (`td/`, `audio`, `scenes/`, `factory`) — the facade re-exports the small public surface: `loadFactory` (dynamic-imports the Phaser `createGame`, keeping Phaser in its own lazy chunk), `controlsHint`, the save descriptor (localStorage keys + change event), and progress getters.

The `/fun` hub lives in `src/fun/`:
- **`games.js`** — the registry: one entry per game wiring its facade exports (`loadFactory`, `setMuted`, `hint`, `save`, `progress`, card copy) into a plain object. `progress()` returns `{ label }` — a free-form string the hub card renders verbatim, so each game summarises its own store however reads best. **This is the only file you touch to add a game.**
- **`GameShell.jsx`** — one generic modal shell that renders *any* registry entry (title, canvas host, mute/fullscreen, rotate prompt, hint). Game-specific behavior comes from the passed `game` object, never hardcoded.
- **`saveSync.js`** — game-agnostic cloud saves (Supabase); reads each game's `save` descriptor from the registry, so it never knows game specifics.

To add a game: create `src/games/<id>/` (with an `index.js` facade exposing that surface), put sprites in `public/games/<id>/`, and add one entry to `games.js`. Hub card, code-splitting, cloud saves, and modal chrome all come for free.

Inside `immune-defense/`, `GameScene` is split by concern: the class (`scenes/GameScene.js`) owns state/geometry/frame-loop, and `scenes/game/*.js` modules (field, hud, toolbar, placement, pause, combat, fx) hold verbatim `this`-based methods mixed onto the prototype via `Object.assign`. Balance/content data is in `td/defs.js`.

The two games today are **`immune-defense/`** (lane tower-defense) and **`microwell/`** (minesweeper framed as a live-cell microfluidic assay / Lab-on-a-Chip — the hidden "mines" are **infected host cells** in a grid of traps, not free pathogens; first-click-safe seeding, flood-fill, flagging, chording, plus a non-invasive "scan" safe-reveal twist). Microwell is the smaller reference for the contract: `scenes/` holds four plain scenes (Boot/Menu/Game/End), a lean local `ui.js`/`audio.js` (near-twins of immune-defense's — a future `src/games/shared/` could host the common core), and all tuning/persistence in `td/defs.js`. Both games' scenes zoom the camera by `RES` (`viewport(scene)`) so gameplay stays in logical pixels at HiDPI.
