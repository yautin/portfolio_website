import { RES, recordWin, getBestFor, starsForTime } from "../../td/defs";
import { UI, REDUCED } from "../../ui";
import { sfx } from "../../audio";
import { ADD, FONT, PTEX } from "./constants";

// End of the assay: the win check, the clean-finish sequence, the outbreak on a
// ruptured cell, and the handoff to the End scene. Mixed into
// GameScene.prototype — `this` is the scene.

export const outcomeMethods = {
  checkWin() {
    if (this.ended) return;
    if (this.revealedCount >= this.totalSafe) this.win();
  },

  win() {
    this.ended = true; this.won = true;
    this.elapsed = this.time.now - this.startAt;
    this.hoverGfx.clear();
    // flag any remaining pathogens as a clean finish
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) {
      const cell = this.cells[r][c];
      if (cell.pathogen && !cell.flagged) { cell.flagged = true; this.flagsPlaced += 1; this.placeFlag(r, c, false); }
    }
    this.drawBoard();
    sfx.win();
    this.immunityPulse();
    const improved = recordWin(this.diff, this.elapsed);
    // Web3 easter egg: announce the cleared chip so the /fun hub can offer a
    // token reward. No-op unless the reward feature is configured + signed in.
    window.dispatchEvent(new CustomEvent("game:levelcomplete", { detail: { gameId: "microwell", level: this.diff } }));
    const stars = starsForTime(this.diff, this.elapsed);
    if (!REDUCED) this.time.delayedCall(160, () => sfx.star());
    this.time.delayedCall(REDUCED ? 300 : 1050, () =>
      this.scene.start("End", { result: "win", difficulty: this.diff, ms: this.elapsed, best: getBestFor(this.diff), improved, stars })
    );
  },

  immunityPulse() {
    if (REDUCED) return;
    const cx = this.boardX + this.cs * this.cols / 2;
    const cy = this.boardY + this.cs * this.rows / 2;
    const gl = this.spawn(this.add.image(cx, cy, "glow").setTint(UI.cyan).setBlendMode(ADD).setDisplaySize(this.cs, this.cs).setAlpha(0.6));
    this.tweens.add({
      targets: gl, displayWidth: this.cs * this.cols * 1.7, displayHeight: this.cs * this.rows * 1.7,
      alpha: 0, ease: "Cubic.out", duration: 900, onComplete: () => gl.destroy(),
    });
    this.cameras.main.flash(360, 80, 210, 255, false);
  },

  lose(tr, tc) {
    this.ended = true;
    this.elapsed = this.seeded ? this.time.now - this.startAt : 0;
    this.hoverGfx.clear();
    if (this._armTween) { this._armTween.stop(); this._armTween = null; }
    const tcell = this.cells[tr][tc];
    tcell.revealed = true;
    this.drawBoard();
    sfx.outbreak();

    const { x: tx, y: ty } = this.center(tr, tc);
    if (!REDUCED) {
      this.cameras.main.shake(480, 0.012);
      this.cameras.main.flash(280, 130, 20, 30);
      const gl = this.spawn(this.add.image(tx, ty, "glow").setTint(UI.danger).setBlendMode(ADD).setDisplaySize(this.cs, this.cs).setAlpha(0.75));
      this.tweens.add({ targets: gl, displayWidth: this.cs * 9, displayHeight: this.cs * 9, alpha: 0, ease: "Cubic.out", duration: 700, onComplete: () => gl.destroy() });
    }

    // reveal every undisturbed pathogen; cross out wrong flags
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.cells[r][c];
        const { x, y } = this.center(r, c);
        if (cell.pathogen && !cell.flagged) {
          const img = this.spawn(this.add.image(x, y, PTEX[cell.ptype]).setDisplaySize(this.cs * 0.66, this.cs * 0.66));
          if (!REDUCED) {
            const sc = img.scaleX; img.setScale(0);
            const dist = Math.hypot(r - tr, c - tc);
            this.tweens.add({ targets: img, scaleX: sc, scaleY: sc, ease: "Back.out", duration: 300, delay: Math.min(dist * 45, 650) });
          }
        } else if (cell.flagged && !cell.pathogen) {
          this.spawn(this.add.text(x, y, "✕", { resolution: RES, fontFamily: FONT, fontSize: `${Math.round(this.cs * 0.5)}px`, fontStyle: "800", color: UI.dangerCss }).setOrigin(0.5));
        }
      }
    }

    this.updateHUD();
    this.time.delayedCall(REDUCED ? 400 : 1300, () =>
      this.scene.start("End", { result: "lose", difficulty: this.diff, ms: this.elapsed })
    );
  },
};
