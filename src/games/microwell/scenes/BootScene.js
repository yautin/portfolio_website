import Phaser from "phaser";
import { RES } from "../td/defs";

// Loads the SVG sprites (rasterised at RES× the logical size for HiDPI crispness
// under the camera zoom) and generates helper textures, then hands off to the
// menu. Sprites are drawn at 1/RES scale in-game so world sizes stay logical.
export default class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload() {
    const svg = (key, w, h = w) => this.load.svg(key, `/games/microwell/${key}.svg`, { width: w * RES, height: h * RES });
    // infected host cells revealed on loss / behind correct flags
    svg("infected-viral", 42);
    svg("infected-lytic", 42);
    svg("infected-bacterial", 42);
    // the antibody "Y" (IgG) used as the flag marker
    svg("antibody", 40);
  }

  create() {
    const R = RES;

    // soft round particle for bursts / drift
    const dot = this.add.graphics();
    dot.fillStyle(0xffffff, 1);
    dot.fillCircle(4, 4, 4);
    dot.generateTexture("dot", 8, 8);
    dot.destroy();

    // faint drifting specks for the ambient background
    const specks = this.add.graphics();
    for (let i = 0; i < 44; i++) {
      specks.fillStyle(0xffffff, 0.04 + Math.random() * 0.05);
      specks.fillCircle(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2);
    }
    specks.generateTexture("specks", 256, 256);
    specks.destroy();

    // soft radial glow (tintable) — heal pulses, pop flashes, cover glow
    const gsize = 128;
    const cv = this.textures.createCanvas("glow", gsize, gsize);
    const gctx = cv.context;
    const grad = gctx.createRadialGradient(gsize / 2, gsize / 2, 0, gsize / 2, gsize / 2, gsize / 2);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.35, "rgba(255,255,255,0.55)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    gctx.fillStyle = grad;
    gctx.fillRect(0, 0, gsize, gsize);
    cv.refresh();

    // thin ring for cell-pop reveals (tint + scale out + fade)
    const ring = this.add.graphics();
    ring.lineStyle(4, 0xffffff, 1);
    ring.strokeCircle(32, 32, 28);
    ring.generateTexture("ring", 64, 64);
    ring.destroy();

    // five-point star for the win-screen rating (RES density)
    const star = this.add.graphics();
    star.fillStyle(0xffffff, 1);
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const ang = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = (i % 2 === 0 ? 8 : 3.4) * R;
      pts.push(new Phaser.Math.Vector2(9 * R + Math.cos(ang) * rr, 9 * R + Math.sin(ang) * rr));
    }
    star.fillPoints(pts, true);
    star.generateTexture("star", 18 * R, 18 * R);
    star.destroy();

    this.scene.start("Menu");
  }
}
