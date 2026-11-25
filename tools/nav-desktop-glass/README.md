# Refractive browser navigation, with Framer interaction details

**Credit:** Matthias Ölschlegel — *Liquid Glass Navbar*, *Nav Link*, *Glass CTA*. [Original desktop preview](https://liquid-glass-navbar.framer.website/). The provided [Framer pin](https://framer.com/m/Liquid-Glass-Navbar-6gh01a.js@gYdRmxtcAJcLe5MMDVHE) re-exports the generated parent. No original module, external font, screenshot, or Framer runtime is served by the app.

## Current optical material

The [ECC liquid-glass-design skill](https://github.com/affaan-m/ECC/blob/main/skills/liquid-glass-design/SKILL.md) describes Apple's native SwiftUI, UIKit and WidgetKit APIs. It is design guidance here, not an installed dependency. The website’s material is its own implementation: the rounded edge offsets the actual composited page, the flat interior transmits it, and the text is painted afterward. The unchanged Framer gem and CTA are accents, not the glass itself.

`GlassOptics.jsx` defines four SVG lens profiles. `bake-lenses.mjs` generates compact, local direction maps; there is no screenshot of the hero, duplicate video, per-frame JavaScript sampling, or external request. Chromium gets the displacement filter; WebKit and other unverified engines use translucent frost. Reduced transparency and forced colors get solid surfaces. The shared header must not itself filter the backdrop or it prevents the refracting children from sampling the page.

## Parent integration

`src/components/nav/DesktopGlass.jsx` is a default-exported optical wrapper, not a second navbar. `src/index.css` imports the two navbar material styles after the shared layout rules. The desktop row and the mobile disclosure are siblings in the positioned `.navbar`:

```jsx
import DesktopGlass from './nav/DesktopGlass.jsx'

<header className="navbar" {...headerProps}>
  <GlassOptics />
  <DesktopGlass>
    <div className="nav-row">{/* name, DesktopLinks, Contact */}</div>
  </DesktopGlass>
  <MobileFluidNav current={current} />
</header>
```

`.nav-name`, `.nav-sections`, `.nav-lens` and `.nav-contact > span` are the styling hooks. Keep the Contact label in that single stable span. The parent manages destinations, section observation and lens measurements. Below 52rem the desktop wrapper is hidden and installs no animation listeners; `MobileFluidNav` owns the disclosure.

## Source attribution and original port

- The root bevel, inset silver face, gem, nav-link and dark CTA surfaces were extracted as source data. The original's opaque rim and face are preserved in the extraction record, not rendered. They were replaced with the transmitted material above.
- The 70 × 90px, 20° light strip travels across the 36px CTA, from `left:-70px` to `right:-70px`, behind the lettering. Its opacity and position run together over 800ms using the original cubic-bezier. Exit reverses from the current values. GSAP uses the existing site runtime; there is no animation loop at rest. The link/CTA spring uses the source's 350ms / .2 bounce settings. The normalized spring curve was sampled from Motion's `spring({duration:350,bounce:.2,keyframes:[0,1]})` at 10ms intervals (`motion-dom@12.23.12`, development scratch only).
- Intentional changes: site names and destinations, self-hosted Mona Sans, darker resting text, 44px hit targets around the original 34/36px faces, host's active-section lens, visible keyboard focus, no sheen travel with reduced motion, and system colors in forced-colors mode. The width and top inset belong to the portfolio host. No new tap/press scaling: the pin's .9 scale belongs to its phone toggle only.
- **Why not directly mount the whole export?** It has no link slots or section destination props, only a logo-name/variant interface, and hard-codes every outbound destination. It imports two HTTPS modules, Framer's generated component runtime and remote Inter font records. The npm `framer@3.0.4` package advertises editor types, not that generated runtime. Even a Framer-compatible bundler would also need a modified source component exposing link slots or rewriting the destinations. Neither runtime fetching nor an iframe fits the production CSP. No package/lockfile changes, rehosting or CSP exceptions are required for this port.

## Verify

From the repository root, `node tools/nav-desktop-glass/check.mjs` builds an ephemeral Vite production page with the integrated portfolio navbar and the real playing `Hero`. It serves only on loopback on a dynamic port with the configured production CSP. It doesn't replace the app entrypoint or run the shared Playwright config. Chrome must be installed (`PLAYWRIGHT_CHANNEL` can override the channel).

Set `GLASS_PROOF_DIR=/absolute/local/directory` to retain `hero.png` and `sweep.png`; these are not public assets. The check swaps painted colours and translates stripes *behind* the same desktop/mobile control. It disables only displacement to compare curved and flat images: the edge must change, while the core stays registered. It also checks a white backdrop for contrast and retains interaction, sizing, local-only and CSP tests. Matching the old 19 opaque silver samples would now be a regression.

For source verification, download these three pinned files **outside** the site, then compare against the bundled material. `extract.mjs` checks SHA-256 first and parses literals without executing the downloaded JavaScript. The output must compare byte-for-byte.

```sh
# Acquisition is developer-only. Use an empty scratch directory.
: "${scratch:?Set scratch to a private, empty directory first}"
curl -fLsS https://framerusercontent.com/modules/OT1EcGfX5pRP3qQx4Toh/gYdRmxtcAJcLe5MMDVHE/YPlENOCxr.js -o "$scratch/nav.js"
curl -fLsS https://framerusercontent.com/modules/LYvjXcLqfpQklKfiZssw/cnM9iq4oZH6T2UqzO4Q4/OiX9Y1TLb.js -o "$scratch/link.js"
curl -fLsS https://framerusercontent.com/modules/8qABoeawsdwsA8TL3D2n/WAwmRNY42LFgyUxriXEs/FFrkgzskp.js -o "$scratch/cta.js"
node tools/nav-desktop-glass/extract.mjs "$scratch/nav.js" "$scratch/link.js" "$scratch/cta.js" > "$scratch/material.json"
cmp "$scratch/material.json" src/components/nav/desktopGlassMaterial.json
```
