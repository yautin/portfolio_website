import Phaser from "phaser";
import {
  RES, DIFFICULTIES, NEIGHBORS, LOAD_COLORS,
  getDifficulty, recordWin, getBestFor, starsForTime,
} from "../td/defs";
import { UI, viewport, ambience, makeButton, makeIconButton, REDUCED } from "../ui";
import { sfx } from "../audio";

const FONT = "'Mona Sans', system-ui, sans-serif";
const HUD_H = 52;   // reserved top strip
const MARGIN = 14;
const STAGGER = 20; // ms per BFS ring for the healing wave
const PTEX = ["infected-viral", "infected-lytic", "infected-bacterial"];
const ADD = Phaser.BlendModes.ADD;

export default class GameScene extends Phaser.Scene {
  constructor() {
    super("Game");
  }

  create(data) {
    const { W, H } = viewport(this);
    this.W = W; this.H = H;
    this.diff = DIFFICULTIES[data?.difficulty] ? data.difficulty : getDifficulty();
    const cfg = DIFFICULTIES[this.diff];
    this.cols = cfg.cols; this.rows = cfg.rows; this.mines = cfg.mines;
    this.scansLeft = cfg.scans;

    this.seeded = false; this.ended = false; this.won = false;
    this.flagsPlaced = 0; this.revealedCount = 0;
    this.totalSafe = this.cols * this.rows - this.mines;
    this.scanArmed = false;
    this.startAt = 0; this.elapsed = 0; this._lastSec = -1;

    ambience(this, W, H);
    this.computeLayout();

    // board model
    this.cells = [];
    for (let r = 0; r < this.rows; r++) {
      const row = [];
      for (let c = 0; c < this.cols; c++) {
        row.push({ pathogen: false, revealed: false, flagged: false, count: 0, ptype: 0, num: null, flagImg: null });
      }
      this.cells.push(row);
    }

    this.chanGfx = this.add.graphics(); // microfluidic channel lattice, behind the wells
    this.drawChannels();
    this.boardGfx = this.add.graphics();
    this.hoverGfx = this.add.graphics();
    this.drawBoard();

    this.buildHUD();
    this.wireInput();

    this.input.keyboard.addCapture("R,S");
    this.input.keyboard.on("keydown-R", () => this.scene.restart({ difficulty: this.diff }));
    this.input.keyboard.on("keydown-S", () => this.toggleScan());
  }

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
  }

  center(r, c) {
    return { x: this.boardX + c * this.cs + this.cs / 2, y: this.boardY + r * this.cs + this.cs / 2 };
  }
  inBounds(r, c) { return r >= 0 && r < this.rows && c >= 0 && c < this.cols; }
  cellAt(wx, wy) {
    const c = Math.floor((wx - this.boardX) / this.cs);
    const r = Math.floor((wy - this.boardY) / this.cs);
    return this.inBounds(r, c) ? { r, c } : null;
  }

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
  }

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
  }

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
  }

  // ---- HUD ------------------------------------------------------------
  buildHUD() {
    const W = this.W, cx = W / 2;
    const panel = this.add.graphics();
    panel.fillStyle(0x141922, 0.82); panel.fillRoundedRect(12, 8, W - 24, 36, 10);
    panel.lineStyle(1.5, UI.line, 1); panel.strokeRoundedRect(12, 8, W - 24, 36, 10);

    this.pathoText = this.add.text(26, 26, "", { resolution: RES, fontFamily: FONT, fontSize: "16px", fontStyle: "800", color: UI.dangerCss }).setOrigin(0, 0.5);
    this.timerText = this.add.text(120, 26, "0:00", { resolution: RES, fontFamily: FONT, fontSize: "15px", fontStyle: "700", color: UI.sub }).setOrigin(0, 0.5);
    this.armedBanner = this.add.text(cx, 26, "🔬 armed — image a trap safely", { resolution: RES, fontFamily: FONT, fontSize: "12px", fontStyle: "700", color: UI.cyanCss }).setOrigin(0.5).setVisible(false);

    this.scanBtn = makeButton(this, W - 150, 26, `🔬 ${this.scansLeft}`, { variant: "primary", minWidth: 88, fontSize: 14, onClick: () => this.toggleScan() });
    makeIconButton(this, W - 58, 26, "⟳", { onClick: () => this.scene.restart({ difficulty: this.diff }), size: 28 });
    makeIconButton(this, W - 26, 26, "☰", { onClick: () => this.scene.start("Menu"), size: 28 });

    this.updateHUD();
  }

  updateHUD() {
    this.pathoText.setText(`🦠 ${this.mines - this.flagsPlaced}`);
    this.scanBtn.setLabel(`🔬 ${this.scansLeft}`);
    this.scanBtn.setButtonEnabled(this.scansLeft > 0 && !this.ended);
    this.armedBanner.setVisible(this.scanArmed);
  }

  toggleScan() {
    if (this.ended || this.scansLeft <= 0) { sfx.nope(); return; }
    this.scanArmed = !this.scanArmed;
    if (this.scanArmed) {
      sfx.flag();
      if (!REDUCED) this._armTween = this.tweens.add({ targets: this.scanBtn, scaleX: 1.08, scaleY: 1.08, yoyo: true, repeat: -1, duration: 480, ease: "Sine.inOut" });
    } else {
      if (this._armTween) { this._armTween.stop(); this._armTween = null; }
      this.scanBtn.setScale(1);
    }
    this.updateHUD();
    this.drawHover(null);
  }

  // ---- input ----------------------------------------------------------
  wireInput() {
    this.input.mouse?.disableContextMenu();

    this.input.on("pointerdown", (p) => {
      if (this.ended) return;
      const cell = this.cellAt(p.worldX, p.worldY);
      this._down = cell ? { ...cell, right: p.rightButtonDown(), moved: false } : null;
      this._longFired = false;
      if (cell && !p.rightButtonDown() && !this.scanArmed) {
        this._lpTimer = this.time.delayedCall(360, () => {
          if (this._down && !this._down.moved) { this._longFired = true; this.toggleFlag(this._down.r, this._down.c); }
        });
      }
    });

    this.input.on("pointermove", (p) => {
      const cell = this.cellAt(p.worldX, p.worldY);
      this.drawHover(cell);
      if (this._down) {
        if (!cell || cell.r !== this._down.r || cell.c !== this._down.c) this._down.moved = true;
      }
    });

    this.input.on("pointerup", (p) => {
      if (this._lpTimer) { this._lpTimer.remove(false); this._lpTimer = null; }
      const d = this._down; this._down = null;
      if (this.ended || !d) return;
      if (this._longFired) { this._longFired = false; return; }
      const cell = this.cellAt(p.worldX, p.worldY);
      if (!cell || cell.r !== d.r || cell.c !== d.c) return;
      if (this.scanArmed) { this.doScan(cell.r, cell.c); return; }
      if (d.right || p.rightButtonReleased()) { this.toggleFlag(cell.r, cell.c); return; }
      this.leftClick(cell.r, cell.c);
    });
  }

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
  }

  // ---- actions --------------------------------------------------------
  leftClick(r, c) {
    const cell = this.cells[r][c];
    if (cell.flagged) return;
    if (cell.revealed) { if (cell.count > 0) this.chord(r, c); return; }
    this.examine(r, c);
  }

  examine(r, c) {
    this.ensureSeeded(r, c);
    const cell = this.cells[r][c];
    if (cell.revealed || cell.flagged) return;
    if (cell.pathogen) { this.lose(r, c); return; }
    const { x, y } = this.center(r, c);
    if (!REDUCED) this.popRing(x, y, UI.cyan);
    this.revealFrom(r, c);
    this.checkWin();
  }

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
  }

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
  }

  autoFlag(r, c, identified) {
    const cell = this.cells[r][c];
    if (cell.flagged || cell.revealed) return;
    cell.flagged = true; this.flagsPlaced += 1;
    this.placeFlag(r, c, identified);
    this.drawBoard();
  }

  placeFlag(r, c, identified) {
    const { x, y } = this.center(r, c);
    const img = this.add.image(x, y, "antibody").setDisplaySize(this.cs * 0.6, this.cs * 0.6);
    this.cells[r][c].flagImg = img;
    if (!REDUCED) {
      const sc = img.scaleX; img.setScale(0);
      this.tweens.add({ targets: img, scaleX: sc, scaleY: sc, ease: "Back.out", duration: 260 });
      if (identified) this.popRing(x, y, UI.cyan, 2.0);
    }
  }

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
  }

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
  }

  showCell(r, c, ring) {
    const cell = this.cells[r][c];
    const { x, y } = this.center(r, c);
    if (cell.count > 0) {
      const t = this.add.text(x, y, String(cell.count), {
        resolution: RES, fontFamily: FONT, fontSize: `${Math.round(this.cs * 0.5)}px`, fontStyle: "800", color: LOAD_COLORS[cell.count],
      }).setOrigin(0.5);
      cell.num = t;
      if (!REDUCED) { t.setScale(0); this.tweens.add({ targets: t, scale: 1, ease: "Back.out", duration: 240, delay: ring * STAGGER }); }
    }
    if (!REDUCED) {
      const gl = this.add.image(x, y, "glow").setTint(UI.heal).setBlendMode(ADD).setDisplaySize(this.cs * 1.5, this.cs * 1.5).setAlpha(0);
      this.tweens.add({ targets: gl, alpha: { from: 0.5, to: 0 }, duration: 520, delay: ring * STAGGER, onComplete: () => gl.destroy() });
    }
  }

  // ---- juice ----------------------------------------------------------
  popRing(x, y, color, toScale = 1.5) {
    const base = this.cs;
    const ring = this.add.image(x, y, "ring").setTint(color).setBlendMode(ADD).setDisplaySize(base * 0.5, base * 0.5).setAlpha(0.9);
    this.tweens.add({ targets: ring, displayWidth: base * toScale, displayHeight: base * toScale, alpha: 0, ease: "Cubic.out", duration: 420, onComplete: () => ring.destroy() });
  }

  // ---- win / lose -----------------------------------------------------
  checkWin() {
    if (this.ended) return;
    if (this.revealedCount >= this.totalSafe) this.win();
  }

  win() {
    this.ended = true; this.won = true;
    this.elapsed = this.time.now - this.startAt;
    this.hoverGfx.clear();
    // flag any remaining pathogens as a clean finish
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) {
      const cell = this.cells[r][c];
      if (cell.pathogen && !cell.flagged) { cell.flagged = true; this.flagsPlaced += 1; this.placeFlag(r, c, false); }
    }
    this.drawBoard();
    sfx.win();
    this.immunityPulse();
    const improved = recordWin(this.diff, this.elapsed);
    const stars = starsForTime(this.diff, this.elapsed);
    if (!REDUCED) this.time.delayedCall(160, () => sfx.star());
    this.time.delayedCall(REDUCED ? 300 : 1050, () =>
      this.scene.start("End", { result: "win", difficulty: this.diff, ms: this.elapsed, best: getBestFor(this.diff), improved, stars })
    );
  }

  immunityPulse() {
    if (REDUCED) return;
    const cx = this.boardX + this.cs * this.cols / 2;
    const cy = this.boardY + this.cs * this.rows / 2;
    const gl = this.add.image(cx, cy, "glow").setTint(UI.cyan).setBlendMode(ADD).setDisplaySize(this.cs, this.cs).setAlpha(0.6);
    this.tweens.add({
      targets: gl, displayWidth: this.cs * this.cols * 1.7, displayHeight: this.cs * this.rows * 1.7,
      alpha: 0, ease: "Cubic.out", duration: 900, onComplete: () => gl.destroy(),
    });
    this.cameras.main.flash(360, 80, 210, 255, false);
  }

  lose(tr, tc) {
    this.ended = true;
    this.elapsed = this.seeded ? this.time.now - this.startAt : 0;
    this.hoverGfx.clear();
    if (this._armTween) { this._armTween.stop(); this._armTween = null; }
    const tcell = this.cells[tr][tc];
    tcell.revealed = true;
    this.drawBoard();
    sfx.outbreak();

    const { x: tx, y: ty } = this.center(tr, tc);
    if (!REDUCED) {
      this.cameras.main.shake(480, 0.012);
      this.cameras.main.flash(280, 130, 20, 30);
      const gl = this.add.image(tx, ty, "glow").setTint(UI.danger).setBlendMode(ADD).setDisplaySize(this.cs, this.cs).setAlpha(0.75);
      this.tweens.add({ targets: gl, displayWidth: this.cs * 9, displayHeight: this.cs * 9, alpha: 0, ease: "Cubic.out", duration: 700, onComplete: () => gl.destroy() });
    }

    // reveal every undisturbed pathogen; cross out wrong flags
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.cells[r][c];
        const { x, y } = this.center(r, c);
        if (cell.pathogen && !cell.flagged) {
          const img = this.add.image(x, y, PTEX[cell.ptype]).setDisplaySize(this.cs * 0.66, this.cs * 0.66);
          if (!REDUCED) {
            const sc = img.scaleX; img.setScale(0);
            const dist = Math.hypot(r - tr, c - tc);
            this.tweens.add({ targets: img, scaleX: sc, scaleY: sc, ease: "Back.out", duration: 300, delay: Math.min(dist * 45, 650) });
          }
        } else if (cell.flagged && !cell.pathogen) {
          this.add.text(x, y, "✕", { resolution: RES, fontFamily: FONT, fontSize: `${Math.round(this.cs * 0.5)}px`, fontStyle: "800", color: UI.dangerCss }).setOrigin(0.5);
        }
      }
    }

    this.updateHUD();
    this.time.delayedCall(REDUCED ? 400 : 1300, () =>
      this.scene.start("End", { result: "lose", difficulty: this.diff, ms: this.elapsed })
    );
  }

  update() {
    if (!this.seeded || this.ended) return;
    this.elapsed = this.time.now - this.startAt;
    const s = Math.floor(this.elapsed / 1000);
    if (s !== this._lastSec) {
      this._lastSec = s;
      this.timerText.setText(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`);
    }
  }
}
