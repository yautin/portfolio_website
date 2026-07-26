import { RES } from "./td/defs";

// Microwell's UI kit — pill buttons, rounded-rect helpers, a brand-gradient title
// and an ambient background. Kept local to the game (a near-twin of Immune
// Defense's ui.js) so the two games can diverge freely; a future
// src/games/shared/ could host the common core.

const FONT = "'Mona Sans', system-ui, sans-serif";

// Respected everywhere motion would otherwise play — set once at module load.
export const REDUCED =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// HiDPI: the canvas backing store is RES× the logical size; zooming the main
// camera by RES makes the scene compose in logical pixels while rendering at
// native density. Call first in create(); returns the logical view size.
export function viewport(scene) {
  const W = scene.scale.width / RES;
  const H = scene.scale.height / RES;
  const cam = scene.cameras.main;
  cam.setZoom(RES);
  cam.centerOn(W / 2, H / 2);
  return { W, H };
}

export const UI = {
  cyan: 0x4cc9f0,
  cyanDeep: 0x2f9bd0,
  violet: 0x9d4edd,
  violetDeep: 0x6d28b8,
  accent: 0x9d4edd,
  accentText: "#f3ecff",
  ink: 0xe8ebf2,
  inkCss: "#e8ebf2",
  sub: "#c4cdda",
  dim: "#8b97ad",
  panel: 0x1b2130,
  panelDeep: 0x141922,
  line: 0x2b3345,
  lineDim: 0x232a36,
  danger: 0xf25f5c,
  dangerCss: "#f25f5c",
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

// Draw a rounded rect (fill/gradient + optional stroke) into a Graphics,
// centred on (0,0) so it drops straight into a Container.
export function roundRectGraphics(scene, w, h, r, opts = {}) {
  const g = scene.add.graphics();
  redrawRoundRect(g, w, h, r, opts);
  return g;
}

export function redrawRoundRect(g, w, h, r, opts = {}) {
  const { fill, fillAlpha = 1, gradient, stroke, strokeAlpha = 1, strokeW = 2, highlight } = opts;
  g.clear();
  if (gradient) {
    const [tl, tr, bl, br] = gradient;
    g.fillGradientStyle(tl, tr, bl, br, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
  } else if (fill !== undefined) {
    g.fillStyle(fill, fillAlpha);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
  }
  if (stroke !== undefined) {
    g.lineStyle(strokeW, stroke, strokeAlpha);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
  }
  if (highlight) {
    g.lineStyle(1, 0xffffff, 0.12);
    g.beginPath();
    g.moveTo(-w / 2 + r, -h / 2 + 1);
    g.lineTo(w / 2 - r, -h / 2 + 1);
    g.strokePath();
  }
}

// A pill button. Primary = cyan→violet brand gradient; secondary = ghost.
export function makeButton(scene, x, y, label, { variant = "primary", onClick, minWidth = 0, fontSize = 16 } = {}) {
  const padX = 18;
  const h = 34;
  const txt = scene.add
    .text(0, 0, label, { resolution: RES, fontFamily: FONT, fontSize: `${fontSize}px`, fontStyle: "700" })
    .setOrigin(0.5);
  const w = Math.max(minWidth, Math.ceil(txt.width) + padX * 2);

  const g = scene.add.graphics();
  const hit = scene.add.rectangle(0, 0, w, h, 0x000000, 0).setInteractive({ useHandCursor: true });
  const c = scene.add.container(x, y, [g, txt, hit]);
  c.setSize(w, h);

  const paint = (state) => {
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
  paint("idle");

  hit.on("pointerover", () => paint("hover"));
  hit.on("pointerout", () => paint("idle"));
  hit.on("pointerdown", () => paint("press"));
  hit.on("pointerup", () => { paint("hover"); onClick && onClick(); });

  c.setLabel = (s) => { txt.setText(s); return c; };
  c.setButtonEnabled = (on) => { hit.input && (hit.input.enabled = on); c.setAlpha(on ? 1 : 0.45); return c; };
  return c;
}

// A round icon button (single glyph), e.g. ☰ menu / 🔊 mute.
export function makeIconButton(scene, x, y, glyph, { onClick, size = 30 } = {}) {
  const g = scene.add.graphics();
  const txt = scene.add.text(0, 0, glyph, { resolution: RES, fontFamily: FONT, fontSize: "18px", fontStyle: "700" }).setOrigin(0.5);
  const hit = scene.add.rectangle(0, 0, size, size, 0x000000, 0).setInteractive({ useHandCursor: true });
  const c = scene.add.container(x, y, [g, txt, hit]);
  c.setSize(size, size);

  const paint = (state) => {
    redrawRoundRect(g, size, size, 8, {
      fill: 0x8ba0c0, fillAlpha: state === "idle" ? 0 : 0.16,
      stroke: state === "idle" ? UI.line : 0x4a5b7a, strokeW: 1.5,
    });
    txt.setColor(state === "idle" ? UI.dim : UI.inkCss);
  };
  paint("idle");

  hit.on("pointerover", () => paint("hover"));
  hit.on("pointerout", () => paint("idle"));
  hit.on("pointerup", () => onClick && onClick());
  c.setGlyph = (s) => { txt.setText(s); return c; };
  return c;
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
