// HiDPI factor shared by every game: the canvas backing store is RES× the
// logical design size and each scene zooms its camera by RES, so gameplay stays
// in logical pixels while rendering at (near-)native display resolution.
// Derived once per session.
//
// Each game re-exports this from its own td/defs.js, so scenes keep importing
// RES from the game they belong to and nothing outside reaches in here.
export const RES = Math.min(
  3,
  Math.max(2, Math.round(((window.screen?.width || 1280) * (window.devicePixelRatio || 1)) / 960))
);
