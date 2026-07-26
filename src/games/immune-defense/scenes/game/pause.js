import { RES } from "../../td/defs";
import { makeButton } from "../../ui";

// Pause overlay: freezes physics/time/tweens and shows the resume / restart /
// level-select dialog. Mixed into GameScene.prototype — `this` is the scene.

const FONT = "'Mona Sans', system-ui, sans-serif";

export const pauseMethods = {
  togglePause() {
    if (this.mode === "over") return;
    if (this.paused) this.resumeGame();
    else this.pauseGame();
  },

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
    els.push(this.add.text(W / 2, H / 2 - 66, "PAUSED", { resolution: RES, fontFamily: FONT, fontSize: "26px", fontStyle: "800", color: "#e8ebf2" }).setOrigin(0.5).setDepth(41));
    const mkBtn = (label, y, variant, action) => els.push(makeButton(this, W / 2, y, label, { variant, minWidth: 208, onClick: action }).setDepth(41));
    mkBtn("Resume", H / 2 - 22, "primary", () => this.resumeGame());
    mkBtn("Restart level", H / 2 + 20, "secondary", () => { this.resumeGame(); this.scene.restart({ level: this.level }); });
    mkBtn("Level select", H / 2 + 62, "secondary", () => { this.resumeGame(); this.scene.start("Menu"); });
    this.pauseEls = els;
  },

  resumeGame() {
    if (!this.paused) return;
    this.paused = false;
    this.physics.resume();
    this.time.paused = false;
    this.tweens.resumeAll();
    if (this.pauseEls) this.pauseEls.forEach((e) => e.destroy());
    this.pauseEls = null;
  },
};
