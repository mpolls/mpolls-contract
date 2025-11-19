#!/usr/bin/env node
import 'dotenv/config';
import { JsonRpcProvider } from '@massalabs/massa-web3';
const provider = JsonRpcProvider.buildnet();
const events = await provider.getEvents({ smartContractAddress: process.env.SWAP_CONTRACT_ADDRESS });
console.log(`Total events: ${events.length}\n`);
events.forEach((e, i) => console.log(`${i+1}. ${e.data}`));
