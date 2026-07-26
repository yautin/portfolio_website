import Phaser from "phaser";
import { RES, DIFFICULTIES, fmtTime } from "../td/defs";
import { UI, viewport, ambience, gradientText, makeButton, REDUCED } from "../ui";

const FONT = "'Mona Sans', system-ui, sans-serif";

export default class EndScene extends Phaser.Scene {
  constructor() {
    super("End");
  }

  create(data) {
    const { W, H } = viewport(this);
    const cx = W / 2, cy = H / 2;
    const win = data?.result === "win";
    const diff = data?.difficulty || "easy";
    const ms = data?.ms || 0;

    ambience(this, W, H);

    // outcome disc
    const disc = this.add.graphics();
    const ring = win ? UI.cyan : UI.danger;
    disc.fillStyle(ring, 0.05); disc.fillCircle(cx, cy - 46, 58);
    disc.lineStyle(2, ring, 0.5); disc.strokeCircle(cx, cy - 46, 58);
    const emoji = this.add.text(cx, cy - 46, win ? "🧪" : "☣️", { resolution: RES, fontFamily: FONT, fontSize: "48px" }).setOrigin(0.5);
    if (!REDUCED) this.tweens.add({ targets: emoji, scale: { from: 0.2, to: 1 }, ease: "Back.out", duration: 460 });

    const title = win
      ? gradientText(this, cx, cy + 34, "ASSAY COMPLETE", { fontSize: 34, from: "#4cc9f0", to: "#52d1a4", fontStyle: "900" })
      : gradientText(this, cx, cy + 34, "CONTAMINATION", { fontSize: 34, from: "#f4a259", to: "#f25f5c", fontStyle: "900" });
    if (!REDUCED) this.tweens.add({ targets: title, scale: { from: 0.85, to: 1 }, ease: "Back.out", duration: 420 });

    const sub = win ? `${DIFFICULTIES[diff].label} chip cleared — every infected cell contained, no rupture.` : "A fragile infected cell ruptured — its payload spread through the flow and contaminated the assay.";
    this.add.text(cx, cy + 64, sub, { resolution: RES, fontFamily: FONT, fontSize: "14px", color: UI.dim }).setOrigin(0.5);

    if (win) {
      // star rating (pops in)
      const stars = data?.stars || 1;
      for (let i = 0; i < 3; i++) {
        const st = this.add.image(cx - 26 + i * 26, cy + 100, "star").setDisplaySize(22, 22).setTint(i < stars ? 0xffd54a : 0x3a4552);
        if (!REDUCED && i < stars) { const sc = st.scaleX; st.setScale(0); this.tweens.add({ targets: st, scaleX: sc, scaleY: sc, ease: "Back.out", duration: 320, delay: 200 + i * 140 }); }
      }
      const line = `Time  ${fmtTime(ms)}      Best  ${data?.best != null ? fmtTime(data.best) : fmtTime(ms)}`;
      this.add.text(cx, cy + 134, line, { resolution: RES, fontFamily: FONT, fontSize: "14px", fontStyle: "700", color: UI.sub }).setOrigin(0.5);
      if (data?.improved) {
        const nb = this.add.text(cx, cy + 156, "✦ NEW BEST ✦", { resolution: RES, fontFamily: FONT, fontSize: "12px", fontStyle: "800", color: UI.healCss }).setOrigin(0.5);
        if (!REDUCED) this.tweens.add({ targets: nb, alpha: { from: 0.4, to: 1 }, yoyo: true, repeat: -1, duration: 700 });
      }
    } else {
      this.add.text(cx, cy + 104, `Survived  ${fmtTime(ms)}`, { resolution: RES, fontFamily: FONT, fontSize: "14px", fontStyle: "700", color: UI.sub }).setOrigin(0.5);
    }

    const by = cy + 196;
    makeButton(this, cx - 78, by, win ? "▶ New culture" : "↻ Try again", { variant: "primary", minWidth: 140, onClick: () => this.scene.start("Game", { difficulty: diff }) });
    makeButton(this, cx + 78, by, "Menu", { variant: "secondary", minWidth: 120, onClick: () => this.scene.start("Menu") });

    this.input.keyboard.addCapture("ENTER");
    this.input.keyboard.on("keydown-ENTER", () => this.scene.start("Game", { difficulty: diff }));
  }
}
