import Phaser from "phaser";
import { RES } from "./td/defs";
import BootScene from "./scenes/BootScene";
import MenuScene from "./scenes/MenuScene";
import GameScene from "./scenes/GameScene";
import EndScene from "./scenes/EndScene";

// Boots the Phaser game into the given DOM parent. Framework-agnostic — the
// generic GameShell only creates and destroys it. Phaser lives in this module
// so it gets code-split into a chunk loaded on demand. Every game's factory
// exports `createGame` with this signature — the shell relies on it. Microwell is
// pure input + rendering, so (unlike Immune Defense) it omits arcade physics.
export const createGame = ({ parent, width = 960, height = 540 }) => {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#0f1116",
    render: { roundPixels: true },
    scale: {
      // Design width is normalised to 960 logical px (the shell picks the height
      // to match the device's landscape shape). The canvas backing store is RES×
      // that; each scene zooms its camera by RES, so gameplay stays in logical
      // pixels while rendering at (near-)native display resolution.
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: width * RES,
      height: height * RES,
    },
    scene: [BootScene, MenuScene, GameScene, EndScene],
  });
  // Dev-only handle for automated/manual debugging in the browser console.
  // `import.meta.env.DEV` is statically false in production, so this whole
  // branch is tree-shaken out of the prod bundle.
  if (import.meta.env.DEV) window.__microwellGame = game;
  return game;
};
