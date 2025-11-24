import 'dotenv/config';
import {
  Account,
  Args,
  Mas,
  SmartContract,
  JsonRpcProvider,
} from '@massalabs/massa-web3';
import { getScByteCode } from './utils';

const account = await Account.fromEnv();
const provider = JsonRpcProvider.buildnet(account);

console.log('Deploying contract...');
console.log(`Account: ${account.address}`);

const byteCode = getScByteCode('build', 'main.wasm');
console.log(`Bytecode size: ${byteCode.length} bytes`);

// Main contract constructor takes no arguments
const constructorArgs = new Args();

console.log('Starting deployment...');

const contract = await SmartContract.deploy(
  provider,
  byteCode,
  constructorArgs,
  {
    coins: Mas.fromString('10'), // Fund with 10 MASSA for deferred call operations
    fee: Mas.fromString('0.01')
  },
);

console.log('Contract deployed at:', contract.address);

const events = await provider.getEvents({
  smartContractAddress: contract.address,
});

for (const event of events) {
  console.log('Event message:', event.data);
}
