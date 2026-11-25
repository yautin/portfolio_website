import rail from './lenses/rail.png'
import pill from './lenses/pill.png'
import panel from './lenses/panel.png'
import disc from './lenses/disc.png'

// These are normal fields, not pictures of the hero. SourceGraphic here is
// the browser's current backdrop; the link text is painted afterwards.
const profiles = [['rail', rail, 48], ['pill', pill, 40], ['panel', panel, 50], ['disc', disc, 28]]
export default function GlassOptics() {
  return <svg className="nav-optics-defs" width="0" height="0" aria-hidden="true" focusable="false">
    <defs>{profiles.map(([name, field, power]) => <filter key={name} id={`nav-optic-${name}`}
      x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
      <feImage href={field} preserveAspectRatio="none" result="normals" />
      <feDisplacementMap in="SourceGraphic" in2="normals" scale={power} xChannelSelector="R" yChannelSelector="G" />
    </filter>)}</defs>
  </svg>
}
