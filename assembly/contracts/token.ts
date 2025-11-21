import { generateEvent, Storage, Context, transferCoins } from "@massalabs/massa-as-sdk";
import { Args, stringToBytes, bytesToString, u64ToBytes, bytesToU64 } from "@massalabs/as-types";

// Token metadata
const TOKEN_NAME = "MPolls Token";
const TOKEN_SYMBOL = "MPOLLS";
const TOKEN_DECIMALS: u8 = 9; // 9 decimals like Massa
const TOTAL_SUPPLY: u64 = 1_000_000_000 * 1_000_000_000; // 1 billion tokens with 9 decimals

// Storage keys
const BALANCE_PREFIX = "balance_";
const ALLOWANCE_PREFIX = "allowance_";
const TOTAL_SUPPLY_KEY = "total_supply";
const OWNER_KEY = "owner";
const MINTER_ROLE_PREFIX = "minter_";

/**
 * Constructor - called only once when the token contract is deployed
 */
export function constructor(_: StaticArray<u8>): void {
  assert(Context.isDeployingContract());

  const deployer = Context.caller().toString();

  // Set the deployer as owner
  Storage.set(OWNER_KEY, deployer);

  // Initialize total supply
  Storage.set(TOTAL_SUPPLY_KEY, TOTAL_SUPPLY.toString());

  // Give initial supply to deployer
  const deployerBalanceKey = `${BALANCE_PREFIX}${deployer}`;
  Storage.set(deployerBalanceKey, TOTAL_SUPPLY.toString());

  // Grant minter role to deployer
  Storage.set(`${MINTER_ROLE_PREFIX}${deployer}`, "true");

  generateEvent(`MPOLLS Token deployed! Total supply: ${TOTAL_SUPPLY} tokens`);
  generateEvent(`Initial supply allocated to: ${deployer}`);
}

// ================= TOKEN METADATA FUNCTIONS =================

/**
 * Get token name
 */
export function name(): void {
  generateEvent(`Token name: ${TOKEN_NAME}`);
}

/**
 * Get token symbol
 */
export function symbol(): void {
  generateEvent(`Token symbol: ${TOKEN_SYMBOL}`);
}

/**
 * Get token decimals
 */
export function decimals(): void {
  generateEvent(`Token decimals: ${TOKEN_DECIMALS}`);
}

/**
 * Get total supply
 */
export function totalSupply(): void {
  const supply = Storage.get(TOTAL_SUPPLY_KEY);
  generateEvent(`Total supply: ${supply !== null ? supply : "0"}`);
}

// ================= BALANCE FUNCTIONS =================

/**
 * Get balance of an address
 * @param args - Serialized arguments containing address
 */
export function balanceOf(args: StaticArray<u8>): void {
  const argsObj = new Args(args);
  const address = argsObj.nextString().expect("Failed to deserialize address");

  const balanceKey = `${BALANCE_PREFIX}${address}`;
  const balance = Storage.get(balanceKey);

  generateEvent(`Balance of ${address}: ${balance !== null ? balance : "0"}`);
}

/**
 * Get balance of caller
 */
export function myBalance(): void {
  const caller = Context.caller().toString();
  const balanceKey = `${BALANCE_PREFIX}${caller}`;
  const balance = Storage.get(balanceKey);

  generateEvent(`Your balance: ${balance !== null ? balance : "0"}`);
}

// ================= TRANSFER FUNCTIONS =================

/**
 * Transfer tokens to another address
 * @param args - Serialized arguments containing recipient address and amount
 */
export function transfer(args: StaticArray<u8>): void {
  const argsObj = new Args(args);
  const to = argsObj.nextString().expect("Failed to deserialize recipient address");
  const amount = argsObj.nextU64().expect("Failed to deserialize amount");

  const from = Context.caller().toString();

  // Validate
  assert(to.length > 0, "Invalid recipient address");
  assert(amount > 0, "Amount must be positive");
  assert(from !== to, "Cannot transfer to yourself");

  // Get sender balance
  const fromBalanceKey = `${BALANCE_PREFIX}${from}`;
  const fromBalanceStr = Storage.get(fromBalanceKey);
  const fromBalance = fromBalanceStr !== null ? u64.parse(fromBalanceStr) : 0;

  // Check sufficient balance
  assert(fromBalance >= amount, "Insufficient balance");

  // Update balances
  const newFromBalance = fromBalance - amount;
  if (newFromBalance === 0) {
    Storage.del(fromBalanceKey);
  } else {
    Storage.set(fromBalanceKey, newFromBalance.toString());
  }

  // Update recipient balance
  const toBalanceKey = `${BALANCE_PREFIX}${to}`;
  const toBalanceStr = Storage.get(toBalanceKey);
  const toBalance = toBalanceStr !== null ? u64.parse(toBalanceStr) : 0;
  const newToBalance = toBalance + amount;
  Storage.set(toBalanceKey, newToBalance.toString());

  generateEvent(`Transfer: ${from} -> ${to}, amount: ${amount}`);
}

/**
 * Transfer tokens from one address to another (requires allowance)
 * @param args - Serialized arguments containing from address, to address, and amount
 */
export function transferFrom(args: StaticArray<u8>): void {
  const argsObj = new Args(args);
  const from = argsObj.nextString().expect("Failed to deserialize from address");
  const to = argsObj.nextString().expect("Failed to deserialize to address");
  const amount = argsObj.nextU64().expect("Failed to deserialize amount");

  const spender = Context.caller().toString();

  // Validate
  assert(from.length > 0, "Invalid from address");
  assert(to.length > 0, "Invalid to address");
  assert(amount > 0, "Amount must be positive");
  assert(from !== to, "Cannot transfer to same address");

  // Check allowance
  const allowanceKey = `${ALLOWANCE_PREFIX}${from}_${spender}`;
  const allowanceStr = Storage.get(allowanceKey);
  const allowance = allowanceStr !== null ? u64.parse(allowanceStr) : 0;
  assert(allowance >= amount, "Insufficient allowance");

  // Get from balance
  const fromBalanceKey = `${BALANCE_PREFIX}${from}`;
  const fromBalanceStr = Storage.get(fromBalanceKey);
  const fromBalance = fromBalanceStr !== null ? u64.parse(fromBalanceStr) : 0;
  assert(fromBalance >= amount, "Insufficient balance");

  // Update balances
  const newFromBalance = fromBalance - amount;
  if (newFromBalance === 0) {
    Storage.del(fromBalanceKey);
  } else {
    Storage.set(fromBalanceKey, newFromBalance.toString());
  }

  const toBalanceKey = `${BALANCE_PREFIX}${to}`;
  let toBalance: u64 = 0;
  if (Storage.has(toBalanceKey)) {
    const toBalanceStr = Storage.get(toBalanceKey);
    if (toBalanceStr !== null) {
      toBalance = u64.parse(toBalanceStr);
    }
  }
  const newToBalance = toBalance + amount;
  Storage.set(toBalanceKey, newToBalance.toString());

  // Update allowance
  const newAllowance = allowance - amount;
  if (newAllowance === 0) {
    Storage.del(allowanceKey);
  } else {
    Storage.set(allowanceKey, newAllowance.toString());
  }

  generateEvent(`TransferFrom: ${from} -> ${to} by ${spender}, amount: ${amount}`);
}

// ================= ALLOWANCE FUNCTIONS =================

/**
 * Approve spender to spend tokens on behalf of caller
 * @param args - Serialized arguments containing spender address and amount
 */
export function approve(args: StaticArray<u8>): void {
  const argsObj = new Args(args);
  const spender = argsObj.nextString().expect("Failed to deserialize spender address");
  const amount = argsObj.nextU64().expect("Failed to deserialize amount");

  const owner = Context.caller().toString();

  // Validate
  assert(spender.length > 0, "Invalid spender address");
  assert(owner !== spender, "Cannot approve yourself");

  // Set allowance
  const allowanceKey = `${ALLOWANCE_PREFIX}${owner}_${spender}`;
  if (amount === 0) {
    Storage.del(allowanceKey);
  } else {
    Storage.set(allowanceKey, amount.toString());
  }

  generateEvent(`Approval: ${owner} approved ${spender} for amount: ${amount}`);
}

/**
 * Get allowance
 * @param args - Serialized arguments containing owner address and spender address
 */
export function allowance(args: StaticArray<u8>): void {
  const argsObj = new Args(args);
  const owner = argsObj.nextString().expect("Failed to deserialize owner address");
  const spender = argsObj.nextString().expect("Failed to deserialize spender address");

  const allowanceKey = `${ALLOWANCE_PREFIX}${owner}_${spender}`;
  const allowanceStr = Storage.get(allowanceKey);

  generateEvent(`Allowance: ${owner} -> ${spender}: ${allowanceStr !== null ? allowanceStr : "0"}`);
}

// ================= MINTER ROLE FUNCTIONS =================

/**
 * Check if caller is owner
 */
function onlyOwner(): void {
  const owner = Storage.get(OWNER_KEY);
  assert(owner !== null, "Owner not set");
  assert(owner === Context.caller().toString(), "Only owner can call this function");
}

/**
 * Check if address has minter role
 */
function hasMinterRole(address: string): boolean {
  const minterKey = `${MINTER_ROLE_PREFIX}${address}`;
  const isMinter = Storage.get(minterKey);
  return isMinter !== null && isMinter === "true";
}

/**
 * Grant minter role to an address (only owner)
 * @param args - Serialized arguments containing address
 */
export function grantMinterRole(args: StaticArray<u8>): void {
  onlyOwner();

  const argsObj = new Args(args);
  const address = argsObj.nextString().expect("Failed to deserialize address");

  assert(address.length > 0, "Invalid address");

  Storage.set(`${MINTER_ROLE_PREFIX}${address}`, "true");

  generateEvent(`Minter role granted to: ${address}`);
}

/**
 * Revoke minter role from an address (only owner)
 * @param args - Serialized arguments containing address
 */
export function revokeMinterRole(args: StaticArray<u8>): void {
  onlyOwner();

  const argsObj = new Args(args);
  const address = argsObj.nextString().expect("Failed to deserialize address");

  Storage.del(`${MINTER_ROLE_PREFIX}${address}`);

  generateEvent(`Minter role revoked from: ${address}`);
}

/**
 * Check if an address has minter role
 * @param args - Serialized arguments containing address
 */
export function isMinter(args: StaticArray<u8>): void {
  const argsObj = new Args(args);
  const address = argsObj.nextString().expect("Failed to deserialize address");

  const result = hasMinterRole(address);
  generateEvent(`Address ${address} is minter: ${result}`);
}

// ================= REWARD DISTRIBUTION FUNCTIONS =================

/**
 * Mint tokens to an address (only minter can call)
 * @param args - Serialized arguments containing recipient address and amount
 */
export function mint(args: StaticArray<u8>): void {
  const caller = Context.caller().toString();
  assert(hasMinterRole(caller), "Only minter can mint tokens");

  const argsObj = new Args(args);
  const to = argsObj.nextString().expect("Failed to deserialize recipient address");
  const amount = argsObj.nextU64().expect("Failed to deserialize amount");

  // Validate
  assert(to.length > 0, "Invalid recipient address");
  assert(amount > 0, "Amount must be positive");

  // Update total supply
  const totalSupplyStr = Storage.get(TOTAL_SUPPLY_KEY);
  const currentSupply = totalSupplyStr !== null ? u64.parse(totalSupplyStr) : 0;
  const newSupply = currentSupply + amount;
  Storage.set(TOTAL_SUPPLY_KEY, newSupply.toString());

  // Update recipient balance
  const toBalanceKey = `${BALANCE_PREFIX}${to}`;
  const toBalanceStr = Storage.get(toBalanceKey);
  const toBalance = toBalanceStr !== null ? u64.parse(toBalanceStr) : 0;
  const newToBalance = toBalance + amount;
  Storage.set(toBalanceKey, newToBalance.toString());

  generateEvent(`Minted ${amount} MPOLLS tokens to ${to}`);
}

/**
 * Burn tokens from caller's balance
 * @param args - Serialized arguments containing amount
 */
export function burn(args: StaticArray<u8>): void {
  const argsObj = new Args(args);
  const amount = argsObj.nextU64().expect("Failed to deserialize amount");

  const caller = Context.caller().toString();

  // Validate
  assert(amount > 0, "Amount must be positive");

  // Get caller balance
  const balanceKey = `${BALANCE_PREFIX}${caller}`;
  const balanceStr = Storage.get(balanceKey);
  const balance = balanceStr !== null ? u64.parse(balanceStr) : 0;

  // Check sufficient balance
  assert(balance >= amount, "Insufficient balance to burn");

  // Update balance
  const newBalance = balance - amount;
  if (newBalance === 0) {
    Storage.del(balanceKey);
  } else {
    Storage.set(balanceKey, newBalance.toString());
  }

  // Update total supply
  const totalSupplyStr = Storage.get(TOTAL_SUPPLY_KEY);
  const currentSupply = totalSupplyStr !== null ? u64.parse(totalSupplyStr) : 0;
  const newSupply = currentSupply - amount;
  Storage.set(TOTAL_SUPPLY_KEY, newSupply.toString());

  generateEvent(`Burned ${amount} MPOLLS tokens from ${caller}`);
}

/**
 * Buy MPOLLS tokens by sending MASSA
 * Exchange rate: 1 MASSA = 100 MPOLLS tokens
 */
export function buyTokens(_: StaticArray<u8>): void {
  const buyer = Context.caller().toString();
  const massaSent = Context.transferredCoins(); // in nanoMASSA

  assert(massaSent > 0, "Must send MASSA to buy tokens");

  // Exchange rate: 1 MASSA (10^9 nanoMASSA) = 100 MPOLLS (100 * 10^9 smallest units)
  // So: 1 nanoMASSA = 100 smallest MPOLLS units
  const tokensToMint = massaSent * 100;

  // Mint tokens to buyer
  const balanceKey = `${BALANCE_PREFIX}${buyer}`;
  const balanceStr = Storage.get(balanceKey);
  const currentBalance = balanceStr !== null ? u64.parse(balanceStr) : 0;
  const newBalance = currentBalance + tokensToMint;
  Storage.set(balanceKey, newBalance.toString());

  // Update total supply
  const totalSupplyStr = Storage.get(TOTAL_SUPPLY_KEY);
  const currentSupply = totalSupplyStr !== null ? u64.parse(totalSupplyStr) : 0;
  const newSupply = currentSupply + tokensToMint;
  Storage.set(TOTAL_SUPPLY_KEY, newSupply.toString());

  // Convert to human-readable amounts for event
  const massaAmount = massaSent / 1_000_000_000;
  const tokenAmount = tokensToMint / 1_000_000_000;

  generateEvent(`${buyer} bought ${tokenAmount} MPOLLS tokens for ${massaAmount} MASSA`);
}

/**
 * Reward tokens to multiple addresses (batch mint - only minter can call)
 * @param args - Serialized arguments containing number of recipients, followed by address-amount pairs
 */
export function rewardBatch(args: StaticArray<u8>): void {
  const caller = Context.caller().toString();
  assert(hasMinterRole(caller), "Only minter can reward tokens");

  const argsObj = new Args(args);
  const count = argsObj.nextU32().expect("Failed to deserialize recipient count");

  assert(count > 0, "At least one recipient required");
  assert(count <= 100, "Cannot reward more than 100 recipients at once");

  let totalRewarded: u64 = 0;

  for (let i: u32 = 0; i < count; i++) {
    const address = argsObj.nextString().expect("Failed to deserialize recipient address");
    const amount = argsObj.nextU64().expect("Failed to deserialize amount");

    assert(address.length > 0, "Invalid recipient address");
    assert(amount > 0, "Amount must be positive");

    // Update recipient balance
    const balanceKey = `${BALANCE_PREFIX}${address}`;
    const balanceStr = Storage.get(balanceKey);
    const balance = balanceStr !== null ? u64.parse(balanceStr) : 0;
    const newBalance = balance + amount;
    Storage.set(balanceKey, newBalance.toString());

    totalRewarded += amount;

    generateEvent(`Rewarded ${amount} MPOLLS to ${address}`);
  }

  // Update total supply
  const totalSupplyStr = Storage.get(TOTAL_SUPPLY_KEY);
  const currentSupply = totalSupplyStr !== null ? u64.parse(totalSupplyStr) : 0;
  const newSupply = currentSupply + totalRewarded;
  Storage.set(TOTAL_SUPPLY_KEY, newSupply.toString());

  generateEvent(`Batch reward completed: ${count} recipients, ${totalRewarded} total tokens`);
}

/**
 * Get contract owner
 */
export function getOwner(): void {
  const owner = Storage.get(OWNER_KEY);
  generateEvent(`Token owner: ${owner !== null ? owner : "Not set"}`);
}

/**
 * Transfer ownership to a new address (only owner)
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
