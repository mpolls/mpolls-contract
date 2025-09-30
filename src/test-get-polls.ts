import 'dotenv/config';
import { JsonRpcProvider, Args } from '@massalabs/massa-web3';

const contractAddress = process.env.CONTRACT_ADDRESS;
if (!contractAddress) {
  throw new Error('CONTRACT_ADDRESS not found in .env');
}

console.log('🔍 Testing getAllPolls...\n');

const provider = JsonRpcProvider.buildnet();

console.log('📞 Calling getAllPolls...');
await provider.readSC({
  target: contractAddress,
  func: 'getAllPolls',
  parameter: new Args().serialize(),
});

console.log('✅ Called successfully, waiting for events...\n');

// Wait longer for events to appear
await new Promise(resolve => setTimeout(resolve, 5000));

console.log('📋 Fetching events...\n');
const events = await provider.getEvents({
  smartContractAddress: contractAddress,
});

console.log(`Total events: ${events.length}\n`);

// Show all events
events.forEach((event, index) => {
  console.log(`Event ${index + 1}: ${event.data}`);
});

console.log('\n🔍 Looking specifically for poll data events...\n');
const pollDataEvents = events.filter(e =>
  e.data.includes('Poll ') && e.data.includes('|')
);

console.log(`Found ${pollDataEvents.length} poll data events:`);
pollDataEvents.forEach(event => {
  console.log(`   ${event.data}`);
});