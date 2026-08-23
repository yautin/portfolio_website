import {
  TOTAL_LEVELS,
  getProgress,
  getStars,
  immuneDefenseSave,
  loadFactory as loadImmuneDefense,
  setMuted as muteImmuneDefense,
  controlsHint as immuneDefenseHint,
  rewardLevels as immuneDefenseLevels,
  levelLabel as immuneDefenseLevelLabel,
  beatenLevels as immuneDefenseBeaten,
} from "../games/immune-defense";
import {
  microwellSave,
  loadFactory as loadMicrowell,
  setMuted as muteMicrowell,
  controlsHint as microwellHint,
  getDifficulty as getMicrowellDifficulty,
  getBestFor as getMicrowellBest,
  getClearedModes as getMicrowellCleared,
  fmtTime as fmtMicrowellTime,
  rewardLevels as microwellLevels,
  levelLabel as microwellLevelLabel,
  beatenLevels as microwellBeaten,
} from "../games/microwell";

// Registry of playable games — the hub's single source of truth. Adding a new
// game means: a folder under src/games/<id>/ (with an index.js facade), a
// sprite folder under public/games/<id>/, and ONE entry here. The generic
// GameShell renders any entry (title, factory, mute, hint), and the
// game-agnostic cloud-save layer syncs via its `save` descriptor.

/**
 * @typedef {Object} SaveDescriptor
 * @property {string}   event  window event name dispatched when the save changes
 * @property {string[]} keys   localStorage keys that constitute the save
 *
 * @typedef {Object} GameEntry
 * @property {string}   id          registry key; also the public/games/<id>/ folder
 * @property {string}   title       shown on the hub card and the modal topbar
 * @property {string}   tagline     one-line genre description
 * @property {string}   blurb       card paragraph
 * @property {string}   cover       absolute path to the card artwork
 * @property {string}   accent      CSS colour driving the card's --accent
 * @property {() => Promise<Function>} loadFactory  dynamic import of createGame
 * @property {(muted: boolean) => void} setMuted    mute hook
 * @property {string}   hint        one-line controls reference
 * @property {SaveDescriptor} save  what saveSync.js snapshots
 * @property {() => { label: string }} progress     free-form card progress line
 * @property {string[]} levels      every level a reward can exist for
 * @property {() => string[]} beatenLevels          subset actually beaten
 * @property {(level: string) => string|null} rewardLabel  display name for a level
 */

// Every key a registry entry must supply. Enforced at module load in dev so a
// half-wired new game fails loudly here rather than silently degrading later
// (a missing `save` would quietly stop cloud sync; a missing `beatenLevels`
// would quietly stop rewards).
const REQUIRED_KEYS = [
  "id", "title", "tagline", "blurb", "cover", "accent",
  "loadFactory", "setMuted", "hint", "save", "progress",
  "levels", "beatenLevels", "rewardLabel",
];

/** @param {GameEntry} entry @returns {GameEntry} */
function defineGame(entry) {
  if (import.meta.env.DEV) {
    const missing = REQUIRED_KEYS.filter((k) => entry[k] === undefined);
    if (missing.length) {
      throw new Error(
        `Game "${entry.id ?? "(no id)"}" is missing registry fields: ${missing.join(", ")}. ` +
        `See the GameEntry typedef in src/fun/games.js.`
      );
    }
  }
  return entry;
}

/** @type {GameEntry[]} */
export const GAMES = [
  defineGame({
    id: "immune-defense",
    title: "Immune Defense",
    tagline: "Lane tower-defense, immune-system themed",
    blurb:
      "Place immune defenders across the lanes and stop pathogens before they reach the cell. 15 levels, 7 defenders, boss encounters.",
    cover: "/games/immune-defense/def-macrophage.svg",
    accent: "#4cc9f0",
    loadFactory: loadImmuneDefense,
    setMuted: muteImmuneDefense,
    hint: immuneDefenseHint,
    save: immuneDefenseSave,
    progress: () => {
      const level = getProgress();
      let stars = 0;
      for (let l = 1; l <= TOTAL_LEVELS; l++) stars += getStars(l);
      return { label: `Level ${level}/${TOTAL_LEVELS} · ${stars}★` };
    },
    levels: immuneDefenseLevels,
    beatenLevels: immuneDefenseBeaten,
    rewardLabel: immuneDefenseLevelLabel,
  }),
  defineGame({
    id: "microwell",
    title: "Microwell",
    tagline: "Single-cell microfluidics minesweeper",
    blurb:
      "Probe a lab-on-a-chip of trapped live cells and clear every healthy one without rupturing a hidden infected cell — a burst payload rides the microfluidic flow and contaminates the whole assay. Read viral-load counts, flag suspects with antibody markers, and spend non-invasive scans for a guaranteed-safe read.",
    cover: "/games/microwell/cover.svg",
    accent: "#9d4edd",
    loadFactory: loadMicrowell,
    setMuted: muteMicrowell,
    hint: microwellHint,
    save: microwellSave,
    progress: () => {
      // distinct chips cleared, not lifetime wins — the old `wins` counter went
      // up every time you cleared the same chip again
      const cleared = getMicrowellCleared().length;
      if (!cleared) return { label: "New chip" };
      const best = getMicrowellBest(getMicrowellDifficulty());
      const label = `${cleared}/${microwellLevels.length} chips cleared`;
      return { label: best != null ? `${label} · best ${fmtMicrowellTime(best)}` : label };
    },
    levels: microwellLevels,
    beatenLevels: microwellBeaten,
    rewardLabel: microwellLevelLabel,
  }),
];

export const gameById = (id) => GAMES.find((g) => g.id === id);

// All (game, level) the player has beaten across games — the source of truth for
// which rewards are claimable (minus what's already minted, checked server-side
// via the token_rewards ledger).
export const allBeatenLevels = () =>
  GAMES.flatMap((g) => g.beatenLevels().map((level) => ({ game: g.id, level })));
