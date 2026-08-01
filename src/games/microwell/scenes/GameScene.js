import Phaser from "phaser";
import { DIFFICULTIES, getDifficulty } from "../td/defs";
import { viewport, ambience } from "../ui";
import { HUD_H } from "./game/constants";
import { boardMethods } from "./game/board";
import { hudMethods } from "./game/hud";
import { inputMethods } from "./game/input";
import { rulesMethods } from "./game/rules";
import { outcomeMethods } from "./game/outcome";
import { fxMethods } from "./game/fx";

// The play scene, decomposed by concern the same way Immune Defense's is: this
// class owns state, the scene graph and the frame loop; the per-concern method
// modules under ./game/ are mixed onto the prototype below (verbatim
// `this`-based methods, so the scene stays one Phaser object at runtime).
//
//   board.js    geometry + well/channel/hover rendering
//   hud.js      the fixed top strip and the scan arm/disarm
//   input.js    pointer disambiguation, pinch/drag/wheel pan-zoom
//   rules.js    seeding, probing, scanning, flagging, chording, flood fill
//   outcome.js  win / lose and the handoff to the End scene
//   fx.js       cosmetic flourishes

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

    // Board layer lives in a container so pinch-zoom / drag-pan can transform it
    // (scale + position) while the HUD — added later, OUTSIDE the container —
    // stays fixed. cellAt() inverts this transform for picking.
    this.board = this.add.container(0, 0);
    this.chanGfx = this.add.graphics(); // microfluidic channel lattice, behind the wells
    this.drawChannels();
    this.boardGfx = this.add.graphics();
    this.hoverGfx = this.add.graphics();
    this.board.add([this.chanGfx, this.boardGfx, this.hoverGfx]);
    this.drawBoard();

    // Clip the board to the play area so a panned/zoomed board never bleeds
    // under the fixed HUD strip or past the edges.
    const clip = this.make.graphics();
    clip.fillStyle(0xffffff).fillRect(0, HUD_H, W, H - HUD_H);
    this.board.setMask(clip.createGeometryMask());

    this.buildHUD();
    this.wireInput();

    this.input.keyboard.addCapture("R,S");
    this.input.keyboard.on("keydown-R", () => this.scene.restart({ difficulty: this.diff }));
    this.input.keyboard.on("keydown-S", () => this.toggleScan());
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

Object.assign(
  GameScene.prototype,
  boardMethods,
  hudMethods,
  inputMethods,
  rulesMethods,
  outcomeMethods,
  fxMethods,
);
