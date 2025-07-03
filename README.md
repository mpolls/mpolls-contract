# Decentralized Polls on Massa

A comprehensive decentralized polling system built on the Massa blockchain. This project includes a smart contract for creating and managing polls, along with a React frontend for user interaction.

## 🗳️ Features

### Smart Contract Features
- **Create Polls**: Create polls with custom titles, descriptions, and multiple options
- **Vote**: Cast votes on active polls (one vote per user per poll)
- **View Results**: Get real-time poll results with vote counts and percentages
- **Poll Management**: Poll creators can end polls early
- **Time-based Expiration**: Polls automatically expire after a specified duration
- **Event Emission**: All actions emit events for frontend integration

### Frontend Features
- **Modern UI**: Clean, responsive interface built with React
- **Real-time Updates**: Live poll results and status updates
- **Interactive Voting**: Easy-to-use voting interface
- **Poll Creation**: Intuitive form for creating new polls
- **Results Visualization**: Visual representation of poll results with progress bars

## 📁 Project Structure

```
massa-hello-world/
├── assembly/
│   └── contracts/
│       └── main.ts              # Smart contract implementation
├── src/
│   ├── deploy.ts               # Contract deployment script
│   ├── polls.ts                # TypeScript interface for contract interaction
│   ├── hello.ts                # Hello World demo
│   └── utils.ts                # Utility functions
├── package.json
└── README.md

my-massa-dapp/
├── src/
│   ├── App.tsx                 # Main app with toggle between Hello World and Polls
│   ├── PollsApp.tsx            # React component for polls interface
│   └── main.tsx                # App entry point
└── package.json
```

## 🚀 Getting Started

### Prerequisites
- Node.js (>= 16)
- npm or yarn
- Massa wallet with some test tokens

### Installation

1. **Clone and install dependencies:**
```bash
# Smart contract
cd massa-hello-world
npm install

# Frontend
cd ../my-massa-dapp
npm install
```

2. **Deploy the smart contract:**
```bash
cd massa-hello-world
npm run deploy
```

3. **Update contract address:**
After deployment, update the `CONTRACT_ADDRESS` in:
- `massa-hello-world/src/polls.ts`
- `my-massa-dapp/src/PollsApp.tsx`

4. **Run the frontend:**
```bash
cd my-massa-dapp
npm run dev
```

## 📋 Smart Contract API

### Functions

#### `createPoll(args: StaticArray<u8>): void`
Creates a new poll with the specified parameters.

**Parameters:**
- `title`: Poll title (string)
- `description`: Poll description (string)
- `options`: Array of poll options (string[])
- `durationInSeconds`: Poll duration in seconds (u64)

#### `vote(args: StaticArray<u8>): void`
Casts a vote on a specific poll.

**Parameters:**
- `pollId`: ID of the poll to vote on (u64)
- `optionIndex`: Index of the selected option (u32)

#### `getPoll(args: StaticArray<u8>): StaticArray<u8>`
Retrieves poll details.

**Parameters:**
- `pollId`: ID of the poll (u64)

#### `getAllPolls(): StaticArray<u8>`
Returns an array of all poll IDs.

#### `getPollResults(args: StaticArray<u8>): StaticArray<u8>`
Gets detailed poll results including vote counts.

**Parameters:**
- `pollId`: ID of the poll (u64)

#### `endPoll(args: StaticArray<u8>): void`
Ends a poll early (only poll creator can call this).

**Parameters:**
- `pollId`: ID of the poll to end (u64)

#### `hasVoted(args: StaticArray<u8>): StaticArray<u8>`
Checks if a user has voted on a specific poll.

**Parameters:**
- `pollId`: ID of the poll (u64)
- `voterAddress`: Address of the voter (string)

## 🎯 Usage Examples

### Creating a Poll
```typescript
const pollsContract = new PollsContract(account);

await pollsContract.createPoll(
  "What's your favorite programming language?",
  "Vote for your preferred language for web development",
  ["JavaScript/TypeScript", "Python", "Rust", "Go", "Other"],
  86400 // 24 hours
);
```

### Voting on a Poll
```typescript
await pollsContract.vote(1, 0); // Vote for option 0 on poll 1
```

### Getting Poll Results
```typescript
const results = await pollsContract.getPollResults(1);
console.log(`Total votes: ${results.totalVotes}`);
results.options.forEach((option, index) => {
  console.log(`${option}: ${results.optionVotes[index]} votes`);
});
```

## 🔧 Development

### Testing
```bash
cd massa-hello-world
npm test
```

### Building
```bash
cd massa-hello-world
npm run build
```

### Linting and Formatting
```bash
cd massa-hello-world
npm run fmt:check
npm run fmt
```

## 🌐 Frontend Features

The React frontend provides:

1. **Poll Creation Interface**
   - Form for entering poll details
   - Dynamic option management (add/remove options)
   - Duration selection

2. **Poll Display**
   - List of all active polls
   - Real-time vote counts
   - Voting buttons for each option

3. **Results Visualization**
   - Modal popup with detailed results
   - Progress bars showing vote percentages
   - Total vote counts

4. **User Experience**
   - Loading states
   - Error handling
   - Success messages
   - Responsive design

## 🔒 Security Features

- **One Vote Per User**: Users can only vote once per poll
- **Creator-only Actions**: Only poll creators can end polls early
- **Time Validation**: Votes are only accepted on active polls within the time limit
- **Input Validation**: All inputs are validated before processing

## 📊 Data Structures

### Poll Structure
```typescript
interface Poll {
  id: u64;
  title: string;
  description: string;
  options: Array<string>;
  creator: Address;
  startTime: u64;
  endTime: u64;
  isActive: boolean;
  totalVotes: u64;
  optionVotes: Array<u64>;
}
```

### Vote Structure
```typescript
interface Vote {
  pollId: u64;
  voter: Address;
  optionIndex: u32;
  timestamp: u64;
}
```

## 🚀 Deployment

### Testnet Deployment
1. Ensure you have testnet MASSA tokens
2. Run `npm run deploy` in the `massa-hello-world` directory
3. Copy the deployed contract address
4. Update the address in both TypeScript files

### Mainnet Deployment
1. Switch to mainnet configuration
2. Ensure you have sufficient MASSA tokens for deployment
3. Follow the same deployment process

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🔗 Resources

- [Massa Documentation](https://docs.massa.net/)
- [Massa Web3 SDK](https://github.com/massalabs/massa-web3)
- [AssemblyScript](https://www.assemblyscript.org/)

## 🆘 Support

For questions and support:
- Check the [Massa Discord](https://discord.gg/massa)
- Review the [Massa documentation](https://docs.massa.net/)
- Open an issue in this repository
