import Phaser from "phaser";
import { TOTAL_LEVELS, DEFENDERS } from "../td/defs";
import { sfx } from "../audio";
import { makeButton, roundRectGraphics } from "../ui";

const FONT = "'Mona Sans', system-ui, sans-serif";

// Shown between levels: clear (advance, with an unlock reveal), victory
// (campaign done), or defeat (retry).
export default class InterludeScene extends Phaser.Scene {
  constructor() {
    super("Interlude");
  }

  init(data) {
    this.outcome = data?.outcome || "clear";
    this.level = data?.level || 1;
    this.unlocked = data?.unlocked || null;
    this.stars = data?.stars || 0;
    this.score = data?.score || 0;
  }

  create() {
    const { width: W, height: H } = this.scale;

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x161922, 0x161922, 0x0f1116, 0x0f1116, 1);
    bg.fillRect(0, 0, W, H);
    this.add.tileSprite(0, 0, W, H, "specks").setOrigin(0, 0).setAlpha(0.55);

    if (this.outcome === "victory") {
      this.buildEnd("VICTORY", "You cleared all 15 levels — the body is defended.", "#4cc9f0",
        "Play again", () => this.scene.start("Game", { level: 1 }), true);
    } else if (this.outcome === "defeat") {
      this.buildEnd("The cell was overrun", `Level ${this.level} failed.`, "#e8ebf2",
        "Retry level", () => this.scene.start("Game", { level: this.level }), false);
    } else if (this.unlocked) {
      this.buildUnlock();
    } else {
      this.buildEnd(`Level ${this.level} cleared`, "The defenders held the line.", "#4cc9f0",
        "Next level →", () => this.scene.start("Game", { level: Math.min(TOTAL_LEVELS, this.level + 1) }), true);
    }
  }

  buildEnd(title, subtitle, titleColor, primary, primaryAction, showStars) {
    const { width: W, height: H } = this.scale;
    const withStars = showStars && this.stars > 0;
    const top = withStars ? H / 2 - 78 : H / 2 - 54;
    this.add.text(W / 2, top, title, { fontFamily: FONT, fontSize: "32px", fontStyle: "800", color: titleColor }).setOrigin(0.5);
    this.add.text(W / 2, top + 40, subtitle, { fontFamily: FONT, fontSize: "16px", color: "#c4cdda" }).setOrigin(0.5);
    if (withStars) {
      this.starRow(W / 2, top + 88, this.stars);
      this.add.text(W / 2, top + 122, `Score ${this.score}`, { fontFamily: FONT, fontSize: "14px", fontStyle: "700", color: "#8b97ad" }).setOrigin(0.5);
      this.buttons(top + 158, primary, primaryAction);
    } else {
      this.buttons(top + 98, primary, primaryAction);
    }
  }

  // Celebratory reveal of the newly-unlocked defender as an animated card.
  buildUnlock() {
    const { width: W, height: H } = this.scale;
    const def = DEFENDERS[this.unlocked];

    this.add.text(W / 2, 34, `Level ${this.level} cleared`, { fontFamily: FONT, fontSize: "22px", fontStyle: "800", color: "#e8ebf2" }).setOrigin(0.5);
    this.starRow(W / 2, 64, this.stars, 0.9);
    this.add.text(W / 2, 92, "NEW DEFENDER UNLOCKED", { fontFamily: FONT, fontSize: "13px", fontStyle: "800", color: "#4cc9f0" }).setOrigin(0.5);

    const cardW = 300, cardH = 138;
    const card = this.add.container(W / 2, 188).setDepth(5);
    const glow = roundRectGraphics(this, cardW + 14, cardH + 14, 18, { fill: def.color, fillAlpha: 0.16 });
    const panel = roundRectGraphics(this, cardW, cardH, 14, { fill: 0x1b2130, fillAlpha: 1, stroke: def.color, strokeW: 2, highlight: true });
    const icon = this.add.image(-cardW / 2 + 48, -cardH / 2 + 40, def.texture).setDisplaySize(56, 56);
    const name = this.add.text(-cardW / 2 + 86, -cardH / 2 + 28, def.name, { fontFamily: FONT, fontSize: "20px", fontStyle: "800", color: "#e8ebf2" }).setOrigin(0, 0.5);
    const cost = this.add.text(-cardW / 2 + 86, -cardH / 2 + 50, `${def.cost} ATP`, { fontFamily: FONT, fontSize: "13px", fontStyle: "700", color: "#8b97ad" }).setOrigin(0, 0.5);
    const blurb = this.add.text(0, 22, def.blurb, {
      fontFamily: FONT, fontSize: "13px", color: "#c4cdda", align: "center", wordWrap: { width: cardW - 34 }, lineSpacing: 3,
    }).setOrigin(0.5, 0.5);
    card.add([glow, panel, icon, name, cost, blurb]);

    card.setScale(0.4).setAlpha(0);
    this.tweens.add({ targets: card, scale: 1, alpha: 1, duration: 420, ease: "Back.out" });
    this.tweens.add({ targets: glow, alpha: 0.4, yoyo: true, repeat: -1, duration: 900, ease: "Sine.inOut" });
    this.tweens.add({ targets: icon, angle: { from: -6, to: 6 }, yoyo: true, repeat: -1, duration: 1400, ease: "Sine.inOut" });

    this.buttons(H - 34, "Next level →", () => this.scene.start("Game", { level: Math.min(TOTAL_LEVELS, this.level + 1) }));
  }

  starRow(cx, y, earned, scale = 1) {
    const gap = 34 * scale;
    const full = 1.5 * scale;
    for (let i = 0; i < 3; i++) {
      const s = this.add.image(cx + (i - 1) * gap, y, "star").setDepth(6);
      if (i < earned) {
        s.setTint(0xffd54a).setScale(0);
        this.tweens.add({ targets: s, scale: full, duration: 260, delay: 320 + i * 200, ease: "Back.out", onComplete: () => sfx.star() });
      } else {
        s.setTint(0x2b3345).setScale(full);
      }
    }
  }

  buttons(y, primary, primaryAction) {
    const { width: W } = this.scale;
    makeButton(this, W / 2 - 94, y, primary, { variant: "primary", minWidth: 158, onClick: primaryAction });
    makeButton(this, W / 2 + 94, y, "Level select", { variant: "secondary", minWidth: 158, onClick: () => this.scene.start("Menu") });

    this.input.keyboard.addCapture("ENTER,SPACE");
    this.time.delayedCall(250, () => {
      this.input.keyboard.on("keydown-ENTER", primaryAction);
      this.input.keyboard.on("keydown-SPACE", primaryAction);
    });
  }
}
