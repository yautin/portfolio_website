import {
  TOTAL_LEVELS,
  getProgress,
  getStars,
  immuneDefenseSave,
  loadFactory as loadImmuneDefense,
  setMuted as muteImmuneDefense,
  controlsHint as immuneDefenseHint,
} from "../games/immune-defense";

// Registry of playable games — the hub's single source of truth. Adding a new
// game means: a folder under src/games/<id>/ (with an index.js facade), a
// sprite folder under public/games/<id>/, and ONE entry here. The generic
// GameShell renders any entry (title, factory, mute, hint), and the
// game-agnostic cloud-save layer syncs via its `save` descriptor.
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
    // A one-line "Level X/15 · N★" progress summary from the game's own store.
    progress: () => {
      const level = getProgress();
      let stars = 0;
      for (let l = 1; l <= TOTAL_LEVELS; l++) stars += getStars(l);
      return { level, total: TOTAL_LEVELS, stars, maxStars: TOTAL_LEVELS * 3 };
    },
  },
];

export const gameById = (id) => GAMES.find((g) => g.id === id);
