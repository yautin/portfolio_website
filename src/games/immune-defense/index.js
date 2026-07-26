// Public API of the Immune Defense game (facade).
// Everything outside this folder must import from here — never from td/defs,
// audio, scenes, or the factory directly — so the game's internals can evolve
// freely. The factory stays behind `loadFactory` as a dynamic import, so
// Phaser remains in its own lazy chunk instead of riding along with this
// eagerly-imported facade.

export { setMuted } from "./audio";
export {
  SAVE_EVENT,
  TOTAL_LEVELS,
  getProgress,
  getStars,
} from "./td/defs";

import {
  PROGRESS_KEY,
  STARS_KEY,
  DIFFICULTY_KEY,
  TUTORIAL_KEY,
  SAVE_EVENT,
} from "./td/defs";

// Lazy factory loader consumed by the generic GameShell (resolves to the
// `createGame` function; Phaser loads only when a player hits Play).
export const loadFactory = () => import("./factory").then((m) => m.createGame);

// One-line control reference shown under the game canvas.
export const controlsHint =
  "Tap a card then a lane to place · tap a defender to upgrade, hold (or right-click) to sell · ⛶ fullscreen · Esc to close";

// Save descriptor consumed by the hub's game registry: which localStorage
// keys constitute this game's save, and which window event signals a change.
export const immuneDefenseSave = {
  event: SAVE_EVENT,
  keys: [PROGRESS_KEY, STARS_KEY, DIFFICULTY_KEY, TUTORIAL_KEY],
};
