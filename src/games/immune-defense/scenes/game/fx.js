import { RES } from "../../td/defs";

// Small reusable effects: particle bursts, the ATP coin flight, and floating
// text. Mixed into GameScene.prototype — `this` is the scene.

const FONT = "'Mona Sans', system-ui, sans-serif";

export const fxMethods = {
  burst(x, y, color, count, spread) {
    for (let i = 0; i < count; i++) {
      const dot = this.add.image(x, y, "dot").setTint(color).setDepth(9);
      const a = Math.random() * Math.PI * 2;
      const dist = 8 + Math.random() * spread;
      this.tweens.add({
        targets: dot, x: x + Math.cos(a) * dist, y: y + Math.sin(a) * dist, alpha: 0, scale: 0.2,
        duration: 280 + Math.random() * 220, ease: "Quad.out", onComplete: () => dot.destroy(),
      });
    }
  },

  coinFly(x, y) {
    const coin = this.add.image(x, y, "atp").setDisplaySize(16, 16).setDepth(11);
    this.tweens.add({ targets: coin, x: 30, y: this.hudRowY, scaleX: coin.scaleX * 0.5, scaleY: coin.scaleY * 0.5, duration: 480, ease: "Quad.in", onComplete: () => coin.destroy() });
  },

  explosionFx(x, y, radius, color) {
    const ring = this.add.circle(x, y, radius, color, 0).setStrokeStyle(3, color, 0.7).setScale(0.15).setDepth(8);
    this.tweens.add({ targets: ring, scale: 1, alpha: 0, duration: 320, ease: "Quad.out", onComplete: () => ring.destroy() });
    this.burst(x, y, color, 16, radius * 0.5);
  },

  floatText(x, y, str, color, dur = 800) {
    const t = this.add.text(x, y, str, { resolution: RES, fontFamily: FONT, fontSize: "14px", fontStyle: "700", color }).setOrigin(0.5).setDepth(10);
    this.tweens.add({ targets: t, y: y - 26, alpha: 0, duration: dur, ease: "Quad.out", onComplete: () => t.destroy() });
  },
};
