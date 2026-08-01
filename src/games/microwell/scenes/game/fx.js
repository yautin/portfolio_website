import { ADD } from "./constants";

// Purely cosmetic flourishes. Mixed into GameScene.prototype — `this` is the
// scene. Callers gate these on REDUCED where the motion is non-essential.

export const fxMethods = {
  popRing(x, y, color, toScale = 1.5) {
    const base = this.cs;
    const ring = this.spawn(this.add.image(x, y, "ring").setTint(color).setBlendMode(ADD).setDisplaySize(base * 0.5, base * 0.5).setAlpha(0.9));
    this.tweens.add({ targets: ring, displayWidth: base * toScale, displayHeight: base * toScale, alpha: 0, ease: "Cubic.out", duration: 420, onComplete: () => ring.destroy() });
  },
};
