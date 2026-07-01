// Decorative divider: a tiny kinesin motor hauling a big cargo vesicle,
// walking hand-over-hand along a microtubule. CSS-animated; sits between Data
// Distilled and Contact. Each leg is a 2-bone limb (thigh + shin) pivoting from
// a fixed hip for a real alternating gait. Honors prefers-reduced-motion.
// Easter egg: poke it and it grumbles at you (while it keeps on walking).
import { useEffect, useRef, useState } from "react";

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
      <svg className="kinesin-track" aria-hidden="true" preserveAspectRatio="none">
        <defs>
          <pattern
            id="tubulin"
            width="32"
            height="28"
            patternUnits="userSpaceOnUse"
          >
            <circle className="tub-a" cx="8" cy="8" r="7" />
            <circle className="tub-b" cx="24" cy="8" r="7" />
            <circle className="tub-b" cx="8" cy="20" r="7" />
            <circle className="tub-a" cx="24" cy="20" r="7" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#tubulin)" />
      </svg>

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
        <svg className="kinesin-body" aria-hidden="true" viewBox="0 0 140 180">
          {/* two small heads that step past each other along the track */}
          <g className="kinesin-leg-a">
            <g className="kinesin-thigh">
              <line className="kinesin-bone" x1="70" y1="144" x2="70" y2="157" />
              <g className="kinesin-shin">
                <line className="kinesin-bone" x1="70" y1="157" x2="70" y2="168" />
                <ellipse className="kinesin-head" cx="70" cy="170" rx="7" ry="5" />
              </g>
            </g>
          </g>
          <g className="kinesin-leg-b">
            <g className="kinesin-thigh">
              <line className="kinesin-bone" x1="70" y1="144" x2="70" y2="157" />
              <g className="kinesin-shin">
                <line className="kinesin-bone" x1="70" y1="157" x2="70" y2="168" />
                <ellipse className="kinesin-head" cx="70" cy="170" rx="7" ry="5" />
              </g>
            </g>
          </g>

          {/* small hip coupling stays with the motor (masks the stalk base) */}
          <circle className="kinesin-hip" cx="70" cy="144" r="8" />

          {/* cargo assembly: trails back-left (fluid drag) and floats in place */}
          <g className="kinesin-cargo-group">
            <path className="kinesin-stalk" d="M70 144 C 64 122, 66 102, 69 89" />
            <circle className="kinesin-cargo" cx="34" cy="54" r="50" />
            <circle className="kinesin-cargo-hl" cx="20" cy="40" r="14" />
          </g>
        </svg>
      </button>

      <span className="kinesin-caption">Kinesin · a molecular motor</span>
    </div>
  );
};

export default KinesinWalk;
