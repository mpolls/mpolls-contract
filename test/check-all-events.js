#!/usr/bin/env node

import 'dotenv/config';
import { JsonRpcProvider } from '@massalabs/massa-web3';

const provider = JsonRpcProvider.buildnet();
const tokenAddress = process.env.TOKEN_CONTRACT_ADDRESS;

const events = await provider.getEvents({ smartContractAddress: tokenAddress });
console.log(`Total events: ${events.length}`);
console.log("\nLast 15 events:");
events.slice(-15).forEach((e, i) => console.log(`${i+1}. ${e.data}`));
