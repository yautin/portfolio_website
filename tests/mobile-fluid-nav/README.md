# Mobile Fluid Nav

Render the default export from `src/components/nav/MobileFluidNav.jsx` as a direct child of the fixed `header.navbar`, alongside **desktop-only** markup. Pass `current` as the active section ID without `#`. Import `src/styles/components/nav-mobile-fluid.css` after the base navbar stylesheet. The closed pill contains only Menu and Contact; the expanded panel contains the section links from `navLinks`. Identity remains on the desktop navbar, not in this component.

**Reference:** `https://framer.com/m/Fluid-Pill-Nav-Complete-C32l2t.js@ut9Wcl3vHU4i6qPd1u5z` and `https://fluid-pill-nav.framer.website/`. The pinned export uses Framer layout, variant and link providers, Framer Motion and three HTTPS submodules. None ship with this port.

The opening goes Base → Bridge → Expand. For the first 300 ms the compact Menu rail travels away from a 24 × 24 seed; its contents do not swap at tap time. Expand reveals the section labels through the widening superellipse, with a detached Close disc above and the original rail shrinking to Contact below. Closing targets Base directly, without replaying Bridge. The material is described in `tools/nav-desktop-glass/README.md`. Each control responds to hover, keyboard focus and touch press; the section arrows move inside stationary hit targets. Reduced motion keeps the feedback without travel.

**Responsive width:** the closed rail fills the viewport between 1rem side gutters (or larger safe-area insets), up to 40rem. Its central area opens Menu. The expanded list retains its independent width and the detached Contact pill stays 5rem wide.

**Visual checks:** `proof/comparison.webp` documents the original reference choreography. Local homepage captures: `context/nav-reference-study/proof/responsive-rail/390.png` (responsive closed rail) and `context/nav-reference-study/proof/mobile-controls/hover.png` (hovered section row).

**Repeatable check:** from the repository root run `node tests/mobile-fluid-nav/choreography.mjs`. It launches installed Chrome and a temporary Vite server on an OS-assigned port. Covers motion geometry, direct collapse, Bridge cancellation, keyboard and pointer dismissal, current-location semantics, anchors, 320 px hit-testing, reduced motion, genuine touch swipe vs short-panel scrolling, and desktop breakpoint reset.
