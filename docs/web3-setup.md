# Web3 token-reward setup

An opt-in easter egg: when a **signed-in** player beats a level in Microwell or
Immune Defense, they can connect MetaMask and receive a `$CULT` ERC-20 reward on
**Base Sepolia**. It's off by default — the UI (and the wagmi/viem chunk) only
appear once you configure the env vars below.

## How it's secured (read this)
The games run entirely in the browser, so a win **cannot be cryptographically
proven** — a determined user can always fake one. This system therefore doesn't
try to prove authenticity; it **bounds emission** so a fake win is harmless:

| Layer | What it stops |
|---|---|
| `Ownable` mint (contract) | Only the backend admin wallet can mint — users can't mint directly. |
| Supabase JWT gate (edge fn) | Only signed-in accounts can claim. |
| `token_rewards` UNIQUE(user,game,level) | Each level pays **once per account** → finite total. |
| Wallet signature + single-use nonce | Rewards can't be farmed to an address you don't control. The nonce is burned with a conditional (compare-and-swap) update, so two concurrent requests can't both consume it. |
| Server-defined amounts | Client can't inflate the payout. |
| `ERC20Capped` | Hard ceiling on total supply, even if the admin key leaks. |
| Rate limit (edge fn) | Caps claim **attempts**/hour per user — counted on issued nonces (`_shared/rateLimit.ts`), since every claim needs a fresh one. |
| `submitted` ledger status | Closes the double-mint window: once a transaction exists on chain the levels are marked `submitted` *before* the receipt is awaited, so a timeout can't hand them back to the player and mint them twice. |
| `ALLOWED_ORIGINS` (fail-closed) | CORS defaults to localhost only — a deployment that forgets to set it refuses the public site rather than allowing every origin. |

Because the token is a **valueless testnet token**, this is the proportionate
design. Real value would need server-side move-log replay (out of scope).

## Prerequisites
- [Foundry](https://book.getfoundry.sh/) (`foundryup`) and the [Supabase CLI](https://supabase.com/docs/guides/cli).
- A **deployer** wallet with a little Base Sepolia ETH ([faucet](https://docs.base.org/tools/network-faucets)).
- A **backend admin** wallet (its key mints rewards; keep it separate). Fund it with Base Sepolia ETH too — it pays gas for every mint.
- A Base Sepolia RPC URL (public `https://sepolia.base.org` works).

## 1 — Deploy the contract
See [`contracts/README.md`](../contracts/README.md). In short:
```bash
git submodule update --init --recursive   # OpenZeppelin + forge-std (pinned commits)
cd contracts
cp .env.example .env         # DEPLOYER_PRIVATE_KEY, ADMIN_ADDRESS, RPC, TOKEN_CAP
forge test -vvv
source .env && forge script script/Deploy.s.sol:Deploy --rpc-url base_sepolia --broadcast --verify
```
Note the deployed **token address**.

## 2 — Database
In the Supabase SQL editor, run [`supabase/reward-schema.sql`](../supabase/reward-schema.sql)
(after `schema.sql`). Adds the `token_rewards` ledger + `reward_nonces` tables.

## 3 — Edge functions
```bash
supabase link --project-ref <your-ref>
supabase secrets set \
  ADMIN_PRIVATE_KEY=0x...          # the ADMIN wallet key (owner/minter) \
  BASE_SEPOLIA_RPC_URL=https://sepolia.base.org \
  REWARD_TOKEN_ADDRESS=0x...       # from step 1 \
  ALLOWED_ORIGINS=https://marco-ng.com,http://localhost:5173
supabase functions deploy reward-nonce  --no-verify-jwt
supabase functions deploy claim-rewards  --no-verify-jwt
```
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are provided to
the functions automatically. **Never** expose the service-role key or the admin
private key anywhere client-side.

## 4 — Frontend env
Add to `.env.local` (and Vercel → Settings → Environment Variables):
```
VITE_REWARD_TOKEN_ADDRESS=0x...   # from step 1
# VITE_REWARD_FUNCTIONS_URL=      # optional; defaults to ${VITE_SUPABASE_URL}/functions/v1
```
Rebuild/redeploy (Vite inlines env at build time). The reward toast now appears
after a win for signed-in players.

## Local dev / testing
```bash
npm run lint:functions              # deno lint + type-check the edge functions
supabase functions serve            # serves the functions locally with your secrets
npm run dev                         # frontend
```
The edge functions are outside ESLint's scope (they're Deno, with `npm:` imports),
so `lint:functions` is what actually checks the most security-sensitive code here.
Needs [Deno](https://docs.deno.com/runtime/getting_started/installation/) installed.
Curl the endpoints with a real user JWT (grab one from the browser devtools
`supabase.auth.getSession()` while signed in) to exercise the happy path,
`already_claimed`, `invalid_nonce`, `bad_signature`, and `rate_limited`.

## Files
- `contracts/` — Foundry project (RewardToken + deploy + tests).
- `supabase/reward-schema.sql`, `supabase/functions/{reward-nonce,claim-rewards,_shared}` — backend (batch: 1 CULT/level, claimed from saved progress).
- `src/web3/**` — strict-TS frontend (wagmi/viem), lazy-loaded.
- `src/fun/rewards.js`, `src/fun/FunPage.jsx` — hub wiring; games dispatch a
  `game:levelcomplete` window event on a win.
