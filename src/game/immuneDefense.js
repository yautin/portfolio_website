import Phaser from "phaser";
import { RES } from "./td/defs";
import BootScene from "./scenes/BootScene";
import MenuScene from "./scenes/MenuScene";
import GameScene from "./scenes/GameScene";
import InterludeScene from "./scenes/InterludeScene";

// Boots the Phaser game into the given DOM parent. Framework-agnostic — the
// React shell only creates and destroys it. Phaser lives in this module so it
// gets code-split into a chunk loaded on demand.
export const createImmuneDefense = ({ parent, width = 960, height = 540 }) =>
  new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#0f1116",
    render: { roundPixels: true },
    scale: {
      // Design width is normalised to 960 logical px (the React shell picks the
      // height to match the device's landscape shape). The canvas backing store
      // is RES× that; each scene zooms its camera by RES, so gameplay stays in
      // logical pixels while rendering at (near-)native display resolution.
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: width * RES,
      height: height * RES,
    },
    physics: {
      default: "arcade",
      arcade: { gravity: { x: 0, y: 0 }, debug: false },
    },
    scene: [BootScene, MenuScene, GameScene, InterludeScene],
  });
