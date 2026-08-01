import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { supportUrl } from "../constants";
import { usePageTransition } from "../components/pageTransitionContext";
import { GAMES, gameById } from "./games";
import CellField from "./CellField";
import AuthCard from "./AuthCard";
import { clearLocal, deleteSave } from "./saveSync";
import { rewardsEnabled } from "./rewards";
import { useSession } from "./hooks/useSession";
import { useCloudSaves } from "./hooks/useCloudSaves";
import { useClaimable } from "./hooks/useClaimable";
import { useLevelCompleteToast } from "./hooks/useLevelCompleteToast";

// One generic shell renders whichever registry game is active (lazy so the
// modal chrome stays out of the hub's initial paint).
const GameShell = lazy(() => import("./GameShell.jsx"));
// Persistent Rewards wallet card — the single place claiming happens. Its own
// lazy chunk holds the whole wagmi/viem stack (never in the main/hub bundle).
const WalletMount = lazy(() => import("../web3/WalletMount"));

// The hub page itself is layout + local UI state. Everything stateful and
// cross-cutting — auth, cloud saves, claimable rewards, the post-win toast —
// lives in ./hooks/*, so this component reads as the page it renders.
const FunPage = () => {
  const [active, setActive] = useState(null); // the currently-open game id
  const [tick, setTick] = useState(0); // bump to re-read local progress + claims
  const pageRef = useRef(null);
  const { portalReveal } = usePageTransition();

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const { session, getAccessToken } = useSession();
  useCloudSaves(session, active, refresh);
  const claimable = useClaimable(session, tick);
  const { reward, dismiss: dismissReward } = useLevelCompleteToast();

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

  const closeGame = () => {
    setActive(null);
    refresh(); // progress line reflects what just happened
  };

  const resetGame = async (game) => {
    const message = rewardsEnabled
      ? `Reset your progress for ${game.title}?\n\n` +
        `This clears your game progress and can't be undone. Any $CULT you've already ` +
        `earned stays in your wallet — but you will NOT be able to earn CULT again ` +
        `from levels you've already beaten.`
      : `Reset your progress for ${game.title}? This can't be undone.`;
    const ok = window.confirm(message);
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
                  <p className="fun-card-progress">{p.label}</p>
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

          {rewardsEnabled && (
            <Suspense fallback={null}>
              <WalletMount
                isSignedIn={!!session}
                claimable={claimable}
                getAccessToken={getAccessToken}
                onClaimed={refresh}
              />
            </Suspense>
          )}

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

      {/* Post-win nudge (plain JS, no wagmi) — layered above the game; points to
          the Rewards wallet where claiming actually happens. */}
      {reward && (
        <div className="reward-toast" role="status">
          <button type="button" className="reward-close" aria-label="Dismiss" onClick={dismissReward}>✕</button>
          <div className="reward-emoji" aria-hidden="true">🪙</div>
          <h3 className="reward-title">{reward.levelLabel} cleared — +1 $CULT!</h3>
          <p className="reward-body">
            {session
              ? "Collect it in your Rewards wallet (side panel)."
              : "Sign in to your account to claim your reward."}
          </p>
          <div className="reward-actions">
            <button type="button" className="reward-btn is-ghost" onClick={dismissReward}>Got it</button>
          </div>
        </div>
      )}
    </main>
  );
};

export default FunPage;
