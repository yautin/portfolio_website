import Phaser from "phaser";
import { sfx } from "../../audio";
import { DEFENDERS, UPGRADES, RES } from "../../td/defs";
import { Defender } from "../../td/entities";
import { makeButton } from "../../ui";

// Pointer/keyboard input and everything it drives: card selection, the live
// placement ghost, placing/selling defenders, and the tap-to-upgrade prompt.
// Mixed into GameScene.prototype — `this` is the scene.

export const placementMethods = {
  buildGhost() {
    this.cellHi = this.add.rectangle(0, 0, this.colW - 4, this.laneH - 4, 0x4cc9f0, 0.12)
      .setStrokeStyle(2, 0x4cc9f0, 0.6).setDepth(2).setVisible(false);
    this.ghost = this.add.image(0, 0, this.units[0] ? DEFENDERS[this.units[0]].texture : "def-antibody")
      .setScale(1 / RES).setAlpha(0.55).setDepth(3).setVisible(false);
  },

  bindInput() {
    this.input.on("pointerdown", (p) => this.onPointerDown(p));
    this.input.on("pointermove", (p) => this.onPointerMove(p));
    this.input.on("pointerup", () => this.cancelPress());
    const keys = ["ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN"];
    this.units.forEach((key, i) => this.input.keyboard.on(`keydown-${keys[i]}`, () => this.selectCard(key)));
    this.input.keyboard.addCapture("P");
    this.input.keyboard.on("keydown-P", () => this.togglePause());
  },

  selectCard(key) {
    if (key && !this.units.includes(key)) return;
    this.selected = this.selected === key ? null : key;
    this.hideUpgradePrompt();
    if (!this.selected) { this.ghost.setVisible(false); this.cellHi.setVisible(false); }
  },

  onPointerMove(p) {
    if (this.pressData && Phaser.Math.Distance.Between(p.worldX, p.worldY, this.pressData.x, this.pressData.y) > 12) this.clearPress();
    this.refreshPreview();
  },

  // Live placement preview — recomputed every frame from the current pointer so
  // the ghost/highlight reflect cooldown & ATP even while the pointer is held
  // still. (Previously only pointermove refreshed it, so a stationary pointer
  // stayed stale-red after a cooldown/ATP freed up.)
  refreshPreview() {
    if (this.paused || !this.selected) { this.ghost.setVisible(false); this.cellHi.setVisible(false); return; }
    const p = this.input.activePointer;
    const cell = this.cellAt(p.worldX, p.worldY);
    if (!cell || this.cells[this.cellIndex(cell.col, cell.row)]) { this.ghost.setVisible(false); this.cellHi.setVisible(false); return; }
    const def = DEFENDERS[this.selected];
    const card = this.cards.find((c) => c.key === this.selected);
    const ok = this.atp >= def.cost && this.time.now >= card.cdEnd;
    const x = this.colX(cell.col), y = this.laneY(cell.row);
    this.cellHi.setPosition(x, y).setFillStyle(ok ? 0x4cc9f0 : 0xf25f5c, 0.12).setStrokeStyle(2, ok ? 0x4cc9f0 : 0xf25f5c, 0.6).setVisible(true);
    this.ghost.setTexture(def.texture).setPosition(x, y).setTint(ok ? 0x9ef0a0 : 0xf25f5c).setVisible(true);
  },

  onPointerDown(p) {
    if (this.paused || this.mode === "over") return;
    const cell = this.cellAt(p.worldX, p.worldY);

    // right-click sells
    if (p.rightButtonDown && p.rightButtonDown()) { if (cell) this.sellAt(cell); return; }

    // tap/hold on an occupied cell (no card): hold = sell, tap = upgrade prompt
    if (cell && this.cells[this.cellIndex(cell.col, cell.row)] && !this.selected) {
      this.pressData = { cell, x: p.worldX, y: p.worldY };
      this.pressTimer = this.time.delayedCall(500, () => { this.pressTimer = null; this.sellAt(cell); this.pressData = null; });
      return;
    }

    if (!this.selected) return;
    if (p.worldY < this.playTop || p.worldY >= this.playBottom || !cell) return;
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
    this.tweens.add({ targets: d, scale: 1 / RES, duration: 180, ease: "Back.out" });
    this.burst(d.x, d.y, def.color, 6, 16);
    if (def.role === "mine") {
      this.time.delayedCall(def.armTime, () => { if (d.active) { d.armed = true; this.burst(d.x, d.y, 0xffe08a, 6, 14); sfx.arm(); } });
    }
    if (this.tutorial) this.endTutorial();
    this.refreshPreview();
  },

  clearPress() {
    if (this.pressTimer) { this.pressTimer.remove(); this.pressTimer = null; }
    this.pressData = null;
  },

  cancelPress() {
    // released before the hold fired → treat as a tap (upgrade prompt)
    if (this.pressTimer && this.pressData) {
      this.pressTimer.remove(); this.pressTimer = null;
      const d = this.cells[this.cellIndex(this.pressData.cell.col, this.pressData.cell.row)];
      if (d && d.active) this.toggleUpgradePrompt(d);
    }
    this.pressData = null;
  },

  sellAt(cell) {
    const d = this.cells[this.cellIndex(cell.col, cell.row)];
    if (!d || !d.active || d.spent) return;
    const refund = Math.floor(d.def.cost * 0.5);
    this.atp += refund;
    this.floatText(d.x, d.y - 12, `+${refund}`, "#4cc9f0", 800);
    sfx.sell();
    if (this.upgradeFor === d) this.hideUpgradePrompt();
    this.destroyDefender(d, true);
  },

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
  },

  hideUpgradePrompt() {
    if (this.upgradeBtn) { this.upgradeBtn.destroy(); this.upgradeBtn = null; }
    if (this.upgradeTimer) { this.upgradeTimer.remove(); this.upgradeTimer = null; }
    this.upgradeFor = null;
  },

  doUpgrade(d, up) {
    if (d.upgraded || this.atp < up.cost) { sfx.nope(); return; }
    this.atp -= up.cost;
    d.def = { ...d.def, ...up.patch };
    d.upgraded = true;
    sfx.upgrade();
    this.burst(d.x, d.y, 0xffe08a, 14, 22);
    d.upgradeMark = this.add.image(d.x + 14, d.y - 14, "star").setTint(0xffe08a).setDisplaySize(12, 12).setDepth(6);
    this.hideUpgradePrompt();
  },
};
