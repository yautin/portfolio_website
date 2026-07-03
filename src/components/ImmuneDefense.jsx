import { useEffect, useRef, useState } from "react";
import { setMuted } from "../game/audio";

// Overlay shell for "Immune Defense". Phaser is dynamically imported (code-split)
// only when this mounts, so it never bloats the main bundle. The React layer
// owns the modal chrome, focus/scroll management, mute toggle, and lifecycle.
const ImmuneDefense = ({ onClose }) => {
  const hostRef = useRef(null);
  const closeRef = useRef(null);
  const gameRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [muted, setMutedState] = useState(
    () => localStorage.getItem("gameMuted") === "1"
  );

  useEffect(() => {
    const prevFocus = document.activeElement;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    setMuted(localStorage.getItem("gameMuted") === "1");

    let cancelled = false;
    import("../game/immuneDefense")
      .then(({ createImmuneDefense }) => {
        if (cancelled || !hostRef.current) return;
        gameRef.current = createImmuneDefense({ parent: hostRef.current });
        setLoading(false);
      })
      .catch(() => setLoading(false));

    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKey);
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
      document.body.style.overflow = "";
      if (prevFocus instanceof HTMLElement) prevFocus.focus();
    };
  }, [onClose]);

  const toggleMute = () => {
    setMutedState((m) => {
      const next = !m;
      setMuted(next);
      localStorage.setItem("gameMuted", next ? "1" : "0");
      return next;
    });
  };

  return (
    <div
      className="game-overlay"
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
          {loading && <div className="game-loading">Loading…</div>}
        </div>

        <p className="game-hint">
          Tap a card then a lane to place · tap a defender to upgrade, hold (or right-click) to sell · Esc to close
        </p>
      </div>
    </div>
  );
};

export default ImmuneDefense;
