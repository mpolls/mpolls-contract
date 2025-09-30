import { generateEvent, Storage, Context } from "@massalabs/massa-as-sdk";
import { Args } from "@massalabs/as-types";

// Storage keys
const POLL_COUNTER_KEY = "poll_counter";
const PROJECT_COUNTER_KEY = "project_counter";
const POLL_PREFIX = "poll_";
const VOTE_PREFIX = "vote_";
const PROJECT_PREFIX = "project_";

// Upgrade management keys
const ADMIN_KEY = "contract_admin";
const VERSION_KEY = "contract_version";
const PAUSED_KEY = "contract_paused";

// Poll status enum
enum PollStatus {
  ACTIVE = 0,
  CLOSED = 1,
  ENDED = 2
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

  constructor(
    id: u64,
    title: string,
    description: string,
    options: string[],
    creator: string,
    startTime: u64,
    endTime: u64,
    projectId: u64 = 0
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
  }

  // Serialize poll to storage format
  serialize(): string {
    const optionsStr = this.options.join("||");
    const votesStr = this.voteCount.map<string>(v => v.toString()).join(",");
    return `${this.id}|${this.title}|${this.description}|${optionsStr}|${this.creator}|${this.startTime}|${this.endTime}|${this.status}|${votesStr}|${this.projectId}`;
  }

  // Deserialize poll from storage format
  static deserialize(data: string): Poll {
    const parts = data.split("|");
    if (parts.length < 9) {
      throw new Error("Invalid poll data format");
    }

    // Parse projectId if available (for backward compatibility)
    const projectId = parts.length > 9 && parts[9] ? u64.parse(parts[9]) : 0;

    const poll = new Poll(
      u64.parse(parts[0]), // id
      parts[1], // title
      parts[2], // description
      parts[3].split("||"), // options
      parts[4], // creator
      u64.parse(parts[5]), // startTime
      u64.parse(parts[6]), // endTime
      projectId // projectId
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
    const currentTime = Context.timestamp(); // Returns milliseconds since epoch
    // Both startTime and endTime are stored in milliseconds, so compare directly
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

/**
 * Create a new poll
 * @param args - Serialized arguments containing title, description, options, duration, and optional projectId
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

  // Validate inputs
  assert(title.length > 0, "Title cannot be empty");
  assert(description.length > 0, "Description cannot be empty");
  assert(options.length >= 2, "Poll must have at least 2 options");
  assert(options.length <= 10, "Poll cannot have more than 10 options");
  assert(durationInSeconds > 0, "Duration must be positive");

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
  const currentTime = Context.timestamp(); // Returns milliseconds since epoch
  const endTime = currentTime + (durationInSeconds * 1000); // Convert duration to milliseconds

  const poll = new Poll(
    newPollId,
    title,
    description,
    options,
    Context.caller().toString(),
    currentTime,
    endTime,
    projectId
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

  generateEvent(`Poll created with ID: ${newPollId} by ${Context.caller().toString()}${projectId > 0 ? ` in project ${projectId}` : ""}`);
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
  const currentTime = Context.timestamp(); // Returns milliseconds since epoch
  // Both are in milliseconds, so compare directly
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

  generateEvent(`Project created with ID: ${newProjectId} by ${Context.caller().toString()}`);
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