import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { supabase } from "../lib/supabase";
import { supportUrl } from "../constants";
import { usePageTransition } from "../components/pageTransitionContext";
import { GAMES, gameById } from "./games";
import CellField from "./CellField";

// One generic shell renders whichever registry game is active (lazy so the
// modal chrome stays out of the hub's initial paint).
const GameShell = lazy(() => import("./GameShell.jsx"));
import AuthCard from "./AuthCard";
import {
  pullSave,
  deleteSave,
  clearLocal,
  makeDebouncedPush,
} from "./saveSync";

const FunPage = () => {
  const [session, setSession] = useState(null);
  const [active, setActive] = useState(null); // the currently-open game id
  const [, setTick] = useState(0); // bump to re-read local progress
  const pageRef = useRef(null);
  const { portalReveal } = usePageTransition();

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  // Iris the transition portal back open now that the page has mounted (no-op
  // on a direct visit). MUST be a plain effect, not useGSAP — a tween created
  // inside a useGSAP context is reverted on unmount (the back nav), which would
  // rewind the persistent overlay to its covering state and flood the previous
  // page with gradient.
  useEffect(() => {
    portalReveal?.();
  }, [portalReveal]);

  // Stagger the hub content in behind the opening portal (safe to revert).
  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.from(".fun-header, .fun-card, .fun-side", {
        opacity: 0,
        y: 24,
        duration: 0.6,
        stagger: 0.12,
        ease: "power2.out",
        delay: 0.15,
      });
    },
    { scope: pageRef }
  );

  // track the auth session
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // on sign-in (or first load while signed in), pull each game's cloud save
  // into localStorage so the hub + game resume from the account copy
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      for (const game of GAMES) {
        try {
          await pullSave(session.user.id, game.id);
        } catch (e) {
          console.warn("pull save failed", e);
        }
      }
      if (!cancelled) refresh();
    })();
    return () => { cancelled = true; };
  }, [session, refresh]);

  // while a game is open and the user is signed in, debounce-push local saves
  // to the cloud on every in-game save event; flush on close
  useEffect(() => {
    if (!active || !session) return;
    const saveEvent = gameById(active)?.save.event;
    if (!saveEvent) return;
    const push = makeDebouncedPush(session.user.id, active);
    const onSave = () => push();
    window.addEventListener(saveEvent, onSave);
    return () => {
      window.removeEventListener(saveEvent, onSave);
      push.flush();
    };
  }, [active, session]);

  const closeGame = () => {
    setActive(null);
    refresh(); // progress line reflects what just happened
  };

  const resetGame = async (game) => {
    const ok = window.confirm(
      `Reset your progress for ${game.title}? This can't be undone.`
    );
    if (!ok) return;
    clearLocal(game.id);
    if (session) {
      try {
        await deleteSave(session.user.id, game.id);
      } catch (e) {
        console.warn("delete save failed", e);
      }
    }
    refresh();
  };

  const activeGame = active ? gameById(active) : null;

  return (
    <main className="fun-page" ref={pageRef}>
      <CellField />
      <header className="fun-header">
        <Link to="/" className="fun-brand">
          ← Marco Ng<span className="fun-brand-dot">.</span>
        </Link>
        <p className="fun-header-tag">Just some games for fun</p>
      </header>

      <div className="fun-body">
        {/* a div, not <section>: the global `section { width: 100dvw }` rule
            (for the portfolio's full-bleed bands) would force this to viewport
            width and overflow the grid track */}
        <div className="fun-games">
          {GAMES.map((game) => {
            const p = game.progress();
            return (
              <article className="fun-card" key={game.id} style={{ "--accent": game.accent }}>
                <div className="fun-card-cover">
                  <img src={game.cover} alt="" />
                </div>
                <div className="fun-card-body">
                  <h2 className="fun-card-title">{game.title}</h2>
                  <p className="fun-card-tagline">{game.tagline}</p>
                  <p className="fun-card-blurb">{game.blurb}</p>
                  <p className="fun-card-progress">
                    Level {p.level}/{p.total} · {p.stars}★
                  </p>
                  <div className="fun-card-actions">
                    <button
                      type="button"
                      className="fun-btn is-primary"
                      onClick={() => setActive(game.id)}
                    >
                      ▶ Play
                    </button>
                    <button
                      type="button"
                      className="fun-btn is-ghost"
                      onClick={() => resetGame(game)}
                    >
                      Reset progress
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <aside className="fun-side">
          <AuthCard session={session} />

          {supportUrl && (
            <a
              className="fun-coffee"
              href={supportUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              ☕ Buy me a coffee
            </a>
          )}
        </aside>
      </div>

      {activeGame && (
        <Suspense fallback={null}>
          <GameShell game={activeGame} onClose={closeGame} />
        </Suspense>
      )}
    </main>
  );
};

export default FunPage;
