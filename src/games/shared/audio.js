// Tiny Web-Audio synth shared by the games — no audio files.
//
// One AudioContext for the whole page (browsers cap how many you may create),
// but each game gets its OWN mute flag and blip via `createAudioKit`, so games
// stay independent and a future third game can't accidentally unmute another.
let audioCtx = null;

const getCtx = () => {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audioCtx = new AC();
  }
  return audioCtx;
};

/**
 * Build a game's audio kit.
 * @param {{ defaultVol?: number }} [opts] baseline volume for this game's blips
 * @returns {{ setMuted: (v: boolean) => void, blip: (spec: object) => void }}
 */
export function createAudioKit({ defaultVol = 0.12 } = {}) {
  let muted = false;

  const setMuted = (value) => { muted = value; };

  const blip = ({ freq = 440, slideTo, dur = 0.12, type = "square", vol = defaultVol }) => {
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

  return { setMuted, blip };
}
