import { createClient } from "@supabase/supabase-js";
import { FLAGS } from "../config/flags";

// Null when the env vars are absent OR still hold the .env.example
// placeholders — the hub then degrades gracefully (games playable with local
// saves; the auth card explains accounts are unavailable) instead of showing
// a sign-in form that can never authenticate. The anon key is public by
// design: row-level security restricts every request to the signed-in user.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Gate shared with the build banner (see src/config/features.js) so what the app
// does and what the build log reports can never disagree.
const configured = FLAGS.accounts.enabled;

export const supabase = configured ? createClient(url, anonKey) : null;
