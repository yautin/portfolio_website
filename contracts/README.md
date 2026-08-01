# RewardToken contracts (Foundry)

The `$CULT` ("Culture Credits") ERC-20 minted to players who beat a level in the
`/fun` games. Self-contained Foundry project — **not** part of the Vite app
build. Deployed to **Base Sepolia** (chain `84532`) first.

## Security in one line
Minting is `Ownable`-gated to a single backend admin wallet, and total supply is
`ERC20Capped`. Players (and the client) can never mint. See the NatSpec in
[`src/RewardToken.sol`](src/RewardToken.sol) for the full model.

## Prerequisites
- [Foundry](https://book.getfoundry.sh/getting-started/installation) (`curl -L https://foundry.paradigm.xyz | bash && foundryup`)
- A **deployer** wallet with a little Base Sepolia ETH ([faucet](https://docs.base.org/tools/network-faucets))
- A **backend admin** wallet address (this becomes the minter/owner)

## Setup
```bash
git submodule update --init --recursive   # OpenZeppelin + forge-std (pinned)
cd contracts
cp .env.example .env        # fill in DEPLOYER_PRIVATE_KEY, ADMIN_ADDRESS, RPC
```
Dependencies are **git submodules pinned to exact commits** (`../.gitmodules`),
not `forge install`-on-demand — the token inherits from OpenZeppelin, so which
commit it builds against is a security property worth pinning and reviewing.
`remappings.txt` already maps `@openzeppelin/contracts/` and `forge-std/`.

## Test
```bash
forge test -vvv
```
Covers: only the owner can mint, non-owner mint reverts, the supply cap is enforced.

## Deploy to Base Sepolia
```bash
source .env
forge script script/Deploy.s.sol:Deploy \
  --rpc-url base_sepolia --broadcast --verify
```
Copy the printed address into:
- Supabase secret `REWARD_TOKEN_ADDRESS`
- Frontend env `VITE_REWARD_TOKEN_ADDRESS`

Then **fund the admin wallet** with Base Sepolia ETH — it pays the gas for every
`mint`, so players don't need any ETH themselves.

## Rotating a leaked admin key
`transferOwnership(newAdmin)` from the current owner, update the edge-function
secret, and (ideally) move to a multisig owner before any mainnet deploy.
