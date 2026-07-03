import Phaser from "phaser";
import { sfx } from "../audio";
import {
  GRID,
  DEFENDERS,
  DEFENDER_ORDER,
  PATHOGENS,
  UPGRADES,
  PLANNING_TIME,
  WAVE_GAP,
  AMBIENT_ATP,
  AMBIENT_EVERY,
  TOTAL_LEVELS,
  TUTORIAL_KEY,
  lanesForLevel,
  unitsForLevel,
  wavesForLevel,
  startAtpForLevel,
  heartsForRun,
  newUnitForLevel,
  setProgress,
  buildWave,
  isBossLevel,
  bossForLevel,
  modifierForLevel,
  recordResult,
  starsForHearts,
  diff,
} from "../td/defs";
import { Pathogen, Projectile, Defender } from "../td/entities";
import { makeButton, makeIconButton, redrawRoundRect } from "../ui";

const FONT = "'Mona Sans', system-ui, sans-serif";
const CONTACT = 34; // px: how close a pathogen must get to a defender to engage
const integrityColor = (frac) => (frac > 0.6 ? 0x4cc9f0 : frac > 0.3 ? 0xf4a259 : 0xf25f5c);

export default class GameScene extends Phaser.Scene {
  constructor() {
    super("Game");
  }

  init(data) {
    this.level = data?.level || 1;
  }

  create() {
    const { width: W, height: H } = this.scale;
    this.W = W;
    this.H = H;

    // --- campaign shape for this level ----------------------------------
    this.lanes = lanesForLevel(this.level);
    this.units = unitsForLevel(this.level);
    this.totalWaves = wavesForLevel(this.level);
    this.modifier = modifierForLevel(this.level);
    this.isBoss = isBossLevel(this.level);
    this.tutorial = this.level === 1 && localStorage.getItem(TUTORIAL_KEY) !== "1";

    // --- geometry -------------------------------------------------------
    this.playTop = GRID.hudTop;
    this.playBottom = H - GRID.toolbar;
    this.playH = this.playBottom - this.playTop;
    this.laneH = this.playH / this.lanes;
    this.gridLeft = GRID.membrane;
    this.colW = (W - this.gridLeft) / GRID.cols;

    // --- state ----------------------------------------------------------
    this.maxHearts = heartsForRun();
    this.hearts = this.maxHearts;
    this.atp = startAtpForLevel(this.level);
    this.kills = 0;
    this.mode = "planning"; // planning | wave | gap | over
    this.planEnd = this.time.now + PLANNING_TIME;
    this.gapEnd = 0;
    this.waveIndex = 0;
    this.waveTotal = 0;
    this.waveSpawned = 0;
    this.selected = null;
    this.paused = false;
    this.pauseEls = null;
    this.boss = null;
    this.pressTimer = null;
    this.pressData = null;
    this.upgradeBtn = null;
    this.upgradeFor = null;
    this.cells = new Array(GRID.cols * this.lanes).fill(null);

    this.input.mouse?.disableContextMenu?.();

    this.buildBackground();

    this.pathogens = this.add.group();
    this.projectiles = this.add.group();
    this.defenders = [];
    this.physics.add.overlap(this.projectiles, this.pathogens, this.onHit, null, this);
    this.barGfx = this.add.graphics().setDepth(7);
    this.waveBarGfx = this.add.graphics().setDepth(16);
    this.bossGfx = this.add.graphics().setDepth(17);

    this.buildHud();
    this.buildToolbar();
    this.buildGhost();
    this.bindInput();

    // ambient ATP drip + heartbeat tension pulse
    this.time.addEvent({
      delay: AMBIENT_EVERY, loop: true, callback: () => {
        if (this.mode === "over") return;
        this.atp += AMBIENT_ATP;
        this.floatText(62, GRID.hudTop + 12, `+${AMBIENT_ATP}`, "#4cc9f0", 850);
      },
    });
    this.time.addEvent({
      delay: 2400, loop: true, callback: () => {
        if (this.mode === "wave") sfx.heartbeat(this.hearts <= 2 ? 1.8 : 1);
      },
    });

    // level intro
    this.showBanner(`LEVEL ${this.level}`);
    if (this.lanes > lanesForLevel(this.level - 1)) this.animateNewLane(this.lanes - 1);
    if (this.modifier) this.floatText(W / 2, this.playTop + 56, `${this.modifier.name} — ${this.modifier.desc}`, "#f4a259", 2600);
    if (this.tutorial) this.showTutorial();
  }

  animateNewLane(row) {
    const y = this.laneY(row);
    const rect = this.add
      .rectangle(this.gridLeft, y, this.W - this.gridLeft, this.laneH, 0x4cc9f0, 0.28)
      .setOrigin(0, 0.5)
      .setDepth(-3)
      .setScale(1, 0);
    this.tweens.add({
      targets: rect, scaleY: 1, duration: 480, ease: "Back.out",
      onComplete: () => this.tweens.add({ targets: rect, alpha: 0, duration: 700, delay: 500, onComplete: () => rect.destroy() }),
    });
    const label = this.add
      .text(this.W / 2, y, "＋ New lane", { fontFamily: FONT, fontSize: "18px", fontStyle: "800", color: "#4cc9f0" })
      .setOrigin(0.5).setDepth(16).setAlpha(0);
    this.tweens.add({ targets: label, alpha: 1, duration: 300, yoyo: true, hold: 1000, onComplete: () => label.destroy() });
  }

  // ---------------------------------------------------------------------
  buildBackground() {
    const { W } = this;
    const g = this.add.graphics().setDepth(-10);
    g.fillGradientStyle(0x161922, 0x161922, 0x0f1116, 0x0f1116, 1);
    g.fillRect(0, 0, W, this.H);
    this.specks = this.add.tileSprite(0, 0, W, this.H, "specks").setOrigin(0, 0).setAlpha(0.5).setDepth(-9);

    const bands = this.add.graphics().setDepth(-6);
    for (let r = 0; r < this.lanes; r++) {
      bands.fillStyle(0xffffff, r % 2 === 0 ? 0.022 : 0.05);
      bands.fillRect(this.gridLeft, this.playTop + r * this.laneH, W - this.gridLeft, this.laneH);
    }

    const grid = this.add.graphics().setDepth(-5);
    grid.lineStyle(1, 0xffffff, 0.05);
    for (let c = 0; c <= GRID.cols; c++) {
      const x = this.gridLeft + c * this.colW;
      grid.lineBetween(x, this.playTop, x, this.playBottom);
    }
    for (let r = 0; r <= this.lanes; r++) {
      const y = this.playTop + r * this.laneH;
      grid.lineBetween(this.gridLeft, y, W, y);
    }

    const gutterX = W - 22;
    const gutter = this.add.graphics().setDepth(-5);
    gutter.fillStyle(0xf25f5c, 0.06);
    gutter.fillRect(gutterX, this.playTop, 22, this.playH);
    gutter.lineStyle(2, 0xf25f5c, 0.3);
    for (let r = 0; r < this.lanes; r++) {
      const cy = this.laneY(r);
      gutter.beginPath();
      gutter.moveTo(gutterX + 13, cy - 5);
      gutter.lineTo(gutterX + 7, cy);
      gutter.lineTo(gutterX + 13, cy + 5);
      gutter.strokePath();
    }

    const ocx = this.gridLeft * 0.42;
    const ocy = (this.playTop + this.playBottom) / 2;
    const orad = Math.min(this.playH * 0.34, 62);
    const organ = this.add.graphics().setDepth(-4);
    organ.fillStyle(0x1e2a33, 1);
    organ.fillRoundedRect(-26, this.playTop + 4, this.gridLeft + 8, this.playH - 8, 18);
    this.organNucleus = this.add.circle(ocx, ocy, orad * 0.5, 0x24343f).setDepth(-4);
    this.organRing = this.add.circle(ocx, ocy, orad, 0x4cc9f0, 0).setStrokeStyle(3, 0x4cc9f0, 0.55).setDepth(-4);
    this.membrane = this.add.rectangle(this.gridLeft - 2, ocy, 5, this.playH - 6, 0x4cc9f0).setDepth(3);

    this.applyIntegrity();
  }

  applyIntegrity() {
    const col = integrityColor(this.hearts / this.maxHearts);
    this.membrane.setFillStyle(col).setAlpha(1);
    this.organRing.setStrokeStyle(3, col, 0.6);
    this.organNucleus.setFillStyle(Phaser.Display.Color.IntegerToColor(col).darken(55).color);
  }

  buildHud() {
    const { W } = this;
    const hy = GRID.hudTop / 2;
    this.add.rectangle(0, 0, W, GRID.hudTop, 0x0d0f14, 0.9).setOrigin(0, 0).setDepth(15);
    this.add.rectangle(0, GRID.hudTop, W, 1, 0xffffff, 0.06).setOrigin(0, 1).setDepth(15);

    this.add.image(20, hy, "atp").setDepth(16);
    this.atpText = this.add.text(36, hy, "", { fontFamily: FONT, fontSize: "18px", fontStyle: "800", color: "#e8ebf2" }).setOrigin(0, 0.5).setDepth(16);
    this.atpShown = -1;
    this.atpPopAt = 0;

    this.waveText = this.add.text(W / 2, hy, "", { fontFamily: FONT, fontSize: "15px", fontStyle: "700", color: "#c4cdda" }).setOrigin(0.5).setDepth(16);
    this.startCta = makeButton(this, W / 2, hy, "▶ Start level · 20s", {
      variant: "primary", minWidth: 184, fontSize: 14, onClick: () => this.skipWait(),
    }).setDepth(16);
    this.tweens.add({ targets: this.startCta, scaleX: 1.03, scaleY: 1.03, yoyo: true, repeat: -1, duration: 720, ease: "Sine.inOut" });

    this.pips = [];
    for (let i = 0; i < this.maxHearts; i++) {
      const x = W - 46 - (this.maxHearts - 1 - i) * 15;
      this.pips.push(this.add.image(x, hy, "heart").setDisplaySize(14, 14).setDepth(16));
    }
    this.menuBtn = makeIconButton(this, W - 22, hy, "☰", { onClick: () => this.togglePause(), size: 30 }).setDepth(16);

    this.banner = this.add.text(W / 2, this.playTop + 30, "", { fontFamily: FONT, fontSize: "24px", fontStyle: "800", color: "#e8ebf2" })
      .setOrigin(0.5).setDepth(16).setAlpha(0);

    this.bossName = this.add.text(W / 2, this.playTop + 8, "", { fontFamily: FONT, fontSize: "13px", fontStyle: "800", color: "#ffd0cf" })
      .setOrigin(0.5).setDepth(17).setVisible(false);
  }

  buildToolbar() {
    const { W, H } = this;
    const n = DEFENDER_ORDER.length;
    const cardW = 116, cardH = 52, gap = 8;
    const total = n * cardW + (n - 1) * gap;
    const startX = (W - total) / 2;
    const cy = H - GRID.toolbar / 2;

    this.add.rectangle(0, this.playBottom, W, GRID.toolbar, 0x0d0f14, 0.9).setOrigin(0, 0).setDepth(15);
    this.add.rectangle(0, this.playBottom, W, 1, 0xffffff, 0.06).setOrigin(0, 0).setDepth(15);

    this.tip = this.add.text(0, 0, "", { fontFamily: FONT, fontSize: "12px", color: "#e8ebf2", backgroundColor: "#1b2130", padding: { x: 7, y: 4 } })
      .setOrigin(0.5, 1).setDepth(30).setVisible(false);

    this.cards = DEFENDER_ORDER.map((key, i) => {
      const def = DEFENDERS[key];
      const locked = !this.units.includes(key);
      const cx = startX + i * (cardW + gap) + cardW / 2;
      const lx = -cardW / 2;

      const bgG = this.add.graphics();
      const icon = this.add.image(lx + 24, 0, def.texture).setDisplaySize(32, 32);
      const nameT = this.add.text(lx + 43, -10, def.shortName, { fontFamily: FONT, fontSize: "11px", fontStyle: "700", color: "#e8ebf2" }).setOrigin(0, 0.5);
      const dot = this.add.image(lx + 46, 10, "dot").setTint(0x4cc9f0).setDisplaySize(7, 7);
      const costT = this.add.text(lx + 54, 10, `${def.cost}`, { fontFamily: FONT, fontSize: "12px", fontStyle: "700", color: "#8b97ad" }).setOrigin(0, 0.5);
      this.add.text(cardW / 2 - 9, -cardH / 2 + 9, `${i + 1}`, { fontFamily: FONT, fontSize: "10px", color: "#5c6b82" }).setOrigin(0.5);
      const cdbar = this.add.rectangle(lx + 6, cardH / 2 - 5, cardW - 12, 3, 0x4cc9f0).setOrigin(0, 0.5).setScale(0, 1).setVisible(false);

      const children = [bgG, icon, nameT, dot, costT, cdbar];

      if (locked) {
        nameT.setVisible(false); dot.setVisible(false); costT.setVisible(false);
        icon.setAlpha(0.35).setTint(0x6b7688);
        const lock = this.add.graphics();
        lock.fillStyle(0x8b97ad, 1).fillRoundedRect(lx + 40, -2, 12, 9, 2);
        lock.lineStyle(2, 0x8b97ad, 1);
        lock.beginPath(); lock.arc(lx + 46, -2, 4, Math.PI, 0); lock.strokePath();
        const lvT = this.add.text(lx + 60, 0, `Lv ${i + 1}`, { fontFamily: FONT, fontSize: "11px", fontStyle: "700", color: "#5c6b82" }).setOrigin(0, 0.5);
        children.push(lock, lvT);
      } else {
        const hit = this.add.rectangle(0, 0, cardW, cardH, 0x000000, 0).setInteractive({ useHandCursor: true });
        hit.on("pointerdown", () => this.selectCard(key));
        hit.on("pointerover", () => this.tip.setText(def.name).setPosition(cx, cy - cardH / 2 - 8).setVisible(true));
        hit.on("pointerout", () => this.tip.setVisible(false));
        children.push(hit);
      }

      const container = this.add.container(cx, cy, children).setDepth(16);
      return { key, def, container, bgG, icon, costT, cdbar, locked, cardW, cardH, baseX: cx, baseY: cy, cdEnd: 0 };
    });

    this.cards.forEach((c) => this.paintCard(c));
  }

  paintCard(card) {
    const { bgG, cardW, cardH } = card;
    if (card.locked) {
      redrawRoundRect(bgG, cardW, cardH, 9, { fill: 0x141922, fillAlpha: 0.6, stroke: 0x232a36, strokeW: 1.5 });
      card.container.setAlpha(0.55);
      return;
    }
    const now = this.time.now;
    const remaining = Math.max(0, card.cdEnd - now);
    const ready = remaining === 0;
    const affordable = this.atp >= card.def.cost;
    const usable = ready && affordable;
    const selected = this.selected === card.key;

    redrawRoundRect(bgG, cardW, cardH, 9, {
      fill: selected ? 0x22344a : 0x1b2130, stroke: selected ? 0x4cc9f0 : 0x2b3345, strokeW: selected ? 2 : 1.5, highlight: true,
    });
    card.container.setAlpha(usable ? 1 : 0.62);
    card.container.y = card.baseY - (selected ? 4 : 0);
    card.icon.setAlpha(usable ? 1 : 0.6);
    card.costT.setColor(affordable ? "#8b97ad" : "#f25f5c");
    if (remaining > 0) card.cdbar.setVisible(true).setScale(1 - remaining / card.def.cooldown, 1);
    else card.cdbar.setVisible(false);
  }

  buildGhost() {
    this.cellHi = this.add.rectangle(0, 0, this.colW - 4, this.laneH - 4, 0x4cc9f0, 0.12)
      .setStrokeStyle(2, 0x4cc9f0, 0.6).setDepth(2).setVisible(false);
    this.ghost = this.add.image(0, 0, this.units[0] ? DEFENDERS[this.units[0]].texture : "def-antibody")
      .setAlpha(0.55).setDepth(3).setVisible(false);
  }

  bindInput() {
    this.input.on("pointerdown", (p) => this.onPointerDown(p));
    this.input.on("pointermove", (p) => this.onPointerMove(p));
    this.input.on("pointerup", () => this.cancelPress());
    const keys = ["ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN"];
    this.units.forEach((key, i) => this.input.keyboard.on(`keydown-${keys[i]}`, () => this.selectCard(key)));
    this.input.keyboard.addCapture("P");
    this.input.keyboard.on("keydown-P", () => this.togglePause());
  }

  showTutorial() {
    const firstX = this.cards[0].container.x;
    this.tutorArrow = this.add.text(firstX, this.playBottom - 4, "▼", { fontFamily: FONT, fontSize: "22px", fontStyle: "800", color: "#4cc9f0" })
      .setOrigin(0.5, 1).setDepth(21);
    this.tweens.add({ targets: this.tutorArrow, y: this.tutorArrow.y - 8, yoyo: true, repeat: -1, duration: 500, ease: "Sine.inOut" });
    this.tutorText = this.add.text(this.W / 2, this.playBottom - 34, "Tap a defender, then tap a lane cell to place it", {
      fontFamily: FONT, fontSize: "13px", fontStyle: "700", color: "#e8ebf2", backgroundColor: "#1b2130cc", padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setDepth(21);
  }

  endTutorial() {
    this.tutorial = false;
    localStorage.setItem(TUTORIAL_KEY, "1");
    [this.tutorArrow, this.tutorText].forEach((o) => o && this.tweens.add({ targets: o, alpha: 0, duration: 300, onComplete: () => o.destroy() }));
    this.tutorArrow = this.tutorText = null;
  }

  // --- pause menu ------------------------------------------------------
  togglePause() {
    if (this.mode === "over") return;
    if (this.paused) this.resumeGame();
    else this.pauseGame();
  }

  pauseGame() {
    this.paused = true;
    this.physics.pause();
    this.time.paused = true;
    this.tweens.pauseAll();
    this.selected = null;
    this.ghost.setVisible(false);
    this.cellHi.setVisible(false);
    this.hideUpgradePrompt();

    const { W, H } = this;
    const els = [];
    els.push(this.add.rectangle(0, 0, W, H, 0x0b0d12, 0.78).setOrigin(0, 0).setDepth(40).setInteractive());
    els.push(this.add.rectangle(W / 2, H / 2, 288, 218, 0x141922, 0.97).setStrokeStyle(1.5, 0x2b3345).setDepth(40.5));
    els.push(this.add.text(W / 2, H / 2 - 66, "PAUSED", { fontFamily: FONT, fontSize: "26px", fontStyle: "800", color: "#e8ebf2" }).setOrigin(0.5).setDepth(41));
    const mkBtn = (label, y, variant, action) => els.push(makeButton(this, W / 2, y, label, { variant, minWidth: 208, onClick: action }).setDepth(41));
    mkBtn("Resume", H / 2 - 22, "primary", () => this.resumeGame());
    mkBtn("Restart level", H / 2 + 20, "secondary", () => { this.resumeGame(); this.scene.restart({ level: this.level }); });
    mkBtn("Level select", H / 2 + 62, "secondary", () => { this.resumeGame(); this.scene.start("Menu"); });
    this.pauseEls = els;
  }

  resumeGame() {
    if (!this.paused) return;
    this.paused = false;
    this.physics.resume();
    this.time.paused = false;
    this.tweens.resumeAll();
    if (this.pauseEls) this.pauseEls.forEach((e) => e.destroy());
    this.pauseEls = null;
  }

  // --- grid helpers ----------------------------------------------------
  laneY(row) { return this.playTop + this.laneH * (row + 0.5); }
  colX(col) { return this.gridLeft + this.colW * (col + 0.5); }
  cellAt(x, y) {
    if (x < this.gridLeft || x >= this.W || y < this.playTop || y >= this.playBottom) return null;
    const col = Math.floor((x - this.gridLeft) / this.colW);
    const row = Math.floor((y - this.playTop) / this.laneH);
    if (col < 0 || col >= GRID.cols || row < 0 || row >= this.lanes) return null;
    return { col, row };
  }
  cellIndex(col, row) { return row * GRID.cols + col; }

  // --- selection, placement, sell, upgrade ----------------------------
  selectCard(key) {
    if (key && !this.units.includes(key)) return;
    this.selected = this.selected === key ? null : key;
    this.hideUpgradePrompt();
    if (!this.selected) { this.ghost.setVisible(false); this.cellHi.setVisible(false); }
  }

  onPointerMove(p) {
    if (this.pressData && Phaser.Math.Distance.Between(p.x, p.y, this.pressData.x, this.pressData.y) > 12) this.clearPress();
    if (this.paused || !this.selected) { this.ghost.setVisible(false); this.cellHi.setVisible(false); return; }
    const cell = this.cellAt(p.x, p.y);
    const def = DEFENDERS[this.selected];
    if (!cell || this.cells[this.cellIndex(cell.col, cell.row)]) { this.ghost.setVisible(false); this.cellHi.setVisible(false); return; }
    const card = this.cards.find((c) => c.key === this.selected);
    const ok = this.atp >= def.cost && this.time.now >= card.cdEnd;
    const x = this.colX(cell.col), y = this.laneY(cell.row);
    this.cellHi.setPosition(x, y).setFillStyle(ok ? 0x4cc9f0 : 0xf25f5c, 0.12).setStrokeStyle(2, ok ? 0x4cc9f0 : 0xf25f5c, 0.6).setVisible(true);
    this.ghost.setTexture(def.texture).setPosition(x, y).setTint(ok ? 0x9ef0a0 : 0xf25f5c).setVisible(true);
  }

  onPointerDown(p) {
    if (this.paused || this.mode === "over") return;
    const cell = this.cellAt(p.x, p.y);

    // right-click sells
    if (p.rightButtonDown && p.rightButtonDown()) { if (cell) this.sellAt(cell); return; }

    // tap/hold on an occupied cell (no card): hold = sell, tap = upgrade prompt
    if (cell && this.cells[this.cellIndex(cell.col, cell.row)] && !this.selected) {
      this.pressData = { cell, x: p.x, y: p.y };
      this.pressTimer = this.time.delayedCall(500, () => { this.pressTimer = null; this.sellAt(cell); this.pressData = null; });
      return;
    }

    if (!this.selected) return;
    if (p.y < this.playTop || p.y >= this.playBottom || !cell) return;
    const idx = this.cellIndex(cell.col, cell.row);
    if (this.cells[idx]) return;

    const def = DEFENDERS[this.selected];
    const card = this.cards.find((c) => c.key === this.selected);
    if (this.time.now < card.cdEnd || this.atp < def.cost) { this.nope(card); return; }

    this.atp -= def.cost;
    card.cdEnd = this.time.now + def.cooldown;
    const d = new Defender(this, this.colX(cell.col), this.laneY(cell.row), { ...def }, cell.col, cell.row);
    this.cells[idx] = d;
    this.defenders.push(d);
    sfx.place();
    d.setScale(0);
    this.tweens.add({ targets: d, scale: 1, duration: 180, ease: "Back.out" });
    this.burst(d.x, d.y, def.color, 6, 16);
    if (def.role === "mine") {
      this.time.delayedCall(def.armTime, () => { if (d.active) { d.armed = true; this.burst(d.x, d.y, 0xffe08a, 6, 14); sfx.arm(); } });
    }
    if (this.tutorial) this.endTutorial();
    this.onPointerMove(p);
  }

  clearPress() {
    if (this.pressTimer) { this.pressTimer.remove(); this.pressTimer = null; }
    this.pressData = null;
  }

  cancelPress() {
    // released before the hold fired → treat as a tap (upgrade prompt)
    if (this.pressTimer && this.pressData) {
      this.pressTimer.remove(); this.pressTimer = null;
      const d = this.cells[this.cellIndex(this.pressData.cell.col, this.pressData.cell.row)];
      if (d && d.active) this.toggleUpgradePrompt(d);
    }
    this.pressData = null;
  }

  sellAt(cell) {
    const d = this.cells[this.cellIndex(cell.col, cell.row)];
    if (!d || !d.active || d.spent) return;
    const refund = Math.floor(d.def.cost * 0.5);
    this.atp += refund;
    this.floatText(d.x, d.y - 12, `+${refund}`, "#4cc9f0", 800);
    sfx.sell();
    if (this.upgradeFor === d) this.hideUpgradePrompt();
    this.destroyDefender(d, true);
  }

  toggleUpgradePrompt(d) {
    if (this.upgradeFor === d) { this.hideUpgradePrompt(); return; }
    this.hideUpgradePrompt();
    const up = UPGRADES[d.def.key];
    if (!up || d.upgraded) return;
    this.upgradeFor = d;
    this.upgradeBtn = makeButton(this, d.x, d.y - 42, `⬆ ${up.name} · ${up.cost}`, {
      variant: "primary", fontSize: 12, minWidth: 128, onClick: () => this.doUpgrade(d, up),
    }).setDepth(22);
    this.upgradeTimer = this.time.delayedCall(3800, () => this.hideUpgradePrompt());
  }

  hideUpgradePrompt() {
    if (this.upgradeBtn) { this.upgradeBtn.destroy(); this.upgradeBtn = null; }
    if (this.upgradeTimer) { this.upgradeTimer.remove(); this.upgradeTimer = null; }
    this.upgradeFor = null;
  }

  doUpgrade(d, up) {
    if (d.upgraded || this.atp < up.cost) { sfx.nope(); return; }
    this.atp -= up.cost;
    d.def = { ...d.def, ...up.patch };
    d.upgraded = true;
    sfx.upgrade();
    this.burst(d.x, d.y, 0xffe08a, 14, 22);
    d.upgradeMark = this.add.image(d.x + 14, d.y - 14, "star").setTint(0xffe08a).setDisplaySize(12, 12).setDepth(6);
    this.hideUpgradePrompt();
  }

  nope(card) {
    sfx.nope();
    this.tweens.add({ targets: card.container, x: card.container.x + 4, duration: 45, yoyo: true, repeat: 3 });
  }

  // --- waves -----------------------------------------------------------
  skipWait() { if (this.mode === "planning" || this.mode === "gap") this.startNextWave(); }

  startNextWave() {
    this.waveIndex += 1;
    this.mode = "wave";
    const events = buildWave(this.level, this.waveIndex - 1, this.lanes);
    this.waveTotal = events.length;
    this.waveSpawned = 0;
    let last = 0;
    events.forEach((e) => {
      last = Math.max(last, e.delay);
      this.time.delayedCall(e.delay, () => {
        if (this.mode !== "wave") return;
        this.spawnPathogen(e.type, e.lane);
        this.waveSpawned += 1;
      });
    });

    const isFinal = this.waveIndex >= this.totalWaves;
    if (isFinal && this.isBoss) {
      this.waveTotal += 1;
      this.time.delayedCall(last + 1600, () => { if (this.mode === "wave") { this.spawnBoss(); this.waveSpawned += 1; } });
      sfx.boss();
      this.showBanner("⚠ BOSS INCOMING", "#f25f5c");
    } else {
      sfx.waveStart();
      this.showBanner(isFinal ? "FINAL WAVE" : `WAVE ${this.waveIndex} / ${this.totalWaves}`, isFinal ? "#f25f5c" : "#e8ebf2");
    }
  }

  spawnPathogen(type, lane) {
    const def = PATHOGENS[type];
    const y = this.laneY(lane) - (def.fly ? 16 : 0);
    const p = new Pathogen(this, this.W + 30, y, def, lane);
    p.maxHp = Math.round(def.hp * diff().hpMul); p.hp = p.maxHp;
    p.baseSpeed = def.speed * diff().speedMul * (this.modifier?.speedMul || 1);
    p.refreshVelocity();
    if (def.fly) this.tweens.add({ targets: p, scaleX: 1.08, scaleY: 1.08, yoyo: true, repeat: -1, duration: 700, ease: "Sine.inOut" });
    this.pathogens.add(p);
  }

  spawnBoss() {
    const cfg = bossForLevel(this.level);
    const def = PATHOGENS[cfg.base];
    const lane = Math.floor(this.lanes / 2);
    const p = new Pathogen(this, this.W + 46, this.laneY(lane), def, lane);
    p.boss = true;
    p.maxHp = Math.round(def.hp * cfg.hpMul * diff().hpMul); p.hp = p.maxHp;
    p.baseSpeed = def.speed * diff().speedMul * 0.85; p.refreshVelocity();
    p.setScale(cfg.scale).setDepth(5);
    this.pathogens.add(p);
    this.boss = p;
    this.bossName.setText(cfg.name);
    this.cameras.main.shake(260, 0.008);
  }

  levelComplete() {
    if (this.mode === "over") return;
    this.mode = "over";
    setProgress(this.level + 1);
    const stars = starsForHearts(this.hearts, this.maxHearts);
    const score = this.kills * 10 + this.hearts * 100 + this.level * 50;
    recordResult(this.level, stars, score);
    sfx.levelclear();
    const outcome = this.level >= TOTAL_LEVELS ? "victory" : "clear";
    const nextUnit = newUnitForLevel(this.level + 1);
    const unlocked = nextUnit ? nextUnit.key : null;
    this.time.delayedCall(750, () => this.scene.start("Interlude", { outcome, level: this.level, unlocked, stars, score }));
  }

  gameOver() {
    if (this.mode === "over") return;
    this.mode = "over";
    sfx.defeat();
    this.pathogens.getChildren().forEach((p) => p.setVelocityX(0));
    this.cameras.main.shake(320, 0.014);
    this.time.delayedCall(650, () => this.scene.start("Interlude", { outcome: "defeat", level: this.level }));
  }

  showBanner(text, color = "#e8ebf2") {
    this.banner.setText(text).setColor(color).setAlpha(1).setScale(0.8);
    this.tweens.add({ targets: this.banner, scale: 1, duration: 220, ease: "Back.out" });
    this.tweens.add({ targets: this.banner, alpha: 0, delay: 1000, duration: 400 });
  }

  // --- combat ----------------------------------------------------------
  onHit(projectile, pathogen) {
    if (!projectile.active || !pathogen.active) return;
    const slowF = projectile.slowFactor, slowD = projectile.slowDuration, dmg = projectile.damage;
    projectile.destroy();
    this.burst(pathogen.x, pathogen.y, 0xbff0ff, 3, 10);
    sfx.hit();
    if (slowF < 1) pathogen.applySlow(slowF, slowD);
    if (pathogen.applyDamage(dmg)) { this.killPathogen(pathogen); return; }
    this.flash(pathogen);
    this.punch(pathogen);
  }

  flash(p) {
    p.setTintFill(0xffffff);
    this.time.delayedCall(45, () => { if (!p.active) return; p.isSlowed() ? p.setTint(0x9fd8ff) : p.clearTint(); });
  }

  punch(p) {
    if (p.punching || p.def.fly) return; // flyers already have an idle pulse
    p.punching = true;
    const s = p.scaleX;
    this.tweens.add({ targets: p, scaleX: s * 1.12, scaleY: s * 1.12, yoyo: true, duration: 55, onComplete: () => { if (p.active) p.setScale(s); p.punching = false; } });
  }

  killPathogen(p) {
    this.kills += 1;
    if (p.boss) { this.boss = null; this.cameras.main.shake(300, 0.012); this.explosionFx(p.x, p.y, 90, p.def.color); sfx.boss(); }
    this.burst(p.x, p.y, p.def.color, p.boss ? 26 : 12, p.boss ? 52 : 26);
    this.coinFly(p.x, p.y);
    this.floatText(p.x, p.y - 10, `+${p.def.bounty}`, "#4cc9f0", 700);
    this.atp += p.def.bounty;
    sfx.lyse();
    p.destroy();
  }

  breach(p) {
    if (p.boss) this.boss = null;
    this.hearts -= 1;
    sfx.breach();
    this.cameras.main.shake(180, 0.008);
    this.membrane.setFillStyle(0xf25f5c);
    this.tweens.add({ targets: this.membrane, alpha: 0.3, duration: 90, yoyo: true, onComplete: () => this.applyIntegrity() });
    this.burst(this.gridLeft, p.y, 0xf25f5c, 12, 28);
    p.destroy();
    if (this.hearts <= 0) this.gameOver();
  }

  fireShooter(d) {
    let target = null;
    this.pathogens.getChildren().forEach((p) => {
      if (!p.active || p.lane !== d.row || p.x <= d.x) return;
      if (!target || p.x < target.x) target = p;
    });
    if (!target) return false;
    const shots = d.def.shots || 1;
    for (let s = 0; s < shots; s++) {
      this.time.delayedCall(s * 120, () => {
        if (!d.active) return;
        this.projectiles.add(new Projectile(this, d.x + 14, d.y - 2, d.def));
      });
    }
    this.burst(d.x + 16, d.y - 2, d.def.color, 2, 8);
    sfx.shoot();
    return true;
  }

  aoeDamage(x, y, radius, dmg) {
    this.pathogens.getChildren().slice().forEach((p) => {
      if (!p.active) return;
      if (Phaser.Math.Distance.Between(x, y, p.x, p.y) <= radius) {
        if (p.applyDamage(dmg, true)) this.killPathogen(p);
        else this.flash(p);
      }
    });
  }

  explosionFx(x, y, radius, color) {
    const ring = this.add.circle(x, y, radius, color, 0).setStrokeStyle(3, color, 0.7).setScale(0.15).setDepth(8);
    this.tweens.add({ targets: ring, scale: 1, alpha: 0, duration: 320, ease: "Quad.out", onComplete: () => ring.destroy() });
    this.burst(x, y, color, 16, radius * 0.5);
  }

  detonate(d, radius, dmg, color, shake) {
    d.spent = true;
    sfx.explode();
    if (shake) this.cameras.main.shake(160, 0.006);
    this.explosionFx(d.x, d.y, radius, color);
    this.aoeDamage(d.x, d.y, radius, dmg);
    this.destroyDefender(d, false);
  }

  destroyDefender(d, withBurst = true) {
    const idx = this.cellIndex(d.col, d.row);
    if (this.cells[idx] === d) this.cells[idx] = null;
    if (d.upgradeMark) { d.upgradeMark.destroy(); d.upgradeMark = null; }
    if (this.upgradeFor === d) this.hideUpgradePrompt();
    if (withBurst) this.burst(d.x, d.y, d.def.color, 10, 22);
    d.destroy();
  }

  // --- FX helpers ------------------------------------------------------
  burst(x, y, color, count, spread) {
    for (let i = 0; i < count; i++) {
      const dot = this.add.image(x, y, "dot").setTint(color).setDepth(9);
      const a = Math.random() * Math.PI * 2;
      const dist = 8 + Math.random() * spread;
      this.tweens.add({
        targets: dot, x: x + Math.cos(a) * dist, y: y + Math.sin(a) * dist, alpha: 0, scale: 0.2,
        duration: 280 + Math.random() * 220, ease: "Quad.out", onComplete: () => dot.destroy(),
      });
    }
  }

  coinFly(x, y) {
    const coin = this.add.image(x, y, "atp").setDisplaySize(15, 15).setDepth(11);
    this.tweens.add({ targets: coin, x: 26, y: GRID.hudTop / 2, scale: 0.45, duration: 480, ease: "Quad.in", onComplete: () => coin.destroy() });
  }

  floatText(x, y, str, color, dur = 800) {
    const t = this.add.text(x, y, str, { fontFamily: FONT, fontSize: "14px", fontStyle: "700", color }).setOrigin(0.5).setDepth(10);
    this.tweens.add({ targets: t, y: y - 26, alpha: 0, duration: dur, ease: "Quad.out", onComplete: () => t.destroy() });
  }

  // --- main loop -------------------------------------------------------
  update(time, delta) {
    if (this.mode === "over" || this.paused) return;
    this.specks.tilePositionX += delta * 0.004;

    this.updateDefenders(delta);
    this.updatePathogens(delta / 1000);
    this.cullProjectiles();

    if (this.mode === "wave" && this.waveSpawned >= this.waveTotal && this.pathogens.countActive(true) === 0) {
      if (this.waveIndex >= this.totalWaves) this.levelComplete();
      else { this.mode = "gap"; this.gapEnd = time + WAVE_GAP; this.floatText(this.W / 2, this.playTop + 58, "Wave cleared", "#4cc9f0", 1100); }
    } else if (this.mode === "gap" && time >= this.gapEnd) {
      this.startNextWave();
    } else if (this.mode === "planning" && time >= this.planEnd) {
      this.startNextWave();
    }

    this.drawBars();
    this.drawWaveBar();
    this.drawBossBar();
    this.updateHud(time);
    this.updateCards();
  }

  updateDefenders(delta) {
    for (const d of this.defenders) {
      if (!d.active || d.spent) continue;
      const role = d.def.role;
      if (role === "economy") {
        d.timer += delta;
        if (d.timer >= d.def.generateEvery) {
          d.timer -= d.def.generateEvery;
          this.atp += d.def.generate;
          this.floatText(d.x, d.y - 12, `+${d.def.generate}`, "#f4a259", 900);
          this.burst(d.x, d.y, 0xf4a259, 5, 14);
          sfx.atp();
        }
      } else if (role === "shoot") {
        d.timer += delta;
        if (d.timer >= d.def.fireRate) { if (this.fireShooter(d)) d.timer = 0; else d.timer = d.def.fireRate; }
      } else if (role === "bomb") {
        d.timer += delta;
        if (d.timer >= d.def.fuse) this.detonate(d, d.def.radius, d.def.damage, 0xff6b4a, true);
      } else if (role === "mine") {
        d.setAlpha(d.armed ? 0.7 + 0.3 * Math.abs(Math.sin(this.time.now / 200)) : 0.85);
      } else if (role === "chomp") {
        d.setAlpha(this.time.now < d.chewUntil ? 0.6 : 1);
      }
    }
  }

  updatePathogens(dt) {
    const pathos = this.pathogens.getChildren().slice();
    for (const p of pathos) {
      if (!p.active || p.vaulting) continue;
      p.tickMotion();

      // airborne pathogens ignore ground defenders entirely
      if (p.def.fly) {
        if (p.x <= this.gridLeft) this.breach(p);
        continue;
      }

      let front = null;
      for (const d of this.defenders) {
        if (!d.active || d.spent || d.row !== p.lane) continue;
        if (p.x > d.x && p.x - d.x < CONTACT && (!front || d.x > front.x)) front = d;
      }

      if (front) {
        if (p.def.vault && !p.vaulted) { this.vaultOver(p, front); continue; }
        p.setBlocked(true);
        this.resolveContact(p, front, dt);
        if (!p.active) continue;
      } else {
        p.setBlocked(false);
      }

      if (p.x <= this.gridLeft) this.breach(p);
    }
  }

  vaultOver(p, d) {
    p.vaulted = true; p.vaulting = true;
    if (p.body) p.body.enable = false;
    const targetX = d.x - this.colW * 0.85;
    const y0 = p.y;
    this.burst(p.x, p.y - 6, p.def.color, 5, 12);
    this.tweens.add({
      targets: p, x: targetX, duration: 430, ease: "Sine.inOut",
      onComplete: () => { if (!p.active) return; if (p.body) { p.body.enable = true; p.body.reset(p.x, p.y); } p.vaulting = false; p.setBlocked(false); },
    });
    this.tweens.add({ targets: p, y: y0 - 30, yoyo: true, duration: 215, ease: "Quad.out" });
  }

  resolveContact(p, d, dt) {
    const role = d.def.role;
    if (role === "mine") {
      if (d.armed) { this.detonate(d, d.def.splash, d.def.damage, 0xffe08a, false); return; }
      d.hp -= p.def.melee * dt;
    } else if (role === "chomp") {
      if (this.time.now >= d.chewUntil) {
        this.burst(d.x, d.y, 0xffffff, 8, 18);
        sfx.chomp();
        d.chewUntil = this.time.now + d.def.chewTime;
        if (p.applyDamage(d.def.biteDamage, true)) { this.killPathogen(p); return; }
      } else {
        d.hp -= p.def.melee * dt;
      }
    } else {
      d.hp -= p.def.melee * dt;
    }
    if (d.hp <= 0 && !d.spent) this.destroyDefender(d);
  }

  cullProjectiles() {
    this.projectiles.getChildren().slice().forEach((pr) => { if (pr.active && pr.x > this.W + 20) pr.destroy(); });
  }

  drawBars() {
    const g = this.barGfx;
    g.clear();
    const bar = (x, y, frac) => {
      const w = 30, h = 5, r = 2.5;
      const cf = Phaser.Math.Clamp(frac, 0, 1);
      g.fillStyle(0x0b0d12, 0.85);
      g.fillRoundedRect(x - w / 2 - 1, y - 1, w + 2, h + 2, r + 1);
      const fw = Math.max(h, w * cf);
      g.fillStyle(cf > 0.5 ? 0x6bbf59 : cf > 0.25 ? 0xf4a259 : 0xf25f5c, 1);
      g.fillRoundedRect(x - w / 2, y, fw, h, r);
      g.fillStyle(0xffffff, 0.18);
      g.fillRoundedRect(x - w / 2, y, fw, 2, r);
    };
    this.pathogens.getChildren().forEach((p) => {
      if (p.active && !p.boss && p.hp < p.maxHp) bar(p.x, p.y - 24, p.hp / p.maxHp);
    });
    for (const d of this.defenders) {
      if (d.active && !d.spent && d.maxHp > 0 && d.hp < d.maxHp) bar(d.x, d.y - 28, d.hp / d.maxHp);
    }
  }

  drawWaveBar() {
    const g = this.waveBarGfx;
    g.clear();
    // only during an active wave — the Start CTA owns the HUD centre otherwise
    if (this.mode !== "wave" || (this.boss && this.boss.active)) return;
    const total = this.totalWaves;
    const inWave = this.waveTotal > 0 ? Phaser.Math.Clamp((this.waveSpawned - this.pathogens.countActive(true)) / this.waveTotal, 0, 1) : 0;
    const frac = Phaser.Math.Clamp((this.waveIndex - 1 + inWave) / total, 0, 1);
    // sits in the HUD strip so it never clips defenders in the top lane
    const L = this.gridLeft + 40, W2 = this.W - 200 - L, y = GRID.hudTop - 7;
    g.fillStyle(0x0b0d12, 0.8); g.fillRoundedRect(L - 2, y - 2, W2 + 4, 6, 3);
    g.fillStyle(0x4cc9f0, 0.95); g.fillRoundedRect(L, y - 1, Math.max(2, W2 * frac), 4, 2);
    for (let i = 1; i <= total; i++) {
      const fx = L + W2 * (i / total);
      const final = i === total;
      g.fillStyle(final ? 0xf25f5c : 0x8b97ad, 1);
      g.fillRect(fx - 1, y - 6, 2, 6);
      g.fillTriangle(fx + 1, y - 6, fx + 7, y - 4, fx + 1, y - 2);
    }
  }

  drawBossBar() {
    const g = this.bossGfx;
    g.clear();
    if (!this.boss || !this.boss.active) { this.bossName.setVisible(false); return; }
    const b = this.boss;
    const frac = Phaser.Math.Clamp(b.hp / b.maxHp, 0, 1);
    const bw = 320, bh = 12, x = this.W / 2 - bw / 2, y = this.playTop + 22;
    g.fillStyle(0x0b0d12, 0.85); g.fillRoundedRect(x - 2, y - 2, bw + 4, bh + 4, 6);
    g.fillStyle(0xf25f5c, 1); g.fillRoundedRect(x, y, Math.max(6, bw * frac), bh, 5);
    g.fillStyle(0xffffff, 0.15); g.fillRoundedRect(x, y, Math.max(6, bw * frac), 4, 5);
    this.bossName.setVisible(true);
  }

  updateHud(time) {
    const shown = Math.floor(this.atp);
    if (shown !== this.atpShown) {
      if (shown > this.atpShown && time - this.atpPopAt > 180) {
        this.atpPopAt = time;
        this.tweens.killTweensOf(this.atpText);
        this.atpText.setScale(1);
        this.tweens.add({ targets: this.atpText, scaleX: 1.2, scaleY: 1.2, duration: 90, yoyo: true });
      }
      this.atpText.setText(`${shown}`);
      this.atpShown = shown;
    }

    for (let i = 0; i < this.pips.length; i++) {
      if (i < this.hearts) this.pips[i].setTint(0xf25f5c).setAlpha(1);
      else this.pips[i].setTint(0x3a4152).setAlpha(0.8);
    }

    const planning = this.mode === "planning", gap = this.mode === "gap";
    if (planning || gap) {
      const s = Math.max(0, Math.ceil(((planning ? this.planEnd : this.gapEnd) - time) / 1000));
      this.startCta.setLabel(`▶ Start ${planning ? "level" : "wave"} · ${s}s`).setVisible(true);
      this.waveText.setVisible(false);
    } else {
      this.startCta.setVisible(false);
      this.waveText.setVisible(true).setText(`LEVEL ${this.level} · WAVE ${this.waveIndex}/${this.totalWaves}`);
    }

    if (this.hearts <= 1) this.membrane.setAlpha(0.55 + 0.45 * Math.abs(Math.sin(time / 200)));
  }

  updateCards() {
    for (const card of this.cards) if (!card.locked) this.paintCard(card);
  }
}
