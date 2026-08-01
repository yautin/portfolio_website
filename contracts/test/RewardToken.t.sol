// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {RewardToken} from "../src/RewardToken.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC20Capped} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";

/// @notice Focused tests for the security-critical properties: only the owner
///         can mint, and the supply cap is enforced.
contract RewardTokenTest is Test {
    RewardToken internal token;
    address internal admin = address(0xA11CE);
    address internal user = address(0xB0B);
    uint256 internal cap = 1_000_000 ether;

    function setUp() public {
        token = new RewardToken(admin, cap);
    }

    function test_OwnerIsAdmin() public view {
        assertEq(token.owner(), admin);
        assertEq(token.cap(), cap);
        assertEq(token.totalSupply(), 0);
    }

    function test_OwnerCanMint() public {
        vm.prank(admin);
        token.mint(user, 5 ether);
        assertEq(token.balanceOf(user), 5 ether);
        assertEq(token.totalSupply(), 5 ether);
    }

    function test_NonOwnerCannotMint() public {
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, user));
        token.mint(user, 1 ether);
    }

    function test_CapIsEnforced() public {
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(ERC20Capped.ERC20ExceededCap.selector, cap + 1, cap));
        token.mint(user, cap + 1);
    }

    function test_OwnerCannotRenounceOwnership() public {
        vm.prank(admin);
        vm.expectRevert(RewardToken.OwnershipCannotBeRenounced.selector);
        token.renounceOwnership();
        assertEq(token.owner(), admin); // still mintable
    }

    function test_NonOwnerCannotRenounceOwnership() public {
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, user));
        token.renounceOwnership();
    }

    function test_OwnershipCanStillBeRotated() public {
        address newAdmin = address(0xC0FFEE);
        vm.prank(admin);
        token.transferOwnership(newAdmin);
        assertEq(token.owner(), newAdmin);

        vm.prank(newAdmin);
        token.mint(user, 1 ether);
        assertEq(token.balanceOf(user), 1 ether);

        vm.prank(admin); // old admin is no longer the minter
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, admin));
        token.mint(user, 1 ether);
    }

    function test_CumulativeMintRespectsCap() public {
        vm.startPrank(admin);
        token.mint(user, cap); // exactly the cap is allowed
        vm.expectRevert(abi.encodeWithSelector(ERC20Capped.ERC20ExceededCap.selector, cap + 1, cap));
        token.mint(user, 1); // one wei over -> revert
        vm.stopPrank();
    }
}
