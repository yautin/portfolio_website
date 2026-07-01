// Decorative divider: a tiny kinesin motor hauling a big cargo vesicle,
// walking hand-over-hand along a microtubule. Purely visual (CSS-animated),
// sits between Data Distilled and Contact. Each leg is a 2-bone limb (thigh +
// shin) pivoting from a fixed hip for a real alternating gait. Honors
// prefers-reduced-motion.
const KinesinWalk = () => {
  return (
    <div
      className="kinesin-band"
      role="img"
      aria-label="Illustration: a kinesin motor protein hauling a cargo vesicle along a microtubule"
    >
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
      <div className="kinesin" aria-hidden="true">
        <svg className="kinesin-body" viewBox="0 0 140 180">
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
      </div>

      <span className="kinesin-caption">Kinesin · a molecular motor</span>
    </div>
  );
};

export default KinesinWalk;
