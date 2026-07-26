import {
  TOTAL_LEVELS,
  getProgress,
  getStars,
  immuneDefenseSave,
  loadFactory as loadImmuneDefense,
  setMuted as muteImmuneDefense,
  controlsHint as immuneDefenseHint,
} from "../games/immune-defense";
import {
  microwellSave,
  loadFactory as loadMicrowell,
  setMuted as muteMicrowell,
  controlsHint as microwellHint,
  getDifficulty as getMicrowellDifficulty,
  getBestFor as getMicrowellBest,
  getStats as getMicrowellStats,
  fmtTime as fmtMicrowellTime,
} from "../games/microwell";

// Registry of playable games — the hub's single source of truth. Adding a new
// game means: a folder under src/games/<id>/ (with an index.js facade), a
// sprite folder under public/games/<id>/, and ONE entry here. The generic
// GameShell renders any entry (title, factory, mute, hint), and the
// game-agnostic cloud-save layer syncs via its `save` descriptor. Each
// `progress()` returns a `{ label }` the hub card shows verbatim, so different
// games can summarise their own store however reads best.
export const GAMES = [
  {
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
  },
  {
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
      const { wins } = getMicrowellStats();
      if (!wins) return { label: "New chip" };
      const best = getMicrowellBest(getMicrowellDifficulty());
      return { label: best != null ? `${wins} cleared · best ${fmtMicrowellTime(best)}` : `${wins} cleared` };
    },
  },
];

export const gameById = (id) => GAMES.find((g) => g.id === id);
