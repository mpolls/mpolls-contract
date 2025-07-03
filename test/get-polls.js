#!/usr/bin/env node

// Test script to retrieve polls from the deployed Massa contract
import 'dotenv/config';
import {
  Account,
  Args,
  Mas,
  JsonRpcProvider,
} from '@massalabs/massa-web3';

const CONTRACT_ADDRESS = 'AS1S3n9oCcsQmzPLKydnqZAFyhCyVhvaThnC11f7xyMzKDEkjkX6';

async function testGetPolls() {
  console.log('🗳️ Testing Poll Retrieval on Massa Contract');
  console.log('═══════════════════════════════════════════');
  console.log(`📍 Contract Address: ${CONTRACT_ADDRESS}`);
  console.log(`🌐 Network: Massa Buildnet`);
  console.log(`📋 Explorer: https://buildnet-explorer.massa.net/address/${CONTRACT_ADDRESS}`);
  console.log('═══════════════════════════════════════════');

  try {
    // Create account from private key
    const account = await Account.fromPrivateKey(process.env.PRIVATE_KEY);
    console.log(`🔑 Using account: ${account.address}`);

    // Connect to buildnet
    const provider = JsonRpcProvider.buildnet(account);
    console.log('🌐 Connected to Massa buildnet');

    // Test 1: Get all polls
    console.log('\n1️⃣ Testing getAllPolls...');
    try {
      const allPollsResult = await provider.callSC({
        target: CONTRACT_ADDRESS,
        func: 'getAllPolls',
        parameter: new Args().serialize(),
        coins: 0n,
        fee: Mas.fromString('0.01'),
      });
      
      console.log('✅ getAllPolls successful!');
      console.log('📋 Raw result:', allPollsResult);
      
      // Try to parse the result if it's structured data
      if (allPollsResult && allPollsResult.length > 0) {
        console.log(`📊 Found ${allPollsResult.length} polls`);
        allPollsResult.forEach((poll, index) => {
          console.log(`\n📝 Poll ${index + 1}:`);
          console.log(`   Data: ${poll}`);
        });
      } else {
        console.log('📭 No polls found or empty result');
      }
    } catch (error) {
      console.log('❌ getAllPolls failed:', error.message);
    }

    // Test 2: Get poll count
    console.log('\n2️⃣ Testing getPollCount...');
    try {
      const pollCountResult = await provider.callSC({
        target: CONTRACT_ADDRESS,
        func: 'getPollCount',
        parameter: new Args().serialize(),
        coins: 0n,
        fee: Mas.fromString('0.01'),
      });
      
      console.log('✅ getPollCount successful!');
      console.log('📊 Poll count:', pollCountResult);
    } catch (error) {
      console.log('❌ getPollCount failed:', error.message);
    }

    // Test 3: Get specific poll by ID (if polls exist)
    console.log('\n3️⃣ Testing getPoll by ID...');
    try {
      // Try to get poll with ID 0 (first poll)
      const pollArgs = new Args().addU32(BigInt(0));
      
      const pollResult = await provider.callSC({
        target: CONTRACT_ADDRESS,
        func: 'getPoll',
        parameter: pollArgs.serialize(),
        coins: 0n,
        fee: Mas.fromString('0.01'),
      });
      
      console.log('✅ getPoll(0) successful!');
      console.log('📋 Poll details:', pollResult);
    } catch (error) {
      console.log('❌ getPoll(0) failed:', error.message);
      if (error.message.includes('index') || error.message.includes('bounds')) {
        console.log('💡 This might be expected if no polls exist yet');
      }
    }

    // Test 4: Check contract events for poll-related activities
    console.log('\n4️⃣ Checking contract events...');
    try {
      const events = await provider.getEvents({
        smartContractAddress: CONTRACT_ADDRESS,
      });
      
      console.log(`📋 Total contract events: ${events.length}`);
      if (events.length > 0) {
        console.log('📋 Recent events:');
        events.slice(-5).forEach((event, index) => {
          console.log(`   ${index + 1}. ${event.data}`);
        });
      }
    } catch (error) {
      console.log('❌ Event retrieval failed:', error.message);
    }

    console.log('\n═══════════════════════════════════════════');
    console.log('🎉 Poll Retrieval Test Summary:');
    console.log(`📍 Contract Address: ${CONTRACT_ADDRESS}`);
    console.log(`🔗 View on Explorer: https://buildnet-explorer.massa.net/address/${CONTRACT_ADDRESS}`);
    console.log('═══════════════════════════════════════════');

    return true;

  } catch (error) {
    console.error('💥 Test script failed:', error);
    console.log('\n🔧 Troubleshooting Steps:');
    console.log('1. Check if the contract is properly deployed');
    console.log('2. Verify the private key has sufficient MASSA balance');
    console.log('3. Ensure network connectivity to buildnet');
    console.log('4. Try creating some polls first with: npm run create-poll');
    return false;
  }
}

// Read-only version without requiring account
async function testReadOnlyPolls() {
  console.log('\n📖 Testing Read-Only Poll Retrieval...');
  console.log('═══════════════════════════════════════════');

  try {
    const provider = JsonRpcProvider.buildnet();
    
    // Test reading polls without account
    console.log('📊 Attempting to read polls without account...');
    
    const readResult = await provider.readSC({
      target: CONTRACT_ADDRESS,
      func: 'getAllPolls',
      parameter: new Args().serialize(),
    });
    
    console.log('✅ Read-only getAllPolls successful:', readResult);
    
    // Try to get poll count as well
    const countResult = await provider.readSC({
      target: CONTRACT_ADDRESS,
      func: 'getPollCount',
      parameter: new Args().serialize(),
    });
    
    console.log('✅ Read-only getPollCount successful:', countResult);
    return true;
    
  } catch (error) {
    console.log('❌ Read-only poll retrieval failed:', error.message);
    
    if (error.message.includes('does not exist')) {
      console.log('\n🚨 CONTRACT NOT FOUND!');
      console.log('The contract address does not exist on the blockchain.');
    }
    
    return false;
  }
}

// Run tests
async function runAllTests() {
  console.log('🚀 Starting Poll Retrieval Tests...\n');
  
  // First test read-only functions to verify contract existence
  const readTestPassed = await testReadOnlyPolls();
  
  if (!readTestPassed) {
    console.log('\n❌ Contract does not exist - cannot retrieve polls');
    console.log('\n🔧 Next Steps:');
    console.log('1. Deploy the contract: npm run deploy-contract');
    console.log('2. Update the contract address in the code');
    console.log('3. Create some polls: npm run create-poll');
    console.log('4. Run this test again');
    process.exit(1);
  }
  
  // If read test passed, run full tests
  const fullTestPassed = await testGetPolls();
  
  if (fullTestPassed) {
    console.log('\n🎉 All poll retrieval tests passed!');
  } else {
    console.log('\n❌ Some tests failed. Check the logs above for details.');
    process.exit(1);
  }
}

// Execute tests if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(error => {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  });
}

export { testGetPolls, testReadOnlyPolls };