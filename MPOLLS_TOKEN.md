# MPOLLS Token - Reward System Documentation

## Overview

MPOLLS is a custom Massa token designed to reward users for participating in the mPolls decentralized polling platform. Users earn MPOLLS tokens for creating polls and voting, incentivizing active participation in the ecosystem.

## Token Specifications

- **Token Name**: MPolls Token
- **Symbol**: MPOLLS
- **Decimals**: 9 (same as Massa)
- **Initial Supply**: 1,000,000,000 MPOLLS (1 billion tokens)
- **Standard**: Massa Token Standard (similar to ERC-20)

## Token Features

### Standard Functions

1. **Metadata**
   - `name()` - Returns token name
   - `symbol()` - Returns token symbol
   - `decimals()` - Returns number of decimals
   - `totalSupply()` - Returns total token supply

2. **Balance Management**
   - `balanceOf(address)` - Get balance of any address
   - `myBalance()` - Get balance of caller

3. **Transfer Functions**
   - `transfer(to, amount)` - Transfer tokens to another address
   - `transferFrom(from, to, amount)` - Transfer on behalf of another address (requires allowance)

4. **Allowance Management**
   - `approve(spender, amount)` - Approve spender to use tokens
   - `allowance(owner, spender)` - Check allowance amount

### Reward System

5. **Minting & Burning**
   - `mint(to, amount)` - Mint new tokens (minter role only)
   - `burn(amount)` - Burn tokens from caller's balance
   - `rewardBatch(recipients[])` - Batch mint to multiple addresses (minter role only)

6. **Role Management**
   - `grantMinterRole(address)` - Grant minting permission (owner only)
   - `revokeMinterRole(address)` - Revoke minting permission (owner only)
   - `isMinter(address)` - Check if address has minter role

7. **Ownership**
   - `getOwner()` - Get contract owner
   - `transferOwnership(newOwner)` - Transfer ownership (owner only)

## Integration with Polls Contract

The polls contract has been enhanced with a reward system that automatically distributes MPOLLS tokens to users:

### Reward Configuration

**Admin Functions** (only contract admin can call):

1. `setTokenContract(tokenAddress)` - Set the MPOLLS token contract address
2. `enableRewards()` - Enable the reward system
3. `disableRewards()` - Disable the reward system
4. `setVoteRewardAmount(amount)` - Set reward for voting (default: 10 MPOLLS)
5. `setCreatePollRewardAmount(amount)` - Set reward for creating polls (default: 50 MPOLLS)

**Query Functions**:

- `getTokenContract()` - Get token contract address
- `areRewardsEnabled()` - Check if rewards are enabled
- `getVoteRewardAmount()` - Get current vote reward amount
- `getCreatePollRewardAmount()` - Get current poll creation reward amount

### Reward Distribution

**Automatic Rewards**:

1. **Creating a Poll**: Users receive MPOLLS tokens when they create a new poll
   - Default reward: 50 MPOLLS (50,000,000,000 with decimals)
   - Encourages quality content creation

2. **Voting on a Poll**: Users receive MPOLLS tokens when they cast a vote
   - Default reward: 10 MPOLLS (10,000,000,000 with decimals)
   - Incentivizes participation
   - One-time reward per poll (users can only vote once per poll)

## Deployment Guide

### 1. Deploy the MPOLLS Token Contract

```bash
# Build the token contract
npm run build

# Deploy the token contract
massa-client deploy_sc \
  --path build/token.wasm \
  --parameter "" \
  --coins 0
```

Save the deployed token contract address.

### 2. Configure the Polls Contract

After deploying the token contract, configure the polls contract to use it:

```javascript
// Set the token contract address
await pollsContract.setTokenContract(tokenContractAddress);

// Grant minter role to the polls contract
await tokenContract.grantMinterRole(pollsContractAddress);

// Enable rewards
await pollsContract.enableRewards();
```

### 3. Adjust Reward Amounts (Optional)

```javascript
// Set custom vote reward (amount in smallest unit - 9 decimals)
// Example: 25 MPOLLS = 25000000000
await pollsContract.setVoteRewardAmount(25000000000);

// Set custom poll creation reward
// Example: 100 MPOLLS = 100000000000
await pollsContract.setCreatePollRewardAmount(100000000000);
```

## Usage Examples

### For Poll Creators

When you create a poll, you automatically receive MPOLLS tokens:

```javascript
// Create a poll
await pollsContract.createPoll(
  "What's your favorite color?",
  "Poll description",
  ["Red", "Blue", "Green"],
  86400 // 24 hours
);

// You now have 50 MPOLLS tokens in your balance!
```

### For Voters

When you vote on a poll, you automatically receive MPOLLS tokens:

```javascript
// Vote on a poll
await pollsContract.vote(pollId, optionIndex);

// You now have 10 MPOLLS tokens in your balance!
```

### Check Your Balance

```javascript
// Get your MPOLLS balance
await tokenContract.myBalance();

// Or check any address
await tokenContract.balanceOf(address);
```

### Transfer Tokens

```javascript
// Transfer MPOLLS to another user
await tokenContract.transfer(recipientAddress, amount);
```

## Token Economics

### Reward Structure

- **Poll Creation**: 50 MPOLLS per poll
  - Encourages quality content
  - Rewards community builders

- **Voting**: 10 MPOLLS per vote
  - Incentivizes participation
  - Makes polling more engaging

### Inflation Control

The token uses a minting model where new tokens are created as rewards. The admin can:
- Adjust reward amounts based on participation levels
- Temporarily disable rewards if needed
- Grant/revoke minter permissions to control supply

### Future Enhancements

Potential additions to the token system:
- **Staking**: Lock tokens for additional rewards
- **Governance**: Use tokens to vote on platform decisions
- **Poll Boosting**: Spend tokens to promote polls
- **Premium Features**: Unlock advanced polling features with tokens
- **Liquidity Pools**: Enable trading on DEXs

## Security Considerations

1. **Minter Role**: Only trusted contracts/addresses should have minter role
2. **Owner Control**: Token owner has significant power - use multisig for production
3. **Reward Caps**: Consider implementing daily/weekly reward caps to prevent abuse
4. **One Vote Per Poll**: The contract prevents multiple votes, preventing reward farming

## Contract Addresses

After deployment, update these addresses:

- **MPOLLS Token Contract**: `[Your deployed token address]`
- **Polls Contract**: `[Your deployed polls address]`

## Support & Development

For questions, issues, or contributions:
- Create an issue in the repository
- Join the Massa Discord community
- Review the Massa smart contract documentation

## License

MIT License - See LICENSE file for details
