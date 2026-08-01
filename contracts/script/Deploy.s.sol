// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {RewardToken} from "../src/RewardToken.sol";

/// @notice Deploys {RewardToken} to the configured network (Base Sepolia first).
/// @dev Secrets are read from the environment (never hard-coded):
///   - DEPLOYER_PRIVATE_KEY : funds & signs the deploy tx (needs testnet ETH)
///   - ADMIN_ADDRESS        : becomes the token owner/minter (the backend wallet)
///   - TOKEN_CAP            : optional supply cap in wei (default 1,000,000e18)
///
/// Run: forge script script/Deploy.s.sol:Deploy \
///        --rpc-url base_sepolia --broadcast --verify
contract Deploy is Script {
    function run() external returns (RewardToken token) {
        uint256 deployerPk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address admin = vm.envAddress("ADMIN_ADDRESS");
        uint256 cap = vm.envOr("TOKEN_CAP", uint256(1_000_000 ether));

        vm.startBroadcast(deployerPk);
        token = new RewardToken(admin, cap);
        vm.stopBroadcast();

        console.log("RewardToken deployed at:", address(token));
        console.log("Owner / sole minter    :", admin);
        console.log("Supply cap (wei)       :", cap);
        console.log("-> set REWARD_TOKEN_ADDRESS (supabase secret) and");
        console.log("   VITE_REWARD_TOKEN_ADDRESS (frontend env) to the address above.");
    }
}
