# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start the Vite dev server with HMR
- `npm run build` — production build to `dist/`
- `npm run preview` — serve the production build locally
- `npm run lint` — run ESLint over the repo (app code only)
- `npm run lint:functions` — `deno lint` + `deno check` the Supabase edge functions. ESLint deliberately ignores `supabase/` (Deno, `npm:` imports), so this is the only static check on the reward backend. Needs Deno installed.
- `npm run typecheck` — `tsc --noEmit` over the strict-TS `src/web3/` modules

There is no test setup for the frontend. The Solidity contracts do have tests: `cd contracts && forge test`.

## What this is

A single-page personal portfolio for Marco Ng (a medical writer in Hong Kong), built on React 19 + Vite. It originated from the JS Mastery portfolio template, so `src/constants/index.js` still contains placeholder template data ("Adrian", fake testimonials, generic experience cards). When adding sections, replace the relevant placeholder data rather than treating it as real content.

## Architecture

The page is assembled in [src/App.jsx](src/App.jsx) by stacking section components (`NavBar`, `Hero`, `ShowcaseSection`). Adding a new region of the page means creating a section and slotting it here.

- **`src/sections/`** — full-width page sections (Hero, ShowcaseSection, DrugProducts, DataDistilled, Contact), each wrapping its own content and animations.
- **`src/components/`** — reusable pieces (Button, NavBar, AnimatedCounter, KinesinWalk).
- **`src/components/HeroModels/`** — the React Three Fiber 3D scene for the hero. `HeroExperience.jsx` is the `<Canvas>` root that composes `DnaHelix`, `HeroLights`, and `Particles` (a procedural DNA helix — there are no `.glb` models).
- **`src/games/<id>/`** — self-contained Phaser games (currently `immune-defense/`), each consumed only through its `index.js` facade; **`src/fun/`** is the `/fun` games hub (route in `Root.jsx`) with `GameShell` (generic modal) and `games.js` (registry). Adding a game = a `src/games/` folder + `public/games/<id>/` sprites + one registry entry. See the game section below.
- **`src/constants/index.js`** — all content data (nav links, words, counters, work projects, drug products, etc.) lives here as exported arrays. Components import and `.map()` over these; edit copy/data here, not inline in JSX. Keys and URLs are read from `import.meta.env` here, never hard-coded — see `.env.example`.
- **`src/web3/`** — the optional token-reward feature: strict TypeScript (the only TS in the app, scoped by `tsconfig.json`), lazily imported so wagmi/viem never enter the main or `/fun` bundles. `config.ts` note: the wagmi transports' RPC hosts must stay in sync with `connect-src` in `vercel.json` or every chain read is blocked at runtime.
- **`supabase/functions/`** — Deno edge functions backing the rewards (nonce issuance + minting). This is the security boundary: reward amounts, the rewardable-level list, and the rate limit are decided here and never trust the client. See `docs/web3-setup.md`.
- **`contracts/`** — Foundry project for the `$CULT` ERC-20. Dependencies are pinned **git submodules** (`git submodule update --init --recursive`), not `forge install`.
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

Each game is a **self-contained folder** under `src/games/<id>/`, framework-agnostic, exposed only through its `index.js` **facade**. Nothing outside the folder may import its internals (`td/`, `audio`, `scenes/`, `factory`) — the facade re-exports the small public surface: `loadFactory` (dynamic-imports the Phaser `createGame`, keeping Phaser in its own lazy chunk), `controlsHint`, the save descriptor (localStorage keys + change event), progress getters, and the **reward vocabulary** (`rewardLevels`, `levelLabel`, `beatenLevels`) — each game owns which of its levels are rewardable and what to call them, so the hub never re-lists them.

The `/fun` hub lives in `src/fun/`:
- **`games.js`** — the registry: one entry per game wiring its facade exports into a plain object, wrapped in `defineGame()`, which asserts in dev that every field of the `GameEntry` typedef is present (a half-wired game fails loudly at module load instead of silently losing cloud saves or rewards). `progress()` returns `{ label }` — a free-form string the hub card renders verbatim. **This is the only file you touch to add a game.**
- **`GameShell.jsx`** — one generic modal shell that renders *any* registry entry (title, canvas host, mute/fullscreen, rotate prompt, hint). Game-specific behavior comes from the passed `game` object, never hardcoded.
- **`saveSync.js`** — game-agnostic cloud saves (Supabase); reads each game's `save` descriptor from the registry, so it never knows game specifics.
- **`hooks/`** — the hub's stateful concerns, one per file: `useSession` (auth + access token), `useCloudSaves` (pull on sign-in, debounced push while a game is open), `useClaimable` (beaten levels minus already-minted), `useLevelCompleteToast`. `FunPage.jsx` composes these and is otherwise just layout.
- **`supabaseClient.js`** — the Supabase singleton, `null` when unconfigured so the hub degrades gracefully. Only `src/fun/` consumes it.

To add a game: create `src/games/<id>/` (with an `index.js` facade exposing that surface), put sprites in `public/games/<id>/`, and add one `defineGame({ … })` entry to `games.js`. Hub card, code-splitting, cloud saves, rewards, and modal chrome all come for free.

**Both** games split `GameScene` by concern the same way: the class (`scenes/GameScene.js`) owns state, the scene graph and the frame loop, and `scenes/game/*.js` modules hold verbatim `this`-based methods mixed onto the prototype via `Object.assign` at the bottom of the file. Immune Defense's modules are field/hud/toolbar/placement/pause/combat/fx; Microwell's are board/hud/input/rules/outcome/fx plus a `constants.js`. Balance/content data is in `td/defs.js`. Keep new scene code in the matching concern module rather than growing the class.

**`src/games/shared/`** holds what the two games genuinely have in common:
- `res.js` — the `RES` HiDPI factor (each game's `td/defs.js` re-exports it, so scenes still import `RES` from their own game).
- `audio.js` — `createAudioKit()`: one page-wide `AudioContext`, but a per-game mute flag and `blip`. Each game's `audio.js` is then just its sound design.
- `ui.js` — `viewport`, `roundRectGraphics`/`redrawRoundRect`, `REDUCED`, `FONT`, `BASE_UI` neutral tokens, and the button *mechanics*. Button **looks** stay per-game: `makeButton` takes a `paint({ g, txt, w, h, state })` strategy, so Immune Defense keeps its solid cyan and Microwell its brand gradient. Each game's `ui.js` re-exports the shared surface, so scenes keep importing everything from `"../ui"`.

The two games today are **`immune-defense/`** (lane tower-defense) and **`microwell/`** (minesweeper framed as a live-cell microfluidic assay / Lab-on-a-Chip — the hidden "mines" are **infected host cells** in a grid of traps, not free pathogens; first-click-safe seeding, flood-fill, flagging, chording, plus a non-invasive "scan" safe-reveal twist). Microwell is the smaller reference for the contract: `scenes/` holds Boot/Menu/End plus the split `Game` scene, its `ui.js`/`audio.js` are thin skins over `src/games/shared/`, and all tuning/persistence lives in `td/defs.js`. Both games' scenes zoom the camera by `RES` (`viewport(scene)`) so gameplay stays in logical pixels at HiDPI.
