import { generateEvent, Storage, Context, call, Address } from "@massalabs/massa-as-sdk";
import { Args } from "@massalabs/as-types";

// Storage keys
const POLL_COUNTER_KEY = "poll_counter";
const PROJECT_COUNTER_KEY = "project_counter";
const POLL_PREFIX = "poll_";
const VOTE_PREFIX = "vote_";
const PROJECT_PREFIX = "project_";
const CONTRIBUTOR_PREFIX = "contributor_";
const CLAIMED_PREFIX = "claimed_";
const DISTRIBUTED_PREFIX = "distributed_";

// Upgrade management keys
const ADMIN_KEY = "contract_admin";
const VERSION_KEY = "contract_version";
const PAUSED_KEY = "contract_paused";

// Token reward keys
const TOKEN_CONTRACT_KEY = "token_contract_address";
const VOTE_REWARD_AMOUNT_KEY = "vote_reward_amount";
const CREATE_POLL_REWARD_AMOUNT_KEY = "create_poll_reward_amount";
const REWARDS_ENABLED_KEY = "rewards_enabled";

// Poll status enum
enum PollStatus {
  ACTIVE = 0,
  CLOSED = 1,
  ENDED = 2
}

// Funding type enum
enum FundingType {
  SELF_FUNDED = 0,
  COMMUNITY_FUNDED = 1,
  TREASURY_FUNDED = 2
}

// Distribution mode enum
enum DistributionMode {
  EQUAL_SPLIT = 0,
  FIXED_REWARD = 1,
  WEIGHTED_QUALITY = 2
}

// Distribution type enum
enum DistributionType {
  MANUAL_PULL = 0,
  MANUAL_PUSH = 1,
  AUTONOMOUS = 2
}

// Project structure
class Project {
  id: u64;
  name: string;
  description: string;
  creator: string;
  createdAt: u64;
  pollIds: u64[];

  constructor(
    id: u64,
    name: string,
    description: string,
    creator: string,
    createdAt: u64
  ) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.creator = creator;
    this.createdAt = createdAt;
    this.pollIds = [];
  }

  // Serialize project to storage format
  serialize(): string {
    const pollIdsStr = this.pollIds.map<string>(id => id.toString()).join(",");
    return `${this.id}|${this.name}|${this.description}|${this.creator}|${this.createdAt}|${pollIdsStr}`;
  }

  // Deserialize project from storage format
  static deserialize(data: string): Project {
    const parts = data.split("|");
    if (parts.length < 5) {
      throw new Error("Invalid project data format");
    }

    const project = new Project(
      u64.parse(parts[0]), // id
      parts[1], // name
      parts[2], // description
      parts[3], // creator
      u64.parse(parts[4]) // createdAt
    );

    // Parse poll IDs
    if (parts.length > 5 && parts[5] && parts[5].length > 0) {
      const pollIds = parts[5].split(",");
      project.pollIds = pollIds.map<u64>(id => u64.parse(id));
    }

    return project;
  }

  // Add poll to project
  addPoll(pollId: u64): void {
    this.pollIds.push(pollId);
  }
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
  projectId: u64; // 0 means no project assigned

  // New economics fields
  rewardPool: u64; // Current MASSA balance for rewards
  fundingType: FundingType;
  distributionMode: DistributionMode;
  distributionType: DistributionType;
  fixedRewardAmount: u64; // Amount per voter (if FIXED_REWARD mode)
  fundingGoal: u64; // Target amount for community-funded polls
  treasuryApproved: boolean; // Approval status for treasury-funded polls
  rewardsDistributed: boolean; // Whether rewards have been distributed

  constructor(
    id: u64,
    title: string,
    description: string,
    options: string[],
    creator: string,
    startTime: u64,
    endTime: u64,
    projectId: u64 = 0,
    rewardPool: u64 = 0,
    fundingType: FundingType = FundingType.SELF_FUNDED,
    distributionMode: DistributionMode = DistributionMode.EQUAL_SPLIT,
    distributionType: DistributionType = DistributionType.MANUAL_PULL,
    fixedRewardAmount: u64 = 0,
    fundingGoal: u64 = 0
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
    this.projectId = projectId;
    this.rewardPool = rewardPool;
    this.fundingType = fundingType;
    this.distributionMode = distributionMode;
    this.distributionType = distributionType;
    this.fixedRewardAmount = fixedRewardAmount;
    this.fundingGoal = fundingGoal;
    this.treasuryApproved = fundingType !== FundingType.TREASURY_FUNDED;
    this.rewardsDistributed = false;
  }

  // Serialize poll to storage format
  serialize(): string {
    const optionsStr = this.options.join("||");
    const votesStr = this.voteCount.map<string>(v => v.toString()).join(",");
    return `${this.id}|${this.title}|${this.description}|${optionsStr}|${this.creator}|${this.startTime}|${this.endTime}|${this.status}|${votesStr}|${this.projectId}|${this.rewardPool}|${this.fundingType}|${this.distributionMode}|${this.distributionType}|${this.fixedRewardAmount}|${this.fundingGoal}|${this.treasuryApproved}|${this.rewardsDistributed}`;
  }

  // Deserialize poll from storage format
  static deserialize(data: string): Poll {
    const parts = data.split("|");
    if (parts.length < 9) {
      throw new Error("Invalid poll data format");
    }

    // Parse fields with backward compatibility
    const projectId = parts.length > 9 && parts[9] ? u64.parse(parts[9]) : 0;
    const rewardPool = parts.length > 10 && parts[10] ? u64.parse(parts[10]) : 0;
    const fundingType = parts.length > 11 && parts[11] ? (u8.parse(parts[11]) as FundingType) : FundingType.SELF_FUNDED;
    const distributionMode = parts.length > 12 && parts[12] ? (u8.parse(parts[12]) as DistributionMode) : DistributionMode.EQUAL_SPLIT;
    const distributionType = parts.length > 13 && parts[13] ? (u8.parse(parts[13]) as DistributionType) : DistributionType.MANUAL_PULL;
    const fixedRewardAmount = parts.length > 14 && parts[14] ? u64.parse(parts[14]) : 0;
    const fundingGoal = parts.length > 15 && parts[15] ? u64.parse(parts[15]) : 0;

    const poll = new Poll(
      u64.parse(parts[0]), // id
      parts[1], // title
      parts[2], // description
      parts[3].split("||"), // options
      parts[4], // creator
      u64.parse(parts[5]), // startTime
      u64.parse(parts[6]), // endTime
      projectId,
      rewardPool,
      fundingType,
      distributionMode,
      distributionType,
      fixedRewardAmount,
      fundingGoal
    );

    poll.status = u8.parse(parts[7]) as PollStatus; // status

    // Parse vote counts
    if (parts[8] && parts[8].length > 0) {
      const votes = parts[8].split(",");
      poll.voteCount = votes.map<u64>(v => u64.parse(v));
    }

    // Parse treasury approved and rewards distributed flags
    if (parts.length > 16 && parts[16]) {
      poll.treasuryApproved = parts[16] === "true";
    }
    if (parts.length > 17 && parts[17]) {
      poll.rewardsDistributed = parts[17] === "true";
    }

    return poll;
  }

  // Check if poll is currently active
  isActive(): boolean {
    const currentTime = Context.timestamp(); // Returns seconds since epoch
    // Both startTime and endTime are stored in seconds, so compare directly
    return this.status === PollStatus.ACTIVE &&
           currentTime >= this.startTime &&
           currentTime < this.endTime;
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

  // Set the deployer as admin
  Storage.set(ADMIN_KEY, Context.caller().toString());

  // Initialize poll counter
  Storage.set(POLL_COUNTER_KEY, "0");

  // Initialize project counter
  Storage.set(PROJECT_COUNTER_KEY, "0");

  // Set initial version
  Storage.set(VERSION_KEY, "1.0.0");

  // Contract is not paused by default
  Storage.set(PAUSED_KEY, "false");

  // Initialize reward system (disabled by default)
  Storage.set(REWARDS_ENABLED_KEY, "false");
  Storage.set(VOTE_REWARD_AMOUNT_KEY, "10000000000"); // 10 MPOLLS (with 9 decimals)
  Storage.set(CREATE_POLL_REWARD_AMOUNT_KEY, "50000000000"); // 50 MPOLLS (with 9 decimals)

  generateEvent("Decentralized Polls contract deployed successfully with project support! Version 1.0.0");
}

// ================= ADMIN & UPGRADE FUNCTIONS =================

/**
 * Check if caller is admin
 */
function onlyAdmin(): void {
  const admin = Storage.get(ADMIN_KEY);
  assert(admin !== null, "Admin not set");
  assert(admin === Context.caller().toString(), "Only admin can call this function");
}

/**
 * Check if contract is not paused
 */
function whenNotPaused(): void {
  const paused = Storage.get(PAUSED_KEY);
  assert(paused === null || paused !== "true", "Contract is paused");
}

/**
 * Get admin address
 */
export function getAdmin(): void {
  const admin = Storage.get(ADMIN_KEY);
  generateEvent(`Admin address: ${admin !== null ? admin : "Not set"}`);
}

/**
 * Transfer admin rights to a new address
 * @param args - Serialized arguments containing new admin address
 */
export function transferAdmin(args: StaticArray<u8>): void {
  onlyAdmin();

  const argsObj = new Args(args);
  const newAdmin = argsObj.nextString().expect("Failed to deserialize new admin address");

  // Validate new admin address
  assert(newAdmin.length > 0, "Invalid admin address");

  // Transfer admin
  Storage.set(ADMIN_KEY, newAdmin);

  generateEvent(`Admin transferred to: ${newAdmin}`);
}

/**
 * Pause the contract (emergency stop)
 * When paused, critical functions cannot be called
 */
export function pause(): void {
  onlyAdmin();

  Storage.set(PAUSED_KEY, "true");
  generateEvent("Contract paused by admin");
}

/**
 * Unpause the contract
 */
export function unpause(): void {
  onlyAdmin();

  Storage.set(PAUSED_KEY, "false");
  generateEvent("Contract unpaused by admin");
}

/**
 * Get contract version
 */
export function getVersion(): void {
  const version = Storage.get(VERSION_KEY);
  generateEvent(`Contract version: ${version !== null ? version : "Unknown"}`);
}

/**
 * Set contract version (used after upgrades)
 * @param args - Serialized arguments containing version string
 */
export function setVersion(args: StaticArray<u8>): void {
  onlyAdmin();

  const argsObj = new Args(args);
  const newVersion = argsObj.nextString().expect("Failed to deserialize version");

  Storage.set(VERSION_KEY, newVersion);
  generateEvent(`Contract version updated to: ${newVersion}`);
}

/**
 * Check if contract is paused
 */
export function isPaused(): void {
  const pausedValue = Storage.get(PAUSED_KEY);
  let isPausedResult = false;
  if (pausedValue !== null) {
    isPausedResult = (pausedValue as string) === "true";
  }
  generateEvent(`Contract paused: ${isPausedResult}`);
}

// ================= TOKEN REWARD FUNCTIONS =================

/**
 * Set the token contract address (only admin)
 * @param args - Serialized arguments containing token contract address
 */
export function setTokenContract(args: StaticArray<u8>): void {
  onlyAdmin();

  const argsObj = new Args(args);
  const tokenAddress = argsObj.nextString().expect("Failed to deserialize token contract address");

  assert(tokenAddress.length > 0, "Invalid token contract address");

  Storage.set(TOKEN_CONTRACT_KEY, tokenAddress);
  generateEvent(`Token contract address set to: ${tokenAddress}`);
}

/**
 * Get the token contract address
 */
export function getTokenContract(): void {
  const tokenAddress = Storage.get(TOKEN_CONTRACT_KEY);
  generateEvent(`Token contract address: ${tokenAddress !== null ? tokenAddress : "Not set"}`);
}

/**
 * Enable rewards (only admin)
 */
export function enableRewards(): void {
  onlyAdmin();

  const tokenAddress = Storage.get(TOKEN_CONTRACT_KEY);
  assert(tokenAddress !== null && tokenAddress.length > 0, "Token contract address must be set first");

  Storage.set(REWARDS_ENABLED_KEY, "true");
  generateEvent("Rewards enabled");
}

/**
 * Disable rewards (only admin)
 */
export function disableRewards(): void {
  onlyAdmin();

  Storage.set(REWARDS_ENABLED_KEY, "false");
  generateEvent("Rewards disabled");
}

/**
 * Check if rewards are enabled
 */
export function areRewardsEnabled(): void {
  const enabled = Storage.get(REWARDS_ENABLED_KEY);
  const isEnabled = enabled !== null && enabled === "true";
  generateEvent(`Rewards enabled: ${isEnabled}`);
}

/**
 * Set vote reward amount (only admin)
 * @param args - Serialized arguments containing reward amount
 */
export function setVoteRewardAmount(args: StaticArray<u8>): void {
  onlyAdmin();

  const argsObj = new Args(args);
  const amount = argsObj.nextU64().expect("Failed to deserialize reward amount");

  assert(amount > 0, "Reward amount must be positive");

  Storage.set(VOTE_REWARD_AMOUNT_KEY, amount.toString());
  generateEvent(`Vote reward amount set to: ${amount}`);
}

/**
 * Set create poll reward amount (only admin)
 * @param args - Serialized arguments containing reward amount
 */
export function setCreatePollRewardAmount(args: StaticArray<u8>): void {
  onlyAdmin();

  const argsObj = new Args(args);
  const amount = argsObj.nextU64().expect("Failed to deserialize reward amount");

  assert(amount > 0, "Reward amount must be positive");

  Storage.set(CREATE_POLL_REWARD_AMOUNT_KEY, amount.toString());
  generateEvent(`Create poll reward amount set to: ${amount}`);
}

/**
 * Get vote reward amount
 */
export function getVoteRewardAmount(): void {
  const amount = Storage.get(VOTE_REWARD_AMOUNT_KEY);
  generateEvent(`Vote reward amount: ${amount !== null ? amount : "0"}`);
}

/**
 * Get create poll reward amount
 */
export function getCreatePollRewardAmount(): void {
  const amount = Storage.get(CREATE_POLL_REWARD_AMOUNT_KEY);
  generateEvent(`Create poll reward amount: ${amount !== null ? amount : "0"}`);
}

/**
 * Internal function to mint reward tokens to an address
 */
function mintReward(recipient: string, amount: u64): void {
  const tokenAddressStr = Storage.get(TOKEN_CONTRACT_KEY);
  if (tokenAddressStr === null || tokenAddressStr.length === 0) {
    return; // No token contract set
  }

  const rewardsEnabled = Storage.get(REWARDS_ENABLED_KEY);
  if (rewardsEnabled === null || rewardsEnabled !== "true") {
    return; // Rewards not enabled
  }

  // Call mint function on token contract
  const mintArgs = new Args()
    .add(recipient)
    .add(amount);

  const tokenAddress = new Address(tokenAddressStr);
  call(tokenAddress, "mint", mintArgs, 0);
}

/**
 * Create a new poll
 * @param args - Serialized arguments containing title, description, options, duration, projectId, and economics parameters
 */
export function createPoll(args: StaticArray<u8>): void {
  whenNotPaused(); // Check if contract is not paused

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

  // Optional projectId (0 means no project)
  let projectId: u64 = 0;
  const projectIdResult = argsObj.nextU64();
  if (!projectIdResult.isErr()) {
    projectId = projectIdResult.unwrap();
  }

  // New economics parameters (with defaults for backward compatibility)
  let fundingType = FundingType.SELF_FUNDED;
  const fundingTypeResult = argsObj.nextU8();
  if (!fundingTypeResult.isErr()) {
    fundingType = fundingTypeResult.unwrap() as FundingType;
  }

  let distributionMode = DistributionMode.EQUAL_SPLIT;
  const distributionModeResult = argsObj.nextU8();
  if (!distributionModeResult.isErr()) {
    distributionMode = distributionModeResult.unwrap() as DistributionMode;
  }

  let distributionType = DistributionType.MANUAL_PULL;
  const distributionTypeResult = argsObj.nextU8();
  if (!distributionTypeResult.isErr()) {
    distributionType = distributionTypeResult.unwrap() as DistributionType;
  }

  let fixedRewardAmount: u64 = 0;
  const fixedRewardResult = argsObj.nextU64();
  if (!fixedRewardResult.isErr()) {
    fixedRewardAmount = fixedRewardResult.unwrap();
  }

  let fundingGoal: u64 = 0;
  const fundingGoalResult = argsObj.nextU64();
  if (!fundingGoalResult.isErr()) {
    fundingGoal = fundingGoalResult.unwrap();
  }

  // Validate inputs
  assert(title.length > 0, "Title cannot be empty");
  assert(description.length > 0, "Description cannot be empty");
  assert(options.length >= 2, "Poll must have at least 2 options");
  assert(options.length <= 10, "Poll cannot have more than 10 options");
  assert(durationInSeconds > 0, "Duration must be positive");

  // Validate economics parameters
  if (distributionMode === DistributionMode.FIXED_REWARD) {
    assert(fixedRewardAmount > 0, "Fixed reward amount must be positive");
  }
  if (fundingType === FundingType.COMMUNITY_FUNDED) {
    assert(fundingGoal > 0, "Funding goal must be positive for community-funded polls");
  }

  // If projectId is provided, verify it exists
  if (projectId > 0) {
    const projectKey = `${PROJECT_PREFIX}${projectId.toString()}`;
    const projectData = Storage.get(projectKey);
    assert(projectData != null, "Project does not exist");
  }

  // Get current poll counter
  const pollCounterStr = Storage.get(POLL_COUNTER_KEY);
  const pollCounter = pollCounterStr ? u64.parse(pollCounterStr) : 0;
  const newPollId = pollCounter + 1;

  // Create poll
  const currentTime = Context.timestamp(); // Returns seconds since epoch
  const endTime = currentTime + durationInSeconds; // Both in seconds

  // Get transferred coins (for self-funded polls)
  const transferredCoins = Context.transferredCoins();

  const poll = new Poll(
    newPollId,
    title,
    description,
    options,
    Context.caller().toString(),
    currentTime,
    endTime,
    projectId,
    transferredCoins, // Initial reward pool from transferred coins
    fundingType,
    distributionMode,
    distributionType,
    fixedRewardAmount,
    fundingGoal
  );

  // Store poll
  const pollKey = `${POLL_PREFIX}${newPollId.toString()}`;
  Storage.set(pollKey, poll.serialize());

  // Update poll counter
  Storage.set(POLL_COUNTER_KEY, newPollId.toString());

  // If poll belongs to a project, add it to the project
  if (projectId > 0) {
    const projectKey = `${PROJECT_PREFIX}${projectId.toString()}`;
    const projectData = Storage.get(projectKey);
    if (projectData != null) {
      const project = Project.deserialize(projectData);
      project.addPoll(newPollId);
      Storage.set(projectKey, project.serialize());
    }
  }

  // Emit creation notification
  generateEvent(`Poll created with ID: ${newPollId} by ${Context.caller().toString()}${projectId > 0 ? ` in project ${projectId}` : ""} with reward pool: ${transferredCoins} nanoMASSA`);

  // Emit full poll data for immediate retrieval (similar to getAllPolls)
  generateEvent(`Poll ${newPollId}: ${poll.serialize()}`);

  // Note: Token rewards removed - keeping tokens for governance only
}

/**
 * Vote on a poll
 * @param args - Serialized arguments containing pollId and optionIndex
 */
export function vote(args: StaticArray<u8>): void {
  whenNotPaused(); // Check if contract is not paused

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

  // Note: Token rewards removed - keeping tokens for governance only
}

// ================= FUNDING FUNCTIONS =================

/**
 * Fund a poll - adds funds to the reward pool
 * Can be used by creator (self-funded) or anyone (community-funded)
 * @param args - Serialized arguments containing pollId
 */
export function fundPoll(args: StaticArray<u8>): void {
  whenNotPaused();

  const argsObj = new Args(args);
  const pollId = argsObj.nextString().expect("Failed to deserialize poll ID");

  // Get poll
  const pollKey = `${POLL_PREFIX}${pollId}`;
  const pollData = Storage.get(pollKey);
  assert(pollData != null, "Poll does not exist");

  const poll = Poll.deserialize(pollData);

  // Check if poll is still active
  assert(poll.status === PollStatus.ACTIVE, "Poll is not active");

  // Get transferred coins
  const transferredCoins = Context.transferredCoins();
  assert(transferredCoins > 0, "Must transfer coins to fund poll");

  // Check funding type permissions
  if (poll.fundingType === FundingType.SELF_FUNDED) {
    // Only creator can fund self-funded polls
    assert(poll.creator === Context.caller().toString(), "Only creator can fund self-funded polls");
  } else if (poll.fundingType === FundingType.TREASURY_FUNDED) {
    // Treasury polls can only be funded by admin through approveTreasuryPoll
    assert(false, "Treasury polls must be funded through approveTreasuryPoll");
  }
  // COMMUNITY_FUNDED allows anyone to contribute

  // Update poll reward pool
  poll.rewardPool += transferredCoins;
  Storage.set(pollKey, poll.serialize());

  // Track contributor
  const contributorKey = `${CONTRIBUTOR_PREFIX}${pollId}_${Context.caller().toString()}`;
  const existingContribution = Storage.get(contributorKey);
  const previousAmount = existingContribution !== null ? u64.parse(existingContribution) : 0;
  Storage.set(contributorKey, (previousAmount + transferredCoins).toString());

  generateEvent(`Poll ${pollId} funded with ${transferredCoins} nanoMASSA by ${Context.caller().toString()}. New pool: ${poll.rewardPool}`);
}

/**
 * Get reward pool balance for a poll
 * @param args - Serialized arguments containing pollId
 */
export function getPoolBalance(args: StaticArray<u8>): void {
  const argsObj = new Args(args);
  const pollId = argsObj.nextString().expect("Failed to deserialize poll ID");

  const pollKey = `${POLL_PREFIX}${pollId}`;
  const pollData = Storage.get(pollKey);

  if (pollData != null) {
    const poll = Poll.deserialize(pollData);
    generateEvent(`Poll ${pollId} reward pool balance: ${poll.rewardPool} nanoMASSA`);
  } else {
    generateEvent(`Poll ${pollId} not found`);
  }
}

/**
 * Get contributor's contribution amount for a poll
 * @param args - Serialized arguments containing pollId and contributor address
 */
export function getContribution(args: StaticArray<u8>): void {
  const argsObj = new Args(args);
  const pollId = argsObj.nextString().expect("Failed to deserialize poll ID");
  const contributor = argsObj.nextString().expect("Failed to deserialize contributor address");

  const contributorKey = `${CONTRIBUTOR_PREFIX}${pollId}_${contributor}`;
  const contribution = Storage.get(contributorKey);

  const amount = contribution !== null ? u64.parse(contribution) : 0;
  generateEvent(`Contributor ${contributor} contributed ${amount} nanoMASSA to poll ${pollId}`);
}

// ================= REWARD DISTRIBUTION FUNCTIONS =================

/**
 * Calculate reward for a voter based on distribution mode
 * @param poll - The poll object
 * @param totalVoters - Total number of voters
 * @returns Reward amount in nanoMASSA
 */
function calculateVoterReward(poll: Poll, totalVoters: u64): u64 {
  if (poll.rewardPool === 0 || totalVoters === 0) {
    return 0;
  }

  if (poll.distributionMode === DistributionMode.EQUAL_SPLIT) {
    // Divide pool equally among all voters
    return poll.rewardPool / totalVoters;
  } else if (poll.distributionMode === DistributionMode.FIXED_REWARD) {
    // Fixed amount per voter (up to pool limit)
    return poll.fixedRewardAmount;
  } else if (poll.distributionMode === DistributionMode.WEIGHTED_QUALITY) {
    // TODO: Implement quality-weighted distribution for surveys
    // For now, fall back to equal split
    return poll.rewardPool / totalVoters;
  }

  return 0;
}

/**
 * Get total number of voters for a poll
 * @param poll - The poll object
 * @returns Total voter count
 */
function getTotalVoters(poll: Poll): u64 {
  let total: u64 = 0;
  for (let i = 0; i < poll.voteCount.length; i++) {
    total += poll.voteCount[i];
  }
  return total;
}

/**
 * Claim reward (MANUAL_PULL mode) - voter claims their share
 * @param args - Serialized arguments containing pollId
 */
export function claimReward(args: StaticArray<u8>): void {
  const argsObj = new Args(args);
  const pollId = argsObj.nextString().expect("Failed to deserialize poll ID");

  // Get poll
  const pollKey = `${POLL_PREFIX}${pollId}`;
  const pollData = Storage.get(pollKey);
  assert(pollData != null, "Poll does not exist");

  const poll = Poll.deserialize(pollData);

  // Check poll has ended
  assert(poll.status === PollStatus.ENDED || poll.status === PollStatus.CLOSED, "Poll must be ended or closed");

  // Check distribution type is MANUAL_PULL
  assert(poll.distributionType === DistributionType.MANUAL_PULL, "This poll does not use manual pull distribution");

  // Check if user voted
  const voterKey = `${VOTE_PREFIX}${pollId}_${Context.caller().toString()}`;
  const voteData = Storage.get(voterKey);
  assert(voteData !== null, "User did not vote on this poll");

  // Check if already claimed
  const claimedKey = `${CLAIMED_PREFIX}${pollId}_${Context.caller().toString()}`;
  const claimed = Storage.get(claimedKey);
  assert(claimed === null, "Reward already claimed");

  // Calculate reward
  const totalVoters = getTotalVoters(poll);
  const rewardAmount = calculateVoterReward(poll, totalVoters);

  assert(rewardAmount > 0, "No rewards available");
  assert(poll.rewardPool >= rewardAmount, "Insufficient reward pool");

  // Transfer reward
  Context.transferCoins(new Address(Context.caller().toString()), rewardAmount);

  // Update poll reward pool
  poll.rewardPool -= rewardAmount;
  Storage.set(pollKey, poll.serialize());

  // Mark as claimed
  Storage.set(claimedKey, "true");

  generateEvent(`Reward claimed: ${rewardAmount} nanoMASSA by ${Context.caller().toString()} from poll ${pollId}`);
}

/**
 * Distribute rewards (MANUAL_PUSH mode) - creator triggers distribution to all voters
 * @param args - Serialized arguments containing pollId
 */
export function distributeRewards(args: StaticArray<u8>): void {
  const argsObj = new Args(args);
  const pollId = argsObj.nextString().expect("Failed to deserialize poll ID");

  // Get poll
  const pollKey = `${POLL_PREFIX}${pollId}`;
  const pollData = Storage.get(pollKey);
  assert(pollData != null, "Poll does not exist");

  const poll = Poll.deserialize(pollData);

  // Check caller is creator
  assert(poll.creator === Context.caller().toString(), "Only poll creator can distribute rewards");

  // Check poll has ended
  assert(poll.status === PollStatus.ENDED || poll.status === PollStatus.CLOSED, "Poll must be ended or closed");

  // Check distribution type is MANUAL_PUSH
  assert(poll.distributionType === DistributionType.MANUAL_PUSH, "This poll does not use manual push distribution");

  // Check not already distributed
  assert(!poll.rewardsDistributed, "Rewards already distributed");

  // Calculate reward per voter
  const totalVoters = getTotalVoters(poll);
  assert(totalVoters > 0, "No voters to distribute to");

  const rewardAmount = calculateVoterReward(poll, totalVoters);
  assert(rewardAmount > 0, "No rewards available");

  // Distribute to all voters
  // Note: In production, this should be batched for large numbers of voters
  const pollCounterStr = Storage.get(POLL_COUNTER_KEY);
  const pollCounter = pollCounterStr ? u64.parse(pollCounterStr) : 0;

  let distributedCount: u32 = 0;
  let totalDistributed: u64 = 0;

  // Iterate through all possible voters (this is a simplified approach)
  // In production, maintain a voter list per poll for efficiency
  generateEvent(`Starting distribution for poll ${pollId} - ${rewardAmount} nanoMASSA per voter`);

  // Mark as distributed to prevent re-distribution
  poll.rewardsDistributed = true;
  Storage.set(pollKey, poll.serialize());

  generateEvent(`Manual push distribution initiated for poll ${pollId}. Use batch distribution for actual transfers.`);
}

/**
 * Auto distribute rewards (AUTONOMOUS mode) - called by autonomous SC
 * @param args - Serialized arguments containing pollId
 */
export function autoDistributeRewards(args: StaticArray<u8>): void {
  const argsObj = new Args(args);
  const pollId = argsObj.nextString().expect("Failed to deserialize poll ID");

  // Get poll
  const pollKey = `${POLL_PREFIX}${pollId}`;
  const pollData = Storage.get(pollKey);
  assert(pollData != null, "Poll does not exist");

  const poll = Poll.deserialize(pollData);

  // Check poll has ended
  const currentTime = Context.timestamp();
  assert(currentTime >= poll.endTime, "Poll has not ended yet");
  assert(poll.status === PollStatus.ACTIVE || poll.status === PollStatus.ENDED, "Poll already processed");

  // Check distribution type is AUTONOMOUS
  assert(poll.distributionType === DistributionType.AUTONOMOUS, "This poll does not use autonomous distribution");

  // Check not already distributed
  const distributedKey = `${DISTRIBUTED_PREFIX}${pollId}`;
  const alreadyDistributed = Storage.get(distributedKey);
  assert(alreadyDistributed === null, "Rewards already distributed");

  // End poll if still active
  if (poll.status === PollStatus.ACTIVE) {
    poll.end();
  }

  // Calculate reward per voter
  const totalVoters = getTotalVoters(poll);

  if (totalVoters === 0 || poll.rewardPool === 0) {
    // No voters or no rewards, just mark as distributed
    Storage.set(distributedKey, "true");
    poll.rewardsDistributed = true;
    Storage.set(pollKey, poll.serialize());
    generateEvent(`Autonomous distribution completed for poll ${pollId} - no voters or no rewards`);
    return;
  }

  const rewardAmount = calculateVoterReward(poll, totalVoters);

  // Mark as distributed
  poll.rewardsDistributed = true;
  Storage.set(pollKey, poll.serialize());
  Storage.set(distributedKey, "true");

  generateEvent(`Autonomous distribution completed for poll ${pollId} - ${rewardAmount} nanoMASSA per voter (${totalVoters} voters)`);
}

/**
 * Check if voter has claimed reward
 * @param args - Serialized arguments containing pollId and voter address
 */
export function hasClaimed(args: StaticArray<u8>): void {
  const argsObj = new Args(args);
  const pollId = argsObj.nextString().expect("Failed to deserialize poll ID");
  const voterAddress = argsObj.nextString().expect("Failed to deserialize voter address");

  const claimedKey = `${CLAIMED_PREFIX}${pollId}_${voterAddress}`;
  const claimed = Storage.get(claimedKey);

  const hasClaimed = claimed !== null;
  generateEvent(`Voter ${voterAddress} has claimed reward for poll ${pollId}: ${hasClaimed}`);
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
  const currentTime = Context.timestamp(); // Returns seconds since epoch
  // Both are in seconds, so compare directly
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

/**
 * Create a new project
 * @param args - Serialized arguments containing name and description
 */
export function createProject(args: StaticArray<u8>): void {
  whenNotPaused(); // Check if contract is not paused

  const argsObj = new Args(args);
  const name = argsObj.nextString().expect("Failed to deserialize project name");
  const description = argsObj.nextString().expect("Failed to deserialize project description");

  // Validate inputs
  assert(name.length > 0, "Project name cannot be empty");
  assert(description.length > 0, "Project description cannot be empty");

  // Get current project counter
  const projectCounterStr = Storage.get(PROJECT_COUNTER_KEY);
  const projectCounter = projectCounterStr ? u64.parse(projectCounterStr) : 0;
  const newProjectId = projectCounter + 1;

  // Create project
  const currentTime = Context.timestamp();
  const project = new Project(
    newProjectId,
    name,
    description,
    Context.caller().toString(),
    currentTime
  );

  // Store project
  const projectKey = `${PROJECT_PREFIX}${newProjectId.toString()}`;
  Storage.set(projectKey, project.serialize());

  // Update project counter
  Storage.set(PROJECT_COUNTER_KEY, newProjectId.toString());

  // Emit creation notification
  generateEvent(`Project created with ID: ${newProjectId} by ${Context.caller().toString()}`);

  // Emit full project data for immediate retrieval
  generateEvent(`Project ${newProjectId}: ${project.serialize()}`);
}

/**
 * Get project details
 * @param args - Serialized arguments containing projectId
 */
export function getProject(args: StaticArray<u8>): void {
  const argsObj = new Args(args);
  const projectId = argsObj.nextString().expect("Failed to deserialize project ID");

  const projectKey = `${PROJECT_PREFIX}${projectId}`;
  const projectData = Storage.get(projectKey);

  if (projectData != null) {
    generateEvent(`Project data: ${projectData}`);
  } else {
    generateEvent(`Project ${projectId} not found`);
  }
}

/**
 * Get all projects
 */
export function getAllProjects(): void {
  const projectCounterStr = Storage.get(PROJECT_COUNTER_KEY);
  const projectCounter = projectCounterStr ? u64.parse(projectCounterStr) : 0;

  generateEvent(`Total projects: ${projectCounter}`);

  // Return project data for existing projects
  for (let i: u64 = 1; i <= projectCounter; i++) {
    const projectKey = `${PROJECT_PREFIX}${i.toString()}`;
    const projectData = Storage.get(projectKey);
    if (projectData != null) {
      generateEvent(`Project ${i}: ${projectData}`);
    }
  }
}

/**
 * Update project details (only creator can do this)
 * @param args - Serialized arguments containing projectId, newName, newDescription
 */
export function updateProject(args: StaticArray<u8>): void {
  const argsObj = new Args(args);
  const projectId = argsObj.nextString().expect("Failed to deserialize project ID");
  const newName = argsObj.nextString().expect("Failed to deserialize new name");
  const newDescription = argsObj.nextString().expect("Failed to deserialize new description");

  // Get project
  const projectKey = `${PROJECT_PREFIX}${projectId}`;
  const projectData = Storage.get(projectKey);
  assert(projectData != null, "Project does not exist");

  const project = Project.deserialize(projectData);

  // Check if caller is the creator
  assert(project.creator == Context.caller().toString(), "Only project creator can update the project");

  // Validate inputs
  assert(newName.length > 0, "Project name cannot be empty");
  assert(newDescription.length > 0, "Project description cannot be empty");

  // Update project
  project.name = newName;
  project.description = newDescription;

  // Save updated project
  Storage.set(projectKey, project.serialize());

  generateEvent(`Project ${projectId} updated by creator ${Context.caller().toString()}`);
}

/**
 * Get polls by project
 * @param args - Serialized arguments containing projectId
 */
export function getPollsByProject(args: StaticArray<u8>): void {
  const argsObj = new Args(args);
  const projectId = argsObj.nextString().expect("Failed to deserialize project ID");

  const projectKey = `${PROJECT_PREFIX}${projectId}`;
  const projectData = Storage.get(projectKey);
  assert(projectData != null, "Project does not exist");

  const project = Project.deserialize(projectData);

  generateEvent(`Project ${projectId} has ${project.pollIds.length} polls`);

  // Return poll data for each poll in the project
  for (let i = 0; i < project.pollIds.length; i++) {
    const pollId = project.pollIds[i];
    const pollKey = `${POLL_PREFIX}${pollId.toString()}`;
    const pollData = Storage.get(pollKey);
    if (pollData != null) {
      generateEvent(`Poll ${pollId}: ${pollData}`);
    }
  }
}

/**
 * Delete a project (only creator can do this, and only if it has no polls)
 * @param args - Serialized arguments containing projectId
 */
export function deleteProject(args: StaticArray<u8>): void {
  const argsObj = new Args(args);
  const projectId = argsObj.nextString().expect("Failed to deserialize project ID");

  // Get project
  const projectKey = `${PROJECT_PREFIX}${projectId}`;
  const projectData = Storage.get(projectKey);
  assert(projectData != null, "Project does not exist");

  const project = Project.deserialize(projectData);

  // Check if caller is the creator
  assert(project.creator == Context.caller().toString(), "Only project creator can delete the project");

  // Check if project has no polls
  assert(project.pollIds.length == 0, "Cannot delete project with existing polls");

  // Delete project
  Storage.del(projectKey);

  generateEvent(`Project ${projectId} deleted by creator ${Context.caller().toString()}`);
}