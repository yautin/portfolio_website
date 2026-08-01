import {
  BASE_UI,
  makeButton as makeSharedButton,
  makeIconButton as makeSharedIconButton,
  redrawRoundRect,
} from "../shared/ui";

// Immune Defense's UI skin. The mechanics (sizing, hit-testing, hover/press
// state, HiDPI viewport, rounded-rect drawing) live in ../shared/ui — this file
// only says what the game LOOKS like, and re-exports the shared surface so
// scenes keep importing everything from "../ui".
export { viewport, roundRectGraphics, redrawRoundRect, REDUCED, FONT } from "../shared/ui";

export const UI = {
  ...BASE_UI,
  accent: 0x4cc9f0,
  accentDeep: 0x2f9bd0,
  accentText: "#eafaff",
};

// Solid cyan primary / ghost secondary.
const paintFor = (variant) => ({ g, txt, w, h, state }) => {
  if (variant === "primary") {
    const fill = state === "hover" ? UI.accent : state === "press" ? 0x2585b4 : UI.accentDeep;
    redrawRoundRect(g, w, h, 9, { fill, stroke: UI.accent, strokeAlpha: 0.6, strokeW: 1.5, highlight: true });
    txt.setColor(UI.accentText);
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
