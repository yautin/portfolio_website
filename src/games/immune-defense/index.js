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
  TOTAL_LEVELS,
  getProgress,
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

// ---- reward vocabulary ----------------------------------------------------
// The game owns the list of levels a reward can exist for, and what to call
// them. The hub (and src/fun/rewards.js) reads it from here instead of
// re-listing "1..15" of its own, so there is one client-side source of truth.
// The SERVER keeps its own independent copy in
// supabase/functions/_shared/rewards.ts — that duplication is deliberate: it is
// the security boundary and must never trust anything shipped to the browser.

/** Every level a reward can be claimed for, as strings. */
export const rewardLevels = Array.from({ length: TOTAL_LEVELS }, (_, i) => String(i + 1));

/** Display name for a level, or null if it isn't rewardable. */
export const levelLabel = (level) =>
  rewardLevels.includes(String(level)) ? `Level ${level}` : null;

/** Levels beaten so far (for retroactive claims): 1..(progress-1). */
export const beatenLevels = () =>
  rewardLevels.slice(0, Math.max(0, Math.min(getProgress() - 1, TOTAL_LEVELS)));
