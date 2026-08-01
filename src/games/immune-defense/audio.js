import { createAudioKit } from "../shared/audio";

// Immune Defense's SFX set. The synth itself (AudioContext, mute flag, the
// oscillator envelope) is shared — see ../shared/audio.js; this file is just the
// game's sound design.
const { setMuted, blip } = createAudioKit({ defaultVol: 0.14 });

export { setMuted };

export const sfx = {
  place: () => blip({ freq: 260, slideTo: 460, dur: 0.12, type: "triangle", vol: 0.12 }),
  shoot: () => blip({ freq: 720, slideTo: 900, dur: 0.06, type: "square", vol: 0.06 }),
  hit: () => blip({ freq: 480, slideTo: 300, dur: 0.05, type: "square", vol: 0.05 }),
  lyse: () => blip({ freq: 420, slideTo: 120, dur: 0.16, type: "sawtooth", vol: 0.1 }),
  atp: () => blip({ freq: 640, slideTo: 1040, dur: 0.12, type: "triangle", vol: 0.1 }),
  nope: () => blip({ freq: 200, slideTo: 140, dur: 0.1, type: "square", vol: 0.09 }),
  breach: () => blip({ freq: 220, slideTo: 70, dur: 0.32, type: "sawtooth", vol: 0.15 }),
  explode: () => blip({ freq: 180, slideTo: 55, dur: 0.4, type: "sawtooth", vol: 0.17 }),
  chomp: () => blip({ freq: 150, slideTo: 85, dur: 0.09, type: "square", vol: 0.13 }),
  slow: () => blip({ freq: 520, slideTo: 300, dur: 0.14, type: "sine", vol: 0.06 }),
  arm: () => blip({ freq: 900, slideTo: 1200, dur: 0.07, type: "triangle", vol: 0.06 }),
  levelclear: () => blip({ freq: 520, slideTo: 900, dur: 0.3, type: "triangle", vol: 0.13 }),
  defeat: () => blip({ freq: 260, slideTo: 70, dur: 0.5, type: "sawtooth", vol: 0.15 }),
  waveStart: () => { blip({ freq: 300, slideTo: 520, dur: 0.14, type: "triangle", vol: 0.1 }); blip({ freq: 450, slideTo: 700, dur: 0.18, type: "triangle", vol: 0.08 }); },
  sell: () => blip({ freq: 620, slideTo: 360, dur: 0.14, type: "triangle", vol: 0.1 }),
  upgrade: () => { blip({ freq: 500, slideTo: 760, dur: 0.1, type: "triangle", vol: 0.11 }); blip({ freq: 760, slideTo: 1100, dur: 0.14, type: "triangle", vol: 0.09 }); },
  star: () => blip({ freq: 900, slideTo: 1500, dur: 0.16, type: "triangle", vol: 0.1 }),
  boss: () => blip({ freq: 120, slideTo: 60, dur: 0.6, type: "sawtooth", vol: 0.18 }),
  // low double-thump; volume scales with tension
  heartbeat: (v = 1) => { blip({ freq: 90, slideTo: 55, dur: 0.11, type: "sine", vol: 0.06 * v }); },
};
