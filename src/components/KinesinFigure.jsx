// The kinesin itself: a cargo vesicle on a stalk, over a hip and two 2-bone
// legs that step hand-over-hand. Shared by the portfolio's adult and the /fun
// page's baby so there is one anatomy to fix when it changes.
//
// Both variants keep the SAME 140×180 viewBox and the SAME hip at (70,144),
// because the gait CSS pivots the limbs about hard-coded user-space origins
// (see kinesin.css). Move the hip here and the legs rotate about thin air.
//
// The baby is NOT the adult scaled down — a uniform scale just reads as a
// distant adult. It gets baby-schema proportions instead: a small starter
// vesicle tucked in close to the body (rather than a huge one slung far out),
// stubbier legs and a smaller head. Speed and waddle come from CSS.
const GEOM = {
  adult: {
    knee: 157,
    foot: 168,
    head: { cy: 170, rx: 7, ry: 5 },
    hipR: 8,
    stalk: "M70 144 C 64 122, 66 102, 69 89",
    cargo: { cx: 34, cy: 54, r: 50 },
    hl: { cx: 20, cy: 40, r: 14 },
  },
  baby: {
    // shorter than the adult's 144→170, but long enough that the step still
    // reads at the 54px the /fun page renders it (at 15 units it vanished)
    knee: 154,
    foot: 164,
    head: { cy: 166, rx: 6.5, ry: 5 },
    hipR: 7,
    // barely any stalk: the vesicle is hugged against the body rather than
    // slung out behind, which is what stops this reading as a small adult
    stalk: "M70 144 C 68 138, 66 132, 65 126",
    // sits nearly over the hip (the adult's is slung far back-left): a toddler
    // carries its load centred, and off-centre made the legs look bolted to the
    // vesicle's right edge rather than underneath it
    cargo: { cx: 64, cy: 106, r: 34 },
    hl: { cx: 54, cy: 96, r: 10 },
  },
};

const Leg = ({ g, className }) => (
  <g className={className}>
    <g className="kinesin-thigh">
      <line className="kinesin-bone" x1="70" y1="144" x2="70" y2={g.knee} />
      <g className="kinesin-shin">
        <line className="kinesin-bone" x1="70" y1={g.knee} x2="70" y2={g.foot} />
        <ellipse className="kinesin-head" cx="70" cy={g.head.cy} rx={g.head.rx} ry={g.head.ry} />
      </g>
    </g>
  </g>
);

const KinesinFigure = ({ variant = "adult" }) => {
  const g = GEOM[variant] ?? GEOM.adult;

  return (
    <svg className="kinesin-body" aria-hidden="true" viewBox="0 0 140 180">
      {/* two heads that step past each other along the track */}
      <Leg g={g} className="kinesin-leg-a" />
      <Leg g={g} className="kinesin-leg-b" />

      {/* hip coupling stays with the motor (masks the stalk base) */}
      <circle className="kinesin-hip" cx="70" cy="144" r={g.hipR} />

      {/* cargo assembly: trails back-left (fluid drag) and floats in place.
          Drawn stalk-then-cargo so the cargo covers where the stalk enters it. */}
      <g className="kinesin-cargo-group">
        <path className="kinesin-stalk" d={g.stalk} />
        <circle className="kinesin-cargo" cx={g.cargo.cx} cy={g.cargo.cy} r={g.cargo.r} />
        <circle className="kinesin-cargo-hl" cx={g.hl.cx} cy={g.hl.cy} r={g.hl.r} />
      </g>
    </svg>
  );
};

export default KinesinFigure;
