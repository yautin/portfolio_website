import Phaser from "phaser";
import { TOTAL_LEVELS, RES, getProgress, getStars, getDifficulty, setDifficulty } from "../td/defs";
import { makeButton, redrawRoundRect, viewport } from "../ui";

const FONT = "'Mona Sans', system-ui, sans-serif";

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super("Menu");
  }

  create() {
    const { W, H } = viewport(this);
    const progress = getProgress();
    const difficulty = getDifficulty();

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x161922, 0x161922, 0x0f1116, 0x0f1116, 1);
    bg.fillRect(0, 0, W, H);
    this.add.tileSprite(0, 0, W, H, "specks").setOrigin(0, 0).setAlpha(0.6);

    this.add.text(W / 2, H / 2 - 158, "IMMUNE DEFENSE", { resolution: RES, fontFamily: FONT, fontSize: "34px", fontStyle: "800", color: "#e8ebf2" }).setOrigin(0.5);
    this.add.text(W / 2, H / 2 - 126, "Place immune defenders — stop the pathogens reaching the cell.", {
      resolution: RES, fontFamily: FONT, fontSize: "14px", color: "#8b97ad",
    }).setOrigin(0.5);

    // difficulty toggle
    this.add.text(W / 2 - 118, H / 2 - 84, "Difficulty", { resolution: RES, fontFamily: FONT, fontSize: "13px", fontStyle: "700", color: "#8b97ad" }).setOrigin(0, 0.5);
    const setDiff = (k) => { if (k !== difficulty) { setDifficulty(k); this.scene.restart(); } };
    makeButton(this, W / 2 - 4, H / 2 - 84, "Easy", { variant: difficulty === "easy" ? "primary" : "secondary", minWidth: 84, fontSize: 13, onClick: () => setDiff("easy") });
    makeButton(this, W / 2 + 88, H / 2 - 84, "Normal", { variant: difficulty === "normal" ? "primary" : "secondary", minWidth: 84, fontSize: 13, onClick: () => setDiff("normal") });

    // level-select grid (8 per row, 15 levels)
    const perRow = 8, bw = 76, bh = 56, gap = 14;
    const rowW = perRow * bw + (perRow - 1) * gap;
    const startX = (W - rowW) / 2 + bw / 2;
    const topY = H / 2 - 20;

    for (let lvl = 1; lvl <= TOTAL_LEVELS; lvl++) {
      const i = lvl - 1;
      const x = startX + (i % perRow) * (bw + gap);
      const y = topY + Math.floor(i / perRow) * (bh + gap);
      const unlocked = lvl <= progress;
      const current = lvl === progress;

      const g = this.add.graphics();
      const paint = (hover) =>
        redrawRoundRect(g, bw, bh, 10, {
          fill: unlocked ? (hover ? 0x27344a : 0x1d2634) : 0x151a22,
          stroke: current ? 0x4cc9f0 : unlocked ? 0x33405a : 0x232a36,
          strokeW: current ? 2 : 1.5, highlight: unlocked,
        });
      paint(false);

      const num = this.add.text(0, -10, `${lvl}`, {
        resolution: RES, fontFamily: FONT, fontSize: "20px", fontStyle: "800", color: unlocked ? "#e8ebf2" : "#3a4152",
      }).setOrigin(0.5);
      const children = [g, num];

      if (unlocked) {
        const earned = getStars(lvl);
        for (let s = 0; s < 3; s++) {
          children.push(this.add.image(-12 + s * 12, 14, "star").setDisplaySize(10, 10).setTint(s < earned ? 0xffd54a : 0x3a4552));
        }
        const hit = this.add.rectangle(0, 0, bw, bh, 0x000000, 0).setInteractive({ useHandCursor: true });
        hit.on("pointerover", () => paint(true));
        hit.on("pointerout", () => paint(false));
        hit.on("pointerup", () => this.scene.start("Game", { level: lvl }));
        children.push(hit);
      } else {
        const lock = this.add.graphics();
        lock.fillStyle(0x3a4152, 1).fillRoundedRect(-6, 12, 12, 9, 2);
        lock.lineStyle(2, 0x3a4152, 1);
        lock.beginPath(); lock.arc(0, 12, 4, Math.PI, 0); lock.strokePath();
        children.push(lock);
      }
      this.add.container(x, y, children);
    }

    const cont = makeButton(this, W / 2, H / 2 + 172, `Continue — Level ${progress}`, {
      variant: "primary", minWidth: 220, onClick: () => this.scene.start("Game", { level: progress }),
    });
    this.tweens.add({ targets: cont, scaleX: 1.03, scaleY: 1.03, yoyo: true, repeat: -1, duration: 900, ease: "Sine.inOut" });

    this.input.keyboard.addCapture("ENTER");
    this.input.keyboard.on("keydown-ENTER", () => this.scene.start("Game", { level: progress }));
  }
}
