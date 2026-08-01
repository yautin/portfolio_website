// Single source of truth for the site's optional features.
//
// Every feature here is opt-in: with none of the env vars set, the site still
// works — the games play with local saves, the contact form falls back to a
// mailto draft, and the reward UI never renders (and its wagmi/viem chunk is
// never fetched). That graceful degradation is deliberate, but it has a sharp
// edge: a MISSING variable and an INTENTIONALLY-OFF feature look identical, so a
// typo'd or forgotten Vercel variable silently removes a whole feature with no
// diagnostic anywhere. That is exactly how the Rewards wallet card went missing
// from production once already.
//
// So these predicates live in one place and are consumed BOTH by the app (with
// `import.meta.env`) and by the build banner in vite.config.js (with Vite's
// `loadEnv`), which prints what is on, what is off, and why. Keeping one
// definition is the point — a banner that drifted from the real gates would be
// worse than no banner at all.
//
// IMPORTANT: this module must stay a pure function of the env object it is
// handed. No `import.meta.env` at module scope, or vite.config.js (plain Node
// ESM, evaluated before any Vite transform) cannot import it.

// Values the .env.example templates ship with. Treated as "not configured" so a
// half-filled .env.local degrades gracefully instead of firing doomed requests.
const PLACEHOLDERS = ["your-project-ref", "your-anon-key", "YOUR_WEB3FORMS_ACCESS_KEY"];

const isSet = (v) => Boolean(v) && !PLACEHOLDERS.some((p) => String(v).includes(p));

/**
 * @param {Record<string, string | undefined>} env
 *   `import.meta.env` in app code, or `loadEnv(mode, cwd, "VITE_")` at build time.
 * @returns {{ [k: string]: { enabled: boolean, label: string, reason: string } }}
 *   `reason` names the specific variable at fault, so the build banner can say
 *   what to fix rather than just that something is off.
 */
export function featureFlags(env = {}) {
  // --- accounts + cloud saves (src/fun/supabaseClient.js) ---
  const hasUrl = isSet(env.VITE_SUPABASE_URL);
  const hasAnon = isSet(env.VITE_SUPABASE_ANON_KEY);
  const accountsMissing = [
    !hasUrl && "VITE_SUPABASE_URL",
    !hasAnon && "VITE_SUPABASE_ANON_KEY",
  ].filter(Boolean);

  // --- contact form (src/sections/Contact.jsx) ---
  const hasFormKey = isSet(env.VITE_WEB3FORMS_KEY);

  // --- web3 rewards (src/fun/rewards.js) ---
  // The functions URL is either explicit or derived from the Supabase URL, so
  // the token address is the variable that actually turns the feature on.
  const hasToken = isSet(env.VITE_REWARD_TOKEN_ADDRESS);
  const hasFunctions = isSet(env.VITE_REWARD_FUNCTIONS_URL) || hasUrl;
  const rewardsMissing = [
    !hasToken && "VITE_REWARD_TOKEN_ADDRESS",
    !hasFunctions && "VITE_REWARD_FUNCTIONS_URL (or VITE_SUPABASE_URL)",
  ].filter(Boolean);

  return {
    accounts: {
      enabled: hasUrl && hasAnon,
      label: "Accounts / cloud saves",
      reason: accountsMissing.length
        ? `${accountsMissing.join(" and ")} unset — /fun runs on local saves only`
        : "",
    },
    contact: {
      enabled: hasFormKey,
      label: "Contact form (Web3Forms)",
      reason: hasFormKey ? "" : "VITE_WEB3FORMS_KEY unset — the form falls back to a mailto draft",
    },
    rewards: {
      enabled: hasToken && hasFunctions,
      label: "Web3 rewards ($CULT)",
      reason: rewardsMissing.length
        ? `${rewardsMissing.join(" and ")} unset — the Rewards wallet card will not render`
        : "",
    },
  };
}
