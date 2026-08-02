// Decorative divider: a tiny kinesin motor hauling a big cargo vesicle,
// walking hand-over-hand along a microtubule. CSS-animated; sits between Data
// Distilled and Contact. Each leg is a 2-bone limb (thigh + shin) pivoting from
// a fixed hip for a real alternating gait. Honors prefers-reduced-motion.
// Easter egg: poke it and it grumbles at you (while it keeps on walking).
import { useEffect, useRef, useState } from "react";
import KinesinFigure from "./KinesinFigure";
import MicrotubuleTrack from "./MicrotubuleTrack";

// grumpy, science-flavoured complaints (kept short so the bubble stays compact)
const complaints = [
  "Hey! I'm walking here.",
  "Do you mind? Precious cargo.",
  "One ATP per step — show some respect.",
  "Poke me again and this vesicle's late.",
  "I'm a motor protein, not a toy.",
];

const KinesinWalk = () => {
  const [message, setMessage] = useState(null);
  const timerRef = useRef(null);
  const lastRef = useRef(-1);

  const poke = () => {
    // pick a complaint that isn't the one just shown
    let i = Math.floor(Math.random() * complaints.length);
    if (i === lastRef.current) i = (i + 1) % complaints.length;
    lastRef.current = i;

    setMessage(complaints[i]);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setMessage(null), 4000);
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <div className="kinesin-band">
      {/* microtubule track — repeating tubulin dimers across the full width */}
      <MicrotubuleTrack className="kinesin-track" />

      {/* the walker: a big cargo vesicle atop a small motor (stalk + two legs) */}
      <button
        type="button"
        className="kinesin"
        aria-label="Poke the kinesin"
        onClick={poke}
      >
        {message && (
          <span className="kinesin-bubble" role="status">
            {message}
          </span>
        )}
        <KinesinFigure variant="adult" />
      </button>

      <span className="kinesin-caption">Kinesin · a molecular motor</span>
    </div>
  );
};

export default KinesinWalk;
