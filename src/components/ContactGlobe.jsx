import { useEffect, useId, useRef } from 'react'
import { contactCities } from '../constants'
import { buildRoute, homeView, projectRoute, staticLand } from './contact-globe/geometry'
import { mountGlobe } from './contact-globe/interaction'

const route = buildRoute(contactCities)
const home = projectRoute(homeView, route)
const poster = staticLand()
const title = `Globe showing ${contactCities[0].name} connected to ${contactCities[1].name}`

export default function ContactGlobe() {
  const host = useRef(null)
  const hint = useId()
  useEffect(() => mountGlobe(host.current, route), [])

  return (
    <div ref={host} className="contact-globe" data-phase="ready" data-renderer="waiting" role="group" aria-label={title}>
      <div className="globe-surface" role="group" tabIndex={-1} aria-label="Rotate globe" aria-describedby={hint}>
        <canvas className="globe-canvas" aria-hidden="true" />
      </div>
      <span id={hint} className="sr-only">Drag or use the arrow keys to rotate. Press Home to return to Hong Kong and Toronto.</span>
      <svg className="globe-overlay" viewBox="0 0 200 200" fill="none" aria-hidden="true" focusable="false">
        <g className="globe-poster" strokeLinecap="round">
          {poster.map((d, depth) => <path key={depth} className={`globe-land depth-${depth}`} d={d} />)}
        </g>
        <path className="globe-route" d={home.route} pathLength="1" strokeDasharray="1 1" />
        {home.pins.map(({ x, y }, i) => (
          <g className="globe-marker" key={contactCities[i].name} transform={`translate(${x} ${y})`}>
            <circle className="globe-pin-halo" r="3.5" />
            <circle className="globe-pin" r="1.65" />
          </g>
        ))}
      </svg>
      {home.pins.map(({ x, y }, i) => <span key={contactCities[i].name} aria-hidden="true"
        className={`globe-label globe-label-${i}`} style={{ left: `${x/2}%`, top: `${y/2}%` }}>{contactCities[i].name}</span>)}
      <button type="button" className="globe-toggle" aria-label="Pause globe rotation" title="Pause globe rotation">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path className="globe-pause" d="M4 3h3v10H4zm5 0h3v10H9z" /><path className="globe-play" d="m5 2 9 6-9 6z" />
        </svg>
      </button>
    </div>
  )
}
