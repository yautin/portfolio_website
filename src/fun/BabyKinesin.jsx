import { useEffect, useRef, useState } from "react";
import KinesinFigure from "../components/KinesinFigure";
import MicrotubuleTrack from "../components/MicrotubuleTrack";

// The /fun page's own kinesin: a smaller, rounder one toddling along a thin
// microtubule at the foot of the hub. Same anatomy component as the portfolio's adult
// (src/components/KinesinFigure.jsx) with baby proportions; the shorter,
// bouncier, slightly waddling gait is CSS (see kinesin.css).
//
// Poke it and it pipes up, like the grown-up one does — but it has not learned
// to be grumpy yet.
const chirps = [
  "I'm walking!",
  "This vesicle is HEAVY.",
  "One ATP please. Two ATP?",
  "Mum says I'm a big motor now.",
];

const BabyKinesin = () => {
  const [message, setMessage] = useState(null);
  const timerRef = useRef(null);
  const lastRef = useRef(-1);

  const poke = () => {
    // never repeat the chirp that's just been shown
    let i = Math.floor(Math.random() * chirps.length);
    if (i === lastRef.current) i = (i + 1) % chirps.length;
    lastRef.current = i;

    setMessage(chirps[i]);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setMessage(null), 3500);
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <div className="baby-kinesin-strip">
      <MicrotubuleTrack className="baby-kinesin-track" scale={0.6} />

      <button
        type="button"
        className="baby-kinesin"
        aria-label="Poke the baby kinesin"
        onClick={poke}
      >
        {message && (
          <span className="kinesin-bubble baby-kinesin-bubble" role="status">
            {message}
          </span>
        )}
        <KinesinFigure variant="baby" />
      </button>

      {/* it steps out of one and into the other — same Doctor Strange portal the
          route transition opens, at 96px (see .baby-portal in kinesin.css) */}
      <span className="baby-portal is-left" aria-hidden="true" />
      <span className="baby-portal is-right" aria-hidden="true" />
    </div>
  );
};

export default BabyKinesin;
