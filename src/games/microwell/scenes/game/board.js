import { UI } from "../../ui";
import { HUD_H, MARGIN } from "./constants";

// Board geometry (sizing, cell ↔ pixel mapping) and the well/channel/hover
// rendering. Mixed into GameScene.prototype — `this` is the scene.

export const boardMethods = {
  // ---- layout ---------------------------------------------------------
  computeLayout() {
    const availW = this.W - MARGIN * 2;
    const availH = this.H - HUD_H - MARGIN;
    let cs = Math.floor(Math.min(availW / this.cols, availH / this.rows));
    cs = Math.max(16, Math.min(cs, 56));
    this.cs = cs;
    const boardW = cs * this.cols, boardH = cs * this.rows;
    this.boardX = Math.round((this.W - boardW) / 2);
    this.boardY = Math.round(HUD_H + (availH - boardH) / 2);
  },

  center(r, c) {
    return { x: this.boardX + c * this.cs + this.cs / 2, y: this.boardY + r * this.cs + this.cs / 2 };
  },

  inBounds(r, c) { return r >= 0 && r < this.rows && c >= 0 && c < this.cols; },

  cellAt(wx, wy) {
    if (wy < HUD_H) return null; // taps on the fixed HUD strip never hit the board
    // invert the board container's pan/zoom transform (identity at default)
    const lx = (wx - this.board.x) / this.board.scaleX;
    const ly = (wy - this.board.y) / this.board.scaleY;
    const c = Math.floor((lx - this.boardX) / this.cs);
    const r = Math.floor((ly - this.boardY) / this.cs);
    return this.inBounds(r, c) ? { r, c } : null;
  },

  // Add a display object to the pan/zoom board layer (so it moves with the wells).
  spawn(obj) { this.board.add(obj); return obj; },

  // ---- rendering ------------------------------------------------------
  drawBoard() {
    const g = this.boardGfx;
    const cs = this.cs, inset = Math.max(1, cs * 0.08), rad = Math.min(9, cs * 0.2);
    g.clear();
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.cells[r][c];
        const x = this.boardX + c * cs + inset, y = this.boardY + r * cs + inset, s = cs - inset * 2;
        const mx = x + s / 2, my = y + s / 2;
        if (cell.revealed && cell.pathogen) {
          // infected host cell (only surfaces on loss / auto-flag reveal)
          g.fillStyle(0x3a1622, 1); g.fillRoundedRect(x, y, s, s, rad);
          g.lineStyle(1.5, UI.danger, 1); g.strokeRoundedRect(x, y, s, s, rad);
        } else if (cell.revealed) {
          // resolved healthy tissue: clean membrane; blanks show organized morphology
          g.fillStyle(0x121722, 1); g.fillRoundedRect(x, y, s, s, rad);
          g.lineStyle(1.5, 0x1e2634, 1); g.strokeRoundedRect(x, y, s, s, rad);
          if (cell.count === 0) {
            g.lineStyle(1, UI.heal, 0.16); g.strokeCircle(mx, my, s * 0.34);
            g.fillStyle(0x2b3a4a, 0.85); g.fillCircle(mx, my, s * 0.15);          // nucleus
            g.fillStyle(0x3d5470, 0.9); g.fillCircle(mx + s * 0.05, my - s * 0.04, s * 0.06); // nucleolus
          }
        } else {
          // hidden = a live cell held in a trap: cyan/teal viability glow + nucleus
          g.fillStyle(UI.wellFill, 1); g.fillRoundedRect(x, y, s, s, rad);
          g.fillStyle(UI.liveGlow, 0.07); g.fillCircle(mx, my, s * 0.34);
          g.fillStyle(UI.liveGlow, 0.09); g.fillCircle(mx, my, s * 0.24);
          g.fillStyle(UI.liveGlow, 0.12); g.fillCircle(mx, my, s * 0.15);
          g.lineStyle(1.5, cell.flagged ? UI.violet : UI.wellRim, cell.flagged ? 0.9 : 1);
          g.strokeRoundedRect(x, y, s, s, rad);
          g.fillStyle(UI.liveNucleus, 0.9); g.fillCircle(mx, my, s * 0.09);
        }
      }
    }
  },

  // Static microfluidic channel lattice behind the wells — thin cyan links
  // between adjacent traps (visible in the gaps) + inlet/outlet ports at the
  // edges. This is the path a ruptured cell's payload takes to its neighbours.
  drawChannels() {
    const g = this.chanGfx; g.clear();
    const cs = this.cs, x0 = this.boardX, y0 = this.boardY;
    const lw = Math.max(1.5, cs * 0.08);
    const right = x0 + (this.cols - 1) * cs + cs / 2;
    const bottom = y0 + (this.rows - 1) * cs + cs / 2;
    g.lineStyle(lw, UI.channel, 0.11);
    for (let r = 0; r < this.rows; r++) { const y = y0 + r * cs + cs / 2; g.lineBetween(x0 + cs / 2, y, right, y); }
    for (let c = 0; c < this.cols; c++) { const x = x0 + c * cs + cs / 2; g.lineBetween(x, y0 + cs / 2, x, bottom); }
    g.lineStyle(lw, UI.channel, 0.16); // inlet/outlet ports
    for (let r = 0; r < this.rows; r++) {
      const y = y0 + r * cs + cs / 2;
      g.lineBetween(x0 - cs * 0.55, y, x0 + cs / 2, y);
      g.lineBetween(right, y, x0 + this.cols * cs + cs * 0.05, y);
    }
  },

  drawHover(cell) {
    const g = this.hoverGfx; g.clear();
    if (!cell || this.ended) return;
    const o = this.cells[cell.r][cell.c];
    if (o.revealed && !(o.count > 0)) return; // nothing to do on cleared blanks
    const cs = this.cs, inset = Math.max(1, cs * 0.08), rad = Math.min(9, cs * 0.2);
    const x = this.boardX + cell.c * cs + inset, y = this.boardY + cell.r * cs + inset, s = cs - inset * 2;
    const color = this.scanArmed ? UI.violet : UI.cyan;
    g.fillStyle(color, 0.1); g.fillRoundedRect(x, y, s, s, rad);
    g.lineStyle(2, color, 0.9); g.strokeRoundedRect(x, y, s, s, rad);
  },
};
