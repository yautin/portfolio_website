import { useCallback, useEffect, useRef, useState } from "react";
import KinesinFigure from "../components/KinesinFigure";
import MicrotubuleTrack from "../components/MicrotubuleTrack";

// The /fun page's own kinesins: small round ones toddling along a thin
// microtubule at the foot of the hub, between two portals. Same anatomy
// component as the portfolio's adult (src/components/KinesinFigure.jsx) with
// baby proportions; the shorter, bouncier, waddling gait is CSS (kinesin.css).
//
// Click the left portal and another one walks out of it. Poke any of them and
// it pipes up, like the grown-up one does — but it hasn't learned to be grumpy
// yet.

// Must match .baby-kinesin's animation duration and .baby-portal-*'s width in
// kinesin.css — the spawn spacing maths below is in those terms.
const WALK_MS = 40000;
const PORTAL_W = 56;

// How much clear track a new walker needs ahead of it. Roughly four body
// widths, so they read as separate creatures rather than a conga line.
const MIN_GAP_PX = 110;

// The gap rule alone would allow ~9 on a wide screen; a lower cap keeps the
// strip calm, which is rather the point of this page.
const MAX_WALKERS = 6;

const chirps = [
  "I'm walking!",
  "This vesicle is heavy...",
  "One ATP please. Two ATP?",
  "Mum says I'm a big motor now.",
];

// One portal is three stacked layers. Every layer carries its own z-index (see
// .baby-portal-* in kinesin.css), so these can sit together in the markup
// regardless of where the track and the walkers appear in DOM order.
const Portal = ({ side, flaring }) => {
  const flare = flaring ? " is-flaring" : "";
  return (
    <>
      <span className={`baby-portal-mouth is-${side}${flare}`} aria-hidden="true" />
      <span className={`baby-portal-rim is-${side} is-near${flare}`} aria-hidden="true" />
      <span className={`baby-portal-rim is-${side} is-far${flare}`} aria-hidden="true" />
    </>
  );
};

// One walker. Its CSS animation starts when it mounts, so a freshly spawned one
// begins at phase 0 — inside the left portal, about to step out. Each keeps its
// own chirp so poking one doesn't make them all speak at once.
const Walker = () => {
  const [message, setMessage] = useState(null);
  const timerRef = useRef(null);
  const lastRef = useRef(-1);

  const poke = () => {
    // never repeat the chirp that's just been shown
    let i = Math.floor(Math.random() * chirps.length);
    if (i === lastRef.current) i = (i + 1) % chirps.length;
    lastRef.current = i;

    setMessage(chirps[i]);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setMessage(null), 3500);
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <button type="button" className="baby-kinesin" aria-label="Poke the baby kinesin" onClick={poke}>
      {message && (
        <span className="kinesin-bubble baby-kinesin-bubble" role="status">
          {message}
        </span>
      )}
      <KinesinFigure variant="baby" />
    </button>
  );
};

const BabyKinesin = () => {
  const stripRef = useRef(null);
  const [walkers, setWalkers] = useState(() => [{ id: 0, bornAt: performance.now() }]);
  const [flaring, setFlaring] = useState(false);
  // bumped by a timer purely to re-render when the cooldown ends; the value
  // itself is never read
  const [, retest] = useState(0);
  const nextId = useRef(1);
  const flareTimer = useRef(null);

  // The strip's width lives in state rather than being read off the ref at
  // render time: the spacing rule is in pixels, so it has to follow a resize,
  // and reading a ref while rendering is neither pure nor allowed.
  const [stripW, setStripW] = useState(0);
  useEffect(() => {
    const el = stripRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => setStripW(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pxPerMs = stripW > PORTAL_W ? (stripW - PORTAL_W) / WALK_MS : 0;

  // Clearance between the spawn point and the nearest walker, measured AROUND
  // THE LOOP rather than across the screen.
  //
  // The distinction is the whole correctness argument. Every walker runs the
  // same 40s linear animation over the same distance, so they share a velocity
  // and their separation never changes — but the walk is `infinite`, so a
  // walker finishing a lap teleports from the right-hand portal back to the
  // left-hand one. Measured on screen, a walker at 97% of its lap is ~985px
  // away and looks perfectly safe; 1.2s later it re-emerges from this very
  // portal and sits 30px from whatever we just spawned, for good.
  //
  // Taking the shorter way round the loop accounts for that, and because the
  // separation it measures is constant, checking once at spawn really does
  // hold for the rest of the session.
  const gapToNearest = useCallback(() => {
    if (pxPerMs <= 0) return Infinity; // not laid out yet; nothing to crowd
    const lap = pxPerMs * WALK_MS;
    const now = performance.now();
    return Math.min(
      ...walkers.map((w) => {
        const ahead = ((now - w.bornAt) % WALK_MS) * pxPerMs;
        return Math.min(ahead, lap - ahead);
      })
    );
  }, [walkers, pxPerMs]);

  // Derived at render rather than held in state: it is a function of the
  // walkers and the clock, and storing it would only create a second source of
  // truth to keep in sync.
  const atCapacity = walkers.length >= MAX_WALKERS;
  const gap = gapToNearest();
  const canSpawn = !atCapacity && gap >= MIN_GAP_PX;

  const spawn = () => {
    // re-checked here rather than trusting the disabled attribute: that is an
    // affordance, this is the rule
    if (atCapacity || gapToNearest() < MIN_GAP_PX) return;

    setWalkers((prev) => [...prev, { id: nextId.current++, bornAt: performance.now() }]);
    setFlaring(true);
    clearTimeout(flareTimer.current);
    flareTimer.current = setTimeout(() => setFlaring(false), 700);
  };

  // Keep the button's enabled state honest as the walkers move.
  //
  // A plain "wait until the one ahead is clear" timer isn't enough, because the
  // window closes as well as opens: a walker most of the way round its lap is
  // about to re-emerge from this portal, so spawning has to lock again shortly
  // before it does. Rather than solve for every boundary of that sawtooth, this
  // re-tests twice a second — cheap for a component this size, and obviously
  // correct. Nothing is set synchronously in the effect, which is what keeps it
  // clear of react-hooks/set-state-in-effect.
  useEffect(() => {
    if (atCapacity || pxPerMs <= 0) return undefined;
    const id = setInterval(() => retest((n) => n + 1), 500);
    return () => clearInterval(id);
  }, [atCapacity, pxPerMs]);

  useEffect(() => () => clearTimeout(flareTimer.current), []);

  return (
    <div className="baby-kinesin-strip" ref={stripRef}>
      <Portal side="left" flaring={flaring} />
      <Portal side="right" />

      <MicrotubuleTrack className="baby-kinesin-track" scale={0.6} />

      {walkers.map((w) => (
        <Walker key={w.id} />
      ))}

      {/* The portal itself is decorative (aria-hidden, pointer-events:none), so
          the control is a real button sitting over it — focusable, labelled,
          and honestly disabled while the last one is still too close. */}
      <button
        type="button"
        className="baby-portal-door"
        onClick={spawn}
        disabled={!canSpawn}
        aria-label={
          walkers.length >= MAX_WALKERS
            ? "The portal is full"
            : canSpawn
              ? "Open the portal and send out another kinesin"
              : "The portal is still settling"
        }
      />
    </div>
  );
};

export default BabyKinesin;
