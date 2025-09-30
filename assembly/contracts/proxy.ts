import { Storage, Context, call, generateEvent, Address } from "@massalabs/massa-as-sdk";
import { Args } from "@massalabs/as-types";

// Storage keys
const IMPLEMENTATION_KEY = "implementation_address";
const ADMIN_KEY = "proxy_admin";

/**
 * Massa Proxy Pattern
 *
 * This proxy forwards all function calls to an upgradeable implementation contract.
 * The proxy address remains constant, while the implementation can be upgraded.
 * All data is stored in the implementation contract, not the proxy.
 */

/**
 * Proxy Constructor - called only once when proxy is deployed
 * Sets up the proxy with initial implementation address
 */
export function constructor(args: StaticArray<u8>): void {
  assert(Context.isDeployingContract(), "Not deploying");

  const argsObj = new Args(args);
  const implementationAddress = argsObj.nextString().expect("Failed to deserialize implementation address");

  // Validate implementation address
  assert(implementationAddress.length > 0, "Invalid implementation address");

  // Set the deployer as admin
  Storage.set(ADMIN_KEY, Context.caller().toString());

  // Set initial implementation
  Storage.set(IMPLEMENTATION_KEY, implementationAddress);

  generateEvent(`Proxy deployed with implementation: ${implementationAddress}`);
}

/**
 * Check if caller is admin
 */
function onlyAdmin(): void {
  const admin = Storage.get(ADMIN_KEY);
  assert(admin !== null, "Admin not set");
  assert(admin === Context.caller().toString(), "Only admin can call this function");
}

/**
 * Get current implementation address
 */
export function getImplementation(): void {
  const implementation = Storage.get(IMPLEMENTATION_KEY);
  generateEvent(`Implementation address: ${implementation !== null ? implementation : "Not set"}`);
}

/**
 * Upgrade to a new implementation (only admin)
 * @param args - Serialized arguments containing new implementation address
 */
export function upgradeTo(args: StaticArray<u8>): void {
  onlyAdmin();

  const argsObj = new Args(args);
  const newImplementation = argsObj.nextString().expect("Failed to deserialize new implementation address");

  // Validate new implementation address
  assert(newImplementation.length > 0, "Invalid implementation address");

  const oldImplementation = Storage.get(IMPLEMENTATION_KEY);

  // Update implementation
  Storage.set(IMPLEMENTATION_KEY, newImplementation);

  generateEvent(`Implementation upgraded from ${oldImplementation} to ${newImplementation}`);
}

/**
 * Transfer admin rights to a new address (only admin)
 * @param args - Serialized arguments containing new admin address
 */
export function transferAdmin(args: StaticArray<u8>): void {
  onlyAdmin();

  const argsObj = new Args(args);
  const newAdmin = argsObj.nextString().expect("Failed to deserialize new admin address");

  // Validate new admin address
  assert(newAdmin.length > 0, "Invalid admin address");

  const oldAdmin = Storage.get(ADMIN_KEY);

  // Transfer admin
  Storage.set(ADMIN_KEY, newAdmin);

  generateEvent(`Proxy admin transferred from ${oldAdmin} to ${newAdmin}`);
}

/**
 * Get admin address
 */
export function getAdmin(): void {
  const admin = Storage.get(ADMIN_KEY);
  generateEvent(`Proxy admin address: ${admin !== null ? admin : "Not set"}`);
}

// ================= DELEGATED FUNCTIONS =================
// These functions forward calls to the implementation contract

/**
 * Helper function to delegate a call to the implementation
 */
function delegate(functionName: string, args: StaticArray<u8>): void {
  const implementationStr = Storage.get(IMPLEMENTATION_KEY);
  assert(implementationStr !== null, "Implementation not set");

  const implementation = new Address(implementationStr);
  const argsObj = new Args(args);

  // Call the implementation contract
  call(implementation, functionName, argsObj, 0);
}

// Poll functions
export function createPoll(args: StaticArray<u8>): void {
  delegate("createPoll", args);
}

export function vote(args: StaticArray<u8>): void {
  delegate("vote", args);
}

export function getPoll(args: StaticArray<u8>): void {
  delegate("getPoll", args);
}

export function getAllPolls(): void {
  const implementationStr = Storage.get(IMPLEMENTATION_KEY);
  assert(implementationStr !== null, "Implementation not set");
  const implementation = new Address(implementationStr);
  call(implementation, "getAllPolls", new Args(), 0);
}

export function getPollResults(args: StaticArray<u8>): void {
  delegate("getPollResults", args);
}

export function updatePoll(args: StaticArray<u8>): void {
  delegate("updatePoll", args);
}

export function closePoll(args: StaticArray<u8>): void {
  delegate("closePoll", args);
}

export function endPoll(args: StaticArray<u8>): void {
  delegate("endPoll", args);
}

export function hasVoted(args: StaticArray<u8>): void {
  delegate("hasVoted", args);
}

// Project functions
export function createProject(args: StaticArray<u8>): void {
  delegate("createProject", args);
}

export function getProject(args: StaticArray<u8>): void {
  delegate("getProject", args);
}

export function getAllProjects(): void {
  const implementationStr = Storage.get(IMPLEMENTATION_KEY);
  assert(implementationStr !== null, "Implementation not set");
  const implementation = new Address(implementationStr);
  call(implementation, "getAllProjects", new Args(), 0);
}

export function updateProject(args: StaticArray<u8>): void {
  delegate("updateProject", args);
}

export function getPollsByProject(args: StaticArray<u8>): void {
  delegate("getPollsByProject", args);
}

export function deleteProject(args: StaticArray<u8>): void {
  delegate("deleteProject", args);
}

// Admin functions (delegated to implementation)
export function pause(): void {
  const implementationStr = Storage.get(IMPLEMENTATION_KEY);
  assert(implementationStr !== null, "Implementation not set");
  const implementation = new Address(implementationStr);
  call(implementation, "pause", new Args(), 0);
}

export function unpause(): void {
  const implementationStr = Storage.get(IMPLEMENTATION_KEY);
  assert(implementationStr !== null, "Implementation not set");
  const implementation = new Address(implementationStr);
  call(implementation, "unpause", new Args(), 0);
}

export function getVersion(): void {
  const implementationStr = Storage.get(IMPLEMENTATION_KEY);
  assert(implementationStr !== null, "Implementation not set");
  const implementation = new Address(implementationStr);
  call(implementation, "getVersion", new Args(), 0);
}

export function setVersion(args: StaticArray<u8>): void {
  delegate("setVersion", args);
}

export function isPaused(): void {
  const implementationStr = Storage.get(IMPLEMENTATION_KEY);
  assert(implementationStr !== null, "Implementation not set");
  const implementation = new Address(implementationStr);
  call(implementation, "isPaused", new Args(), 0);
}