# Marco Ng — Portfolio

A personal portfolio website for **Marco Ng**, a medical writer based in Hong Kong specializing in promotional and educational content for healthcare professionals.

The site is a single-page application featuring an interactive 3D hero, scroll-driven animations, case-study summaries of selected work, and an animated showcase of drug products across therapeutic areas.

## Tech stack

- **React 19** + **Vite** — UI and build tooling
- **Tailwind CSS v4** (via `@tailwindcss/vite`) — styling, configured entirely in `src/index.css`
- **GSAP** (`@gsap/react`, `ScrollTrigger`) — entrance and scroll-driven animations
- **React Three Fiber** (`@react-three/fiber`, `drei`, `postprocessing`) — the 3D DNA-helix hero scene

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
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

## Available scripts

| Command           | Description                                      |
| ----------------- | ------------------------------------------------ |
| `npm run dev`     | Start the Vite dev server with hot-module reload |
| `npm run build`   | Build the production bundle to `dist/`           |
| `npm run preview` | Serve the production build locally               |
| `npm run lint`    | Run ESLint over the project                      |

## Project structure

```
public/            Static assets (images, 3D models, favicon)
src/
  components/      Reusable UI and 3D model components
  sections/        Full-width page sections (Hero, Work, Drug Products)
  constants/       Centralized content/data (copy, drug list, etc.)
  index.css        Tailwind theme, component classes, and animations
  App.jsx          Page composition
```

Site content (headings, the drug list, therapeutic-area colors, and case studies) lives in `src/constants/index.js`, so most copy changes are made there rather than in the components.

## Deployment

The production build in `dist/` is a static bundle and can be deployed to any static host (e.g. Vercel, Netlify, or GitHub Pages):

```bash
npm run build
```

## License

This project is for personal portfolio use. All rights reserved.
