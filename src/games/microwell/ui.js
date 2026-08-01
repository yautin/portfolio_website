import { RES } from "./td/defs";
import {
  BASE_UI,
  FONT,
  REDUCED,
  makeButton as makeSharedButton,
  makeIconButton as makeSharedIconButton,
  redrawRoundRect,
} from "../shared/ui";

// Microwell's UI skin. The mechanics (sizing, hit-testing, hover/press state,
// HiDPI viewport, rounded-rect drawing) live in ../shared/ui — this file holds
// what's specific to Microwell: the brand-gradient buttons and title, the
// lab-on-a-chip palette, and the ambient background. Shared pieces are
// re-exported so scenes keep importing everything from "../ui".
export { viewport, roundRectGraphics, redrawRoundRect, REDUCED, FONT } from "../shared/ui";

export const UI = {
  ...BASE_UI,
  cyan: 0x4cc9f0,
  cyanDeep: 0x2f9bd0,
  violet: 0x9d4edd,
  violetDeep: 0x6d28b8,
  accent: 0x9d4edd,
  accentText: "#f3ecff",
  heal: 0x52d1a4,
  healCss: "#52d1a4",
  cyanCss: "#4cc9f0",
  violetCss: "#c79bff",
  // Live-cell / lab-on-a-chip accents: an untested trap holds a live cell that
  // glows with a viability dye (cyan-teal); wells sit on faint microfluidic
  // channels that carry a ruptured cell's payload to its neighbours.
  wellFill: 0x141b22,
  wellRim: 0x2b3a45,
  liveGlow: 0x2fb0c8,
  liveNucleus: 0x4a7d8a,
  channel: 0x3aa0c0,
};

// Primary = cyan→violet brand gradient; secondary = ghost.
const paintFor = (variant) => ({ g, txt, w, h, state }) => {
  if (variant === "primary") {
    // brand gradient, brightened on hover, dimmed on press
    const a = state === "hover" ? [0x5ad2f5, 0xad63e8] : state === "press" ? [0x2f9bd0, 0x6d28b8] : [0x4cc9f0, 0x9d4edd];
    redrawRoundRect(g, w, h, 9, { gradient: [a[0], a[1], a[0], a[1]], stroke: UI.violet, strokeAlpha: 0.5, strokeW: 1.5, highlight: true });
    txt.setColor("#ffffff");
  } else {
    const fillA = state === "hover" ? 0.14 : state === "press" ? 0.22 : 0;
    redrawRoundRect(g, w, h, 9, { fill: 0x8ba0c0, fillAlpha: fillA, stroke: state === "idle" ? UI.line : 0x4a5b7a, strokeW: 1.5 });
    txt.setColor(state === "idle" ? UI.sub : UI.inkCss);
  }
};

export function makeButton(scene, x, y, label, { variant = "primary", ...rest } = {}) {
  return makeSharedButton(scene, x, y, label, { ...rest, paint: paintFor(variant) });
}

export function makeIconButton(scene, x, y, glyph, opts = {}) {
  return makeSharedIconButton(scene, x, y, glyph, { ...opts, ui: UI });
}

// A title drawn with a horizontal cyan→violet gradient fill (the site brand
// gradient). Phaser scales the text context by `resolution`, so the gradient is
// built in logical text coordinates.
export function gradientText(scene, x, y, label, { fontSize = 34, from = "#4cc9f0", to = "#9d4edd", fontStyle = "800", letterSpacing = 0 } = {}) {
  const t = scene.add
    .text(x, y, label, { resolution: RES, fontFamily: FONT, fontSize: `${fontSize}px`, fontStyle, color: from })
    .setOrigin(0.5);
  if (letterSpacing && t.setLetterSpacing) t.setLetterSpacing(letterSpacing);
  const grad = t.context.createLinearGradient(0, 0, t.width || fontSize * label.length, 0);
  grad.addColorStop(0, from);
  grad.addColorStop(0.5, "#7bb8ef");
  grad.addColorStop(1, to);
  t.setFill(grad);
  return t;
}

// Ambient background: vertical gradient wash, two soft brand glow blobs, and a
// drifting speck layer. Returns the speck TileSprite (drift set up here unless
// reduced motion). Requires the "specks" texture (BootScene).
export function ambience(scene, W, H) {
  const bg = scene.add.graphics();
  bg.fillGradientStyle(0x171b26, 0x141824, 0x0f1116, 0x0c0e13, 1);
  bg.fillRect(0, 0, W, H);

  const glow = scene.add.graphics();
  glow.fillStyle(0x4cc9f0, 0.06); glow.fillCircle(W * 0.18, H * 0.22, Math.max(W, H) * 0.28);
  glow.fillStyle(0x9d4edd, 0.06); glow.fillCircle(W * 0.84, H * 0.78, Math.max(W, H) * 0.3);

  const specks = scene.add.tileSprite(0, 0, W, H, "specks").setOrigin(0, 0).setAlpha(0.5);
  if (!REDUCED) {
    scene.tweens.add({ targets: specks, tilePositionY: 256, duration: 26000, repeat: -1, ease: "Linear" });
    scene.tweens.add({ targets: specks, tilePositionX: 128, duration: 34000, repeat: -1, yoyo: true, ease: "Sine.inOut" });
  }
  return specks;
}
