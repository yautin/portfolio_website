// All tuning knobs for Immune Defense live here so balancing is a one-file job.

export const COLORS = {
  antibody: 0x4cc9f0,
  mito: 0xf4a259,
  macrophage: 0x57c7c7,
  mine: 0x93a15c,
  interferon: 0x8fd3f0,
  mastcell: 0xe0483f,
  neutrophil: 0xb48ad6,
  virus: 0xf25f5c,
  bacterium: 0x6bbf59,
  resistant: 0x9b8cff,
  parasite: 0xd76ba8,
  spore: 0xb7c26a,
  miasma: 0x9fe0c0,
  biofilm: 0x4a6b52,
  atp: 0x4cc9f0,
};

// Campaign shape.
export const LANES_MAX = 5;
export const UNITS_MAX = 7;
export const TOTAL_LEVELS = 15;
export const PLANNING_TIME = 20000; // planning phase at the start of each level
export const WAVE_GAP = 3500; // pause between waves within a level
export const AMBIENT_ATP = 25; // "sun from the sky" so lvl 1 is playable
export const AMBIENT_EVERY = 10000;
export const CELL_HEARTS = 5; // default; actual per-run comes from difficulty
export const PROGRESS_KEY = "immuneDefenseProgress";
export const STARS_KEY = "immuneDefenseStars";
export const DIFFICULTY_KEY = "immuneDefenseDifficulty";
export const TUTORIAL_KEY = "immuneDefenseTutorial";

// Layout (canvas is 900×360). Lane count is per-level, so rows are dynamic.
export const GRID = {
  cols: 8,
  membrane: 96,
  hudTop: 44,
  toolbar: 64,
};

// ---- difficulty -------------------------------------------------------
export const DIFFICULTIES = {
  easy: { key: "easy", label: "Easy", atpMul: 1.5, hpMul: 0.75, speedMul: 0.9, countMul: 0.8, hearts: 7 },
  normal: { key: "normal", label: "Normal", atpMul: 1, hpMul: 1, speedMul: 1, countMul: 1, hearts: 5 },
};
export const getDifficulty = () => (localStorage.getItem(DIFFICULTY_KEY) === "easy" ? "easy" : "normal");
export const setDifficulty = (k) => localStorage.setItem(DIFFICULTY_KEY, k);
export const diff = () => DIFFICULTIES[getDifficulty()];

// The seven defenders. Every one occupies a tile, blocks its lane and has HP;
// `role` selects behaviour in GameScene. Array order = unlock order.
export const DEFENDERS = {
  antibody: {
    key: "antibody", name: "Antibody", shortName: "Antibody", texture: "def-antibody", color: COLORS.antibody, role: "shoot",
    cost: 100, cooldown: 5000, hp: 120, fireRate: 1100, damage: 25, projectileSpeed: 360, shots: 1,
    blurb: "Fires antibody rounds at the nearest pathogen in its lane. Your bread-and-butter attacker.",
  },
  mito: {
    key: "mito", name: "Mitochondrion", shortName: "Mito", texture: "def-mito", color: COLORS.mito, role: "economy",
    cost: 50, cooldown: 6000, hp: 80, generate: 25, generateEvery: 5000,
    blurb: "Generates ATP over time so you can afford more defenders. Fragile — keep it protected.",
  },
  macrophage: {
    key: "macrophage", name: "Macrophage", shortName: "Macrophage", texture: "def-macrophage", color: COLORS.macrophage, role: "wall",
    cost: 50, cooldown: 12000, hp: 800,
    blurb: "A high-HP wall that stalls pathogens and soaks damage. Buys your shooters time.",
  },
  mine: {
    key: "mine", name: "Complement Mine", shortName: "Mine", texture: "def-mine", color: COLORS.mine, role: "mine",
    cost: 25, cooldown: 12000, hp: 60, armTime: 10000, damage: 300, splash: 72, oneShot: true,
    blurb: "Arms after a short delay, then detonates on contact for heavy splash damage. Single use.",
  },
  interferon: {
    key: "interferon", name: "Interferon", shortName: "Interferon", texture: "def-interferon", color: COLORS.interferon, role: "shoot",
    cost: 175, cooldown: 5000, hp: 120, fireRate: 1200, damage: 20, projectileSpeed: 340, shots: 1,
    projectile: "projectile-slow", slowFactor: 0.5, slowDuration: 2500,
    blurb: "Fires chilling rounds that slow pathogens as well as damage them. Great against fast enemies.",
  },
  mastcell: {
    key: "mastcell", name: "Mast Cell", shortName: "Mast Cell", texture: "def-mastcell", color: COLORS.mastcell, role: "bomb",
    cost: 150, cooldown: 20000, hp: 100, fuse: 1200, damage: 250, radius: 120, oneShot: true,
    blurb: "Lights a short fuse, then degranulates in a huge area blast. Single use — save it for a crowd.",
  },
  neutrophil: {
    key: "neutrophil", name: "Neutrophil", shortName: "Neutrophil", texture: "def-neutrophil", color: COLORS.neutrophil, role: "chomp",
    cost: 150, cooldown: 8000, hp: 150, biteDamage: 400, chewTime: 4500,
    blurb: "Engulfs a pathogen whole, then digests briefly — vulnerable while it chews.",
  },
};

export const DEFENDER_ORDER = ["antibody", "mito", "macrophage", "mine", "interferon", "mastcell", "neutrophil"];

// In-run upgrades (a money sink once the board fills). `patch` is merged onto
// the defender instance's def.
export const UPGRADES = {
  antibody: { name: "Repeater", cost: 150, patch: { shots: 2, fireRate: 1000, name: "Repeater", shortName: "Repeater" } },
  mito: { name: "Twin Mito", cost: 125, patch: { generate: 50, name: "Twin Mitochondria", shortName: "Twin Mito" } },
  interferon: { name: "Deep Freeze", cost: 175, patch: { slowFactor: 0.32, slowDuration: 3400, damage: 26, name: "Deep Freeze", shortName: "Deep Freeze" } },
};

// Pathogens march left. `melee` is dps dealt to a blocked defender; `armor` is
// fractional projectile-damage reduction (bypassed by AoE, mines and chomp);
// `unlock` is the earliest level; `weight` biases the mix; abilities: `vault`
// (leaps the first blocker once), `fly` (airborne — only ranged/AoE hits it),
// `burst` (spawns as a cluster).
export const PATHOGENS = {
  virus: { key: "virus", texture: "pathogen-virus", color: COLORS.virus, hp: 60, speed: 34, bounty: 15, melee: 18, armor: 0, unlock: 1, weight: 1.0 },
  bacterium: { key: "bacterium", texture: "pathogen-bacterium", color: COLORS.bacterium, hp: 200, speed: 20, bounty: 25, melee: 30, armor: 0.15, unlock: 2, weight: 0.85 },
  resistant: { key: "resistant", texture: "pathogen-resistant", color: COLORS.resistant, hp: 120, speed: 28, bounty: 30, melee: 24, armor: 0.45, unlock: 4, weight: 0.7 },
  parasite: { key: "parasite", texture: "pathogen-parasite", color: COLORS.parasite, hp: 70, speed: 62, bounty: 25, melee: 20, armor: 0, unlock: 5, weight: 0.75, vault: true },
  spore: { key: "spore", texture: "pathogen-spore", color: COLORS.spore, hp: 35, speed: 46, bounty: 10, melee: 12, armor: 0, unlock: 6, weight: 0.7, burst: true },
  miasma: { key: "miasma", texture: "pathogen-miasma", color: COLORS.miasma, hp: 95, speed: 26, bounty: 30, melee: 0, armor: 0, unlock: 9, weight: 0.55, fly: true },
  biofilm: { key: "biofilm", texture: "pathogen-biofilm", color: COLORS.biofilm, hp: 1400, speed: 14, bounty: 90, melee: 80, armor: 0.35, unlock: 10, weight: 0.28 },
};

// Boss appears as the final enemy of the last wave on levels 5 / 10 / 15.
export const BOSSES = {
  5: { base: "bacterium", name: "The Superbug", hpMul: 14, scale: 2.0 },
  10: { base: "biofilm", name: "Necrotic Mass", hpMul: 8, scale: 2.2 },
  15: { base: "biofilm", name: "Pathogen Titan", hpMul: 18, scale: 2.6 },
};
export const isBossLevel = (level) => level % 5 === 0;
export const bossForLevel = (level) => BOSSES[level] || null;

// Occasional level modifiers for variety.
export const MODIFIERS = {
  7: { name: "Cytokine Storm", desc: "Pathogens move 25% faster", speedMul: 1.25 },
  12: { name: "Rationing", desc: "Reduced starting ATP", atpMul: 0.7 },
};
export const modifierForLevel = (level) => MODIFIERS[level] || null;

// The level where a unit's counter enemy is showcased (level = when that unit
// becomes available), so each new defender gets a moment to shine.
const SPOTLIGHT = { 3: "bacterium", 4: "resistant", 5: "parasite", 6: "spore", 7: "resistant", 9: "miasma" };

// ---- campaign helpers --------------------------------------------------
export const lanesForLevel = (level) => Math.min(level, LANES_MAX);
export const unitsForLevel = (level) => DEFENDER_ORDER.slice(0, Math.min(level, UNITS_MAX));
export const wavesForLevel = (level) => 2 + Math.floor(level / 2);
export const startAtpForLevel = (level) => Math.round((100 + level * 10) * diff().atpMul * (modifierForLevel(level)?.atpMul || 1));
export const heartsForRun = () => diff().hearts;
export const newUnitForLevel = (level) =>
  level >= 2 && level <= UNITS_MAX ? DEFENDERS[DEFENDER_ORDER[level - 1]] : null;

export function getProgress() {
  const n = Number(localStorage.getItem(PROGRESS_KEY) || 1);
  return Math.max(1, Math.min(TOTAL_LEVELS, n));
}
export function setProgress(level) {
  if (level > getProgress()) localStorage.setItem(PROGRESS_KEY, String(Math.min(TOTAL_LEVELS, level)));
}

export function getStarsMap() {
  try { return JSON.parse(localStorage.getItem(STARS_KEY) || "{}"); } catch { return {}; }
}
export const getStars = (level) => getStarsMap()[level]?.stars || 0;
export const getScore = (level) => getStarsMap()[level]?.score || 0;
export function recordResult(level, stars, score) {
  const m = getStarsMap();
  const prev = m[level] || { stars: 0, score: 0 };
  m[level] = { stars: Math.max(prev.stars, stars), score: Math.max(prev.score, score) };
  localStorage.setItem(STARS_KEY, JSON.stringify(m));
}
export const starsForHearts = (hearts, maxHearts) =>
  hearts >= maxHearts ? 3 : hearts >= Math.ceil(maxHearts / 2) ? 2 : 1;

function pickPathogen(pool, level, spotlight) {
  const weighted = pool.map((p) => {
    let w = p.weight * (1 + Math.max(0, level - p.unlock) * 0.3);
    if (p.key === spotlight) w *= 3;
    return { p, w };
  });
  const total = weighted.reduce((s, x) => s + x.w, 0);
  let r = Math.random() * total;
  for (const x of weighted) {
    r -= x.w;
    if (r <= 0) return x.p;
  }
  return pool[0];
}

// Spawn list for a wave: escalating count, shrinking interval, a mix gated by
// the pathogens unlocked at this level and biased toward the level's spotlight.
// Spore-type entries burst into a cluster.
export function buildWave(level, waveIndex, lanes) {
  const pool = Object.values(PATHOGENS).filter((p) => p.unlock <= level);
  const count = Math.max(2, Math.round((3 + level + waveIndex * 2) * diff().countMul));
  const interval = Math.max(450, 1500 - level * 40 - waveIndex * 60);
  const spotlight = SPOTLIGHT[level];
  const events = [];
  let t = 0;
  for (let i = 0; i < count; i++) {
    const def = pickPathogen(pool, level, spotlight);
    if (def.burst) {
      const n = 3 + Math.floor(Math.random() * 3);
      for (let k = 0; k < n; k++) {
        events.push({ type: "spore", lane: Math.floor(Math.random() * lanes), delay: t + k * 130 });
      }
    } else {
      events.push({ type: def.key, lane: Math.floor(Math.random() * lanes), delay: t });
    }
    t += interval;
  }
  return events;
}
