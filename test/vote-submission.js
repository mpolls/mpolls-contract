#!/usr/bin/env node

// Test script to submit votes to polls on the deployed Massa contract
import 'dotenv/config';
import {
  Account,
  Args,
  Mas,
  JsonRpcProvider,
} from '@massalabs/massa-web3';

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

async function testVoteSubmission() {
  console.log('🗳️  Testing Vote Submission on Massa Contract');
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

    // First, check if contract exists and get available polls
    console.log('\n1️⃣ Fetching available polls...');
    try {
      const allPollsResult = await provider.readSC({
        target: CONTRACT_ADDRESS,
        func: 'getAllPolls',
        parameter: new Args().serialize(),
      });
      console.log('✅ Contract verified! Got polls response');
    } catch (error) {
      console.log('❌ Contract verification failed:', error.message);
      return false;
    }

    // Get events to find available polls
    const events = await provider.getEvents({
      smartContractAddress: CONTRACT_ADDRESS,
    });
    
    console.log(`📋 Found ${events.length} contract events`);
    
    // Filter for poll creation events
    const pollEvents = events.filter(event => 
      event.data.includes('Poll created with ID:') || 
      event.data.includes('Total polls:') ||
      event.data.includes('Poll ') && event.data.includes(':')
    );
    
    console.log(`🗳️  Found ${pollEvents.length} poll-related events`);
    
    if (pollEvents.length === 0) {
      console.log('\n⚠️  No polls found! Creating a test poll first...');
      await createTestPoll(provider);
      
      // Wait for poll creation to be processed
      console.log('⏳ Waiting for poll creation to be processed...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Fetch events again
      const newEvents = await provider.getEvents({
        smartContractAddress: CONTRACT_ADDRESS,
      });
      
      const newPollEvents = newEvents.filter(event => 
        event.data.includes('Poll created with ID:')
      );
      
      if (newPollEvents.length === 0) {
        console.log('❌ Failed to create test poll');
        return false;
      }
    }

    // Test voting scenarios
    console.log('\n2️⃣ Testing vote submission scenarios...');
    
    // Test 1: Vote on poll ID "1" with option 0
    console.log('\n📝 Test 1: Voting on poll 1, option 0...');
    await testVote(provider, "1", 0);
    
    // Test 2: Vote on poll ID "1" with option 1 (should fail - duplicate vote)
    console.log('\n📝 Test 2: Attempting duplicate vote (should fail)...');
    await testVote(provider, "1", 1);
    
    // Test 3: Vote on non-existent poll (should fail)
    console.log('\n📝 Test 3: Voting on non-existent poll (should fail)...');
    await testVote(provider, "999", 0);
    
    // Test 4: Vote with invalid option index (should fail)
    console.log('\n📝 Test 4: Voting with invalid option index (should fail)...');
    await testVote(provider, "1", 99);

    console.log('\n3️⃣ Checking poll results after voting...');
    await checkPollResults(provider, "1");

    console.log('\n4️⃣ Testing hasVoted function...');
    await testHasVoted(provider, "1", account.address);

    console.log('\n═══════════════════════════════════════════');
    console.log('🎉 Vote Submission Test Summary Complete!');
    console.log(`📍 Contract Address: ${CONTRACT_ADDRESS}`);
    console.log(`🔗 View on Explorer: https://buildnet-explorer.massa.net/address/${CONTRACT_ADDRESS}`);
    console.log('═══════════════════════════════════════════');

    return true;

  } catch (error) {
    console.error('💥 Test script failed:', error);
    console.log('\n🔧 Troubleshooting Steps:');
    console.log('1. Ensure the contract is properly deployed');
    console.log('2. Verify the private key has sufficient MASSA balance');
    console.log('3. Check that polls exist in the contract');
    console.log('4. Try creating a poll first if none exist');
    return false;
  }
}

async function createTestPoll(provider) {
  console.log('🏗️  Creating test poll for voting...');
  
  const pollArgs = new Args()
    .addString("Test Poll for Voting")
    .addString("This poll is created for testing vote submission")
    .addU32(BigInt(3))
    .addString("Option A")
    .addString("Option B") 
    .addString("Option C")
    .addU64(BigInt(24 * 60 * 60)); // 1 day duration

  try {
    const result = await provider.callSC({
      target: CONTRACT_ADDRESS,
      func: 'createPoll',
      parameter: pollArgs.serialize(),
      coins: 0n,
      fee: Mas.fromString('0.01'),
    });

    console.log('✅ Test poll created successfully');
    console.log('📋 Creation result:', result);
    return true;
  } catch (error) {
    console.log('❌ Failed to create test poll:', error.message);
    return false;
  }
}

async function testVote(provider, pollId, optionIndex) {
  try {
    console.log(`⏳ Submitting vote: Poll ${pollId}, Option ${optionIndex}...`);
    
    const voteArgs = new Args()
      .addString(pollId)
      .addU32(BigInt(optionIndex));

    const result = await provider.callSC({
      target: CONTRACT_ADDRESS,
      func: 'vote',
      parameter: voteArgs.serialize(),
      coins: 0n,
      fee: Mas.fromString('0.01'),
    });

    console.log(`✅ Vote submitted successfully!`);
    console.log(`📋 Transaction result:`, result);
    
    // Wait for transaction processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return true;
  } catch (error) {
    console.log(`❌ Vote submission failed: ${error.message}`);
    
    if (error.message.includes('already voted')) {
      console.log('   💡 This is expected - user has already voted on this poll');
    } else if (error.message.includes('does not exist')) {
      console.log('   💡 This is expected - poll does not exist');
    } else if (error.message.includes('Invalid option')) {
      console.log('   💡 This is expected - invalid option index');
    } else if (error.message.includes('not active')) {
      console.log('   💡 Poll may have expired or been closed');
    }
    
    return false;
  }
}

async function checkPollResults(provider, pollId) {
  try {
    console.log(`📊 Getting results for poll ${pollId}...`);
    
    const resultsArgs = new Args().addString(pollId);
    
    const result = await provider.readSC({
      target: CONTRACT_ADDRESS,
      func: 'getPollResults',
      parameter: resultsArgs.serialize(),
    });
    
    console.log('✅ Poll results retrieved');
    console.log('📋 Results:', result);
    
    // Also check events for poll results
    const events = await provider.getEvents({
      smartContractAddress: CONTRACT_ADDRESS,
    });
    
    const resultEvents = events.filter(event => 
      event.data.includes(`Poll ${pollId} results:`)
    );
    
    if (resultEvents.length > 0) {
      console.log('📋 Latest poll results from events:');
      resultEvents.slice(-1).forEach(event => {
        console.log(`   ${event.data}`);
      });
    }
    
    return true;
  } catch (error) {
    console.log(`❌ Failed to get poll results: ${error.message}`);
    return false;
  }
}

async function testHasVoted(provider, pollId, voterAddress) {
  try {
    console.log(`🔍 Checking if ${voterAddress} has voted on poll ${pollId}...`);
    
    const hasVotedArgs = new Args()
      .addString(pollId)
      .addString(voterAddress);
    
    const result = await provider.readSC({
      target: CONTRACT_ADDRESS,
      func: 'hasVoted',
      parameter: hasVotedArgs.serialize(),
    });
    
    console.log('✅ hasVoted check completed');
    console.log('📋 Result:', result);
    
    // Check events for hasVoted result
    const events = await provider.getEvents({
      smartContractAddress: CONTRACT_ADDRESS,
    });
    
    const hasVotedEvents = events.filter(event => 
      event.data.includes(`has voted on poll ${pollId}:`)
    );
    
    if (hasVotedEvents.length > 0) {
      console.log('📋 hasVoted result from events:');
      hasVotedEvents.slice(-1).forEach(event => {
        console.log(`   ${event.data}`);
      });
    }
    
    return true;
  } catch (error) {
    console.log(`❌ Failed to check hasVoted: ${error.message}`);
    return false;
  }
}

// Test different vote scenarios
async function runComprehensiveVoteTests() {
  console.log('🚀 Starting Comprehensive Vote Tests...\n');
  
  const success = await testVoteSubmission();
  
  if (success) {
    console.log('\n🎉 All vote tests completed! Check the logs above for details.');
  } else {
    console.log('\n❌ Some vote tests failed. Check the logs above for details.');
    process.exit(1);
  }
}

// Execute tests if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runComprehensiveVoteTests().catch(error => {
    console.error('💥 Vote test runner failed:', error);
    process.exit(1);
  });
}

export { testVoteSubmission, testVote, checkPollResults, testHasVoted };