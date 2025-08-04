import { Client, WalletClient, IAccount, IEvent } from "@massalabs/massa-web3";
import { Args } from "@massalabs/massa-as-sdk";

// Configuration
const RPC_ENDPOINT = "https://test.massa.net/api/v2";
const CONTRACT_ADDRESS = "AS1S3n9oCcsQmzPLKydnqZAFyhCyVhvaThnC11f7xyMzKDEkjkX6"; // Will be set after deployment

// Poll interface for TypeScript
interface Poll {
  id: number;
  title: string;
  description: string;
  options: string[];
  creator: string;
  startTime: number;
  endTime: number;
  isActive: boolean;
  totalVotes: number;
  optionVotes: number[];
}

// Vote interface for TypeScript
interface Vote {
  pollId: number;
  voter: string;
  optionIndex: number;
  timestamp: number;
}

// Poll results interface
interface PollResults {
  id: number;
  title: string;
  options: string[];
  optionVotes: number[];
  totalVotes: number;
  isActive: boolean;
  endTime: number;
}

export class PollsContract {
  private client: Client;
  private account: IAccount;

  constructor(account: IAccount) {
    this.client = new Client({
      url: RPC_ENDPOINT,
      retryStrategyOn: true,
    });
    this.account = account;
  }

  /**
   * Set the contract address after deployment
   */
  setContractAddress(address: string): void {
    (CONTRACT_ADDRESS as any) = address;
  }

  /**
   * Create a new poll
   */
  async createPoll(
    title: string,
    description: string,
    options: string[],
    durationInSeconds: number
  ): Promise<string> {
    const args = new Args()
      .add(title)
      .add(description)
      .add(options)
      .add(durationInSeconds);

    const operationId = await this.client.smartContracts().callSmartContract({
      targetAddress: CONTRACT_ADDRESS,
      functionName: "createPoll",
      parameter: args.serialize(),
      maxGas: 1000000,
      fee: 0,
      coins: 0,
    });

    console.log(`Poll creation initiated. Operation ID: ${operationId}`);
    return operationId;
  }

  /**
   * Vote on a poll
   */
  async vote(pollId: number, optionIndex: number): Promise<string> {
    const args = new Args().add(pollId).add(optionIndex);

    const operationId = await this.client.smartContracts().callSmartContract({
      targetAddress: CONTRACT_ADDRESS,
      functionName: "vote",
      parameter: args.serialize(),
      maxGas: 1000000,
      fee: 0,
      coins: 0,
    });

    console.log(`Vote cast. Operation ID: ${operationId}`);
    return operationId;
  }

  /**
   * Get poll details
   */
  async getPoll(pollId: number): Promise<Poll> {
    const args = new Args().add(pollId);

    const result = await this.client.smartContracts().readSmartContract({
      targetAddress: CONTRACT_ADDRESS,
      targetFunction: "getPoll",
      parameter: args.serialize(),
    });

    // Parse the result (this would need to be implemented based on the actual serialization)
    // For now, returning a mock structure
    return {
      id: pollId,
      title: "Sample Poll",
      description: "Sample Description",
      options: ["Option 1", "Option 2"],
      creator: "sample_address",
      startTime: Date.now(),
      endTime: Date.now() + 86400000, // 24 hours
      isActive: true,
      totalVotes: 0,
      optionVotes: [0, 0],
    };
  }

  /**
   * Get all polls
   */
  async getAllPolls(): Promise<number[]> {
    const result = await this.client.smartContracts().readSmartContract({
      targetAddress: CONTRACT_ADDRESS,
      targetFunction: "getAllPolls",
      parameter: new Uint8Array(),
    });

    // Parse the result to get poll IDs
    // For now, returning mock data
    return [1, 2, 3];
  }

  /**
   * Get poll results
   */
  async getPollResults(pollId: number): Promise<PollResults> {
    const args = new Args().add(pollId);

    const result = await this.client.smartContracts().readSmartContract({
      targetAddress: CONTRACT_ADDRESS,
      targetFunction: "getPollResults",
      parameter: args.serialize(),
    });

    // Parse the result
    // For now, returning mock data
    return {
      id: pollId,
      title: "Sample Poll",
      options: ["Option 1", "Option 2"],
      optionVotes: [5, 3],
      totalVotes: 8,
      isActive: true,
      endTime: Date.now() + 86400000,
    };
  }

  /**
   * End a poll early (only creator can do this)
   */
  async endPoll(pollId: number): Promise<string> {
    const args = new Args().add(pollId);

    const operationId = await this.client.smartContracts().callSmartContract({
      targetAddress: CONTRACT_ADDRESS,
      functionName: "endPoll",
      parameter: args.serialize(),
      maxGas: 1000000,
      fee: 0,
      coins: 0,
    });

    console.log(`Poll ended. Operation ID: ${operationId}`);
    return operationId;
  }

  /**
   * Check if user has voted on a specific poll
   */
  async hasVoted(pollId: number, voterAddress: string): Promise<boolean> {
    const args = new Args().add(pollId).add(voterAddress);

    const result = await this.client.smartContracts().readSmartContract({
      targetAddress: CONTRACT_ADDRESS,
      targetFunction: "hasVoted",
      parameter: args.serialize(),
    });

    // Parse the result
    // For now, returning mock data
    return false;
  }

  /**
   * Listen for poll events
   */
  async listenForEvents(callback: (event: IEvent) => void): Promise<void> {
    await this.client.events().subscribeToEvents(
      {
        start: 0,
        end: 0,
        originalCallerAddress: CONTRACT_ADDRESS,
        originalOperationId: "",
        isFinal: true,
      },
      callback
    );
  }
}

// Example usage functions
export async function createSamplePoll(pollsContract: PollsContract): Promise<void> {
  console.log("Creating a sample poll...");
  
  const title = "What's your favorite programming language?";
  const description = "Vote for your preferred programming language for web development";
  const options = ["JavaScript/TypeScript", "Python", "Rust", "Go", "Other"];
  const durationInSeconds = 86400; // 24 hours

  try {
    const operationId = await pollsContract.createPoll(title, description, options, durationInSeconds);
    console.log(`Sample poll created with operation ID: ${operationId}`);
  } catch (error) {
    console.error("Error creating poll:", error);
  }
}

export async function voteOnPoll(pollsContract: PollsContract, pollId: number, optionIndex: number): Promise<void> {
  console.log(`Voting on poll ${pollId} for option ${optionIndex}...`);
  
  try {
    const operationId = await pollsContract.vote(pollId, optionIndex);
    console.log(`Vote cast with operation ID: ${operationId}`);
  } catch (error) {
    console.error("Error voting:", error);
  }
}

export async function displayPollResults(pollsContract: PollsContract, pollId: number): Promise<void> {
  console.log(`Getting results for poll ${pollId}...`);
  
  try {
    const results = await pollsContract.getPollResults(pollId);
    console.log("Poll Results:");
    console.log(`Title: ${results.title}`);
    console.log(`Total Votes: ${results.totalVotes}`);
    console.log(`Active: ${results.isActive}`);
    console.log("Votes per option:");
    
    results.options.forEach((option, index) => {
      const votes = results.optionVotes[index];
      const percentage = results.totalVotes > 0 ? ((votes / results.totalVotes) * 100).toFixed(1) : "0";
      console.log(`  ${option}: ${votes} votes (${percentage}%)`);
    });
  } catch (error) {
    console.error("Error getting poll results:", error);
  }
}

// Main function to demonstrate the contract usage
export async function main(): Promise<void> {
  console.log("Decentralized Polls Contract Demo");
  console.log("==================================");

  // Note: In a real application, you would need to:
  // 1. Deploy the contract first
  // 2. Set up a wallet with some MASSA tokens
  // 3. Set the contract address after deployment
  
  console.log("To use this contract:");
  console.log("1. Deploy the contract using: npm run deploy");
  console.log("2. Update the CONTRACT_ADDRESS in this file");
  console.log("3. Set up your wallet credentials");
  console.log("4. Run the demo functions");
} 