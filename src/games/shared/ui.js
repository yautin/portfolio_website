import { RES } from "./res";

// Chrome primitives shared by the games' Phaser scenes.
//
// What lives here is the part that was byte-identical between the two games'
// ui.js files: the HiDPI viewport helper, the rounded-rect drawing, the button
// *mechanics* (text + graphics + hit rect in a container, hover/press/idle
// states, click wiring) and the neutral half of the palette.
//
// What does NOT live here is how a button LOOKS. Each game keeps its own visual
// identity by passing a `paint(state)` strategy — that's the only thing the two
// makeButton implementations ever really disagreed about, so injecting it lets
// them share the mechanics without flattening the games into one style.

export const FONT = "'Mona Sans', system-ui, sans-serif";

// Respected everywhere motion would otherwise play — read once at module load.
export const REDUCED =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// Neutral tokens every game shares. Games spread this into their own UI object
// and add/override their accents.
export const BASE_UI = {
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
};

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

// Draw a rounded rect (flat fill or 4-corner gradient, + optional stroke) into a
// Graphics, centred on (0,0) so it drops straight into a Container.
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
  // faint top-edge highlight for a little sheen
  if (highlight) {
    g.lineStyle(1, 0xffffff, 0.12);
    g.beginPath();
    g.moveTo(-w / 2 + r, -h / 2 + 1);
    g.lineTo(w / 2 - r, -h / 2 + 1);
    g.strokePath();
  }
}

/**
 * A pill button. The caller supplies the look via `paint`; everything else —
 * sizing, the invisible hit Rectangle (Shapes hit-test reliably, unlike a bare
 * Container whose hit area is offset by its display origin), the state machine
 * and the click wiring — is shared.
 *
 * @param {(ctx: { g: object, txt: object, w: number, h: number, state: "idle"|"hover"|"press" }) => void} opts.paint
 */
export function makeButton(scene, x, y, label, { paint, onClick, minWidth = 0, fontSize = 16 } = {}) {
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

  const repaint = (state) => paint({ g, txt, w, h, state });
  repaint("idle");

  hit.on("pointerover", () => repaint("hover"));
  hit.on("pointerout", () => repaint("idle"));
  hit.on("pointerdown", () => repaint("press"));
  hit.on("pointerup", () => { repaint("hover"); onClick && onClick(); });

  c.setLabel = (s) => { txt.setText(s); return c; };
  c.setButtonEnabled = (on) => { if (hit.input) hit.input.enabled = on; c.setAlpha(on ? 1 : 0.45); return c; };
  return c;
}

// A round icon button (single glyph), e.g. the ☰ menu or 🔊 mute. Both games
// draw these identically, so the look is shared too — only the palette differs,
// and that comes in via `ui`.
export function makeIconButton(scene, x, y, glyph, { onClick, size = 30, ui = BASE_UI } = {}) {
  const g = scene.add.graphics();
  const txt = scene.add.text(0, 0, glyph, { resolution: RES, fontFamily: FONT, fontSize: "18px", fontStyle: "700" }).setOrigin(0.5);
  const hit = scene.add.rectangle(0, 0, size, size, 0x000000, 0).setInteractive({ useHandCursor: true });
  const c = scene.add.container(x, y, [g, txt, hit]);
  c.setSize(size, size);

  const paint = (state) => {
    redrawRoundRect(g, size, size, 8, {
      fill: 0x8ba0c0, fillAlpha: state === "idle" ? 0 : 0.16,
      stroke: state === "idle" ? ui.line : 0x4a5b7a, strokeW: 1.5,
    });
    txt.setColor(state === "idle" ? ui.dim : ui.inkCss);
  };
  paint("idle");

  hit.on("pointerover", () => paint("hover"));
  hit.on("pointerout", () => paint("idle"));
  hit.on("pointerup", () => onClick && onClick());
  c.setGlyph = (s) => { txt.setText(s); return c; };
  return c;
}
