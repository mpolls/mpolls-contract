import { generateEvent, Storage, Context, call, Address } from "@massalabs/massa-as-sdk";
import { Args } from "@massalabs/as-types";

// Storage keys
const OWNER_KEY = "owner";
const MPOLLS_RESERVE_KEY = "mpolls_reserve";
const MASSA_RESERVE_KEY = "massa_reserve";
const TOKEN_CONTRACT_KEY = "token_contract";
const SPREAD_PERCENTAGE_KEY = "spread_percentage"; // Stored as basis points (e.g., 250 = 2.5%)
const TOTAL_VOLUME_KEY = "total_volume";
const PAUSED_KEY = "paused";

/**
 * Constructor - Initialize the swap contract with liquidity pool
 */
export function constructor(args: StaticArray<u8>): void {
  assert(Context.isDeployingContract());

  const argsObj = new Args(args);
  const tokenContractAddress = argsObj.nextString().expect("Failed to deserialize token contract address");

  const deployer = Context.caller().toString();

  // Set owner
  Storage.set(OWNER_KEY, deployer);

  // Set token contract address
  Storage.set(TOKEN_CONTRACT_KEY, tokenContractAddress);

  // Set spread to 2.5% (250 basis points)
  Storage.set(SPREAD_PERCENTAGE_KEY, "250");

  // Initialize reserves to 0
  Storage.set(MPOLLS_RESERVE_KEY, "0");
  Storage.set(MASSA_RESERVE_KEY, "0");

  // Initialize total volume
  Storage.set(TOTAL_VOLUME_KEY, "0");

  // Contract not paused initially
  Storage.set(PAUSED_KEY, "false");

  generateEvent(`Swap contract deployed with 2.5% spread`);
  generateEvent(`Token contract: ${tokenContractAddress}`);
}

/**
 * Check if caller is owner
 */
function onlyOwner(): void {
  const owner = Storage.get(OWNER_KEY);
  assert(owner !== null, "Owner not set");
  assert(owner === Context.caller().toString(), "Only owner can call this function");
}

/**
 * Check if contract is paused
 */
function requireNotPaused(): void {
  const paused = Storage.get(PAUSED_KEY);
  assert(paused === null || paused === "false", "Contract is paused");
}

/**
 * Add liquidity to the pool (owner only)
 * Accepts MASSA and expects MPOLLS tokens to be transferred separately
 * @param args - Serialized arguments containing MPOLLS amount
 */
export function addLiquidity(args: StaticArray<u8>): void {
  onlyOwner();
  requireNotPaused();

  const argsObj = new Args(args);
  const mpollsAmount = argsObj.nextU64().expect("Failed to deserialize MPOLLS amount");

  const massaAmount = Context.transferredCoins(); // in nanoMASSA

  assert(massaAmount > 0, "Must send MASSA to add liquidity");
  assert(mpollsAmount > 0, "MPOLLS amount must be positive");

  // Get current reserves
  const mpollsReserveStr = Storage.get(MPOLLS_RESERVE_KEY);
  const massaReserveStr = Storage.get(MASSA_RESERVE_KEY);

  const currentMpollsReserve = mpollsReserveStr !== null ? u64.parse(mpollsReserveStr) : 0;
  const currentMassaReserve = massaReserveStr !== null ? u64.parse(massaReserveStr) : 0;

  // Update reserves
  const newMpollsReserve = currentMpollsReserve + mpollsAmount;
  const newMassaReserve = currentMassaReserve + massaAmount;

  Storage.set(MPOLLS_RESERVE_KEY, newMpollsReserve.toString());
  Storage.set(MASSA_RESERVE_KEY, newMassaReserve.toString());

  // Transfer MPOLLS tokens from owner to contract
  const tokenContractStr = Storage.get(TOKEN_CONTRACT_KEY);
  assert(tokenContractStr !== null, "Token contract not set");

  const caller = Context.caller().toString();
  const contractAddress = Context.callee().toString();

  // Call transferFrom on token contract to move tokens from caller to this contract
  const transferArgs = new Args()
    .add(caller)
    .add(contractAddress)
    .add(mpollsAmount);

  const tokenAddress = new Address(tokenContractStr);
  call(
    tokenAddress,
    "transferFrom",
    transferArgs,
    0
  );

  generateEvent(`Liquidity added: ${massaAmount / 1_000_000_000} MASSA + ${mpollsAmount / 1_000_000_000} MPOLLS`);
  generateEvent(`New reserves: ${newMassaReserve / 1_000_000_000} MASSA, ${newMpollsReserve / 1_000_000_000} MPOLLS`);
}

/**
 * Remove liquidity from the pool (owner only)
 * @param args - Serialized arguments containing MASSA amount and MPOLLS amount to remove
 */
export function removeLiquidity(args: StaticArray<u8>): void {
  onlyOwner();

  const argsObj = new Args(args);
  const massaAmount = argsObj.nextU64().expect("Failed to deserialize MASSA amount");
  const mpollsAmount = argsObj.nextU64().expect("Failed to deserialize MPOLLS amount");

  assert(massaAmount > 0, "MASSA amount must be positive");
  assert(mpollsAmount > 0, "MPOLLS amount must be positive");

  // Get current reserves
  const mpollsReserveStr = Storage.get(MPOLLS_RESERVE_KEY);
  const massaReserveStr = Storage.get(MASSA_RESERVE_KEY);

  const currentMpollsReserve = mpollsReserveStr !== null ? u64.parse(mpollsReserveStr) : 0;
  const currentMassaReserve = massaReserveStr !== null ? u64.parse(massaReserveStr) : 0;

  assert(currentMassaReserve >= massaAmount, "Insufficient MASSA reserve");
  assert(currentMpollsReserve >= mpollsAmount, "Insufficient MPOLLS reserve");

  // Update reserves
  const newMpollsReserve = currentMpollsReserve - mpollsAmount;
  const newMassaReserve = currentMassaReserve - massaAmount;

  Storage.set(MPOLLS_RESERVE_KEY, newMpollsReserve.toString());
  Storage.set(MASSA_RESERVE_KEY, newMassaReserve.toString());

  // Transfer MASSA to owner
  const owner = Storage.get(OWNER_KEY);
  assert(owner !== null, "Owner not set");

  // TODO: Transfer MASSA coins to owner
  // Note: In Massa, we need to use transferCoins function

  // Transfer MPOLLS tokens to owner
  const tokenContractStr = Storage.get(TOKEN_CONTRACT_KEY);
  assert(tokenContractStr !== null, "Token contract not set");

  const transferArgs = new Args()
    .add<string>(owner)
    .add<u64>(mpollsAmount);

  const tokenAddress = new Address(tokenContractStr);
  call(
    tokenAddress,
    "transfer",
    transferArgs,
    0
  );

  generateEvent(`Liquidity removed: ${massaAmount / 1_000_000_000} MASSA + ${mpollsAmount / 1_000_000_000} MPOLLS`);
  generateEvent(`New reserves: ${newMassaReserve / 1_000_000_000} MASSA, ${newMpollsReserve / 1_000_000_000} MPOLLS`);
}

/**
 * Calculate output amount for a swap with 2.5% spread
 * Uses constant product formula: x * y = k
 * @param inputAmount - Amount being swapped in
 * @param inputReserve - Current reserve of input token
 * @param outputReserve - Current reserve of output token
 * @returns Output amount after applying spread
 */
function calculateSwapOutput(inputAmount: u64, inputReserve: u64, outputReserve: u64): u64 {
  assert(inputAmount > 0, "Input amount must be positive");
  assert(inputReserve > 0, "Input reserve must be positive");
  assert(outputReserve > 0, "Output reserve must be positive");

  // Get spread percentage (in basis points, e.g., 250 = 2.5%)
  const spreadStr = Storage.get(SPREAD_PERCENTAGE_KEY);
  const spreadBasisPoints = spreadStr !== null ? u64.parse(spreadStr) : 250;

  // Apply spread to input amount (subtract spread from input)
  // inputAfterSpread = inputAmount * (10000 - spreadBasisPoints) / 10000
  const inputAfterSpread = (inputAmount * (10000 - spreadBasisPoints)) / 10000;

  // Constant product formula: (x + dx) * (y - dy) = x * y
  // Solving for dy: dy = (y * dx) / (x + dx)
  const numerator = outputReserve * inputAfterSpread;
  const denominator = inputReserve + inputAfterSpread;

  const outputAmount = numerator / denominator;

  return outputAmount;
}

/**
 * Swap MASSA for MPOLLS tokens
 * Send MASSA with the transaction to buy MPOLLS
 */
export function swapMassaForMpolls(_: StaticArray<u8>): void {
  requireNotPaused();

  const buyer = Context.caller().toString();
  const massaAmount = Context.transferredCoins(); // in nanoMASSA

  assert(massaAmount > 0, "Must send MASSA to swap");

  // Get current reserves
  const mpollsReserveStr = Storage.get(MPOLLS_RESERVE_KEY);
  const massaReserveStr = Storage.get(MASSA_RESERVE_KEY);

  const mpollsReserve = mpollsReserveStr !== null ? u64.parse(mpollsReserveStr) : 0;
  const massaReserve = massaReserveStr !== null ? u64.parse(massaReserveStr) : 0;

  assert(massaReserve > 0, "No MASSA liquidity available");
  assert(mpollsReserve > 0, "No MPOLLS liquidity available");

  // Calculate output amount
  const mpollsOutput = calculateSwapOutput(massaAmount, massaReserve, mpollsReserve);

  assert(mpollsOutput > 0, "Output amount too small");
  assert(mpollsOutput <= mpollsReserve, "Insufficient MPOLLS liquidity");

  // Update reserves
  const newMassaReserve = massaReserve + massaAmount;
  const newMpollsReserve = mpollsReserve - mpollsOutput;

  Storage.set(MASSA_RESERVE_KEY, newMassaReserve.toString());
  Storage.set(MPOLLS_RESERVE_KEY, newMpollsReserve.toString());

  // Update total volume
  const volumeStr = Storage.get(TOTAL_VOLUME_KEY);
  const currentVolume = volumeStr !== null ? u64.parse(volumeStr) : 0;
  const newVolume = currentVolume + massaAmount;
  Storage.set(TOTAL_VOLUME_KEY, newVolume.toString());

  // Transfer MPOLLS tokens to buyer
  const tokenContractStr = Storage.get(TOKEN_CONTRACT_KEY);
  assert(tokenContractStr !== null, "Token contract not set");

  const transferArgs = new Args()
    .add<string>(buyer)
    .add<u64>(mpollsOutput);

  const tokenAddress = new Address(tokenContractStr);
  call(
    tokenAddress,
    "transfer",
    transferArgs,
    0
  );

  const massaAmountReadable = massaAmount / 1_000_000_000;
  const mpollsOutputReadable = mpollsOutput / 1_000_000_000;

  generateEvent(`Swap: ${massaAmountReadable} MASSA -> ${mpollsOutputReadable} MPOLLS`);
  generateEvent(`Buyer: ${buyer}`);
}

/**
 * Swap MPOLLS for MASSA tokens
 * @param args - Serialized arguments containing MPOLLS amount to swap
 */
export function swapMpollsForMassa(args: StaticArray<u8>): void {
  requireNotPaused();

  const argsObj = new Args(args);
  const mpollsAmount = argsObj.nextU64().expect("Failed to deserialize MPOLLS amount");

  assert(mpollsAmount > 0, "MPOLLS amount must be positive");

  const seller = Context.caller().toString();
  const contractAddress = Context.callee().toString();

  // Get current reserves
  const mpollsReserveStr = Storage.get(MPOLLS_RESERVE_KEY);
  const massaReserveStr = Storage.get(MASSA_RESERVE_KEY);

  const mpollsReserve = mpollsReserveStr !== null ? u64.parse(mpollsReserveStr) : 0;
  const massaReserve = massaReserveStr !== null ? u64.parse(massaReserveStr) : 0;

  assert(massaReserve > 0, "No MASSA liquidity available");
  assert(mpollsReserve > 0, "No MPOLLS liquidity available");

  // Calculate output amount
  const massaOutput = calculateSwapOutput(mpollsAmount, mpollsReserve, massaReserve);

  assert(massaOutput > 0, "Output amount too small");
  assert(massaOutput <= massaReserve, "Insufficient MASSA liquidity");

  // Update reserves
  const newMpollsReserve = mpollsReserve + mpollsAmount;
  const newMassaReserve = massaReserve - massaOutput;

  Storage.set(MPOLLS_RESERVE_KEY, newMpollsReserve.toString());
  Storage.set(MASSA_RESERVE_KEY, newMassaReserve.toString());

  // Update total volume
  const volumeStr = Storage.get(TOTAL_VOLUME_KEY);
  const currentVolume = volumeStr !== null ? u64.parse(volumeStr) : 0;
  const newVolume = currentVolume + massaOutput;
  Storage.set(TOTAL_VOLUME_KEY, newVolume.toString());

  // Transfer MPOLLS tokens from seller to contract
  const tokenContractStr = Storage.get(TOKEN_CONTRACT_KEY);
  assert(tokenContractStr !== null, "Token contract not set");

  const transferFromArgs = new Args()
    .add<string>(seller)
    .add<string>(contractAddress)
    .add<u64>(mpollsAmount);

  const tokenAddress = new Address(tokenContractStr);
  call(
    tokenAddress,
    "transferFrom",
    transferFromArgs,
    0
  );

  // Transfer MASSA to seller
  // TODO: Use transferCoins to send MASSA to seller
  // Note: This requires using the transferCoins function from massa-as-sdk

  const mpollsAmountReadable = mpollsAmount / 1_000_000_000;
  const massaOutputReadable = massaOutput / 1_000_000_000;

  generateEvent(`Swap: ${mpollsAmountReadable} MPOLLS -> ${massaOutputReadable} MASSA`);
  generateEvent(`Seller: ${seller}`);
}

/**
 * Get quote for swapping MASSA to MPOLLS
 * @param args - Serialized arguments containing MASSA amount
 */
export function getQuoteMassaToMpolls(args: StaticArray<u8>): void {
  const argsObj = new Args(args);
  const massaAmount = argsObj.nextU64().expect("Failed to deserialize MASSA amount");

  // Get current reserves
  const mpollsReserveStr = Storage.get(MPOLLS_RESERVE_KEY);
  const massaReserveStr = Storage.get(MASSA_RESERVE_KEY);

  const mpollsReserve = mpollsReserveStr !== null ? u64.parse(mpollsReserveStr) : 0;
  const massaReserve = massaReserveStr !== null ? u64.parse(massaReserveStr) : 0;

  if (massaReserve === 0 || mpollsReserve === 0) {
    generateEvent("No liquidity available");
    return;
  }

  const mpollsOutput = calculateSwapOutput(massaAmount, massaReserve, mpollsReserve);

  const massaAmountReadable = massaAmount / 1_000_000_000;
  const mpollsOutputReadable = mpollsOutput / 1_000_000_000;

  generateEvent(`Quote: ${massaAmountReadable} MASSA -> ${mpollsOutputReadable} MPOLLS`);
}

/**
 * Get quote for swapping MPOLLS to MASSA
 * @param args - Serialized arguments containing MPOLLS amount
 */
export function getQuoteMpollsToMassa(args: StaticArray<u8>): void {
  const argsObj = new Args(args);
  const mpollsAmount = argsObj.nextU64().expect("Failed to deserialize MPOLLS amount");

  // Get current reserves
  const mpollsReserveStr = Storage.get(MPOLLS_RESERVE_KEY);
  const massaReserveStr = Storage.get(MASSA_RESERVE_KEY);

  const mpollsReserve = mpollsReserveStr !== null ? u64.parse(mpollsReserveStr) : 0;
  const massaReserve = massaReserveStr !== null ? u64.parse(massaReserveStr) : 0;

  if (massaReserve === 0 || mpollsReserve === 0) {
    generateEvent("No liquidity available");
    return;
  }

  const massaOutput = calculateSwapOutput(mpollsAmount, mpollsReserve, massaReserve);

  const mpollsAmountReadable = mpollsAmount / 1_000_000_000;
  const massaOutputReadable = massaOutput / 1_000_000_000;

  generateEvent(`Quote: ${mpollsAmountReadable} MPOLLS -> ${massaOutputReadable} MASSA`);
}

/**
 * Get pool reserves
 */
export function getReserves(): void {
  const mpollsReserveStr = Storage.get(MPOLLS_RESERVE_KEY);
  const massaReserveStr = Storage.get(MASSA_RESERVE_KEY);

  const mpollsReserve = mpollsReserveStr !== null ? u64.parse(mpollsReserveStr) : 0;
  const massaReserve = massaReserveStr !== null ? u64.parse(massaReserveStr) : 0;

  const mpollsReserveReadable = mpollsReserve / 1_000_000_000;
  const massaReserveReadable = massaReserve / 1_000_000_000;

  generateEvent(`MASSA Reserve: ${massaReserveReadable}`);
  generateEvent(`MPOLLS Reserve: ${mpollsReserveReadable}`);
}

/**
 * Get pool statistics
 */
export function getPoolStats(): void {
  const mpollsReserveStr = Storage.get(MPOLLS_RESERVE_KEY);
  const massaReserveStr = Storage.get(MASSA_RESERVE_KEY);
  const volumeStr = Storage.get(TOTAL_VOLUME_KEY);
  const spreadStr = Storage.get(SPREAD_PERCENTAGE_KEY);

  const mpollsReserve = mpollsReserveStr !== null ? u64.parse(mpollsReserveStr) : 0;
  const massaReserve = massaReserveStr !== null ? u64.parse(massaReserveStr) : 0;
  const volume = volumeStr !== null ? u64.parse(volumeStr) : 0;
  const spread = spreadStr !== null ? u64.parse(spreadStr) : 250;

  generateEvent(`MASSA Reserve: ${massaReserve / 1_000_000_000}`);
  generateEvent(`MPOLLS Reserve: ${mpollsReserve / 1_000_000_000}`);
  generateEvent(`Total Volume: ${volume / 1_000_000_000} MASSA`);
  generateEvent(`Spread: ${spread / 100}%`);
}

/**
 * Pause the contract (owner only)
 */
export function pause(_: StaticArray<u8>): void {
  onlyOwner();
  Storage.set(PAUSED_KEY, "true");
  generateEvent("Contract paused");
}

/**
 * Unpause the contract (owner only)
 */
export function unpause(_: StaticArray<u8>): void {
  onlyOwner();
  Storage.set(PAUSED_KEY, "false");
  generateEvent("Contract unpaused");
}

/**
 * Get contract owner
 */
export function getOwner(): void {
  const owner = Storage.get(OWNER_KEY);
  generateEvent(`Contract owner: ${owner !== null ? owner : "Not set"}`);
}

/**
 * Transfer ownership (owner only)
 * @param args - Serialized arguments containing new owner address
 */
export function transferOwnership(args: StaticArray<u8>): void {
  onlyOwner();

  const argsObj = new Args(args);
  const newOwner = argsObj.nextString().expect("Failed to deserialize new owner address");

  assert(newOwner.length > 0, "Invalid owner address");

  Storage.set(OWNER_KEY, newOwner);

  generateEvent(`Ownership transferred to: ${newOwner}`);
}
