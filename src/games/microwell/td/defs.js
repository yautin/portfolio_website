// All tuning + persistence for Microwell (live-cell microfluidics minesweeper) lives here.

// HiDPI factor — derived once per session in ../../shared/res.js and re-exported
// here so scenes keep importing it from their own game's defs.
export { RES } from "../../shared/res";

export const COLORS = {
  bg: 0x0f1116,
  cellHidden: 0x1b2130,
  cellHiddenEdge: 0x2b3345,
  cellClear: 0x11151d,
  cellClearEdge: 0x1e2634,
  nucleus: 0x2a3346,
  cyan: 0x4cc9f0,
  violet: 0x9d4edd,
  teal: 0x52d1a4,
  amber: 0xf4a259,
  danger: 0xf25f5c,
  ink: "#e8ebf2",
  sub: "#c4cdda",
  dim: "#8b97ad",
};

// Viral load for a healthy cell = how many of its neighbouring traps hold an
// infected cell (index = count 1..8), graded cyan→teal→violet→red.
export const LOAD_COLORS = [
  null,
  "#4cc9f0", // 1 cyan
  "#52d1a4", // 2 teal
  "#9d4edd", // 3 violet
  "#6aa9ff", // 4 blue
  "#f4a259", // 5 amber
  "#f08a4b", // 6 orange
  "#f25f5c", // 7 red
  "#e8ebf2", // 8 white
];

// board shapes: cols × rows (landscape-friendly), pathogen count, microscope scans
export const DIFFICULTIES = {
  easy: { key: "easy", label: "Easy", cols: 9, rows: 9, mines: 10, scans: 3 },
  normal: { key: "normal", label: "Normal", cols: 12, rows: 12, mines: 26, scans: 2 },
  hard: { key: "hard", label: "Hard", cols: 20, rows: 16, mines: 58, scans: 2 },
};
export const DIFFICULTY_ORDER = ["easy", "normal", "hard"];

// 8-neighbour offsets
export const NEIGHBORS = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0],           [1, 0],
  [-1, 1],  [0, 1],  [1, 1],
];

// ---- persistence -----------------------------------------------------
export const BEST_KEY = "microwellBest";       // { easy, normal, hard } best ms
export const STATS_KEY = "microwellStats";     // { wins }
export const DIFFICULTY_KEY = "microwellDifficulty";
export const SAVE_EVENT = "microwell:save-changed";

const emitSaveChanged = () => window.dispatchEvent(new CustomEvent(SAVE_EVENT));

const readJSON = (key) => { try { return JSON.parse(localStorage.getItem(key) || "{}"); } catch { return {}; } };

export const getDifficulty = () => {
  const d = localStorage.getItem(DIFFICULTY_KEY);
  return DIFFICULTIES[d] ? d : "easy";
};
export const setDifficulty = (k) => {
  if (!DIFFICULTIES[k]) return;
  localStorage.setItem(DIFFICULTY_KEY, k);
  emitSaveChanged();
};

export const getBest = () => readJSON(BEST_KEY);
export const getBestFor = (diff) => getBest()[diff] ?? null;
export const getStats = () => ({ wins: 0, ...readJSON(STATS_KEY) });

export function recordWin(diff, ms) {
  const best = getBest();
  const improved = best[diff] == null || ms < best[diff];
  if (improved) { best[diff] = ms; localStorage.setItem(BEST_KEY, JSON.stringify(best)); }
  const stats = getStats();
  stats.wins += 1;
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  emitSaveChanged();
  return improved;
}

export const fmtTime = (ms) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

// star rank by time relative to a per-difficulty par (fun, not punishing)
export const starsForTime = (diff, ms) => {
  const par = { easy: 60000, normal: 150000, hard: 360000 }[diff] || 120000;
  if (ms <= par * 0.6) return 3;
  if (ms <= par) return 2;
  return 1;
};
