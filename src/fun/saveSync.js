import { supabase } from "./supabaseClient";
import { gameById } from "./games";

// Generic cloud-save layer for the games hub. Games keep reading and writing
// localStorage untouched; each registry entry's `save` descriptor (keys +
// change event) tells this module what to snapshot into the one JSON blob per
// (user, game) row in Supabase — no per-game knowledge lives here.

const keysFor = (gameId) => gameById(gameId)?.save.keys ?? [];

const snapshot = (gameId) => {
  const data = {};
  for (const key of keysFor(gameId)) {
    const v = localStorage.getItem(key);
    if (v !== null) data[key] = v;
  }
  return data;
};

const hydrate = (gameId, data) => {
  for (const key of keysFor(gameId)) {
    if (data && Object.hasOwn(data, key)) localStorage.setItem(key, data[key]);
    else localStorage.removeItem(key);
  }
};

export const clearLocal = (gameId) => {
  for (const key of keysFor(gameId)) localStorage.removeItem(key);
};

// Sign-in / page-load sync: cloud copy wins when it exists; otherwise the
// current local progress is uploaded (first-login migration).
export async function pullSave(userId, gameId) {
  if (!supabase) return;
  const { data, error } = await supabase
    .from("game_saves")
    .select("save_data")
    .eq("user_id", userId)
    .eq("game_id", gameId)
    .maybeSingle();
  if (error) throw error;
  if (data) hydrate(gameId, data.save_data);
  else await pushSave(userId, gameId);
}

export async function pushSave(userId, gameId) {
  if (!supabase) return;
  const { error } = await supabase.from("game_saves").upsert({
    user_id: userId,
    game_id: gameId,
    save_data: snapshot(gameId),
  });
  if (error) throw error;
}

export async function deleteSave(userId, gameId) {
  if (!supabase) return;
  const { error } = await supabase
    .from("game_saves")
    .delete()
    .eq("user_id", userId)
    .eq("game_id", gameId);
  if (error) throw error;
}

// Debounced pusher for the in-game save-changed events.
export function makeDebouncedPush(userId, gameId, delay = 1500) {
  let timer = null;
  const fire = () => {
    timer = null;
    pushSave(userId, gameId).catch((e) => console.warn("save sync failed", e));
  };
  const push = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(fire, delay);
  };
  push.flush = () => {
    if (timer) {
      clearTimeout(timer);
      fire();
    }
  };
  push.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  return push;
}
