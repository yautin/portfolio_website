import Phaser from "phaser";
import { sfx } from "../audio";
import {
  GRID,
  PLANNING_TIME,
  WAVE_GAP,
  AMBIENT_ATP,
  AMBIENT_EVERY,
  TUTORIAL_KEY,
  lanesForLevel,
  unitsForLevel,
  wavesForLevel,
  startAtpForLevel,
  heartsForRun,
  isBossLevel,
  modifierForLevel,
} from "../td/defs";
import { viewport } from "../ui";
import { fieldMethods } from "./game/field";
import { hudMethods } from "./game/hud";
import { toolbarMethods } from "./game/toolbar";
import { placementMethods } from "./game/placement";
import { pauseMethods } from "./game/pause";
import { combatMethods } from "./game/combat";
import { fxMethods } from "./game/fx";

// The play scene, decomposed by concern: this class owns state, geometry and
// the frame loop; the per-concern method modules under ./game/ are mixed onto
// the prototype below (verbatim `this`-based methods, so the scene remains
// one Phaser object at runtime).

export default class GameScene extends Phaser.Scene {
  constructor() {
    super("Game");
  }

  init(data) {
    this.level = data?.level || 1;
  }

  create() {
    const { W, H } = viewport(this);
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
    // countdown budget (ms) for the current planning / gap phase, ticked by
    // frame delta while the scene updates — a fresh 20s every level, immune to
    // absolute-clock drift, pausing, and scene restarts
    this.countdown = PLANNING_TIME;
    this.waveIndex = 0;
    this.waveTotal = 0;
    this.waveSpawned = 0;
    this.waveBarShown = 0; // smoothed fill for the progress bar
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

  // --- main loop -------------------------------------------------------
  update(_loopTime, delta) {
    if (this.mode === "over" || this.paused) return;
    this.specks.tilePositionX += delta * 0.004;

    this.updateDefenders(delta);
    this.updatePathogens(delta / 1000);
    this.cullProjectiles();

    if (this.mode === "wave") {
      if (this.waveSpawned >= this.waveTotal && this.pathogens.countActive(true) === 0) {
        if (this.waveIndex >= this.totalWaves) this.levelComplete();
        else { this.mode = "gap"; this.countdown = WAVE_GAP; this.floatText(this.W / 2, this.playTop + 58, "Wave cleared", "#4cc9f0", 1100); }
      }
    } else if (this.mode === "planning" || this.mode === "gap") {
      this.countdown -= delta;
      if (this.countdown <= 0) this.startNextWave();
    }

    this.drawBars();
    this.drawWaveBar();
    this.drawBossBar();
    this.updateHud(this.time.now);
    this.updateCards();
    this.refreshPreview();
  }
}

Object.assign(
  GameScene.prototype,
  fieldMethods,
  hudMethods,
  toolbarMethods,
  placementMethods,
  pauseMethods,
  combatMethods,
  fxMethods,
);
