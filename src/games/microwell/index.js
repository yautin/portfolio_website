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
  getClearedModes,
  fmtTime,
} from "./td/defs";

import {
  BEST_KEY,
  STATS_KEY,
  DIFFICULTY_KEY,
  SAVE_EVENT,
  DIFFICULTIES,
  DIFFICULTY_ORDER,
  getClearedModes,
} from "./td/defs";

// Lazy factory loader consumed by the generic GameShell (resolves to the
// `createGame` function; Phaser loads only when a player hits Play).
export const loadFactory = () => import("./factory").then((m) => m.createGame);

// One-line control reference shown under the game canvas.
export const controlsHint =
  "Left-click to probe a cell · right-click or hold to flag an infected cell · click a number to chord · 🔬 spends a safe (non-invasive) scan · pinch/scroll to zoom · drag to pan · ⛶ fullscreen · Esc to close";

// Save descriptor consumed by the hub's game registry: which localStorage keys
// constitute this game's save, and which window event signals a change.
export const microwellSave = {
  event: SAVE_EVENT,
  keys: [BEST_KEY, STATS_KEY, DIFFICULTY_KEY],
};

// ---- reward vocabulary ----------------------------------------------------
// This game's "levels" are its difficulties. It owns the list and the display
// names; the hub (and src/fun/rewards.js) reads them from here rather than
// re-listing ["easy","normal","hard"] of its own. The SERVER keeps an
// independent copy in supabase/functions/_shared/rewards.ts — that duplication
// is deliberate: it is the security boundary and must not trust the client.

/** Every level (difficulty) a reward can be claimed for. */
export const rewardLevels = DIFFICULTY_ORDER;

/** Display name for a level, or null if it isn't rewardable. */
export const levelLabel = (level) =>
  DIFFICULTIES[level] ? `${DIFFICULTIES[level].label} chip` : null;

/** A difficulty counts as beaten once it has a recorded best time (won ≥ once) —
    the same predicate the menu's cleared count uses, defined once in td/defs. */
export const beatenLevels = () => getClearedModes();
