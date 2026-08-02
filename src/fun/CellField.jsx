import { useEffect, useRef } from "react";
import { useTheme } from "../hooks/useTheme";

// Ambient "living microscope slide" behind the games hub: soft cells drift and
// gently flee the cursor. Pure Canvas 2D + rAF (no deps); pauses when the tab
// is hidden; skipped entirely under prefers-reduced-motion.

// Cool palette with one warm mote listed once against the others' twice, so
// roughly a sixth of the field picks up the lamplight wash behind it (see
// .fun-page::before) instead of the whole slide reading clinical.
const COLORS = [
  [76, 201, 240],  // cyan
  [157, 78, 221],  // violet
  [82, 209, 164],  // teal
  [76, 201, 240],
  [157, 78, 221],
  [244, 178, 116], // warm amber — the occasional lamplit speck
];
const COUNT = 40;
const REPEL_R = 150;

const prefersReduced = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const makeCells = (w, h) =>
  Array.from({ length: COUNT }, () => {
    // roughly half the old pace: unhurried drift reads as calm, and calm is
    // most of what makes this page feel like somewhere to sit rather than a
    // dashboard to scan
    const speed = 6 + Math.random() * 7;
    const dir = Math.random() * Math.PI * 2;
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      r: 8 + Math.random() * 32,
      vx: Math.cos(dir) * speed,
      vy: Math.sin(dir) * speed,
      wob: Math.random() * Math.PI * 2, // wobble phase
      wobSpeed: 0.25 + Math.random() * 0.35,
      rgb: COLORS[(Math.random() * COLORS.length) | 0],
    };
  });

const CellField = () => {
  const canvasRef = useRef(null);
  const theme = useTheme(); // "light" | "dark" — re-inits rendering on change

  useEffect(() => {
    if (prefersReduced()) return; // motion off → nothing to run
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const light = theme === "light";

    let dpr = 1, w = 0, h = 0, cells = [], transient = [], raf = 0, last = 0;
    const mouse = { x: -9999, y: -9999 };
    const MAX_TRANSIENT = 220;

    // click "cell-pop" burst — a ring of cyan/violet particles flung outward
    const spawnBurst = (x, y) => {
      for (let i = 0; i < 16 && transient.length < MAX_TRANSIENT; i++) {
        const a = (i / 16) * Math.PI * 2 + Math.random() * 0.4;
        const sp = 90 + Math.random() * 210;
        transient.push({
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          age: 0, life: 0.45 + Math.random() * 0.35,
          size: 2 + Math.random() * 3.5,
          rgb: Math.random() < 0.5 ? COLORS[0] : COLORS[1],
          core: Math.random() < 0.5,
        });
      }
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      if (!cells.length) cells = makeCells(w, h);
    };
    resize();

    const onMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    const onLeave = () => { mouse.x = mouse.y = -9999; };
    const onDown = (e) => {
      if (e.button !== 0) return; // primary click only
      // only pop on "empty space" — skip controls and the open game modal
      if (e.target?.closest?.("button, a, input, textarea, select, label, .game-overlay")) return;
      spawnBurst(e.clientX, e.clientY);
    };

    const step = (t) => {
      const dt = Math.min((t - last) || 16, 40) / 1000;
      last = t;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = light ? "source-over" : "lighter";

      for (const c of cells) {
        // cursor repulsion
        const dx = c.x - mouse.x, dy = c.y - mouse.y;
        const d = Math.hypot(dx, dy);
        if (d < REPEL_R && d > 0.01) {
          const f = (1 - d / REPEL_R) * 260 * dt;
          c.vx += (dx / d) * f;
          c.vy += (dy / d) * f;
        }
        // drift + wobble + damping back toward gentle speed
        c.wob += c.wobSpeed * dt;
        c.x += (c.vx + Math.cos(c.wob) * 6) * dt;
        c.y += (c.vy + Math.sin(c.wob) * 6) * dt;
        c.vx *= 0.96;
        c.vy *= 0.96;
        // keep a minimum drift so they never fully stop
        const sp = Math.hypot(c.vx, c.vy);
        if (sp < 10) { c.vx *= 1.04; c.vy *= 1.04; }
        // wrap around edges
        if (c.x < -c.r) c.x = w + c.r;
        if (c.x > w + c.r) c.x = -c.r;
        if (c.y < -c.r) c.y = h + c.r;
        if (c.y > h + c.r) c.y = -c.r;

        // cytoplasm glow
        const [R, G, B] = c.rgb;
        const a = light ? 0.16 : 0.13;
        const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
        g.addColorStop(0, `rgba(${R},${G},${B},${a})`);
        g.addColorStop(1, `rgba(${R},${G},${B},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.fill();
        // nucleus
        ctx.fillStyle = `rgba(${R},${G},${B},${light ? 0.5 : 0.42})`;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r * 0.18, 0, Math.PI * 2);
        ctx.fill();
      }

      // transient particles: click-pop bursts
      for (let i = transient.length - 1; i >= 0; i--) {
        const s = transient[i];
        s.age += dt;
        if (s.age >= s.life) { transient.splice(i, 1); continue; }
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vx *= 0.9;
        s.vy *= 0.9;
        const [R, G, B] = s.rgb;
        const a = (1 - s.age / s.life) * (light ? 0.75 : 0.85);
        const rad = s.size * 3;
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, rad);
        g.addColorStop(0, `rgba(${R},${G},${B},${a})`);
        g.addColorStop(1, `rgba(${R},${G},${B},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(s.x, s.y, rad, 0, Math.PI * 2);
        ctx.fill();
        if (s.core) {
          ctx.fillStyle = `rgba(255,255,255,${a})`;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size * 0.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      raf = requestAnimationFrame(step);
    };

    const start = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(step); } };
    const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };
    const onVis = () => (document.hidden ? stop() : start());

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseout", onLeave);
    window.addEventListener("pointerdown", onDown);
    document.addEventListener("visibilitychange", onVis);
    start();

    return () => {
      stop();
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseout", onLeave);
      window.removeEventListener("pointerdown", onDown);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [theme]);

  if (prefersReduced()) return null;
  return <canvas ref={canvasRef} className="fun-cellfield" aria-hidden="true" />;
};

export default CellField;
