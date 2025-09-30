import 'dotenv/config';
import { JsonRpcProvider, Args } from '@massalabs/massa-web3';

const contractAddress = process.env.CONTRACT_ADDRESS;
if (!contractAddress) {
  throw new Error('CONTRACT_ADDRESS not found in .env');
}

console.log('🔍 Checking Contract Features...\n');
console.log(`📍 Contract: ${contractAddress}`);
console.log(`🔗 Explorer: https://buildnet-explorer.massa.net/address/${contractAddress}\n`);

const provider = JsonRpcProvider.buildnet();

// Test if getAllProjects function exists
console.log('Testing getAllProjects function...');
try {
  await provider.readSC({
    target: contractAddress,
    func: 'getAllProjects',
    parameter: new Args().serialize(),
  });

  console.log('✅ getAllProjects function EXISTS');

  // Wait for events
  await new Promise(resolve => setTimeout(resolve, 2000));

  const events = await provider.getEvents({
    smartContractAddress: contractAddress,
  });

  const projectEvents = events.filter(e => e.data.includes('Total projects:') || e.data.includes('Project'));

  if (projectEvents.length > 0) {
    console.log('\n📊 Project-related events found:');
    projectEvents.slice(0, 5).forEach(event => {
      console.log(`   - ${event.data}`);
    });
  } else {
    console.log('⚠️  No project events found (contract may not have projects support OR no projects created yet)');
  }

} catch (error: any) {
  if (error.message && error.message.includes('function not found')) {
    console.log('❌ getAllProjects function DOES NOT EXIST');
    console.log('\n⚠️  This contract does not support projects!');
    console.log('   You need to deploy a new contract with project support.');
  } else {
    console.log('⚠️  Error:', error.message);
  }
}

// Test basic poll functionality
console.log('\n\nTesting getAllPolls function...');
try {
  await provider.readSC({
    target: contractAddress,
    func: 'getAllPolls',
    parameter: new Args().serialize(),
  });

  console.log('✅ getAllPolls function EXISTS (polls supported)');

} catch (error: any) {
  console.log('❌ getAllPolls function error:', error.message);
}

console.log('\n✅ Contract feature check complete!');