import { generateEvent, Storage, Context, Address } from "@massalabs/massa-as-sdk";
import { Args } from "@massalabs/as-types";

// Storage keys
const POLLS_KEY = "polls";
const VOTES_KEY = "votes";
const POLL_COUNTER_KEY = "poll_counter";
const POLL_PREFIX = "poll_";
const VOTE_PREFIX = "vote_";

// Poll status enum
enum PollStatus {
  ACTIVE = 0,
  CLOSED = 1,
  ENDED = 2
}

// Poll structure
class Poll {
  id: u64;
  title: string;
  description: string;
  options: string[];
  creator: string;
  startTime: u64;
  endTime: u64;
  status: PollStatus;
  voteCount: u64[];

  constructor(
    id: u64,
    title: string,
    description: string,
    options: string[],
    creator: string,
    startTime: u64,
    endTime: u64
  ) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.options = options;
    this.creator = creator;
    this.startTime = startTime;
    this.endTime = endTime;
    this.status = PollStatus.ACTIVE;
    this.voteCount = new Array<u64>(options.length).fill(0);
  }

  // Serialize poll to storage format
  serialize(): string {
    const optionsStr = this.options.join("||");
    const votesStr = this.voteCount.map<string>(v => v.toString()).join(",");
    return `${this.id}|${this.title}|${this.description}|${optionsStr}|${this.creator}|${this.startTime}|${this.endTime}|${this.status}|${votesStr}`;
  }

  // Deserialize poll from storage format
  static deserialize(data: string): Poll {
    const parts = data.split("|");
    if (parts.length < 9) {
      throw new Error("Invalid poll data format");
    }

    const poll = new Poll(
      u64.parse(parts[0]), // id
      parts[1], // title
      parts[2], // description
      parts[3].split("||"), // options
      parts[4], // creator
      u64.parse(parts[5]), // startTime
      u64.parse(parts[6]), // endTime
    );
    
    poll.status = u8.parse(parts[7]) as PollStatus; // status
    
    // Parse vote counts
    if (parts[8] && parts[8].length > 0) {
      const votes = parts[8].split(",");
      poll.voteCount = votes.map<u64>(v => u64.parse(v));
    }

    return poll;
  }

  // Check if poll is currently active
  isActive(): boolean {
    const currentTime = Context.timestamp();
    return this.status === PollStatus.ACTIVE && currentTime < this.endTime;
  }

  // Update poll details (only title and description can be updated)
  update(newTitle: string, newDescription: string): void {
    this.title = newTitle;
    this.description = newDescription;
  }

  // Close poll manually
  close(): void {
    this.status = PollStatus.CLOSED;
  }

  // End poll (when time expires)
  end(): void {
    this.status = PollStatus.ENDED;
  }
}

/**
 * Constructor - called only once when the contract is deployed
 */
export function constructor(_: StaticArray<u8>): void {
  assert(Context.isDeployingContract());
  
  // Initialize poll counter
  Storage.set(POLL_COUNTER_KEY, "0");
  
  generateEvent("Decentralized Polls contract deployed successfully!");
}

/**
 * Create a new poll
 * @param args - Serialized arguments containing title, description, options, and duration
 */
export function createPoll(args: StaticArray<u8>): void {
  // Deserialize arguments
  const argsObj = new Args(args);
  const title = argsObj.nextString().expect("Failed to deserialize poll title");
  const description = argsObj.nextString().expect("Failed to deserialize poll description");
  const optionCount = argsObj.nextU32().expect("Failed to deserialize option count");
  
  // Read options
  const options: string[] = [];
  for (let i: u32 = 0; i < optionCount; i++) {
    options.push(argsObj.nextString().expect("Failed to deserialize option"));
  }
  
  const durationInSeconds = argsObj.nextU64().expect("Failed to deserialize poll duration");
  
  // Validate inputs
  assert(title.length > 0, "Title cannot be empty");
  assert(description.length > 0, "Description cannot be empty");
  assert(options.length >= 2, "Poll must have at least 2 options");
  assert(options.length <= 10, "Poll cannot have more than 10 options");
  assert(durationInSeconds > 0, "Duration must be positive");
  
  // Get current poll counter
  const pollCounterStr = Storage.get(POLL_COUNTER_KEY);
  const pollCounter = pollCounterStr ? u64.parse(pollCounterStr) : 0;
  const newPollId = pollCounter + 1;
  
  // Create poll
  const currentTime = Context.timestamp();
  const endTime = currentTime + (durationInSeconds * 1000); // Convert to milliseconds
  
  const poll = new Poll(
    newPollId,
    title,
    description,
    options,
    Context.caller().toString(),
    currentTime,
    endTime
  );
  
  // Store poll
  const pollKey = `${POLL_PREFIX}${newPollId.toString()}`;
  Storage.set(pollKey, poll.serialize());
  
  // Update poll counter
  Storage.set(POLL_COUNTER_KEY, newPollId.toString());
  
  generateEvent(`Poll created with ID: ${newPollId} by ${Context.caller().toString()}`);
}

/**
 * Vote on a poll
 * @param args - Serialized arguments containing pollId and optionIndex
 */
export function vote(args: StaticArray<u8>): void {
  // Deserialize arguments
  const argsObj = new Args(args);
  const pollId = argsObj.nextString().expect("Failed to deserialize poll ID");
  const optionIndex = argsObj.nextU32().expect("Failed to deserialize option index");
  
  // Get poll
  const pollKey = `${POLL_PREFIX}${pollId}`;
  const pollData = Storage.get(pollKey);
  assert(pollData != null, "Poll does not exist");
  
  const poll = Poll.deserialize(pollData);
  
  // Check if poll is active
  assert(poll.isActive(), "Poll is not active");
  
  // Validate option index
  assert(optionIndex < <u32>poll.options.length, "Invalid option index");
  
  // Check if user has already voted
  const voterKey = `${VOTE_PREFIX}${pollId}_${Context.caller().toString()}`;
  const existingVote = Storage.get(voterKey);
  assert(existingVote == null, "User has already voted on this poll");
  
  // Record vote
  poll.voteCount[optionIndex] += 1;
  Storage.set(voterKey, optionIndex.toString());
  
  // Update poll in storage
  Storage.set(pollKey, poll.serialize());
  
  generateEvent(`Vote cast by ${Context.caller().toString()} for option ${optionIndex} in poll ${pollId}`);
}

/**
 * Get poll details
 * @param args - Serialized arguments containing pollId
 * @returns Serialized poll data
 */
export function getPoll(args: StaticArray<u8>): void {
  const argsObj = new Args(args);
  const pollId = argsObj.nextString().expect("Failed to deserialize poll ID");
  
  const pollKey = `${POLL_PREFIX}${pollId}`;
  const pollData = Storage.get(pollKey);
  
  if (pollData != null) {
    generateEvent(`Poll data: ${pollData}`);
  } else {
    generateEvent(`Poll ${pollId} not found`);
  }
}

/**
 * Get all polls (returns poll IDs and basic info)
 * @returns Serialized array of poll data
 */
export function getAllPolls(): void {
  const pollCounterStr = Storage.get(POLL_COUNTER_KEY);
  const pollCounter = pollCounterStr ? u64.parse(pollCounterStr) : 0;
  
  generateEvent(`Total polls: ${pollCounter}`);
  
  // Return poll data for existing polls
  for (let i: u64 = 1; i <= pollCounter; i++) {
    const pollKey = `${POLL_PREFIX}${i.toString()}`;
    const pollData = Storage.get(pollKey);
    if (pollData != null) {
      generateEvent(`Poll ${i}: ${pollData}`);
    }
  }
}

/**
 * Get poll results
 * @param args - Serialized arguments containing pollId
 * @returns Serialized poll results
 */
export function getPollResults(args: StaticArray<u8>): void {
  const argsObj = new Args(args);
  const pollId = argsObj.nextString().expect("Failed to deserialize poll ID");
  
  const pollKey = `${POLL_PREFIX}${pollId}`;
  const pollData = Storage.get(pollKey);
  
  if (pollData != null) {
    const poll = Poll.deserialize(pollData);
    const totalVotes = poll.voteCount.reduce((sum, count) => sum + count, <u64>0);
    generateEvent(`Poll ${pollId} results: Total votes ${totalVotes}, Votes: ${poll.voteCount.join(",")}`);
  } else {
    generateEvent(`Poll ${pollId} not found`);
  }
}

/**
 * Update poll details (only creator can do this)
 * @param args - Serialized arguments containing pollId, newTitle, newDescription
 */
export function updatePoll(args: StaticArray<u8>): void {
  const argsObj = new Args(args);
  const pollId = argsObj.nextString().expect("Failed to deserialize poll ID");
  const newTitle = argsObj.nextString().expect("Failed to deserialize new title");
  const newDescription = argsObj.nextString().expect("Failed to deserialize new description");
  
  // Get poll
  const pollKey = `${POLL_PREFIX}${pollId}`;
  const pollData = Storage.get(pollKey);
  assert(pollData != null, "Poll does not exist");
  
  const poll = Poll.deserialize(pollData);
  
  // Check if caller is the creator
  assert(poll.creator == Context.caller().toString(), "Only poll creator can update the poll");
  
  // Check if poll is still active
  assert(poll.isActive(), "Cannot update inactive poll");
  
  // Validate inputs
  assert(newTitle.length > 0, "Title cannot be empty");
  assert(newDescription.length > 0, "Description cannot be empty");
  
  // Update poll
  poll.update(newTitle, newDescription);
  
  // Save updated poll
  Storage.set(pollKey, poll.serialize());
  
  generateEvent(`Poll ${pollId} updated by creator ${Context.caller().toString()}`);
}

/**
 * Close a poll manually (only creator can do this)
 * @param args - Serialized arguments containing pollId
 */
export function closePoll(args: StaticArray<u8>): void {
  const argsObj = new Args(args);
  const pollId = argsObj.nextString().expect("Failed to deserialize poll ID");
  
  // Get poll
  const pollKey = `${POLL_PREFIX}${pollId}`;
  const pollData = Storage.get(pollKey);
  assert(pollData != null, "Poll does not exist");
  
  const poll = Poll.deserialize(pollData);
  
  // Check if caller is the creator
  assert(poll.creator == Context.caller().toString(), "Only poll creator can close the poll");
  
  // Check if poll is not already closed/ended
  assert(poll.status == PollStatus.ACTIVE, "Poll is already closed or ended");
  
  // Close poll
  poll.close();
  
  // Save updated poll
  Storage.set(pollKey, poll.serialize());
  
  generateEvent(`Poll ${pollId} closed by creator ${Context.caller().toString()}`);
}

/**
 * End a poll when time expires (can be called by anyone)
 * @param args - Serialized arguments containing pollId
 */
export function endPoll(args: StaticArray<u8>): void {
  const argsObj = new Args(args);
  const pollId = argsObj.nextString().expect("Failed to deserialize poll ID");
  
  // Get poll
  const pollKey = `${POLL_PREFIX}${pollId}`;
  const pollData = Storage.get(pollKey);
  assert(pollData != null, "Poll does not exist");
  
  const poll = Poll.deserialize(pollData);
  
  // Check if poll time has expired
  const currentTime = Context.timestamp();
  assert(currentTime >= poll.endTime, "Poll time has not expired yet");
  assert(poll.status == PollStatus.ACTIVE, "Poll is already ended or closed");
  
  // End poll
  poll.end();
  
  // Save updated poll
  Storage.set(pollKey, poll.serialize());
  
  generateEvent(`Poll ${pollId} ended due to time expiration`);
}

/**
 * Check if user has voted on a specific poll
 * @param args - Serialized arguments containing pollId and voter address
 * @returns Serialized boolean indicating if user has voted
 */
export function hasVoted(args: StaticArray<u8>): void {
  const argsObj = new Args(args);
  const pollId = argsObj.nextString().expect("Failed to deserialize poll ID");
  const voterAddress = argsObj.nextString().expect("Failed to deserialize voter address");
  
  const voterKey = `${VOTE_PREFIX}${pollId}_${voterAddress}`;
  const voteData = Storage.get(voterKey);
  
  const hasVotedResult = voteData !== null;
  generateEvent(`User ${voterAddress} has voted on poll ${pollId}: ${hasVotedResult}`);
}