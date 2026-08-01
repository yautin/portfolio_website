import Phaser from "phaser";
import { RES, NEIGHBORS, LOAD_COLORS } from "../../td/defs";
import { UI, REDUCED } from "../../ui";
import { sfx } from "../../audio";
import { ADD, FONT, PTEX, STAGGER } from "./constants";

// The rules of the assay: first-click-safe seeding, probing a trap, the
// non-invasive scan, flagging, chording, and the flood-fill reveal. Mixed into
// GameScene.prototype — `this` is the scene.

export const rulesMethods = {
  // ---- seeding (first-click-safe) ------------------------------------
  ensureSeeded(sr, sc) {
    if (this.seeded) return;
    const safe = new Set([`${sr},${sc}`]);
    for (const [dr, dc] of NEIGHBORS) { const r = sr + dr, c = sc + dc; if (this.inBounds(r, c)) safe.add(`${r},${c}`); }
    const spots = [];
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) if (!safe.has(`${r},${c}`)) spots.push([r, c]);
    Phaser.Utils.Array.Shuffle(spots);
    for (let i = 0; i < this.mines && i < spots.length; i++) {
      const [r, c] = spots[i];
      this.cells[r][c].pathogen = true;
      this.cells[r][c].ptype = (Math.random() * PTEX.length) | 0;
    }
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.cells[r][c].pathogen) continue;
        let n = 0;
        for (const [dr, dc] of NEIGHBORS) { const nr = r + dr, nc = c + dc; if (this.inBounds(nr, nc) && this.cells[nr][nc].pathogen) n++; }
        this.cells[r][c].count = n;
      }
    }
    this.seeded = true;
    this.startAt = this.time.now;
    this._lastSec = -1;
  },

  // ---- actions --------------------------------------------------------
  leftClick(r, c) {
    const cell = this.cells[r][c];
    if (cell.flagged) return;
    if (cell.revealed) { if (cell.count > 0) this.chord(r, c); return; }
    this.examine(r, c);
  },

  examine(r, c) {
    this.ensureSeeded(r, c);
    const cell = this.cells[r][c];
    if (cell.revealed || cell.flagged) return;
    if (cell.pathogen) { this.lose(r, c); return; }
    const { x, y } = this.center(r, c);
    if (!REDUCED) this.popRing(x, y, UI.cyan);
    this.revealFrom(r, c);
    this.checkWin();
  },

  doScan(r, c) {
    const cell = this.cells[r][c];
    if (cell.revealed || cell.flagged) { sfx.nope(); return; }
    this.ensureSeeded(r, c);
    this.scansLeft -= 1;
    this.scanArmed = false;
    if (this._armTween) { this._armTween.stop(); this._armTween = null; this.scanBtn.setScale(1); }
    sfx.scan();
    if (cell.pathogen) {
      this.autoFlag(r, c, true); // identified, not disturbed
    } else {
      const { x, y } = this.center(r, c);
      if (!REDUCED) this.popRing(x, y, UI.violet);
      this.revealFrom(r, c);
    }
    this.updateHUD();
    this.checkWin();
  },

  toggleFlag(r, c) {
    const cell = this.cells[r][c];
    if (cell.revealed || this.ended) return;
    if (cell.flagged) {
      cell.flagged = false; this.flagsPlaced -= 1;
      if (cell.flagImg) { cell.flagImg.destroy(); cell.flagImg = null; }
      sfx.unflag();
    } else {
      cell.flagged = true; this.flagsPlaced += 1;
      this.placeFlag(r, c, false);
      sfx.flag();
    }
    this.drawBoard();
    this.updateHUD();
  },

  autoFlag(r, c, identified) {
    const cell = this.cells[r][c];
    if (cell.flagged || cell.revealed) return;
    cell.flagged = true; this.flagsPlaced += 1;
    this.placeFlag(r, c, identified);
    this.drawBoard();
  },

  placeFlag(r, c, identified) {
    const { x, y } = this.center(r, c);
    const img = this.spawn(this.add.image(x, y, "antibody").setDisplaySize(this.cs * 0.6, this.cs * 0.6));
    this.cells[r][c].flagImg = img;
    if (!REDUCED) {
      const sc = img.scaleX; img.setScale(0);
      this.tweens.add({ targets: img, scaleX: sc, scaleY: sc, ease: "Back.out", duration: 260 });
      if (identified) this.popRing(x, y, UI.cyan, 2.0);
    }
  },

  chord(r, c) {
    const cell = this.cells[r][c];
    let flags = 0;
    for (const [dr, dc] of NEIGHBORS) { const nr = r + dr, nc = c + dc; if (this.inBounds(nr, nc) && this.cells[nr][nc].flagged) flags++; }
    if (flags !== cell.count) return;
    for (const [dr, dc] of NEIGHBORS) {
      const nr = r + dr, nc = c + dc;
      if (this.inBounds(nr, nc)) {
        const n = this.cells[nr][nc];
        if (!n.flagged && !n.revealed) { this.examine(nr, nc); if (this.ended) return; }
      }
    }
  },

  revealFrom(sr, sc) {
    const q = [[sr, sc, 0]];
    while (q.length) {
      const [r, c, ring] = q.shift();
      const cell = this.cells[r][c];
      if (cell.revealed || cell.flagged || cell.pathogen) continue;
      cell.revealed = true; this.revealedCount += 1;
      this.showCell(r, c, ring);
      if (cell.count === 0) {
        for (const [dr, dc] of NEIGHBORS) {
          const nr = r + dr, nc = c + dc;
          if (this.inBounds(nr, nc)) {
            const n = this.cells[nr][nc];
            if (!n.revealed && !n.flagged && !n.pathogen) q.push([nr, nc, ring + 1]);
          }
        }
      }
    }
    this.drawBoard();
  },

  showCell(r, c, ring) {
    const cell = this.cells[r][c];
    const { x, y } = this.center(r, c);
    if (cell.count > 0) {
      const t = this.spawn(this.add.text(x, y, String(cell.count), {
        resolution: RES, fontFamily: FONT, fontSize: `${Math.round(this.cs * 0.5)}px`, fontStyle: "800", color: LOAD_COLORS[cell.count],
      }).setOrigin(0.5));
      cell.num = t;
      if (!REDUCED) { t.setScale(0); this.tweens.add({ targets: t, scale: 1, ease: "Back.out", duration: 240, delay: ring * STAGGER }); }
    }
    if (!REDUCED) {
      const gl = this.spawn(this.add.image(x, y, "glow").setTint(UI.heal).setBlendMode(ADD).setDisplaySize(this.cs * 1.5, this.cs * 1.5).setAlpha(0));
      this.tweens.add({ targets: gl, alpha: { from: 0.5, to: 0 }, duration: 520, delay: ring * STAGGER, onComplete: () => gl.destroy() });
    }
  },
};
