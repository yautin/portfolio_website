import { useCallback, useEffect, useRef, useState } from "react";
import { useMediaQuery } from "react-responsive";
import { setMuted } from "../game/audio";

// Design width is normalised to 960; the height is chosen to match the host's
// landscape shape so FIT fills the device with no distortion.
const BASE_W = 960;
const computeDesign = (w, h) => ({
  width: BASE_W,
  height: Math.round(Math.min(760, Math.max(400, BASE_W / (w / Math.max(1, h))))),
});

// Overlay shell for "Immune Defense". Phaser is dynamically imported (code-split)
// only when this mounts. The React layer owns the modal chrome, focus/scroll,
// mute + fullscreen, and device-responsive sizing (immersive on small screens,
// rotate prompt in portrait).
const ImmuneDefense = ({ onClose }) => {
  const hostRef = useRef(null);
  const closeRef = useRef(null);
  const gameRef = useRef(null);
  const factoryRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [isFs, setIsFs] = useState(false);
  const [muted, setMutedState] = useState(
    () => localStorage.getItem("gameMuted") === "1"
  );

  const isSmall = useMediaQuery({ query: "(max-width: 860px), (pointer: coarse)" });
  const isPortrait = useMediaQuery({ query: "(orientation: portrait)" });
  const rotateBlocked = isSmall && isPortrait;

  // read-latest ref so the mount effect's observer stays stable; kept in sync
  // by the orientation effect below (refs must not be written during render)
  const blockedRef = useRef(rotateBlocked);

  // Create the Phaser game once the host has a real landscape size and we're
  // not held back by portrait orientation. Idempotent.
  const tryCreate = useCallback(() => {
    if (gameRef.current || !factoryRef.current || blockedRef.current || !hostRef.current) return;
    const rect = hostRef.current.getBoundingClientRect();
    if (rect.width < 40 || rect.height < 40) return;
    const { width, height } = computeDesign(rect.width, rect.height);
    gameRef.current = factoryRef.current({ parent: hostRef.current, width, height });
    setLoading(false);
  }, []);

  useEffect(() => {
    const prevFocus = document.activeElement;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    setMuted(localStorage.getItem("gameMuted") === "1");

    let cancelled = false;
    import("../game/immuneDefense")
      .then(({ createImmuneDefense }) => {
        if (cancelled) return;
        factoryRef.current = createImmuneDefense;
        tryCreate();
      })
      .catch(() => setLoading(false));

    const ro = new ResizeObserver(() => tryCreate());
    if (hostRef.current) ro.observe(hostRef.current);

    // Esc exits fullscreen (browser) before it closes the game.
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (document.fullscreenElement) return;
      onClose();
    };
    const onFsChange = () => {
      setIsFs(!!document.fullscreenElement);
      // re-read parent bounds once the host has its fullscreen (or restored)
      // size so FIT rescales the canvas to fill it
      requestAnimationFrame(() => gameRef.current?.scale?.refresh());
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFsChange);

    return () => {
      cancelled = true;
      ro.disconnect();
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFsChange);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
      document.body.style.overflow = "";
      if (prevFocus instanceof HTMLElement) prevFocus.focus();
    };
  }, [onClose, tryCreate]);

  // Pause the running game while the rotate prompt is up; resume (and create if
  // we were waiting on landscape) when it clears.
  useEffect(() => {
    blockedRef.current = rotateBlocked;
    const mgr = gameRef.current?.scene;
    if (rotateBlocked) {
      if (mgr?.isActive?.("Game")) mgr.pause("Game");
    } else {
      if (mgr?.isPaused?.("Game")) mgr.resume("Game");
      tryCreate();
    }
  }, [rotateBlocked, tryCreate]);

  const toggleMute = () => {
    setMutedState((m) => {
      const next = !m;
      setMuted(next);
      localStorage.setItem("gameMuted", next ? "1" : "0");
      return next;
    });
  };

  // Fullscreen the host element via the browser API (Phaser's own
  // startFullscreen mis-measures our CSS-constrained host and leaves the
  // canvas small in a corner). CSS gives the fullscreened host the whole
  // screen; the fullscreenchange handler re-syncs Phaser's scale to it.
  const toggleFullscreen = () => {
    try {
      if (document.fullscreenElement) document.exitFullscreen?.();
      else hostRef.current?.requestFullscreen?.();
    } catch {
      /* fullscreen can be blocked by the browser; ignore */
    }
  };

  return (
    <div
      className={`game-overlay${isSmall ? " is-immersive" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Immune Defense game"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="game-panel">
        <div className="game-topbar">
          <span className="game-title">Immune Defense</span>
          <div className="game-actions">
            <button
              type="button"
              className="game-icon-btn"
              aria-label={muted ? "Unmute" : "Mute"}
              onClick={toggleMute}
            >
              {muted ? "🔇" : "🔊"}
            </button>
            {document.fullscreenEnabled && (
              <button
                type="button"
                className="game-icon-btn"
                aria-label={isFs ? "Exit fullscreen" : "Fullscreen"}
                onClick={toggleFullscreen}
              >
                {isFs ? "⤡" : "⛶"}
              </button>
            )}
            <button
              ref={closeRef}
              type="button"
              className="game-icon-btn"
              aria-label="Close game"
              onClick={onClose}
            >
              ✕
            </button>
          </div>
        </div>

        <div ref={hostRef} className="game-host">
          {/* the topbar is outside the fullscreened host, so give fullscreen its
              own exit control inside it */}
          {isFs && (
            <button
              type="button"
              className="game-fs-exit"
              aria-label="Exit fullscreen"
              onClick={toggleFullscreen}
            >
              ⤡ Exit
            </button>
          )}
          {loading && !rotateBlocked && <div className="game-loading">Loading…</div>}
          {rotateBlocked && (
            <div className="game-rotate">
              <div className="game-rotate-icon" aria-hidden="true">⟳</div>
              <p>Rotate your device to landscape to play</p>
            </div>
          )}
        </div>

        <p className="game-hint">
          Tap a card then a lane to place · tap a defender to upgrade, hold (or right-click) to sell · ⛶ fullscreen · Esc to close
        </p>
      </div>
    </div>
  );
};

export default ImmuneDefense;
