# Marco Ng — Portfolio

A personal portfolio for **Marco Ng**, a medical writer based in Hong Kong who specialises in promotional and educational content for healthcare professionals (HCPs).

The site is a single-page React application with an interactive 3D hero, scroll-driven animations, and several purpose-built sections that reframe a traditional developer portfolio around medical communications. Motion is used deliberately and respects the visitor's reduced-motion preference throughout.

<!-- Live site: add your deployment URL here once published. -->

## Sections

- **Hero** — a 3D DNA-helix scene (React Three Fiber) with a rotating headline and an animated stats counter.
- **Work** — case-study cards for selected deliverables (detail aids, reminder cards), colour-coded by therapeutic area.
- **Drug Product Experience** — an infinite marquee of products worked on, grouped by therapeutic area.
- **Data Distilled** — trial readouts condensed into a single clinician-facing takeaway, with count-up figures, arm-comparison bars, and referenced footnotes.
- **Contact** — a working contact form (Web3Forms) plus direct contact details, preceded by a decorative kinesin-walking-a-microtubule animation.

## Tech stack

- **React 19** + **Vite** — UI and build tooling.
- **Tailwind CSS v4** (via `@tailwindcss/vite`) — styling; the theme and component classes live entirely in `src/index.css` (no `tailwind.config.js`).
- **GSAP** (`@gsap/react`, `ScrollTrigger`) — entrance and scroll-driven animations.
- **React Three Fiber** (`@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`, `three`) — the 3D hero scene.
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
  favicon.svg
src/
  components/        Reusable UI + the hero 3D scene (HeroModels/) and KinesinWalk
  sections/          Full-width page sections (Hero, Work, DrugProducts, DataDistilled, Contact)
  constants/         All site content/data in a single module
  index.css          Tailwind theme, component classes, keyframes
  App.jsx            Page composition
  main.jsx           App entry point
```

## Editing content

Nearly all copy and data live in **`src/constants/index.js`**, so most updates are made there rather than in the components:

- `navLinks` — navigation items
- `counterItems` — hero stats
- `workProjects` — Work case studies (title, therapeutic area, accent colour, tags)
- `drugProducts` / `drugAreaColors` — the drug marquee and its per-area colours
- `dataDistillExamples` — Data Distilled rows, including per-row `footnotes` and `citation`
- `contactEmail`, `contactLinks` — contact details

> **Note:** the trial figures in `dataDistillExamples` are illustrative placeholders and should be verified against the primary publications before publishing.

## Contact form

The contact form submits via [Web3Forms](https://web3forms.com). The access key is set in `web3formsKey` in `src/constants/index.js` (it is designed to be public / safe to expose client-side). If no key is configured, the form gracefully falls back to opening a pre-filled draft in the visitor's email client.

## Accessibility

Animations (scroll reveals, the drug marquee, count-ups, and the kinesin animation) are disabled or reduced when the visitor has **`prefers-reduced-motion`** enabled, and anchored navigation accounts for the fixed navbar so section headings are never obscured.

## Deployment

The production build in `dist/` is a fully static bundle and can be deployed to any static host (e.g. Vercel, Netlify, or GitHub Pages):

```bash
npm run build
```

## License

This project is for personal portfolio use. All rights reserved.
