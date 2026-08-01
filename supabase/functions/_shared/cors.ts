// CORS + JSON helpers shared by the reward edge functions.
//
// FAIL CLOSED: the allow-list defaults to local dev origins only, so a
// deployment that forgets to set ALLOWED_ORIGINS refuses browser calls from the
// public site rather than accepting every origin on the internet. Set
// ALLOWED_ORIGINS (comma-separated) in the Supabase secrets, e.g.
//   ALLOWED_ORIGINS=https://marco-ng.com,http://localhost:5173
// A literal "*" is still honoured if you explicitly opt into it.
const DEV_DEFAULT = "http://localhost:5173,http://127.0.0.1:5173";

const ALLOWED = (Deno.env.get("ALLOWED_ORIGINS") ?? DEV_DEFAULT)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  // Echo the origin only when it is allow-listed. An unknown origin gets no
  // Access-Control-Allow-Origin header at all, so the browser blocks the read.
  const allow = ALLOWED.includes("*") ? "*" : ALLOWED.includes(origin) ? origin : "";
  return {
    ...(allow ? { "Access-Control-Allow-Origin": allow } : {}),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

export function jsonResponse(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}
