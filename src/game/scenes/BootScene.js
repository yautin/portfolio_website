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
    const svg = (key, w, h = w) => this.load.svg(key, `/game/${key}.svg`, { width: w * RES, height: h * RES });
    // defenders
    svg("def-antibody", 46); svg("def-mito", 46); svg("def-macrophage", 46);
    svg("def-mine", 46); svg("def-interferon", 46); svg("def-mastcell", 46); svg("def-neutrophil", 46);
    // pathogens
    svg("pathogen-virus", 38); svg("pathogen-bacterium", 40); svg("pathogen-resistant", 38);
    svg("pathogen-parasite", 40); svg("pathogen-spore", 30); svg("pathogen-miasma", 42); svg("pathogen-biofilm", 48);
    // projectiles + atp
    svg("projectile", 14); svg("projectile-slow", 16); svg("atp", 22);
  }

  create() {
    const R = RES;

    // small round particle (soft — kept at native size)
    const dot = this.add.graphics();
    dot.fillStyle(0xffffff, 1);
    dot.fillCircle(4, 4, 4);
    dot.generateTexture("dot", 8, 8);
    dot.destroy();

    // faint drifting specks for the cytoplasm background
    const specks = this.add.graphics();
    for (let i = 0; i < 44; i++) {
      specks.fillStyle(0xffffff, 0.04 + Math.random() * 0.05);
      specks.fillCircle(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2);
    }
    specks.generateTexture("specks", 256, 256);
    specks.destroy();

    // heart pip (crisp UI icon → RES density)
    const heart = this.add.graphics();
    heart.fillStyle(0xffffff, 1);
    heart.fillCircle(5 * R, 6 * R, 5 * R);
    heart.fillCircle(13 * R, 6 * R, 5 * R);
    heart.fillTriangle(0.5 * R, 7.5 * R, 17.5 * R, 7.5 * R, 9 * R, 17 * R);
    heart.generateTexture("heart", 18 * R, 18 * R);
    heart.destroy();

    // five-point star for level ratings (RES density)
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
