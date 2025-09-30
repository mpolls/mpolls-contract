import {
  bytesToStr,
  SmartContract,
  JsonRpcProvider,
} from '@massalabs/massa-web3';
import 'dotenv/config';

// Read contract address from .env
const CONTRACT_ADDR = process.env.CONTRACT_ADDRESS;
if (!CONTRACT_ADDR) {
  throw new Error('CONTRACT_ADDRESS not found in .env');
}

// Here we only use the read method of the contract so we don't need an account
// provider will be a JsonRpcPublicProvider instance
const provider = JsonRpcProvider.buildnet();

const helloContract = new SmartContract(provider, CONTRACT_ADDR);

const messageBin = await helloContract.read('hello');

// deserialize message
const message = bytesToStr(messageBin.value);

console.log(`Received from the contract: ${message}`);
