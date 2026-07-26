// Tiny Web-Audio synthesized SFX for Microwell — no audio files. `muted` is toggled
// from the React shell (GameShell) via setMuted.
let audioCtx = null;
let muted = false;

const getCtx = () => {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audioCtx = new AC();
  }
  return audioCtx;
};

export const setMuted = (value) => { muted = value; };

const blip = ({ freq = 440, slideTo, dur = 0.12, type = "square", vol = 0.12 }) => {
  if (muted) return;
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.03);
};

export const sfx = {
  reveal: () => blip({ freq: 520, slideTo: 680, dur: 0.05, type: "triangle", vol: 0.07 }),
  flood: () => blip({ freq: 700, slideTo: 900, dur: 0.03, type: "sine", vol: 0.04 }),
  flag: () => blip({ freq: 300, slideTo: 520, dur: 0.09, type: "triangle", vol: 0.1 }),
  unflag: () => blip({ freq: 420, slideTo: 260, dur: 0.09, type: "triangle", vol: 0.08 }),
  scan: () => { blip({ freq: 640, slideTo: 1040, dur: 0.12, type: "sine", vol: 0.09 }); blip({ freq: 900, slideTo: 1300, dur: 0.16, type: "sine", vol: 0.06 }); },
  nope: () => blip({ freq: 200, slideTo: 140, dur: 0.1, type: "square", vol: 0.09 }),
  outbreak: () => blip({ freq: 200, slideTo: 55, dur: 0.5, type: "sawtooth", vol: 0.18 }),
  win: () => { blip({ freq: 520, slideTo: 900, dur: 0.28, type: "triangle", vol: 0.13 }); blip({ freq: 780, slideTo: 1300, dur: 0.34, type: "triangle", vol: 0.09 }); },
  star: () => blip({ freq: 900, slideTo: 1500, dur: 0.16, type: "triangle", vol: 0.1 }),
};
