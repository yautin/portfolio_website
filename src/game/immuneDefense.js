import Phaser from "phaser";
import BootScene from "./scenes/BootScene";
import MenuScene from "./scenes/MenuScene";
import GameScene from "./scenes/GameScene";
import InterludeScene from "./scenes/InterludeScene";

// Boots the Phaser game into the given DOM parent. Framework-agnostic — the
// React shell only creates and destroys it. Phaser lives in this module so it
// gets code-split into a chunk loaded on demand.
export const createImmuneDefense = ({ parent }) =>
  new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#0f1116",
    render: { roundPixels: true },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 900,
      height: 360,
    },
    physics: {
      default: "arcade",
      arcade: { gravity: { x: 0, y: 0 }, debug: false },
    },
    scene: [BootScene, MenuScene, GameScene, InterludeScene],
  });
