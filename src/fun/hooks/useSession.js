import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

// Owns the Supabase auth session for the hub: current session plus the access
// token the reward edge functions need. Every "is Supabase even configured?"
// check lives in here rather than being repeated at each call site.
export function useSession() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Read the token fresh on each call rather than closing over `session` — it
  // may have been silently refreshed since the last render.
  const getAccessToken = useCallback(async () => {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  return { session, getAccessToken };
}
