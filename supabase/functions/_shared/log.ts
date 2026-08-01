// Error logging that can't leak secrets.
//
// viem embeds the transport URL in its error details, and an RPC URL commonly
// carries an API key in the path (Alchemy/Infura). Logging a raw error object
// would write that key into the Supabase function logs, so every log site goes
// through here.
export function safeErrorMessage(err: unknown): string {
  const e = err as { name?: string; shortMessage?: string; message?: string };
  const raw = e?.shortMessage ?? e?.message ?? String(err);
  return `${e?.name ?? "Error"}: ${raw.replace(/https?:\/\/\S+/g, "[redacted-url]").slice(0, 300)}`;
}
