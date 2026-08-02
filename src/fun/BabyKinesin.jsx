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

// One portal is three stacked layers. Every layer carries its own z-index (see
// .baby-portal-* in kinesin.css), so these can sit together in the markup
// regardless of where the track and the walker appear in DOM order.
const Portal = ({ side }) => (
  <>
    <span className={`baby-portal-mouth is-${side}`} aria-hidden="true" />
    <span className={`baby-portal-rim is-${side} is-near`} aria-hidden="true" />
    <span className={`baby-portal-rim is-${side} is-far`} aria-hidden="true" />
  </>
);

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
      <Portal side="left" />
      <Portal side="right" />

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
    </div>
  );
};

export default BabyKinesin;
