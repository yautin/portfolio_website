// Fail fast (and loudly) if a required secret is missing, rather than sending a
// malformed transaction. Never log the values.
export function requireEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}
