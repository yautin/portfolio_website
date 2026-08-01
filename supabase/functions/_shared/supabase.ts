import { createClient, type SupabaseClient, type User } from "npm:@supabase/supabase-js@2";
import { requireEnv } from "./env.ts";

// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are injected
// automatically into the Supabase edge runtime.

/// Service-role client — BYPASSES row-level security. Used only for the reward
/// ledger + nonce tables. The service-role key must NEVER reach the client.
export function adminDb(): SupabaseClient {
  return createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/// Verify the caller's Supabase JWT (from the Authorization header) and return
/// the authenticated user, or null. This is what gates every claim to a real,
/// logged-in account.
export async function getUser(req: Request): Promise<User | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const client = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser();
  return error ? null : data.user;
}
