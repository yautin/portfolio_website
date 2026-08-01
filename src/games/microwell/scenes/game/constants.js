import Phaser from "phaser";

// Layout + presentation constants shared by the GameScene concern modules.

export const FONT = "'Mona Sans', system-ui, sans-serif";
export const HUD_H = 52;   // reserved top strip
export const MARGIN = 14;
export const STAGGER = 20; // ms per BFS ring for the healing wave
export const PTEX = ["infected-viral", "infected-lytic", "infected-bacterial"];
export const ADD = Phaser.BlendModes.ADD;
