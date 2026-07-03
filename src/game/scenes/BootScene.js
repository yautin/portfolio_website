import Phaser from "phaser";

// Loads the SVG sprites and generates helper textures, then hands off to the
// menu.
export default class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload() {
    // defenders
    this.load.svg("def-antibody", "/game/def-antibody.svg", { width: 46, height: 46 });
    this.load.svg("def-mito", "/game/def-mito.svg", { width: 46, height: 46 });
    this.load.svg("def-macrophage", "/game/def-macrophage.svg", { width: 46, height: 46 });
    this.load.svg("def-mine", "/game/def-mine.svg", { width: 46, height: 46 });
    this.load.svg("def-interferon", "/game/def-interferon.svg", { width: 46, height: 46 });
    this.load.svg("def-mastcell", "/game/def-mastcell.svg", { width: 46, height: 46 });
    this.load.svg("def-neutrophil", "/game/def-neutrophil.svg", { width: 46, height: 46 });
    // pathogens
    this.load.svg("pathogen-virus", "/game/pathogen-virus.svg", { width: 38, height: 38 });
    this.load.svg("pathogen-bacterium", "/game/pathogen-bacterium.svg", { width: 40, height: 40 });
    this.load.svg("pathogen-resistant", "/game/pathogen-resistant.svg", { width: 38, height: 38 });
    this.load.svg("pathogen-parasite", "/game/pathogen-parasite.svg", { width: 40, height: 40 });
    this.load.svg("pathogen-spore", "/game/pathogen-spore.svg", { width: 30, height: 30 });
    this.load.svg("pathogen-miasma", "/game/pathogen-miasma.svg", { width: 42, height: 42 });
    this.load.svg("pathogen-biofilm", "/game/pathogen-biofilm.svg", { width: 48, height: 48 });
    // projectiles + atp
    this.load.svg("projectile", "/game/projectile.svg", { width: 14, height: 14 });
    this.load.svg("projectile-slow", "/game/projectile-slow.svg", { width: 16, height: 16 });
    this.load.svg("atp", "/game/atp.svg", { width: 22, height: 22 });
  }

  create() {
    // small round particle
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

    // heart pip for the cell-integrity display (two lobes + a point)
    const heart = this.add.graphics();
    heart.fillStyle(0xffffff, 1);
    heart.fillCircle(5, 6, 5);
    heart.fillCircle(13, 6, 5);
    heart.fillTriangle(0.5, 7.5, 17.5, 7.5, 9, 17);
    heart.generateTexture("heart", 18, 18);
    heart.destroy();

    // five-point star for level ratings
    const star = this.add.graphics();
    star.fillStyle(0xffffff, 1);
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const ang = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 === 0 ? 8 : 3.4;
      pts.push(new Phaser.Math.Vector2(9 + Math.cos(ang) * rr, 9 + Math.sin(ang) * rr));
    }
    star.fillPoints(pts, true);
    star.generateTexture("star", 18, 18);
    star.destroy();

    this.scene.start("Menu");
  }
}
