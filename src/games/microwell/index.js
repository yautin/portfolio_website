// Public API of the Microwell game (facade).
// Everything outside this folder must import from here — never from td/defs,
// audio, scenes, or the factory directly — so the game's internals can evolve
// freely. The factory stays behind `loadFactory` as a dynamic import, so
// Phaser remains in its own lazy chunk instead of riding along with this
// eagerly-imported facade.

export { setMuted } from "./audio";
export {
  SAVE_EVENT,
  getDifficulty,
  getBestFor,
  getStats,
  fmtTime,
} from "./td/defs";

import {
  BEST_KEY,
  STATS_KEY,
  DIFFICULTY_KEY,
  SAVE_EVENT,
} from "./td/defs";

// Lazy factory loader consumed by the generic GameShell (resolves to the
// `createGame` function; Phaser loads only when a player hits Play).
export const loadFactory = () => import("./factory").then((m) => m.createGame);

// One-line control reference shown under the game canvas.
export const controlsHint =
  "Left-click to probe a cell · right-click or hold to flag an infected cell · click a number to chord · 🔬 spends a safe (non-invasive) scan · ⛶ fullscreen · Esc to close";

// Save descriptor consumed by the hub's game registry: which localStorage keys
// constitute this game's save, and which window event signals a change.
export const microwellSave = {
  event: SAVE_EVENT,
  keys: [BEST_KEY, STATS_KEY, DIFFICULTY_KEY],
};
