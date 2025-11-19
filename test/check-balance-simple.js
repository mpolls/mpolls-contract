#!/usr/bin/env node

import 'dotenv/config';
import { Args, Mas, JsonRpcProvider } from '@massalabs/massa-web3';

const provider = JsonRpcProvider.buildnet();
const tokenAddress = process.env.TOKEN_CONTRACT_ADDRESS;

await provider.readSC({
  target: tokenAddress,
  func: "balanceOf",
  parameter: new Args().addString("AU1Pd3bod1Js2xD71GLFd1Q1dA8tnugsHroL54Rn7SzYY5KiozfS").serialize(),
  fee: Mas.fromString("0"),
  maxGas: BigInt(2000000000)
});

await new Promise(resolve => setTimeout(resolve, 3000));

const events = await provider.getEvents({ smartContractAddress: tokenAddress });
const balanceEvent = events[events.length - 1];
console.log("Latest event:", balanceEvent.data);
