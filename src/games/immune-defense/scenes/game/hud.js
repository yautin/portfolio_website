import Phaser from "phaser";
import { GRID, RES } from "../../td/defs";
import { makeButton, makeIconButton } from "../../ui";

// Top HUD strip (ATP, wave status/CTA, hearts, menu), banners, and the
// per-frame bar drawing (HP bars, wave progress, boss bar). Mixed into
// GameScene.prototype — `this` is the scene.

const FONT = "'Mona Sans', system-ui, sans-serif";

export const hudMethods = {
  buildHud() {
    const { W } = this;
    const y1 = 22; // top content row (icons / text / buttons)
    this.hudRowY = y1;
    this.add.rectangle(0, 0, W, GRID.hudTop, 0x0d0f14, 0.9).setOrigin(0, 0).setDepth(15);
    this.add.rectangle(0, GRID.hudTop, W, 1, 0xffffff, 0.06).setOrigin(0, 1).setDepth(15);

    // left cluster: ATP
    this.add.image(28, y1, "atp").setDisplaySize(22, 22).setDepth(16);
    this.atpText = this.add.text(45, y1, "", { resolution: RES, fontFamily: FONT, fontSize: "18px", fontStyle: "800", color: "#e8ebf2" }).setOrigin(0, 0.5).setDepth(16);
    this.atpShown = -1;
    this.atpPopAt = 0;

    // centre cluster: wave status / Start CTA
    this.waveText = this.add.text(W / 2, y1, "", { resolution: RES, fontFamily: FONT, fontSize: "15px", fontStyle: "700", color: "#c4cdda" }).setOrigin(0.5).setDepth(16);
    this.startCta = makeButton(this, W / 2, y1, "▶ Start level · 20s", {
      variant: "primary", minWidth: 186, fontSize: 14, onClick: () => this.skipWait(),
    }).setDepth(16);
    this.tweens.add({ targets: this.startCta, scaleX: 1.03, scaleY: 1.03, yoyo: true, repeat: -1, duration: 720, ease: "Sine.inOut" });

    // right cluster: menu button, then hearts to its left with a clear gap
    this.menuBtn = makeIconButton(this, W - 28, y1, "☰", { onClick: () => this.togglePause(), size: 32 }).setDepth(16);
    this.pips = [];
    const pipGap = 18, pipRight = W - 66;
    for (let i = 0; i < this.maxHearts; i++) {
      const x = pipRight - (this.maxHearts - 1 - i) * pipGap;
      this.pips.push(this.add.image(x, y1, "heart").setDisplaySize(15, 15).setDepth(16));
    }

    this.banner = this.add.text(W / 2, this.playTop + 30, "", { resolution: RES, fontFamily: FONT, fontSize: "24px", fontStyle: "800", color: "#e8ebf2" })
      .setOrigin(0.5).setDepth(16).setAlpha(0);

    this.bossName = this.add.text(W / 2, this.playTop + 8, "", { resolution: RES, fontFamily: FONT, fontSize: "13px", fontStyle: "800", color: "#ffd0cf" })
      .setOrigin(0.5).setDepth(17).setVisible(false);
  },

  showBanner(text, color = "#e8ebf2") {
    this.banner.setText(text).setColor(color).setAlpha(1).setScale(0.8);
    this.tweens.add({ targets: this.banner, scale: 1, duration: 220, ease: "Back.out" });
    this.tweens.add({ targets: this.banner, alpha: 0, delay: 1000, duration: 400 });
  },

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
  },

  drawWaveBar() {
    const g = this.waveBarGfx;
    g.clear();

    // target fill (kill-based); always eased so the bar glides rather than jumps
    const total = this.totalWaves;
    let target = 0;
    if (this.mode === "wave") {
      const inWave = this.waveTotal > 0 ? Phaser.Math.Clamp((this.waveSpawned - this.pathogens.countActive(true)) / this.waveTotal, 0, 1) : 0;
      target = (this.waveIndex - 1 + inWave) / total;
    } else if (this.mode === "gap") {
      target = this.waveIndex / total;
    }
    target = Phaser.Math.Clamp(target, 0, 1);
    this.waveBarShown = Phaser.Math.Linear(this.waveBarShown, target, 0.09);

    // shown only during a wave — the Start CTA owns the HUD centre otherwise
    if (this.mode !== "wave" || (this.boss && this.boss.active)) return;
    const shown = this.waveBarShown;

    // dedicated progress row along the bottom of the HUD strip
    const L = 156, R = this.W - 156, BW = R - L, y = GRID.hudTop - 12;
    g.fillStyle(0x11161f, 1); g.fillRoundedRect(L - 3, y - 4, BW + 6, 8, 4);
    g.lineStyle(1, 0xffffff, 0.05); g.strokeRoundedRect(L - 3, y - 4, BW + 6, 8, 4);
    const fw = Math.max(4, BW * shown);
    g.lineStyle(0, 0, 0);
    g.fillStyle(0x4cc9f0, 1); g.fillRoundedRect(L, y - 2, fw, 4, 2);
    g.fillStyle(0xffffff, 0.28); g.fillRoundedRect(L, y - 2, fw, 1.5, 2); // gloss

    // flag checkpoint at each wave boundary (pennant on a pole + a node on the bar)
    for (let i = 1; i <= total; i++) {
      const cx = L + BW * (i / total);
      const passed = shown >= i / total - 0.004;
      const isFinal = i === total;
      const poleH = isFinal ? 16 : 12;
      const col = isFinal ? (passed ? 0x8ef0a0 : 0xf25f5c) : (passed ? 0x4cc9f0 : 0x8b97ad);
      g.fillStyle(0xaab4c6, passed ? 1 : 0.55); // pole
      g.fillRect(cx - 0.75, y - poleH, 1.5, poleH);
      const fpw = isFinal ? 11 : 8, fph = isFinal ? 8 : 6; // pennant
      g.fillStyle(col, passed ? 1 : 0.9);
      g.fillTriangle(cx + 0.75, y - poleH, cx + 0.75, y - poleH + fph, cx + 0.75 + fpw, y - poleH + fph / 2);
      g.fillStyle(0x11161f, 1); g.fillCircle(cx, y, isFinal ? 5 : 4); // node backing
      g.fillStyle(passed ? col : 0x3a4552, 1); g.fillCircle(cx, y, isFinal ? 3.2 : 2.4);
    }
  },

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
  },

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
      const s = Math.max(0, Math.ceil(this.countdown / 1000));
      this.startCta.setLabel(`▶ Start ${planning ? "level" : "wave"} · ${s}s`).setVisible(true);
      this.waveText.setVisible(false);
    } else {
      this.startCta.setVisible(false);
      this.waveText.setVisible(true).setText(`LEVEL ${this.level} · WAVE ${this.waveIndex}/${this.totalWaves}`);
    }

    if (this.hearts <= 1) this.membrane.setAlpha(0.55 + 0.45 * Math.abs(Math.sin(time / 200)));
  },
};
