import { useEffect } from "react";
import { GAMES, gameById } from "../games";
import { makeDebouncedPush, pullSave } from "../saveSync";

// Keeps localStorage and the cloud in step for the signed-in player:
//   • on sign-in (or first load while signed in) pull every game's cloud save
//     down, so the hub and the games resume from the account copy;
//   • while a game is open, debounce-push local saves on each in-game save
//     event and flush on close.
// Game-agnostic throughout — the `save.event` name comes from the registry.
export function useCloudSaves(session, activeGameId, onHydrated) {
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
      if (!cancelled) onHydrated?.();
    })();
    return () => { cancelled = true; };
  }, [session, onHydrated]);

  useEffect(() => {
    if (!activeGameId || !session) return;
    const saveEvent = gameById(activeGameId)?.save.event;
    if (!saveEvent) return;
    const push = makeDebouncedPush(session.user.id, activeGameId);
    const onSave = () => push();
    window.addEventListener(saveEvent, onSave);
    return () => {
      window.removeEventListener(saveEvent, onSave);
      push.flush();
    };
  }, [activeGameId, session]);
}
