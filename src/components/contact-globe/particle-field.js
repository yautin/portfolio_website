import {
  BufferAttribute, BufferGeometry, Camera, Matrix3, Points, Scene, ShaderMaterial,
  Vector4, WebGLRenderer,
} from 'three'
import rows from './particles.json' with { type: 'json' }

export const ASSEMBLY_SECONDS = 2.4
const RAD = Math.PI / 180
const TAU = Math.PI * 2

// Decode land once per field. A shuffled index makes every draw-range prefix
// a sample of the whole Earth, rather than a cut through the latitude rows.
function makeGeometry() {
  let count = 0
  for (const row of rows) {
    for (let k = 4; k < row.length; k += 2) count += row[k]
  }
  const surface = new Float32Array(count * 3)
  const cloud = new Float32Array(count * 3)
  const seed = new Float32Array(count * 4)
  const indices = Array.from({ length: count }, (_, i) => i)
  let state = 0x71c3a4df
  const random = () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0
    return state / 4294967296
  }
  let i = 0
  for (const [lat, nLon, stagger, ...runs] of rows) {
    const a = lat * RAD, cosA = Math.cos(a), sinA = Math.sin(a)
    for (let k = 0; k < runs.length; k += 2) {
      for (let n = runs[k]; n < runs[k] + runs[k + 1]; n++, i++) {
        const b = (-180 + 360 * (n + stagger) / nLon) * RAD
        surface.set([cosA * Math.cos(b), cosA * Math.sin(b), sinA], 3 * i)
        // Volume sampling, not a radial explosion of the same continent mask.
        const phi = TAU * random(), z = 2 * random() - 1
        const r = 1.38 * Math.cbrt(random()), xy = r * Math.sqrt(1 - z * z)
        cloud.set([xy * Math.cos(phi), xy * Math.sin(phi), r * z], 3 * i)
        seed.set([random(), random(), random(), random()], 4 * i)
      }
    }
  }
  for (let n = count - 1; n > 0; n--) {
    const j = Math.floor(random() * (n + 1))
    const tmp = indices[j]; indices[j] = indices[n]; indices[n] = tmp
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(surface, 3))
  geometry.setAttribute('aCloud', new BufferAttribute(cloud, 3))
  geometry.setAttribute('aSeed', new BufferAttribute(seed, 4))
  geometry.setIndex(indices)
  return geometry
}

const vertexShader = /* glsl */ `
  attribute vec3 aCloud;
  attribute vec4 aSeed;
  uniform mat3 uView;
  uniform vec4 uHover;
  uniform float uProgress, uTime, uPointScale, uLight, uFrameScale;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    // Two small, independently phased tangent motions. Reproject onto the
    // unit sphere so moving dots still share the pins' orthographic limb.
    vec3 east = normalize(vec3(-position.y, position.x, 0.0) + vec3(1e-8, 0.0, 0.0));
    vec3 north = cross(position, east);
    vec2 phase = 6.2831853 * aSeed.xy + uTime * (0.55 + 1.15 * aSeed.zw);
    vec3 surface = normalize(position + 0.0055 * (east * sin(phase.x) + north * cos(phase.y)));
    vec3 normal = uView * surface; // east, north, towards the viewer
    float assembled = smoothstep(0.28 * aSeed.z, 1.0, uProgress);
    vec3 p = mix(uView * aCloud, normal, assembled);
    p.xy += (4.0 * assembled * (1.0 - assembled)) * 0.16 * (aSeed.xy * 2.0 - 1.0);
    gl_Position = vec4(0.84 * uFrameScale * p.xy, -0.5 * p.z, 1.0);

    // Chord distance on the sphere, not a screen-space cursor disc. The
    // expanding, fading band and its core can only illuminate front dots.
    float d = distance(normal, uHover.xyz);
    float cycle = fract(uTime * 0.65);
    float ring = 1.0 - smoothstep(0.0, 0.038, abs(d - mix(0.08, 0.34, cycle)));
    ring *= sin(3.14159265 * cycle);
    float halo = (exp(-55.0 * d * d) + 0.72 * ring) * uHover.w;
    halo = clamp(halo, 0.0, 1.0) * smoothstep(0.0, 0.09, normal.z) * assembled;

    float face = smoothstep(-0.025, 0.24, normal.z);
    float silver = clamp(0.22 + 0.48 * normal.z + 0.30 * aSeed.x, 0.0, 1.0);
    vec3 night = mix(vec3(0.22, 0.40, 0.56), vec3(0.88, 0.95, 1.0), silver);
    vec3 day = mix(vec3(0.24, 0.40, 0.50), vec3(0.07, 0.17, 0.24), silver);
    vec3 lit = mix(vec3(0.29, 0.93, 1.0), vec3(0.0, 0.50, 0.64), uLight);
    vColor = mix(mix(night, day, uLight), lit, halo);

    float farAlpha = step(0.65, aSeed.w) * (0.10 + 0.12 * aSeed.y);
    float landAlpha = mix(farAlpha, 0.57 + 0.30 * aSeed.y, face);
    vAlpha = mix(0.10 + 0.13 * aSeed.x, min(1.0, landAlpha + 0.35 * halo), assembled);
    gl_PointSize = max(1.0, uPointScale * (0.83 + 0.42 * aSeed.w + 0.22 * face + 0.55 * halo));
  }
`

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 xy = 2.0 * gl_PointCoord - 1.0;
    float r2 = dot(xy, xy);
    if (r2 >= 1.0 || vAlpha == 0.0) discard;
    float alpha = vAlpha * (1.0 - smoothstep(0.16, 1.0, r2));
    gl_FragColor = vec4(vColor, alpha); // display-space palette, straight alpha
  }
`

/** Caller owns the clock, orbit, pointer and canvas CSS; no animation is scheduled here. */
export function createParticleField(canvas) {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: false, depth: false, stencil: false })
  renderer.setClearColor(0x000000, 0)
  const uniforms = {
    uFrameScale: { value: 1 },
    uView: { value: new Matrix3() }, uHover: { value: new Vector4(0, 0, 1, 0) },
    uProgress: { value: 0 }, uTime: { value: 0 }, uPointScale: { value: 1 }, uLight: { value: 0 },
  }
  const geometry = makeGeometry()
  const material = new ShaderMaterial({
    uniforms, vertexShader, fragmentShader, transparent: true, depthTest: false, depthWrite: false, toneMapped: false,
  })
  const points = new Points(geometry, material)
  points.frustumCulled = false // shader emits clip space directly
  const scene = new Scene(), camera = new Camera()
  scene.add(points)

  return {
    resize(cssSize, dpr = 1, paintSize = cssSize) {
      const size = Math.max(1, cssSize), ratio = Math.min(2, Math.max(1, dpr))
      // Only the framebuffer grows; the map, sprite sizes and density still
      // use the logical globe size shared by the SVG pins and pointer input.
      renderer.setDrawingBufferSize(paintSize, paintSize, ratio)
      uniforms.uFrameScale.value = size / paintSize
      uniforms.uPointScale.value = ratio * Math.max(1.15, size / 230)
      const full = geometry.attributes.position.count
      geometry.setDrawRange(0, Math.min(full, Math.ceil(full * (size / 330) ** 2)))
    },
    draw({ lat, lon, time = 0, progress = time / ASSEMBLY_SECONDS, hover, light = false }) {
      const a = lat * RAD, b = lon * RAD
      const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b)
      uniforms.uView.value.set(-sb, cb, 0, -sa * cb, -sa * sb, ca, ca * cb, ca * sb, sa)
      uniforms.uProgress.value = Math.min(1, Math.max(0, progress))
      uniforms.uTime.value = time
      uniforms.uHover.value.set(hover?.x ?? 0, hover?.y ?? 0, hover?.z ?? 1, hover?.strength ?? 0)
      uniforms.uLight.value = light ? 1 : 0
      renderer.render(scene, camera)
    },
    dispose() {
      geometry.dispose()
      material.dispose()
      renderer.dispose()
    },
  }
}
