#!/usr/bin/env node

import 'dotenv/config';
import { Args, Mas, JsonRpcProvider } from '@massalabs/massa-web3';

const provider = JsonRpcProvider.buildnet();
const tokenAddress = process.env.TOKEN_CONTRACT_ADDRESS;
const ownerAddress = "AU1Pd3bod1Js2xD71GLFd1Q1dA8tnugsHroL54Rn7SzYY5KiozfS";
const spenderAddress = process.env.SWAP_CONTRACT_ADDRESS;

console.log('Checking allowance...');
console.log('Owner:', ownerAddress);
console.log('Spender:', spenderAddress);

const args = new Args()
  .addString(ownerAddress)
  .addString(spenderAddress);

await provider.readSC({
  target: tokenAddress,
  func: "allowance",
  parameter: args.serialize(),
  fee: Mas.fromString("0"),
  maxGas: BigInt(2000000000)
});

await new Promise(resolve => setTimeout(resolve, 3000));

const events = await provider.getEvents({ smartContractAddress: tokenAddress });
console.log("\nLast 3 events:");
events.slice(-3).forEach(e => console.log(e.data));
