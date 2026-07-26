import Phaser from "phaser";
import { GRID, RES } from "../../td/defs";

// Play-field construction: background, lanes, grid, entry gutter, the
// defended organ, and its integrity tinting. Mixed into GameScene.prototype —
// `this` is the scene.

const FONT = "'Mona Sans', system-ui, sans-serif";
const integrityColor = (frac) => (frac > 0.6 ? 0x4cc9f0 : frac > 0.3 ? 0xf4a259 : 0xf25f5c);

export const fieldMethods = {
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
  },

  applyIntegrity() {
    const col = integrityColor(this.hearts / this.maxHearts);
    this.membrane.setFillStyle(col).setAlpha(1);
    this.organRing.setStrokeStyle(3, col, 0.6);
    this.organNucleus.setFillStyle(Phaser.Display.Color.IntegerToColor(col).darken(55).color);
  },

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
      .text(this.W / 2, y, "＋ New lane", { resolution: RES, fontFamily: FONT, fontSize: "18px", fontStyle: "800", color: "#4cc9f0" })
      .setOrigin(0.5).setDepth(16).setAlpha(0);
    this.tweens.add({ targets: label, alpha: 1, duration: 300, yoyo: true, hold: 1000, onComplete: () => label.destroy() });
  },
};
