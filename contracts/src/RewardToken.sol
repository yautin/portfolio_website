// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Capped} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title RewardToken — reward ERC-20 for the /fun games easter egg
/// @notice Minted to players who beat a level in the browser games. Deployed on
///         Base Sepolia (chain 84532) first.
///
/// @dev SECURITY MODEL — read before changing anything:
///  - Minting is gated by {Ownable}: ONLY the `owner` (the backend admin wallet
///    whose private key lives in the Supabase edge function's secrets) can call
///    {mint}. No user — and no other contract — can mint directly. This is what
///    keeps the token supply out of players' hands even though the games run
///    100% client-side.
///  - Client-side game wins are inherently spoofable (the browser controls the
///    game), so this contract does NOT try to prove a win is real. Instead the
///    off-chain edge function bounds *emission*: it is login-gated, records one
///    reward per (account, game, level) in an idempotent ledger, and verifies a
///    wallet signature before it ever calls {mint}. This contract is the last
///    line of defence: {ERC20Capped} caps the total supply that can EVER exist,
///    so even a fully-compromised admin key cannot mint past `cap`.
///  - The admin/owner pays the gas to mint to the player's address, so players
///    need no testnet ETH — only a wallet to receive.
///  - Ownership can be rotated with {transferOwnership} if the admin key is ever
///    exposed; consider a multisig owner for a mainnet deployment.
///  - {renounceOwnership} is DISABLED (see below). Inheriting it unchanged means
///    a single call — fat-fingered or malicious — permanently leaves the token
///    with no owner and therefore no minter, bricking rewards forever with no
///    recovery path. Rotating the key is always the right move instead.
contract RewardToken is ERC20Capped, Ownable {
    /// @notice Thrown by {renounceOwnership}, which is intentionally disabled.
    error OwnershipCannotBeRenounced();

    /// @param admin  Address that becomes the sole minter (`owner`). Set this to
    ///               the backend admin wallet — it need not be the deployer.
    /// @param cap_   Hard ceiling on total supply, in wei (18 decimals). Must be
    ///               > 0 (enforced by {ERC20Capped}).
    constructor(address admin, uint256 cap_)
        ERC20("Culture Credits", "CULT")
        ERC20Capped(cap_)
        Ownable(admin)
    {}

    /// @notice Mint `amount` (in wei) of the reward token to `to`.
    /// @dev Restricted to `owner` (the backend). Reverts with
    ///      `ERC20ExceededCap` if it would push total supply past the cap, and
    ///      with `OwnableUnauthorizedAccount` if called by anyone else. The cap
    ///      check is enforced inside {ERC20Capped-_update}, which {_mint} calls.
    /// @param to     Recipient wallet (validated off-chain via a signed nonce).
    /// @param amount Token amount in wei (server-defined; never client-supplied).
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /// @notice Disabled. Renouncing ownership would leave the token with no
    ///         minter, permanently and irreversibly. Use {transferOwnership} to
    ///         rotate to a new admin wallet (or a multisig) instead.
    /// @dev Always reverts with {OwnershipCannotBeRenounced}.
    function renounceOwnership() public view override onlyOwner {
        revert OwnershipCannotBeRenounced();
    }
}
