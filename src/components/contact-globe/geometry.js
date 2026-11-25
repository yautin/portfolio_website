import rows from './land.json'

const RAD = Math.PI / 180
export const globeRadius = 84
// Look across the North Pacific, rather than centring one marker on the globe.
export const homeView = { lat: 55, lon: 173 }
const xyz = (lat, lon) => {
  const a = lat * RAD, b = lon * RAD
  return [Math.cos(a) * Math.cos(b), Math.cos(a) * Math.sin(b), Math.sin(a)]
}
const dot = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2]
const point = (p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`

const land = []
for (const [lat, count, offset, ...runs] of rows) {
  for (let k = 0; k < runs.length; k += 2) {
    for (let n = runs[k]; n < runs[k] + runs[k + 1]; n++) {
      land.push(xyz(lat, -180 + 360 * (n + offset) / count))
    }
  }
}

// Interpolate on the sphere (not longitude, which wraps at the date line).
// Zero lift at t=0 and t=1 registers both ends exactly on their city markers.
export function buildRoute(cities) {
  const [from, to] = cities.map(({ lat, lon }) => xyz(lat, lon))
  const angle = Math.acos(Math.max(-1, Math.min(1, dot(from, to))))
  return Array.from({ length: 65 }, (_, i) => {
    const t = i / 64, sine = Math.sin(angle), lift = 1 + 0.2 * Math.sin(t * Math.PI)
    const a = Math.sin((1 - t) * angle) / sine, b = Math.sin(t * angle) / sine
    return from.map((v, j) => lift * (a * v + b * to[j]))
  })
}

function camera({ lat, lon }) {
  const a = lat * RAD, b = lon * RAD
  const east = [-Math.sin(b), Math.cos(b), 0]
  const north = [-Math.sin(a)*Math.cos(b), -Math.sin(a)*Math.sin(b), Math.cos(a)]
  const front = xyz(lat, lon)
  return v => ({ x: 100 + globeRadius * dot(east, v), y: 100 - globeRadius * dot(north, v), z: dot(front, v) })
}

// Light, transparent poster for WebGL failure. Never recalculate land in the frame loop.
export function staticLand() {
  const project = camera(homeView)
  const field = [[], [], []]
  for (const v of land) {
    const p = project(v)
    if (p.z <= 0.025) continue
    const depth = Math.min(2, Math.floor(p.z * 3))
    field[depth].push(`M${point(p)}h.01`)
  }
  return field.map(d => d.join(''))
}

export function projectRoute(view, route) {
  const track = route.map(camera(view))
  let path = '', connected = false
  for (const p of track) {
    // A lifted arc behind the horizon may still rise above the silhouette.
    const visible = p.z >= 0 || (p.x - 100)**2 + (p.y - 100)**2 >= globeRadius**2
    if (visible) path += (connected ? 'L' : 'M') + point(p)
    connected = visible
  }
  return { route: path, pins: [track[0], track.at(-1)] }
}
