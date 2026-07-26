import { useCallback, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router";
import gsap from "gsap";
import { TransitionContext } from "./pageTransitionContext";

// A single persistent "portal" overlay above the routes. portalTo() ignites a
// Doctor-Strange-style sanctum portal at the trigger: a crackling ring of
// sparks expands around a growing circle (the clip-path gradient "dimension"),
// then navigation happens behind it and the destination page calls
// portalReveal() on mount to implode the ring away. The overlay lives above
// <Routes> so it survives the route swap and masks the lazy chunk load.
//
// IMPORTANT: the cover/reveal tweens must be created OUTSIDE any component's
// `useGSAP` context (portalTo runs from a DOM event handler; portalReveal is
// called from a plain useEffect, never useGSAP). A tween captured by a page's
// useGSAP context gets reverted on unmount — which would strand the overlay
// covering and flood the previous page.

const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// radius that reaches the farthest viewport corner from (x, y)
const coverRadius = (x, y) => {
  const w = window.innerWidth, h = window.innerHeight;
  return Math.hypot(Math.max(x, w - x), Math.max(y, h - y));
};

const CYAN = [76, 201, 240];
const VIOLET = [157, 78, 221];
const RING_DOTS = 130;
const MAX_SPARKS = 420;

// additive radial glow: white core → coloured halo → transparent
const glow = (ctx, x, y, radius, rgb, a) => {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, `rgba(255,255,255,${a})`);
  g.addColorStop(0.35, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`);
  g.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
};

export function TransitionProvider({ children }) {
  const navigate = useNavigate();
  const portalRef = useRef(null);   // gradient "dimension" fill (clip-path)
  const canvasRef = useRef(null);   // spark-ring particle layer
  const coveringRef = useRef(false);
  const safetyRef = useRef(null);

  // shared portal state read by both the clip-path and the canvas renderer
  const fx = useRef({ r: 0, cx: 0, cy: 0, spin: 0, sparks: [], active: false, dpr: 1, t: 0 });
  const renderRef = useRef(null); // stable ticker fn for add/remove

  const setClip = useCallback((r, x, y) => {
    if (portalRef.current) portalRef.current.style.clipPath = `circle(${r}px at ${x}px ${y}px)`;
  }, []);

  // --- particle helpers ------------------------------------------------
  const spawnRim = (count, speedMul = 1) => {
    const st = fx.current;
    for (let i = 0; i < count && st.sparks.length < MAX_SPARKS; i++) {
      const a = Math.random() * Math.PI * 2;
      const rad = st.r + (Math.random() - 0.4) * 10;
      const out = 60 + Math.random() * 180; // radial speed
      const tan = (Math.random() - 0.5) * 160; // tangential jitter
      const vx = Math.cos(a) * out - Math.sin(a) * tan;
      const vy = Math.sin(a) * out + Math.cos(a) * tan;
      st.sparks.push({
        x: st.cx + Math.cos(a) * rad,
        y: st.cy + Math.sin(a) * rad,
        vx: vx * speedMul,
        vy: vy * speedMul,
        life: 0.3 + Math.random() * 0.35,
        age: 0,
        size: 1 + Math.random() * 2.4,
        rgb: Math.random() < 0.5 ? CYAN : VIOLET,
      });
    }
  };

  const render = useCallback((_time, deltaMs) => {
    const st = fx.current;
    const canvas = canvasRef.current;
    if (!canvas || !st.active) return;
    const ctx = canvas.getContext("2d");
    const dt = Math.min(deltaMs, 40) / 1000;
    st.t += dt;
    st.spin += dt * 1.6;

    ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width / st.dpr, canvas.height / st.dpr);
    ctx.globalCompositeOperation = "lighter";

    const { cx, cy, r } = st;

    // faint rotating filament arcs inside the ring — "dimension" depth
    if (r > 8) {
      ctx.lineWidth = 1.4;
      for (let k = 0; k < 4; k++) {
        const rr = r * (0.5 + k * 0.12);
        const start = st.spin * (k % 2 ? -1.3 : 1.1) + k;
        ctx.strokeStyle = `rgba(${k % 2 ? VIOLET : CYAN}, 0.28)`;
        ctx.beginPath();
        ctx.arc(cx, cy, rr, start, start + 1.1 + (k * 0.3));
        ctx.stroke();
      }
    }

    // the crackling energy rim
    if (r > 2) {
      // glowing brand-coloured energy edge (blurred stroke)
      ctx.save();
      ctx.lineWidth = 4.5;
      ctx.strokeStyle = `rgba(${CYAN[0]},${CYAN[1]},${CYAN[2]},0.7)`;
      ctx.shadowColor = `rgba(${VIOLET[0]},${VIOLET[1]},${VIOLET[2]},0.95)`;
      ctx.shadowBlur = 34;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // glowing dots around the circle with flicker + white-hot cores
      for (let i = 0; i < RING_DOTS; i++) {
        const ang = (i / RING_DOTS) * Math.PI * 2 + st.spin;
        const flick = Math.sin(st.t * 22 + i * 1.7) * 5 + (Math.random() - 0.5) * 6;
        const rr = r + flick;
        const x = cx + Math.cos(ang) * rr;
        const y = cy + Math.sin(ang) * rr;
        const rgb = i % 2 ? CYAN : VIOLET;
        const size = 3.5 + Math.abs(Math.sin(st.t * 18 + i)) * 4;
        glow(ctx, x, y, size * 3.2, rgb, 0.65);
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.beginPath();
        ctx.arc(x, y, size * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // update + draw flung sparks
    for (let i = st.sparks.length - 1; i >= 0; i--) {
      const s = st.sparks[i];
      s.age += dt;
      if (s.age >= s.life) { st.sparks.splice(i, 1); continue; }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vx *= 0.94;
      s.vy *= 0.94;
      const a = (1 - s.age / s.life) * 0.9;
      glow(ctx, s.x, s.y, s.size * 3, s.rgb, a);
    }

    ctx.globalCompositeOperation = "source-over";
  }, []);

  const startFx = (cx, cy) => {
    const canvas = canvasRef.current;
    const st = fx.current;
    st.dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas) {
      canvas.width = window.innerWidth * st.dpr;
      canvas.height = window.innerHeight * st.dpr;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
    }
    st.cx = cx; st.cy = cy; st.r = 0; st.spin = 0; st.t = 0; st.sparks = [];
    st.active = true;
    if (!renderRef.current) renderRef.current = render;
    gsap.ticker.add(renderRef.current);
  };

  const stopFx = useCallback(() => {
    const st = fx.current;
    st.active = false;
    if (renderRef.current) gsap.ticker.remove(renderRef.current);
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    st.sparks = [];
  }, []);

  const reset = useCallback(() => {
    coveringRef.current = false;
    if (safetyRef.current) { clearTimeout(safetyRef.current); safetyRef.current = null; }
    stopFx();
    const el = portalRef.current;
    if (!el) return;
    el.style.pointerEvents = "none";
    el.style.clipPath = "circle(0px at 50% 50%)";
  }, [stopFx]);

  const portalReveal = useCallback(() => {
    if (!coveringRef.current || !portalRef.current) return;
    if (safetyRef.current) { clearTimeout(safetyRef.current); safetyRef.current = null; }
    const st = fx.current;
    const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    st.cx = cx; st.cy = cy;
    if (!st.active) startFx(cx, cy); // safety path: fx not running
    st.r = coverRadius(cx, cy);
    spawnRim(90, 1.3); // arrival burst
    gsap.to(st, {
      r: 0,
      duration: 0.7,
      ease: "power2.out",
      onUpdate: () => { setClip(st.r, cx, cy); if (Math.random() < 0.6) spawnRim(3); },
      onComplete: reset,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setClip, reset]);

  const portalTo = useCallback((to, originEl) => {
    if (prefersReduced() || !portalRef.current) { navigate(to); return; }

    const rect = originEl?.getBoundingClientRect?.();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    const maxR = coverRadius(x, y);

    const el = portalRef.current;
    el.style.pointerEvents = "auto"; // swallow clicks mid-transition
    coveringRef.current = true;

    const st = fx.current;
    startFx(x, y);
    setClip(0, x, y);
    spawnRim(110, 1.3); // ignition burst
    gsap.to(st, {
      r: maxR,
      duration: 0.68,
      ease: "power2.in",
      onUpdate: () => { setClip(st.r, x, y); spawnRim(7); },
      onComplete: () => {
        navigate(to);
        safetyRef.current = setTimeout(() => portalReveal(), 1800);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, setClip, portalReveal]);

  // clear timer + ticker if the provider unmounts
  useEffect(() => () => {
    if (safetyRef.current) clearTimeout(safetyRef.current);
    if (renderRef.current) gsap.ticker.remove(renderRef.current);
  }, []);

  const value = useMemo(() => ({ portalTo, portalReveal }), [portalTo, portalReveal]);

  return (
    <TransitionContext.Provider value={value}>
      {children}
      <div ref={portalRef} className="route-portal" aria-hidden="true" />
      <canvas ref={canvasRef} className="route-portal-fx" aria-hidden="true" />
    </TransitionContext.Provider>
  );
}
