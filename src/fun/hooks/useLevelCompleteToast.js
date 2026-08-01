import { useCallback, useEffect, useState } from "react";
import { rewardLabel, rewardsEnabled } from "../rewards";

// Web3 easter egg: when a level is beaten (a `game:levelcomplete` window event
// from the Phaser games), surface the claim nudge.
//
// Deliberately NOT gated on sign-in — the toast tells the player to sign in when
// they need to, so a win is never a silent no-op. No-op entirely unless the
// reward feature is configured.
export function useLevelCompleteToast() {
  const [reward, setReward] = useState(null);
  const dismiss = useCallback(() => setReward(null), []);

  useEffect(() => {
    if (!rewardsEnabled) return;
    const onWin = (e) => {
      const { gameId, level } = e.detail || {};
      if (!gameId || level == null) return;
      const levelLabel = rewardLabel(gameId, String(level));
      if (levelLabel) setReward({ levelLabel });
    };
    window.addEventListener("game:levelcomplete", onWin);
    return () => window.removeEventListener("game:levelcomplete", onWin);
  }, []);

  return { reward, dismiss };
}
