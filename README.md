# Marco Ng — Portfolio

A personal portfolio for **Marco Ng**, a medical writer based in Hong Kong who specialises in promotional and educational content for healthcare professionals (HCPs).

The site is a single-page React application with an interactive 3D hero, scroll-driven animations, and purpose-built sections that reframe a traditional developer portfolio around medical communications. Motion is used deliberately and respects the visitor's reduced-motion preference throughout. Tucked in the footer is a **"For Fun" games hub** with two Phaser mini-games — **Immune Defense** (a browser tower-defense) and **Microwell** (a live-cell microfluidics minesweeper) — each lazy-loaded so it never affects the site's initial load.

Live site: https://marco-ng.com/

## Highlights

- **Interactive 3D hero** — a DNA-helix scene (React Three Fiber) with a rotating headline and animated stat counters.
- **Purpose-built content sections** with a consistent type scale and alternating background bands for a clear reading rhythm.
- **Two mini-games** behind the footer's "For Fun" button (see below): **Immune Defense**, a 15-level PvZ-style lane tower defense, and **Microwell**, a single-cell-microfluidics twist on minesweeper.
- **Accessible & responsive** — honours `prefers-reduced-motion`, keyboard-focusable, anchor-aware navigation, and mobile-friendly layouts.

## Sections

- **Hero** — a 3D DNA-helix scene with a rotating headline and an animated stats counter.
- **Work** — case-study cards for selected deliverables (detail aids, reminder cards), colour-coded by therapeutic area.
- **Drug Product Experience** — an infinite marquee of products worked on, grouped by therapeutic area.
- **Data Distilled** — trial readouts condensed into a single clinician-facing takeaway, with count-up figures, arm-comparison bars, and referenced footnotes.
- **Kinesin divider** — a decorative kinesin-walking-a-microtubule animation (poke it for a reaction).
- **Contact** — a working contact form (Web3Forms) plus direct contact details, and the footer's game launcher.

## "For Fun" games hub (`/fun`)

The footer's **🎮 For Fun** button links to a dedicated **`/fun`** page — a games hub listing everything playable (two games: **Immune Defense** and **Microwell**). Visitors can play in-browser with progress saved locally; if accounts are configured, they can **sign in to sync progress across devices** and **reset progress per game**. A discreet **"Buy me a coffee"** button lives here (hidden until a Stripe Payment Link is set).

- **Optional accounts** — email + password and Google sign-in via **Supabase Auth**. Cloud saves live in a single `game_saves` table protected by row-level security (each user only ever touches their own rows).
- **Graceful degradation** — with no Supabase env vars configured, `/fun` still works fully: games play, progress persists in `localStorage`, and Supabase is **tree-shaken out of the build entirely** (zero added weight). Configure the env vars and Supabase moves into the code-split `/fun` chunk — never the portfolio landing bundle.
- **Zero risk to gameplay** — each game keeps reading/writing its own `localStorage` keys unchanged; a thin sync layer (`src/fun/saveSync.js`) snapshots them to the cloud on change (debounced) and hydrates them on sign-in, driven per-game by a `save` descriptor in the registry.
- **Optional Web3 reward easter egg** — when configured, beating a level lets signed-in players connect MetaMask and claim a `$CULT` ERC-20 reward on Base Sepolia. It's off (and zero-bundle-cost) unless the env vars are set; the wagmi/viem stack is a separate lazy chunk fetched only when a reward is actually offered. Minting is admin-only + server-side (a Supabase edge function using viem) with a per-level, per-account emission cap and an on-chain supply cap. Full write-up + setup: [docs/web3-setup.md](docs/web3-setup.md).

See [Optional: accounts, cloud saves & the coffee button](#optional-accounts-cloud-saves--the-coffee-button) for setup.

## Immune Defense (the game)

Immune Defense is a self-contained tower-defense game built with **Phaser 3**, themed around the immune system.

- **Campaign** — 15 levels; lanes grow from 1 → 5 and a new defender unlocks after each level (up to 7).
- **7 defenders** (a Plants-vs-Zombies-style role triangle re-skinned as immune cells): Antibody, Mitochondrion, Macrophage, Complement Mine, Interferon, Mast Cell, and Neutrophil — each with distinct cost, HP, and behaviour, plus in-run upgrades.
- **6 pathogens** with escalating abilities (armoured, fast-vaulting, airborne, swarming) and **boss encounters** on levels 5/10/15.
- **Meta & QoL** — a 20-second planning phase, star ratings and best scores, saved progress and level select (via `localStorage`), an Easy/Normal difficulty toggle, mute, and a fullscreen mode.
- **Presentation** — hand-authored SVG art, synthesised Web-Audio SFX (no audio files), HiDPI rendering, device-responsive sizing (immersive full-screen on small screens with a rotate-to-landscape prompt in portrait).
- **Performance** — Phaser (~1.2 MB) is loaded through a dynamic `import()`, so it is **code-split into its own chunk** and only fetched when a visitor opens the game; it never bloats the main bundle.

## Microwell (the game)

Microwell is a biology-themed **minesweeper** built with **Phaser 3**, framed as a **live-cell microfluidic assay (Lab-on-a-Chip)**: the board is a grid of microwell traps each holding a live cell, hidden **infected cells** (hijacked and fragile) replace mines, and the goal is to probe every healthy cell without rupturing an infected one. Under the hood it is true minesweeper (first-click-safe seeding, flood-fill reveal, 1–8 adjacency counts, flagging, chording). The live-cell framing makes the mechanics airtight — you actively *probe* cells (microinjection / electroporation / optical tweezers), and a ruptured cell's payload rides the microfluidic channels to its neighbours.

- **Reframed mechanics** — a reveal is a physical **probe**; the number is the **viral load** from infected neighbours, colour-graded cyan→teal→violet→amber→red; flags are **antibody (IgG) markers**; a win is **Assay Complete**, a loss is **Contamination** (a fragile infected cell ruptures and its payload spreads through the flow).
- **Signature twist — non-invasive scans** — each board grants a few 🔬 scans (3 Easy / 2 Normal / 2 Hard). Arm one and click any trap to image it **safely** (non-destructively): a healthy cell reveals (flooding if empty), while an infected cell is **auto-flagged with an antibody** instead of rupturing. A limited strategic lifeline.
- **Three difficulties** — Easy 9×9 / 10 infected cells, Normal 12×12 / 26, Hard 20×16 / 58 — with per-difficulty best times and a total "assays cleared" tally saved to `localStorage`.
- **Presentation** — brand cyan→violet gradient titles, a lab-on-a-chip menu motif, live-cell wells (cyan/teal viability glow) linked by faint microfluidic channels, synthesised Web-Audio SFX, and juice (a staggered "healing wave" on flood, an assay-complete pulse on win, a contamination ripple + shake on loss) — all gated on `prefers-reduced-motion`.

Balance and persistence live in **`src/games/microwell/td/defs.js`** (difficulties, palette, save helpers).

Each game is a self-contained, framework-agnostic folder under `src/games/<id>/` (`immune-defense/`, `microwell/`), consumed exclusively through its facade (`src/games/<id>/index.js`) — never its internals. The facade's `loadFactory` keeps Phaser behind a dynamic `import()` in its own lazy chunk. One generic React shell (`src/fun/GameShell.jsx`) renders any game from the registry: **adding a game = a folder in `src/games/`, sprites in `public/games/<id>/`, and one entry in `src/fun/games.js`** (whose `progress()` returns a `{ label }` the hub card shows verbatim) — hub card, cloud saves, modal chrome, and code-splitting all come free.

## Easter eggs

- **Tab title** — switch away from the tab and the browser title changes to a cheeky line ("👀 The kinesin misses you"), restored on return.
- **Kinesin divider** — clicking the walking kinesin triggers a speech-bubble complaint.
- **The game** — described above.

## Tech stack

- **React 19** + **Vite 8** — UI and build tooling.
- **Tailwind CSS v4** (via `@tailwindcss/vite`) — styling; the theme and component classes live entirely in `src/index.css` (there is no `tailwind.config.js`).
- **GSAP** (`@gsap/react`, `ScrollTrigger`) — entrance and scroll-driven animations.
- **React Three Fiber** (`@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`, `three`) — the 3D hero scene.
- **Phaser 3** — the two code-split mini-games ("Immune Defense" and "Microwell").
- **react-responsive** — device/orientation detection for the games' responsive shell.
- **React Router** — client-side routing (`/` portfolio, `/fun` games hub).
- **Supabase** (`@supabase/supabase-js`) — optional managed auth + Postgres for game accounts and cloud saves (lazy-loaded with `/fun`; omitted from the build when unconfigured).
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
  images/            Icons and section assets (SVG)
  games/             Per-game sprite folders (immune-defense/, microwell/)
  favicon.svg
src/
  components/        Reusable site UI and the hero 3D scene (HeroModels/)
  sections/          Full-width page sections (Hero, Work, DrugProducts,
                     DataDistilled, Contact)
  games/             One self-contained folder per game (framework-agnostic)
    immune-defense/
      index.js           public facade — the ONLY entry point for outside code
      factory.js         Phaser factory (createGame; entry for the lazy import)
      scenes/            Boot / Menu / Game / Interlude scenes
        game/              GameScene method modules, split by concern:
                           field, hud, toolbar, placement, pause, combat, fx
      td/                defs.js (all tuning data) + entities.js
      ui.js              shared canvas UI kit + HiDPI camera helper
      audio.js           synthesised Web-Audio SFX
    microwell/           live-cell microfluidics minesweeper (same contract)
      index.js  factory.js  audio.js  ui.js
      scenes/            Boot / Menu / Game / End scenes
      td/                defs.js (difficulties, palette, save helpers)
  fun/               The /fun games hub (code-split): FunPage, AuthCard,
                     GameShell (one generic React modal shell for any game),
                     the games registry (per-game card + facade wiring +
                     save descriptor), and the game-agnostic cloud save-sync
  lib/               supabase.js — null-safe Supabase client
  constants/         All site content/data in a single module
  index.css          Stylesheet entry point (ordered @imports; order = cascade)
  styles/            base / theme (tokens, dark+light) / utilities / animations
    components/        one stylesheet per page region (navbar, hero, work,
                       drugs, distill, contact, footer, fun, game, kinesin…)
  App.jsx            Portfolio page composition
  Root.jsx           Router (/ portfolio, /fun hub)
  main.jsx           App entry point
supabase/
  schema.sql         game_saves table + row-level-security policies
```

## Editing content

Nearly all site copy and data live in **`src/constants/index.js`**, so most updates are made there rather than in the components:

- `navLinks` — navigation items
- `words` / `counterItems` — hero rotating words and stats
- `workProjects` — Work case studies (title, therapeutic area, accent colour, tags)
- `drugProducts` / `drugAreaColors` — the drug marquee and its per-area colours
- `dataDistillExamples` — Data Distilled rows, including per-row `footnotes` and `citation`
- `contactEmail`, `contactLinks`, `web3formsKey` — contact details and form key
- `supportUrl` — Stripe Payment Link for the `/fun` "Buy me a coffee" button (empty = hidden)

Each game's balance and content live in its own `td/defs.js` — **`src/games/immune-defense/td/defs.js`** (defenders, pathogens, levels, difficulty) and **`src/games/microwell/td/defs.js`** (board sizes, infected-cell/scan counts, palette).

> **Note:** the trial figures in `dataDistillExamples` are illustrative placeholders and should be verified against the primary publications before publishing.

## Contact form

The contact form submits via [Web3Forms](https://web3forms.com). Set the access key as **`VITE_WEB3FORMS_KEY`** in `.env.local` and in Vercel → Environment Variables. If no key is configured, the form gracefully falls back to opening a pre-filled draft in the visitor's email client.

The key is unavoidably public (the browser posts it directly), but it lives in the environment rather than in source so it can be **rotated without a commit** — which matters, because a key committed to a public repo stays readable in git history forever. Two further mitigations are in place: restrict the key to your domain in the Web3Forms dashboard, and the form carries an off-screen `botcheck` honeypot that Web3Forms rejects server-side.

## Optional: accounts, cloud saves & the coffee button

The `/fun` hub works with no setup (local saves only). To enable **accounts + cross-device cloud saves**, provision a free [Supabase](https://supabase.com) project — the site stays a static deploy; Supabase is the managed backend.

1. **Create the project** — supabase.com → *New project*. From *Project Settings → API*, copy the **Project URL** and **anon public key**.
2. **Create the table** — *SQL Editor → New query*, paste the contents of [`supabase/schema.sql`](supabase/schema.sql), and run it. This creates the `game_saves` table with row-level security so each user can only read/write their own saves.
3. **Set env vars** — copy `.env.example` to `.env.local` and fill in:
   ```
   VITE_SUPABASE_URL=https://<your-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<your-anon-key>
   ```
   Add the same two variables in **Vercel → Project → Settings → Environment Variables** for production. (The anon key is safe to expose — RLS restricts every request to the signed-in user.)

   The full set of client env vars — all optional except the two above, and all documented in [`.env.example`](.env.example):

   | Variable | Purpose |
   |---|---|
   | `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | accounts + cloud saves |
   | `VITE_WEB3FORMS_KEY` | contact form (see [Contact form](#contact-form)) |
   | `VITE_REWARD_TOKEN_ADDRESS` | `$CULT` token address — enables the reward easter egg |
   | `VITE_REWARD_FUNCTIONS_URL` | override for the edge-function base URL; defaults to `${VITE_SUPABASE_URL}/functions/v1` |

   Vite inlines these at **build** time, so changing one in Vercel requires a redeploy, not just a restart.
4. **Redirect allow-list** — in *Supabase → Authentication → URL Configuration*, set **Site URL** to `https://marco-ng.com` and add both `http://localhost:5173/fun` and `https://marco-ng.com/fun` to the **Redirect URLs** allow-list. (These are the app's own post-auth destinations — distinct from Google's redirect URI in the next step.)

5. **Enable Google sign-in** (optional) — this trips people up because *two different* redirect settings are involved:
   - **Google Cloud Console** (*APIs & Services → Credentials →* your OAuth 2.0 Client): under **Authorized redirect URIs**, add exactly
     `https://<your-ref>.supabase.co/auth/v1/callback`
     This is the URI Google redirects to (Supabase's callback, **not** your `/fun` page) — omitting it is what causes `Error 400: redirect_uri_mismatch`. It must be an exact match; easiest to copy from Supabase's Google-provider page ("Callback URL").
   - **Supabase** (*Authentication → Providers → Google*): paste the **Client ID + secret** from that *same* OAuth client (a mismatch between the branded/edited client and the one Supabase uses is the #1 cause of lingering issues).
   - **Consent-screen wording** (*Google Cloud → OAuth consent screen*): the **App name** controls the "Sign in to continue to …" text and must be set on the *same project* as the OAuth client; publish the app (basic email/profile scopes need no verification).

Without any of this, the sign-in card shows a friendly "accounts unavailable" note and everything else still works.

### Stripe — payments & invoicing (hosted surfaces only)

This site is fully static, so all Stripe money-movement happens on **Stripe-hosted pages** — no API keys, no stripe-js, no server. **No secret key must ever enter this repo**; if custom in-site checkout is ever wanted, that is the moment to add a server/function layer — not before.

**"Buy me a coffee" (the `/fun` button):**

1. Stripe Dashboard (start in **test mode**) → *Product catalog → + Add product* — e.g. "Coffee ☕", pricing **"Customers choose what to pay"**, currency HKD.
2. *Payment Links → + New* from that product; enable the payment methods you want (cards, Alipay, etc.); copy the `https://buy.stripe.com/…` URL.
3. Paste it into `supportUrl` in [`src/constants/index.js`](src/constants/index.js) — the ☕ button on `/fun` appears automatically (hidden while the URL is empty).
4. Verify with test card `4242 4242 4242 4242`, then recreate/switch the link in live mode and swap the URL.

**Invoicing clients (no website involvement):** invoices are a Stripe Dashboard workflow — *Customers → + Add* (client + billing email), then *Invoices → + Create* (line items such as "Medical writing — detail aid, 8-panel", payment terms, memo) → **Send**. Stripe emails a hosted invoice page that accepts card/bank payment, tracks paid/overdue status, and sends reminders. Set your logo and brand colour under *Settings → Branding* so invoices match the site. A per-paid-invoice fee applies (see [stripe.com/pricing](https://stripe.com/pricing)).

## Accessibility & performance

- Animations (scroll reveals, the drug marquee, count-ups, and the kinesin animation) are disabled or reduced when the visitor has **`prefers-reduced-motion`** enabled, and anchored navigation accounts for the fixed navbar so section headings are never obscured.
- The Phaser game **and** the `/fun` hub (with Supabase) are each **lazy-loaded on demand**, keeping both out of the portfolio's initial bundle so the landing page stays fast.
- SPA routing uses [`vercel.json`](vercel.json) rewrites so deep links like `/fun` resolve to the app on refresh.

## Security

- [`vercel.json`](vercel.json) ships hardened response headers: a **Content-Security-Policy** (self-only scripts + the hashed inline theme script; Supabase/Web3Forms allow-listed for `connect-src`; `frame-ancestors 'none'`), `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and a minimal `Permissions-Policy`.
- **CSP hash maintenance:** if the inline theme script in [`index.html`](index.html) is ever edited, recompute its hash and update the CSP:
  ```bash
  npm run build && node -e "const c=require('crypto'),h=require('fs').readFileSync('dist/index.html','utf8');const m=[...h.matchAll(/<script(?![^>]*src=)([^>]*)>([\s\S]*?)<\/script>/g)].filter(x=>!/ld\+json/.test(x[1]));m.forEach(x=>console.log('sha256-'+c.createHash('sha256').update(x[2]).digest('base64')))"
  ```
- No secret keys exist anywhere in the repo: Supabase uses the public anon key gated by **row-level security**, Stripe runs entirely on hosted Payment Links / dashboard invoicing, and Web3Forms' access key is public by design. `.env*` files are gitignored (`.env.example` excepted).
- Headers only apply on Vercel — `npm run preview` serves without them, so verify the CSP on a preview deployment after significant changes.

## Deployment

The production build in `dist/` is a fully static bundle and can be deployed to any static host (e.g. Vercel, Netlify, or GitHub Pages):

```bash
npm run build
```

## License

This project is for personal portfolio use. All rights reserved.
