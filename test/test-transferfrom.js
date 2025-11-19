#!/usr/bin/env node

// Test calling transferFrom directly to see if it works
import 'dotenv/config';
import {
  Account,
  Args,
  Mas,
  JsonRpcProvider,
} from '@massalabs/massa-web3';

const account = await Account.fromPrivateKey(process.env.PRIVATE_KEY);
const provider = JsonRpcProvider.buildnet(account);
const tokenAddress = process.env.TOKEN_CONTRACT_ADDRESS;
const swapAddress = process.env.SWAP_CONTRACT_ADDRESS;

console.log('Testing transferFrom...');
console.log('Token:', tokenAddress);
console.log('Swap:', swapAddress);
console.log('Owner:', account.address.toString());

const amount = BigInt(100) * BigInt(1_000_000_000); // 100 tokens

// Try transferFrom: from owner to swap contract
const args = new Args()
  .addString(account.address.toString())
  .addString(swapAddress)
  .addU64(amount);

console.log('\nCalling transferFrom with:');
console.log('  From:', account.address.toString());
console.log('  To:', swapAddress);
console.log('  Amount:', amount.toString());

const op = await provider.callSC({
  target: tokenAddress,
  func: "transferFrom",
  parameter: args.serialize(),
  fee: Mas.fromString("0.01"),
  maxGas: BigInt(2000000000)
});

console.log('\nOperation submitted:', op.id);
console.log('Waiting...');

await new Promise(resolve => setTimeout(resolve, 5000));

const events = await provider.getEvents({ smartContractAddress: tokenAddress });
console.log('\nLast 3 events:');
events.slice(-3).forEach(e => console.log(e.data));
