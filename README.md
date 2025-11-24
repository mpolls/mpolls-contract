# MPolls Smart Contract

A feature-rich decentralized polling smart contract built on the Massa blockchain with autonomous reward distribution capabilities using Massa's native deferred calls.

## 🎯 Key Features

### Core Polling Features
- **Create Polls**: Multi-option polls with customizable parameters
- **Voting System**: One vote per address per poll with vote weight tracking
- **Project Organization**: Group related polls into projects
- **Time-based Expiration**: Automatic poll closure at scheduled end time
- **Event-driven Architecture**: Comprehensive event emission for frontend integration

### Autonomous Distribution System
- **Massa Deferred Calls**: Native blockchain-based scheduled execution
- **Three Distribution Types**:
  - **Manual Pull (Type 0)**: Voters claim rewards individually
  - **Manual Push (Type 1)**: Creator distributes all rewards at once
  - **Autonomous (Type 2)**: Scheduled automatic distribution
- **Batch Processing**: Distributes rewards to up to 50 voters per execution
- **Automatic Scheduling**: Deferred call registration when closing polls
- **Balance Management**: Automatic balance checks for deferred call costs

### Reward Management
- **Flexible Reward Pools**: Support for MASSA and custom tokens
- **Equal Distribution**: Rewards split equally among all voters
- **Claim Tracking**: Individual claim status for each voter
- **Duplicate Prevention**: Protection against double-claiming
- **Balance Verification**: Ensures sufficient funds before distribution

## 📁 Project Structure

```
mpolls-contract/
├── assembly/
│   └── contracts/
│       └── main.ts                  # Smart contract implementation
├── src/
│   ├── deploy.ts                    # Contract deployment script
│   ├── check-distribution.ts        # Distribution monitoring script
│   └── utils.ts                     # Utility functions
├── test/
│   └── fund-contract.js             # Contract funding script
├── .env                             # Environment configuration
└── package.json
```

## 🚀 Getting Started

### Prerequisites
- Node.js (>= 18)
- npm or yarn
- Massa wallet with test tokens
- AssemblyScript knowledge (for contract modifications)

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/mpolls/mpolls-contract.git
cd mpolls-contract
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment:**
Create a `.env` file in the project root:
```env
WALLET_SECRET_KEY=your_secret_key_here
CONTRACT_ADDRESS=AS12GGXCyVYTH2Lc7hRfCcSFpiSU4zCgguQCFY8Z47BkXdN3siVSz
```

### Deployment

1. **Build the contract:**
```bash
npm run build
```

2. **Deploy to Buildnet:**
```bash
npm run deploy
```

The deployment script will:
- Compile the AssemblyScript contract
- Deploy to Massa Buildnet
- Fund the contract with 10 MASSA (required for deferred calls)
- Display the deployed contract address

3. **Update environment:**
Copy the deployed address to your `.env` file:
```env
CONTRACT_ADDRESS=your_new_contract_address
```

### Funding the Contract

The contract needs MASSA balance to register deferred calls for autonomous distribution:

```bash
npm run fund-contract
```

This sends 10 MASSA to the contract. Minimum recommended balance: 10 MASSA.

## 📋 Smart Contract API

### Poll Creation

#### `createPoll(args: StaticArray<u8>): void`

Creates a new poll with specified parameters.

**Arguments (serialized with Args):**
- `title` (string): Poll title
- `description` (string): Poll description
- `options` (Array<string>): Voting options
- `endTime` (u64): Unix timestamp when poll ends
- `rewardPool` (u64): Total reward amount (0 for no rewards)
- `distributionType` (u8): Distribution type (0, 1, or 2)
- `projectId` (string): Optional project identifier

**Events Emitted:**
- `Poll created: {pollId} - {title}`

**Example:**
```typescript
const args = new Args()
  .add("What's your favorite color?")
  .add("Vote for your preferred color")
  .add(["Red", "Blue", "Green"])
  .add(endTimestamp)
  .add(1000000000) // 1 MASSA reward pool
  .add(2) // Autonomous distribution
  .add("project-123");

account.call(contractAddress, "createPoll", args.serialize());
```

### Voting

#### `vote(args: StaticArray<u8>): void`

Cast a vote on an active poll.

**Arguments:**
- `pollId` (string): ID of the poll
- `optionIndex` (u32): Index of the selected option

**Events Emitted:**
- `Vote cast: Poll {pollId}, Option {optionIndex} by {voterAddress}`

**Constraints:**
- Poll must be active
- One vote per address per poll
- Option index must be valid

### Poll Management

#### `closePoll(args: StaticArray<u8>): void`

Close a poll and optionally schedule autonomous distribution.

**Arguments:**
- `pollId` (string): ID of the poll to close
- `distributionTime` (u64): Unix timestamp for distribution (optional, only for Autonomous type)

**For Autonomous Distribution:**
- Calculates delay in blockchain periods (16s per period)
- Validates delay is between 2 and 10,000 periods (32s to 44 hours)
- Registers deferred call for automatic distribution
- Stores deferred call ID for tracking

**Events Emitted:**
- `Poll {pollId} closed with auto-distribution scheduled for timestamp {distributionTime}`
- `✅ Deferred call registered for poll {pollId}: ID {callId}, slot period {period}`

### Reward Distribution

#### `distributeRewards(args: StaticArray<u8>): void`

Distribute rewards to voters (called automatically for Autonomous, or manually).

**Arguments:**
- `pollId` (string): ID of the poll

**Behavior:**
- Processes up to 50 voters per call
- Calculates equal share for each voter
- Transfers MASSA to each voter
- Marks voters as having claimed
- Emits distribution events

**Events Emitted:**
- `⏰ Deferred call triggered: Distributing rewards for poll {pollId}`
- `Distributed {amount} to {voterAddress} for poll {pollId}`
- `Distribution progress: {distributed}/{totalVoters} voters processed`
- `✅ All rewards distributed for poll {pollId}`

#### `claimReward(args: StaticArray<u8>): void`

Claim reward for a poll (Manual Pull distribution type only).

**Arguments:**
- `pollId` (string): ID of the poll

**Constraints:**
- Poll must be closed
- Distribution type must be Manual Pull (0)
- Caller must have voted
- Reward not already claimed

### Query Functions

#### `getPoll(args: StaticArray<u8>): StaticArray<u8>`

Get poll details including status, votes, and metadata.

#### `getAllPolls(): StaticArray<u8>`

Get array of all poll IDs.

#### `getPollResults(args: StaticArray<u8>): StaticArray<u8>`

Get detailed poll results including vote counts and percentages.

#### `hasVoted(args: StaticArray<u8>): StaticArray<u8>`

Check if an address has voted on a specific poll.

#### `getClaimStatus(args: StaticArray<u8>): StaticArray<u8>`

Get claim/distribution status for all voters of a poll.

## ⏱️ Autonomous Distribution Architecture

### Massa Deferred Calls

Autonomous distribution uses **Massa's deferred calls**, a native blockchain feature that enables scheduled smart contract execution without external intervention.

### Period Calculation

Massa blockchain operates on **periods**, each lasting **16 seconds** (16,000 milliseconds).

```typescript
// Convert time difference to periods (with ceiling division)
const timeDifferenceMs = distributionTime - currentTime;
const periodsFromNow: u64 = (timeDifferenceMs + 15999) / 16000;
```

**Ceiling division** ensures we always schedule for a future period:
- 30,000ms → (30,000 + 15,999) / 16,000 = 2.87 → **2 periods** (32 seconds)
- 16,000ms → (16,000 + 15,999) / 16,000 = 1.99 → **1 period** (16 seconds)

### Timing Constraints

- **Minimum delay**: 2 periods (32 seconds)
- **Maximum delay**: 10,000 periods (44 hours, 26 minutes, 40 seconds)
- **Accuracy**: ±16-32 seconds (due to period boundaries)

### Deferred Call Registration

```typescript
function registerDeferredDistribution(pollId: string, periodsFromNow: u64): void {
  const currentPeriod = Context.currentPeriod();
  const targetPeriod = currentPeriod + periodsFromNow;
  const maxGas: u64 = 200_000_000; // 200M gas

  // Find cheapest execution slot at target period
  const slot = findCheapestSlot(targetPeriod, targetPeriod, maxGas, paramsSize);

  // Calculate execution cost
  const cost = deferredCallQuote(slot, maxGas, paramsSize);

  // Register the deferred call
  const callId = deferredCallRegister(
    Context.callee().toString(),
    'distributeRewards',
    slot,
    maxGas,
    args.serialize(),
    0
  );

  // Store call ID for tracking
  Storage.set(`deferred_call_${pollId}`, callId);
}
```

### Cost Management

Deferred calls have a cost that must be paid from the contract's balance:
- Typical cost: ~2 MASSA per deferred call
- Recommended contract balance: 10+ MASSA
- Cost depends on gas limit and slot availability

## 🧪 Testing & Monitoring

### Check Distribution Status

Monitor auto-distribution execution:

```bash
npm run check-distribution [pollId]
```

Example:
```bash
npm run check-distribution 1
```

This script:
- Fetches contract events from blockchain
- Filters for distribution-related events
- Shows deferred call status
- Displays distribution progress

### Fund Contract

Ensure contract has sufficient balance:

```bash
npm run fund-contract
```

### Check Contract Balance

```bash
npm run check-balance
```

## 🔧 Development

### Building

```bash
npm run build
```

Compiles AssemblyScript to WebAssembly in `build/main.wasm`.

### Testing Locally

```bash
npm test
```

### Linting

```bash
npm run lint
```

### Deploy Fresh Contract

Deploy a new contract instance:

```bash
npm run deploy
```

## 📊 Distribution Types Comparison

| Feature | Manual Pull (0) | Manual Push (1) | Autonomous (2) |
|---------|----------------|-----------------|----------------|
| **Execution** | Voter-initiated | Creator-initiated | Blockchain-scheduled |
| **Gas Cost** | Paid by voter | Paid by creator | Paid by contract |
| **Timing** | Anytime after close | Creator's discretion | Scheduled time |
| **Automation** | None | Manual | Fully automated |
| **Batch Size** | 1 per claim | Up to 50 per tx | Up to 50 per call |
| **Best For** | Opt-in claiming | Guaranteed delivery | Set-and-forget |

## 🔒 Security Features

### Access Control
- Poll creators can only close their own polls
- Voters can only claim rewards once
- Distribution respects poll closure status

### Input Validation
- All arguments are validated before processing
- Option indices checked against bounds
- Timestamps validated for future dates
- Period calculations validated against limits

### Balance Protection
- Balance checks before transfers
- Deferred call cost verification
- Reward pool sufficiency validation

### Reentrancy Protection
- State updates before external calls
- Claim status set before transfers
- Event emissions for audit trail

## 📝 Events Reference

### Poll Events
- `Poll created: {pollId} - {title}`
- `Vote cast: Poll {pollId}, Option {optionIndex} by {voterAddress}`
- `Poll {pollId} closed`

### Distribution Events
- `Poll {pollId} closed with auto-distribution scheduled for timestamp {time}`
- `✅ Deferred call registered for poll {pollId}: ID {callId}, slot period {period}`
- `⏰ Deferred call triggered: Distributing rewards for poll {pollId}`
- `Distributed {amount} to {voterAddress} for poll {pollId}`
- `Distribution progress: {distributed}/{totalVoters} voters processed`
- `✅ All rewards distributed for poll {pollId}`

### Claim Events
- `Reward claimed: {amount} by {voterAddress} for poll {pollId}`

### Debug Events
- `🔍 DEBUG: Starting deferred call setup`
- `🔍 DEBUG: Target period - targetPeriod: {period}`
- `🔍 DEBUG: Slot found - period: {period}, thread: {thread}`
- `💰 Balance check - cost: {cost}, balance: {balance}`

## 🔗 Additional Documentation

- **[Architecture Documentation](../mpolls-dapp/ARCHITECTURE.md)** - Comprehensive system architecture, data flow, and technical implementation
- **[Frontend Repository](../mpolls-dapp/README.md)** - React frontend for the platform
- **[Project Summary](../mpolls-dapp/PROJECT_SUMMARY.md)** - Overall project overview and features
- **[Token Minting Guide](../mpolls-dapp/TOKEN_MINTING_GUIDE.md)** - MPOLLS token creation
- **[Contract Analysis](../mpolls-dapp/CONTRACT_ANALYSIS.md)** - Detailed contract analysis
- **[Swap Setup](../mpolls-dapp/SWAP_SETUP.md)** - Token swap configuration

## 🚨 Troubleshooting

### "Distribution time is too far in the future"
- Ensure delay is ≤ 44 hours (10,000 periods)
- Check that distribution time is a future timestamp
- Verify period calculation is correct

### "The Deferred call cannot be registered"
- Ensure distribution time is at least 32 seconds in future
- Check that period calculation rounds up (ceiling division)
- Verify contract has sufficient balance

### "Insufficient balance for deferred call"
- Fund contract with at least 10 MASSA
- Run `npm run fund-contract`
- Check contract balance before closing polls

### Deferred Call Not Executing
- Check contract events for execution logs
- Verify distribution time has passed
- Ensure contract wasn't redeployed (clears deferred calls)
- Monitor with `npm run check-distribution [pollId]`

## 📈 Performance Considerations

- **Batch Processing**: Distributes to 50 voters per call
- **Gas Optimization**: Efficient storage access patterns
- **Event Emissions**: Minimal overhead for frontend integration
- **State Management**: Optimized serialization/deserialization

## 🔧 Configuration

### Environment Variables

```env
# Required
WALLET_SECRET_KEY=your_wallet_secret_key
CONTRACT_ADDRESS=AS12GGXCyVYTH2Lc7hRfCcSFpiSU4zCgguQCFY8Z47BkXdN3siVSz

# Optional
BUILDNET_URL=https://buildnet.massa.net/api/v2
CHAIN_ID=77658377
```

### Deployment Configuration

In `src/deploy.ts`:
```typescript
const contract = await SmartContract.deploy(
  provider,
  byteCode,
  constructorArgs,
  {
    coins: Mas.fromString('10'), // Fund with 10 MASSA
    fee: Mas.fromString('0.01')  // Deployment fee
  },
);
```

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Test thoroughly on Buildnet
4. Submit a pull request with clear description

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

- [Massa Discord](https://discord.gg/massa)
- [Massa Documentation](https://docs.massa.net/)
- [AssemblyScript Documentation](https://www.assemblyscript.org/)
- [Massa Web3 SDK](https://github.com/massalabs/massa-web3)

## 🔗 Resources

- **Massa Deferred Calls**: [Example Implementation](https://github.com/massalabs/massa-sc-examples/tree/main/deferred-call-manager)
- **Massa Smart Contracts**: [Official Guide](https://docs.massa.net/docs/build/smart-contract)
- **AssemblyScript**: [Language Documentation](https://www.assemblyscript.org/introduction.html)

---

**Current Deployed Contract**: `AS12GGXCyVYTH2Lc7hRfCcSFpiSU4zCgguQCFY8Z47BkXdN3siVSz`

Built with ❤️ on Massa blockchain
