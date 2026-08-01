import { RES } from "../../td/defs";
import { UI, makeButton, makeIconButton, REDUCED } from "../../ui";
import { sfx } from "../../audio";
import { FONT } from "./constants";

// The fixed top HUD strip (remaining-pathogen count, timer, scan button, restart
// and menu) plus the arm/disarm state of the non-invasive scan. Mixed into
// GameScene.prototype — `this` is the scene.

export const hudMethods = {
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
  },

  updateHUD() {
    this.pathoText.setText(`🦠 ${this.mines - this.flagsPlaced}`);
    this.scanBtn.setLabel(`🔬 ${this.scansLeft}`);
    this.scanBtn.setButtonEnabled(this.scansLeft > 0 && !this.ended);
    this.armedBanner.setVisible(this.scanArmed);
  },

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
  },
};
