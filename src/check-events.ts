import 'dotenv/config';
import { JsonRpcProvider } from '@massalabs/massa-web3';

const contractAddress = process.env.CONTRACT_ADDRESS;
if (!contractAddress) {
  throw new Error('CONTRACT_ADDRESS not found in .env');
}

console.log('🔍 Checking Contract Events...\n');
console.log(`📍 Contract: ${contractAddress}\n`);

const provider = JsonRpcProvider.buildnet();

const events = await provider.getEvents({
  smartContractAddress: contractAddress,
});

console.log(`📋 Total events: ${events.length}\n`);

if (events.length > 0) {
  console.log('📄 All Events:\n');
  events.forEach((event, index) => {
    console.log(`Event ${index + 1}:`);
    console.log(`   Data: ${event.data}`);
    console.log(`   Context: ${JSON.stringify(event.context)}`);
    console.log();
  });
} else {
  console.log('⚠️  No events found on this contract.');
  console.log('   This could mean:');
  console.log('   1. Contract is fresh/new with no activity');
  console.log('   2. Events have expired (Massa only keeps recent events)');
  console.log('   3. Wrong contract address');
}