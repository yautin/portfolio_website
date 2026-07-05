# Marco Ng — Portfolio

A personal portfolio for **Marco Ng**, a medical writer based in Hong Kong who specialises in promotional and educational content for healthcare professionals (HCPs).

The site is a single-page React application with an interactive 3D hero, scroll-driven animations, and purpose-built sections that reframe a traditional developer portfolio around medical communications. Motion is used deliberately and respects the visitor's reduced-motion preference throughout. Tucked in the footer is a full **browser tower-defense game** ("Immune Defense"), built on Phaser and lazy-loaded so it never affects the site's initial load.

<!-- Live site: add your deployment URL here once published. -->

## Highlights

- **Interactive 3D hero** — a DNA-helix scene (React Three Fiber) with a rotating headline and animated stat counters.
- **Purpose-built content sections** with a consistent type scale and alternating background bands for a clear reading rhythm.
- **"Immune Defense"** — a 15-level, PvZ-style lane tower defense hidden behind the footer's "For Fun" button (see below).
- **Accessible & responsive** — honours `prefers-reduced-motion`, keyboard-focusable, anchor-aware navigation, and mobile-friendly layouts.

## Sections

- **Hero** — a 3D DNA-helix scene with a rotating headline and an animated stats counter.
- **Work** — case-study cards for selected deliverables (detail aids, reminder cards), colour-coded by therapeutic area.
- **Drug Product Experience** — an infinite marquee of products worked on, grouped by therapeutic area.
- **Data Distilled** — trial readouts condensed into a single clinician-facing takeaway, with count-up figures, arm-comparison bars, and referenced footnotes.
- **Kinesin divider** — a decorative kinesin-walking-a-microtubule animation (poke it for a reaction).
- **Contact** — a working contact form (Web3Forms) plus direct contact details, and the footer's game launcher.

## Immune Defense (footer mini-game)

Opening the footer's **🎮 For Fun** button launches a self-contained tower-defense game built with **Phaser 3**, themed around the immune system.

- **Campaign** — 15 levels; lanes grow from 1 → 5 and a new defender unlocks after each level (up to 7).
- **7 defenders** (a Plants-vs-Zombies-style role triangle re-skinned as immune cells): Antibody, Mitochondrion, Macrophage, Complement Mine, Interferon, Mast Cell, and Neutrophil — each with distinct cost, HP, and behaviour, plus in-run upgrades.
- **6 pathogens** with escalating abilities (armoured, fast-vaulting, airborne, swarming) and **boss encounters** on levels 5/10/15.
- **Meta & QoL** — a 20-second planning phase, star ratings and best scores, saved progress and level select (via `localStorage`), an Easy/Normal difficulty toggle, mute, and a fullscreen mode.
- **Presentation** — hand-authored SVG art, synthesised Web-Audio SFX (no audio files), HiDPI rendering, device-responsive sizing (immersive full-screen on small screens with a rotate-to-landscape prompt in portrait).
- **Performance** — Phaser (~1.2 MB) is loaded through a dynamic `import()`, so it is **code-split into its own chunk** and only fetched when a visitor opens the game; it never bloats the main bundle.

All game code lives under `src/game/` and is framework-agnostic — the React layer (`src/components/ImmuneDefense.jsx`) only mounts/destroys the Phaser instance and owns the modal chrome.

## Easter eggs

- **Tab title** — switch away from the tab and the browser title changes to a cheeky line ("👀 The kinesin misses you"), restored on return.
- **Kinesin divider** — clicking the walking kinesin triggers a speech-bubble complaint.
- **The game** — described above.

## Tech stack

- **React 19** + **Vite 8** — UI and build tooling.
- **Tailwind CSS v4** (via `@tailwindcss/vite`) — styling; the theme and component classes live entirely in `src/index.css` (there is no `tailwind.config.js`).
- **GSAP** (`@gsap/react`, `ScrollTrigger`) — entrance and scroll-driven animations.
- **React Three Fiber** (`@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`, `three`) — the 3D hero scene.
- **Phaser 3** — the code-split "Immune Defense" mini-game.
- **react-responsive** — device/orientation detection for the game's responsive shell.
- **react-countup** — animated hero stat counters.
- **Web3Forms** — serverless contact-form submissions (no backend required).

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) ≥ 20.19 (or ≥ 22.12), as required by Vite 8
- npm (bundled with Node)

### Installation

```bash
git clone https://github.com/yautin/portfolio_website.git
cd portfolio_website
npm install
```

### Development

```bash
npm run dev
```

Then open the local URL printed in the terminal (default: `http://localhost:5173`).

## Scripts

| Command           | Description                                        |
| ----------------- | -------------------------------------------------- |
| `npm run dev`     | Start the Vite dev server with hot-module reload   |
| `npm run build`   | Build the production bundle to `dist/`             |
| `npm run preview` | Serve the production build locally                 |
| `npm run lint`    | Run ESLint over the project                        |

## Project structure

```
public/
  images/            Icons, textures, and section assets
  models/            3D model files (.glb)
  game/              SVG sprites for the Immune Defense game
  favicon.svg
src/
  components/        Reusable UI, the hero 3D scene (HeroModels/), KinesinWalk,
                     and ImmuneDefense (the game's React shell)
  sections/          Full-width page sections (Hero, Work, DrugProducts,
                     DataDistilled, Contact)
  game/              The Phaser mini-game (framework-agnostic)
    immuneDefense.js   Phaser game factory (entry for the dynamic import)
    scenes/            Boot / Menu / Game / Interlude scenes
    td/                defs.js (all tuning data) + entities.js
    ui.js              shared canvas UI kit + HiDPI camera helper
    audio.js           synthesised Web-Audio SFX
  constants/         All site content/data in a single module
  index.css          Tailwind theme, shared type scale, component classes, keyframes
  App.jsx            Page composition
  main.jsx           App entry point
```

## Editing content

Nearly all site copy and data live in **`src/constants/index.js`**, so most updates are made there rather than in the components:

- `navLinks` — navigation items
- `words` / `counterItems` — hero rotating words and stats
- `workProjects` — Work case studies (title, therapeutic area, accent colour, tags)
- `drugProducts` / `drugAreaColors` — the drug marquee and its per-area colours
- `dataDistillExamples` — Data Distilled rows, including per-row `footnotes` and `citation`
- `contactEmail`, `contactLinks`, `web3formsKey` — contact details and form key

The game's balance and content (defenders, pathogens, levels, difficulty) live in **`src/game/td/defs.js`**.

> **Note:** the trial figures in `dataDistillExamples` are illustrative placeholders and should be verified against the primary publications before publishing.

## Contact form

The contact form submits via [Web3Forms](https://web3forms.com). The access key is set in `web3formsKey` in `src/constants/index.js` (it is designed to be public / safe to expose client-side). If no key is configured, the form gracefully falls back to opening a pre-filled draft in the visitor's email client.

## Accessibility & performance

- Animations (scroll reveals, the drug marquee, count-ups, and the kinesin animation) are disabled or reduced when the visitor has **`prefers-reduced-motion`** enabled, and anchored navigation accounts for the fixed navbar so section headings are never obscured.
- The Phaser game is **lazy-loaded on demand**, keeping it out of the initial bundle so the portfolio itself stays fast.

## Deployment

The production build in `dist/` is a fully static bundle and can be deployed to any static host (e.g. Vercel, Netlify, or GitHub Pages):

```bash
npm run build
```

## License

This project is for personal portfolio use. All rights reserved.
