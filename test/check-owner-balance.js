#!/usr/bin/env node

import 'dotenv/config';
import { Args, Mas, JsonRpcProvider } from '@massalabs/massa-web3';

const provider = JsonRpcProvider.buildnet();
const tokenAddress = process.env.TOKEN_CONTRACT_ADDRESS;
const ownerAddress = "AU1Pd3bod1Js2xD71GLFd1Q1dA8tnugsHroL54Rn7SzYY5KiozfS";

console.log('Checking balance for:', ownerAddress);
console.log('Token contract:', tokenAddress);

const args = new Args().addString(ownerAddress);

await provider.readSC({
  target: tokenAddress,
  func: "balanceOf",
  parameter: args.serialize(),
  fee: Mas.fromString("0"),
  maxGas: BigInt(2000000000)
});

await new Promise(resolve => setTimeout(resolve, 2000));

const events = await provider.getEvents({ smartContractAddress: tokenAddress });
console.log("\nRecent events:");
events.slice(-10).forEach(e => console.log(e.data));
