// Shared UI kit for the game scenes: pill buttons, icon buttons and a
// rounded-rect helper, so every scene draws chrome the same way.

export const UI = {
  accent: 0x4cc9f0,
  accentDeep: 0x2f9bd0,
  accentText: "#eafaff",
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

// Draw a rounded rect (fill + optional stroke) into a Graphics, centred on
// (0,0) so it drops straight into a Container.
export function roundRectGraphics(scene, w, h, r, opts = {}) {
  const g = scene.add.graphics();
  redrawRoundRect(g, w, h, r, opts);
  return g;
}

export function redrawRoundRect(g, w, h, r, opts = {}) {
  const { fill, fillAlpha = 1, stroke, strokeAlpha = 1, strokeW = 2, highlight } = opts;
  g.clear();
  if (fill !== undefined) {
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

const FONT = "'Mona Sans', system-ui, sans-serif";

// A pill button. Returns the Container; state redraws happen on hover/press.
export function makeButton(scene, x, y, label, { variant = "primary", onClick, minWidth = 0, fontSize = 16 } = {}) {
  const padX = 18;
  const h = 34;
  const txt = scene.add
    .text(0, 0, label, { fontFamily: FONT, fontSize: `${fontSize}px`, fontStyle: "700" })
    .setOrigin(0.5);
  const w = Math.max(minWidth, Math.ceil(txt.width) + padX * 2);

  const g = scene.add.graphics();
  // invisible Rectangle handles input — Shapes hit-test reliably, unlike a
  // bare Container whose hit area is offset by its display origin.
  const hit = scene.add.rectangle(0, 0, w, h, 0x000000, 0).setInteractive({ useHandCursor: true });
  const c = scene.add.container(x, y, [g, txt, hit]);
  c.setSize(w, h);

  const paint = (state) => {
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
  paint("idle");

  hit.on("pointerover", () => paint("hover"));
  hit.on("pointerout", () => paint("idle"));
  hit.on("pointerdown", () => paint("press"));
  hit.on("pointerup", () => { paint("hover"); onClick && onClick(); });

  c.setLabel = (s) => { txt.setText(s); return c; };
  return c;
}

// A round icon button (single glyph), e.g. the ☰ menu.
export function makeIconButton(scene, x, y, glyph, { onClick, size = 30 } = {}) {
  const g = scene.add.graphics();
  const txt = scene.add.text(0, 0, glyph, { fontFamily: FONT, fontSize: "18px", fontStyle: "700" }).setOrigin(0.5);
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
  return c;
}
