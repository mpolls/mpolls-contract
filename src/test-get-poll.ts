import 'dotenv/config';
import { JsonRpcProvider, Args } from '@massalabs/massa-web3';

const contractAddress = process.env.CONTRACT_ADDRESS;
if (!contractAddress) {
  throw new Error('CONTRACT_ADDRESS not found in .env');
}

console.log('🔍 Testing getPoll for ID 1...\n');

const provider = JsonRpcProvider.buildnet();

const args = new Args().addString('1');

console.log('📞 Calling getPoll(1)...');
await provider.readSC({
  target: contractAddress,
  func: 'getPoll',
  parameter: args.serialize(),
});

console.log('✅ Called successfully, waiting for events...\n');
await new Promise(resolve => setTimeout(resolve, 5000));

console.log('📋 Fetching events...\n');
const events = await provider.getEvents({
  smartContractAddress: contractAddress,
});

console.log(`Total events: ${events.length}\n`);

console.log('All events:');
events.forEach((event, index) => {
  console.log(`${index + 1}. ${event.data}`);
});

const pollDataEvents = events.filter(e =>
  e.data.includes('Poll data:') || e.data.includes('Poll 1')
);

console.log(`\n📊 Poll data events: ${pollDataEvents.length}`);
pollDataEvents.forEach(event => {
  console.log(`   ${event.data}`);
});