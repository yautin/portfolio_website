import Phaser from "phaser";
import { RES, DIFFICULTIES, DIFFICULTY_ORDER, getDifficulty, setDifficulty, getBestFor, getStats, fmtTime } from "../td/defs";
import { UI, viewport, ambience, gradientText, makeButton, REDUCED } from "../ui";

const FONT = "'Mona Sans', system-ui, sans-serif";

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super("Menu");
  }

  create() {
    const { W, H } = viewport(this);
    const difficulty = getDifficulty();
    const d = DIFFICULTIES[difficulty];
    const cx = W / 2;
    const cy = H / 2;

    ambience(this, W, H);

    // lab-on-a-chip motif framing the content
    const chipW = Math.min(W * 0.62, 460), chipH = Math.min(H * 0.74, 360);
    const cl = cx - chipW / 2, ct = cy - chipH / 2;
    const chip = this.add.graphics();
    chip.fillStyle(0x4cc9f0, 0.025); chip.fillRoundedRect(cl, ct, chipW, chipH, 22);
    chip.lineStyle(2, 0x4cc9f0, 0.16); chip.strokeRoundedRect(cl, ct, chipW, chipH, 22);
    chip.lineStyle(1, 0x9d4edd, 0.14); chip.strokeRoundedRect(cl + 7, ct + 7, chipW - 14, chipH - 14, 16);
    // faint microfluidic well-array + channel lines (chip substrate)
    const gcols = 7, grows = 5, gx = chipW / (gcols + 1), gy = chipH / (grows + 1);
    for (let r = 1; r <= grows; r++) {
      const yy = ct + gy * r;
      chip.lineStyle(1, 0x4cc9f0, 0.06); chip.lineBetween(cl + gx * 0.4, yy, cl + chipW - gx * 0.4, yy);
      chip.fillStyle(0x4cc9f0, 0.10);
      for (let c = 1; c <= gcols; c++) chip.fillCircle(cl + gx * c, yy, 2.2);
    }
    // inlet / outlet ports
    chip.lineStyle(2, 0x9d4edd, 0.18);
    chip.lineBetween(cl - 12, cy, cl, cy);
    chip.lineBetween(cl + chipW, cy, cl + chipW + 12, cy);
    if (!REDUCED) this.tweens.add({ targets: chip, alpha: { from: 0.72, to: 1 }, yoyo: true, repeat: -1, duration: 2600, ease: "Sine.inOut" });

    const title = gradientText(this, cx, cy - 118, "MICROWELL", { fontSize: 42, fontStyle: "900" });
    title.setShadow(0, 3, "rgba(76,201,240,0.35)", 12);
    if (!REDUCED) this.tweens.add({ targets: title, y: cy - 122, yoyo: true, repeat: -1, duration: 2600, ease: "Sine.inOut" });

    this.add.text(cx, cy - 80, "Live-cell microfluidic assay", {
      resolution: RES, fontFamily: FONT, fontSize: "15px", fontStyle: "700", color: UI.cyanCss,
    }).setOrigin(0.5);
    this.add.text(cx, cy - 58, "Probe the chip, flag infected cells, keep the assay clean.", {
      resolution: RES, fontFamily: FONT, fontSize: "13px", color: UI.dim,
    }).setOrigin(0.5);

    // difficulty toggle
    this.add.text(cx, cy - 22, "DIFFICULTY", {
      resolution: RES, fontFamily: FONT, fontSize: "11px", fontStyle: "700", color: UI.dim,
    }).setOrigin(0.5).setLetterSpacing?.(2);

    const setDiff = (k) => { if (k !== difficulty) { setDifficulty(k); this.scene.restart(); } };
    const spots = [cx - 108, cx, cx + 108];
    DIFFICULTY_ORDER.forEach((k, i) => {
      makeButton(this, spots[i], cy + 6, DIFFICULTIES[k].label, {
        variant: k === difficulty ? "primary" : "secondary", minWidth: 96, fontSize: 14, onClick: () => setDiff(k),
      });
    });

    // slide stats for the chosen difficulty
    this.add.text(cx, cy + 44, `${d.cols}×${d.rows} chip   ·   ${d.mines} infected cells   ·   🔬 ${d.scans} scans`, {
      resolution: RES, fontFamily: FONT, fontSize: "13px", fontStyle: "600", color: UI.sub,
    }).setOrigin(0.5);

    const best = getBestFor(difficulty);
    const { wins } = getStats();
    this.add.text(cx, cy + 68, `Best  ${best != null ? fmtTime(best) : "—"}      Assays cleared  ${wins}`, {
      resolution: RES, fontFamily: FONT, fontSize: "12px", color: UI.dim,
    }).setOrigin(0.5);

    const play = makeButton(this, cx, cy + 112, "▶  Run assay", {
      variant: "primary", minWidth: 220, fontSize: 17, onClick: () => this.start(),
    });
    if (!REDUCED) this.tweens.add({ targets: play, scaleX: 1.03, scaleY: 1.03, yoyo: true, repeat: -1, duration: 900, ease: "Sine.inOut" });

    this.add.text(cx, cy + 150, "Left-click to probe a cell   ·   right-click or hold to flag infection   ·   click a number to chord", {
      resolution: RES, fontFamily: FONT, fontSize: "11px", color: UI.dim,
    }).setOrigin(0.5);

    this.input.keyboard.addCapture("ENTER");
    this.input.keyboard.on("keydown-ENTER", () => this.start());
  }

  start() {
    this.scene.start("Game", { difficulty: getDifficulty() });
  }
}
