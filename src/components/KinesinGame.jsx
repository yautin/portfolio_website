import { useEffect, useRef } from "react";

// "Kinesin Run" — a Geometry-Dash-style endless platformer easter egg launched
// from the footer. The terrain is a scrolling stream of ground/platform
// segments with pits and spikes; land on tops, clear gaps, dodge spikes.
// Everything is drawn on a <canvas> in a delta-time rAF loop; game state lives
// in the effect closure (no React re-renders during play).
const HIGH_SCORE_KEY = "kinesinHighScore";
const W = 760; // logical canvas width
const H = 300; // logical canvas height
const GROUND_Y = 250; // baseline ground surface
const DEATH_Y = H + 40; // fall below this = dead (fell in a pit)

const KinesinGame = ({ onClose }) => {
  const canvasRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    const prevFocus = document.activeElement;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    // --- tunables ---
    const GRAVITY = 2400;
    const JUMP_V = -790; // apex ~130px (clears platforms up to ~90px)
    const BASE_SPEED = 300;
    const MAX_SPEED = 600;
    const HALF = 13; // half hitbox width
    const KH = 50; // hitbox height

    let state = "idle"; // idle | playing | over
    let raf = 0;
    let last = 0;

    const kin = { x: 100, y: GROUND_Y, vy: 0, onGround: true, legPhase: 0 };
    let speed, distance, score, frontier;
    let segments, spikes, atps;
    let best = Number(localStorage.getItem(HIGH_SCORE_KEY) || 0);

    const addGround = (x, w, top) => segments.push({ x, x2: x + w, top });

    // append terrain features until we're generated well past the right edge
    const generate = () => {
      while (frontier < W + 400) {
        // recovery flat ground (always jumpable landing between features)
        const rec = 150 + Math.random() * 70;
        addGround(frontier, rec, GROUND_Y);
        frontier += rec;

        const r = Math.random();
        if (r < 0.4) {
          // spikes on a flat stretch
          const len = 150;
          addGround(frontier, len, GROUND_Y);
          const n = 1 + Math.floor(Math.random() * 3);
          for (let k = 0; k < n; k++) {
            spikes.push({ x: frontier + 34 + k * 28, w: 22, top: GROUND_Y });
          }
          frontier += len;
        } else if (r < 0.68) {
          // pit (gap in the ground)
          frontier += 80 + Math.random() * 60;
        } else {
          // raised platform — must jump onto it (hitting its face is death)
          const h = 42 + Math.random() * 44;
          const blen = 120 + Math.random() * 70;
          addGround(frontier, blen, GROUND_Y - h);
          if (Math.random() < 0.6) {
            atps.push({ x: frontier + blen / 2, y: GROUND_Y - h - 34, r: 10, got: false });
          }
          frontier += blen;
        }

        if (Math.random() < 0.4) {
          atps.push({ x: frontier - 70, y: GROUND_Y - 74 - Math.random() * 36, r: 10, got: false });
        }
      }
    };

    const reset = () => {
      speed = BASE_SPEED;
      distance = 0;
      score = 0;
      segments = [];
      spikes = [];
      atps = [];
      frontier = 0;
      addGround(0, 340, GROUND_Y); // safe intro run
      frontier = 340;
      generate();
      kin.y = GROUND_Y;
      kin.vy = 0;
      kin.onGround = true;
      kin.legPhase = 0;
    };
    reset();

    const start = () => {
      reset();
      state = "playing";
    };
    const jump = () => {
      if (kin.onGround) {
        kin.vy = JUMP_V;
        kin.onGround = false;
      }
    };
    const action = () => (state === "playing" ? jump() : start());
    const end = () => {
      state = "over";
      if (score > best) {
        best = score;
        localStorage.setItem(HIGH_SCORE_KEY, String(best));
      }
    };

    // --- input ---
    const onKey = (e) => {
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "Enter") {
        e.preventDefault();
        action();
      } else if (e.code === "Escape") {
        onClose();
      }
    };
    const onPointer = (e) => {
      e.preventDefault();
      action();
    };
    window.addEventListener("keydown", onKey);
    canvas.addEventListener("pointerdown", onPointer);

    const aabb = (a, b) =>
      a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

    // --- update ---
    const update = (dt) => {
      if (state !== "playing") return;

      distance += speed * dt;
      score = Math.floor(distance / 10);
      speed = Math.min(MAX_SPEED, BASE_SPEED + distance * 0.02);

      const dx = speed * dt;
      for (const s of segments) {
        s.x -= dx;
        s.x2 -= dx;
      }
      for (const s of spikes) s.x -= dx;
      for (const a of atps) a.x -= dx;
      frontier -= dx;

      segments = segments.filter((s) => s.x2 > -40);
      spikes = spikes.filter((s) => s.x + s.w > -40);
      atps = atps.filter((a) => a.x + a.r > -40 && !a.got);
      generate();

      // physics
      const prevFeet = kin.y;
      kin.vy += GRAVITY * dt;
      kin.y += kin.vy * dt;

      // resolve terrain: land on tops, die on faces
      let floorTop = null;
      for (const s of segments) {
        if (kin.x + HALF > s.x && kin.x - HALF < s.x2) {
          if (prevFeet <= s.top + 8 && kin.y >= s.top) {
            if (floorTop === null || s.top < floorTop) floorTop = s.top;
          } else if (prevFeet > s.top + 8 && kin.y > s.top) {
            end();
            return; // ran into a raised platform's face
          }
        }
      }
      if (floorTop !== null) {
        kin.y = floorTop;
        kin.vy = 0;
        kin.onGround = true;
      } else {
        kin.onGround = false;
      }
      if (kin.y > DEATH_Y) {
        end();
        return; // fell into a pit
      }

      kin.legPhase += dt * (speed / 26);

      const box = { x: kin.x - HALF, y: kin.y - KH, w: HALF * 2, h: KH };
      for (const s of spikes) {
        if (aabb(box, { x: s.x, y: s.top - 22, w: s.w, h: 22 })) {
          end();
          return;
        }
      }
      for (const a of atps) {
        if (!a.got && aabb(box, { x: a.x - a.r, y: a.y - a.r, w: a.r * 2, h: a.r * 2 })) {
          a.got = true;
          score += 5;
          distance += 50;
        }
      }
    };

    // --- draw ---
    const drawSegment = (s) => {
      const w = s.x2 - s.x;
      ctx.fillStyle = "#141a24";
      ctx.fillRect(s.x, s.top, w, H - s.top);
      ctx.fillStyle = "#2b3547";
      ctx.fillRect(s.x, s.top, w, 3);
      // sparse tubulin beads along the surface (microtubule flavour)
      ctx.fillStyle = "#55617a";
      for (let x = s.x + 10; x < s.x2 - 4; x += 20) {
        ctx.beginPath();
        ctx.arc(x, s.top + 11, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const drawSpike = (s) => {
      ctx.fillStyle = "#f25f5c";
      ctx.beginPath();
      ctx.moveTo(s.x, s.top);
      ctx.lineTo(s.x + s.w / 2, s.top - 22);
      ctx.lineTo(s.x + s.w, s.top);
      ctx.closePath();
      ctx.fill();
    };

    const drawAtp = (a) => {
      ctx.fillStyle = "#4cc9f0";
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0f1116";
      ctx.font = "700 11px 'Mona Sans', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("P", a.x, a.y + 0.5);
      ctx.textBaseline = "alphabetic";
    };

    const drawKinesin = () => {
      const cx = kin.x;
      const feet = kin.y;
      ctx.strokeStyle = "#4cc9f0";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      const swing = kin.onGround ? Math.sin(kin.legPhase) * 6 : 4;
      ctx.beginPath();
      ctx.moveTo(cx - 3, feet - 16);
      ctx.lineTo(cx - 6 - swing, feet);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + 3, feet - 16);
      ctx.lineTo(cx + 6 + swing, feet);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, feet - 16);
      ctx.quadraticCurveTo(cx - 9, feet - 32, cx - 6, feet - 42);
      ctx.stroke();
      ctx.fillStyle = "#c9d4e1";
      ctx.beginPath();
      ctx.arc(cx - 8, feet - 54, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.beginPath();
      ctx.arc(cx - 13, feet - 59, 5, 0, Math.PI * 2);
      ctx.fill();
    };

    const overlayText = (title, sub) => {
      ctx.fillStyle = "rgba(15,17,22,0.72)";
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = "center";
      ctx.fillStyle = "#e8ebf2";
      ctx.font = "700 34px 'Mona Sans', sans-serif";
      ctx.fillText(title, W / 2, H / 2 - 6);
      ctx.fillStyle = "#8b97ad";
      ctx.font = "500 15px 'Mona Sans', sans-serif";
      ctx.fillText(sub, W / 2, H / 2 + 24);
    };

    const draw = () => {
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#161922");
      bg.addColorStop(1, "#0f1116");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      segments.forEach(drawSegment);
      atps.forEach(drawAtp);
      spikes.forEach(drawSpike);
      drawKinesin();

      ctx.fillStyle = "#c4cdda";
      ctx.font = "600 16px 'Mona Sans', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`SCORE ${score}`, 16, 27);
      ctx.textAlign = "right";
      ctx.fillText(`BEST ${best}`, W - 16, 27);

      if (state === "idle") {
        overlayText("Kinesin Run", "Press Space / tap to run");
      } else if (state === "over") {
        overlayText("Game over", `Score ${score} · Best ${best} — Space / tap to retry`);
      }
    };

    const loop = (t) => {
      const dt = Math.min(0.033, last ? (t - last) / 1000 : 0);
      last = t;
      update(dt);
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      canvas.removeEventListener("pointerdown", onPointer);
      document.body.style.overflow = "";
      if (prevFocus instanceof HTMLElement) prevFocus.focus();
    };
  }, [onClose]);

  return (
    <div
      className="game-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Kinesin Run mini-game"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="game-panel">
        <div className="game-topbar">
          <span className="game-title">Kinesin Run</span>
          <button
            ref={closeRef}
            type="button"
            className="game-close"
            aria-label="Close game"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <canvas ref={canvasRef} className="game-canvas" />
        <p className="game-hint">
          Space / ↑ / tap to jump · clear pits &amp; platforms · dodge spikes · Esc to close
        </p>
      </div>
    </div>
  );
};

export default KinesinGame;
