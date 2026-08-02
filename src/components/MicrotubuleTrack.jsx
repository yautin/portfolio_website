import { useId } from "react";

// The microtubule a kinesin walks along: repeating α/β-tubulin dimers tiled
// across the full width of whatever box it's dropped into.
//
// The pattern id is generated per instance. Two of these on one page with a
// hard-coded id would collide, and every `fill: url(#tubulin)` would resolve to
// whichever pattern happened to render first — the classic SVG duplicate-id
// bug. useId's colons are stripped because `url(#:r1:)` is not a usable
// reference.
const MicrotubuleTrack = ({ className, scale = 1 }) => {
  const id = `tubulin-${useId().replace(/:/g, "")}`;
  const w = 32 * scale;
  const h = 28 * scale;

  return (
    <svg className={className} aria-hidden="true" preserveAspectRatio="none">
      <defs>
        <pattern id={id} width={w} height={h} patternUnits="userSpaceOnUse">
          <circle className="tub-a" cx={8 * scale} cy={8 * scale} r={7 * scale} />
          <circle className="tub-b" cx={24 * scale} cy={8 * scale} r={7 * scale} />
          <circle className="tub-b" cx={8 * scale} cy={20 * scale} r={7 * scale} />
          <circle className="tub-a" cx={24 * scale} cy={20 * scale} r={7 * scale} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
};

export default MicrotubuleTrack;
