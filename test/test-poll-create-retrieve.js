#!/usr/bin/env node

// Test script to create a poll and retrieve it to verify data integrity
import 'dotenv/config';
import {
  Account,
  Args,
  Mas,
  JsonRpcProvider,
} from '@massalabs/massa-web3';

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

// Test data
const TEST_POLL = {
  title: "Test Poll - Data Integrity Check",
  description: "This poll tests if submitted data matches retrieved data",
  options: ["Option Alpha", "Option Beta", "Option Gamma"],
  duration: 3600 // 1 hour in seconds
};

async function testPollCreateAndRetrieve() {
  console.log('🧪 Testing Poll Creation and Retrieval Data Integrity');
  console.log('═══════════════════════════════════════════════════');
  console.log(`📍 Contract Address: ${CONTRACT_ADDRESS}`);
  console.log(`🌐 Network: Massa Buildnet`);
  console.log('═══════════════════════════════════════════════════');

  try {
    // Create account from private key
    const account = await Account.fromPrivateKey(process.env.PRIVATE_KEY);
    console.log(`🔑 Using account: ${account.address}`);

    // Connect to buildnet
    const provider = JsonRpcProvider.buildnet(account);
    console.log('🌐 Connected to Massa buildnet');

    // Step 1: Create a poll with known test data
    console.log('\n1️⃣ Creating test poll...');
    console.log('📦 Test data:', TEST_POLL);

    const createArgs = new Args()
      .addString(TEST_POLL.title)
      .addString(TEST_POLL.description)
      .addU32(BigInt(TEST_POLL.options.length))
      .addString(TEST_POLL.options[0])
      .addString(TEST_POLL.options[1])
      .addString(TEST_POLL.options[2])
      .addU64(BigInt(TEST_POLL.duration));

    const createResult = await provider.callSC({
      target: CONTRACT_ADDRESS,
      func: 'createPoll',
      parameter: createArgs.serialize(),
      coins: 0n,
      fee: Mas.fromString('0.01'),
    });

    console.log('✅ Poll created successfully!');
    console.log('📋 Create result:', createResult);

    // Wait for transaction confirmation
    console.log('⏳ Waiting for transaction confirmation...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Step 2: Get the poll ID from events
    console.log('\n2️⃣ Retrieving poll ID from events...');
    const events = await provider.getEvents({
      smartContractAddress: CONTRACT_ADDRESS,
    });

    let pollId = null;
    console.log(`📋 Found ${events.length} events`);
    
    // Look for poll creation event
    const createEvent = events.find(event => 
      event.data.includes('Poll created with ID:')
    );
    
    if (createEvent) {
      const match = createEvent.data.match(/Poll created with ID: (\d+)/);
      if (match) {
        pollId = match[1];
        console.log(`✅ Found poll ID: ${pollId}`);
      }
    }

    if (!pollId) {
      console.log('❌ Could not determine poll ID from events');
      console.log('📋 Recent events:');
      events.slice(-3).forEach((event, index) => {
        console.log(`   ${index + 1}. ${event.data}`);
      });
      return false;
    }

    // Step 3: Retrieve the poll data
    console.log('\n3️⃣ Retrieving poll data...');
    
    const getPollArgs = new Args().addString(pollId);
    
    await provider.callSC({
      target: CONTRACT_ADDRESS,
      func: 'getPoll',
      parameter: getPollArgs.serialize(),
      coins: 0n,
      fee: Mas.fromString('0.01'),
    });

    // Wait for the getPoll call to complete
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Get all events from the contract
    const allEvents = await provider.getEvents({
      smartContractAddress: CONTRACT_ADDRESS,
    });

    console.log(`📋 Checking ${allEvents.length} total events for poll data...`);

    // Look for poll data event (could be from any previous call)
    const pollDataEvent = allEvents.find(event => 
      event.data.includes('Poll data:') && event.data.includes(pollId)
    );

    if (!pollDataEvent) {
      console.log('❌ Could not find poll data in events');
      console.log('📋 All events:');
      allEvents.forEach((event, index) => {
        console.log(`   ${index + 1}. ${event.data}`);
      });
      return false;
    }

    // Step 4: Parse and compare the data
    console.log('\n4️⃣ Parsing and comparing data...');
    
    const pollDataStr = pollDataEvent.data.replace('Poll data: ', '');
    console.log('📋 Raw poll data:', pollDataStr);

    // Parse the serialized poll data
    // Format: id|title|description|option1||option2||option3|creator|startTime|endTime|status|voteCount
    const parts = pollDataStr.split('|');
    
    if (parts.length < 8) {
      console.log('❌ Invalid poll data format - not enough parts');
      console.log(`📋 Found ${parts.length} parts, expected at least 8`);
      return false;
    }

    // Find where the options end by looking for the creator (address starting with AU)
    let creatorIndex = -1;
    for (let i = 3; i < parts.length; i++) {
      if (parts[i].startsWith('AU') && parts[i].length > 20) {
        creatorIndex = i;
        break;
      }
    }

    if (creatorIndex === -1) {
      console.log('❌ Could not find creator address in poll data');
      return false;
    }

    // Reconstruct options by joining parts between index 3 and creator
    const optionsParts = parts.slice(3, creatorIndex);
    const optionsString = optionsParts.join('|');
    const options = optionsString.split('||').filter(opt => opt.length > 0);

    const retrievedPoll = {
      id: parts[0],
      title: parts[1],
      description: parts[2],
      options: options,
      creator: parts[creatorIndex],
      startTime: parts[creatorIndex + 1],
      endTime: parts[creatorIndex + 2],
      status: parts[creatorIndex + 3],
      voteCount: parts[creatorIndex + 4] ? parts[creatorIndex + 4].split(',').map(v => parseInt(v)) : []
    };

    console.log('📦 Retrieved poll data:', {
      id: retrievedPoll.id,
      title: retrievedPoll.title,
      description: retrievedPoll.description,
      options: retrievedPoll.options,
      creator: retrievedPoll.creator,
      status: retrievedPoll.status,
      voteCount: retrievedPoll.voteCount
    });

    // Step 5: Data integrity verification
    console.log('\n5️⃣ Verifying data integrity...');
    
    const results = {
      title: TEST_POLL.title === retrievedPoll.title,
      description: TEST_POLL.description === retrievedPoll.description,
      optionCount: TEST_POLL.options.length === retrievedPoll.options.length,
      optionsMatch: JSON.stringify(TEST_POLL.options) === JSON.stringify(retrievedPoll.options),
      creator: retrievedPoll.creator === account.address.toString(),
      statusActive: retrievedPoll.status === '0', // PollStatus.ACTIVE
      voteCountsZero: retrievedPoll.voteCount.every(count => count === 0)
    };

    console.log('🔍 Verification results:');
    console.log(`   ✅ Title match: ${results.title ? '✅' : '❌'} (${TEST_POLL.title} === ${retrievedPoll.title})`);
    console.log(`   ✅ Description match: ${results.description ? '✅' : '❌'} (${TEST_POLL.description} === ${retrievedPoll.description})`);
    console.log(`   ✅ Option count match: ${results.optionCount ? '✅' : '❌'} (${TEST_POLL.options.length} === ${retrievedPoll.options.length})`);
    console.log(`   ✅ Options match: ${results.optionsMatch ? '✅' : '❌'}`);
    console.log(`   ✅ Creator match: ${results.creator ? '✅' : '❌'} (${account.address.toString()} === ${retrievedPoll.creator})`);
    console.log(`   ✅ Status is ACTIVE: ${results.statusActive ? '✅' : '❌'} (status: ${retrievedPoll.status})`);
    console.log(`   ✅ Vote counts are zero: ${results.voteCountsZero ? '✅' : '❌'} (${retrievedPoll.voteCount.join(',')})`);

    const allTestsPassed = Object.values(results).every(result => result === true);

    if (allTestsPassed) {
      console.log('\n🎉 DATA INTEGRITY TEST PASSED!');
      console.log('✅ All submitted values match retrieved values perfectly');
    } else {
      console.log('\n❌ DATA INTEGRITY TEST FAILED!');
      console.log('⚠️ Some submitted values do not match retrieved values');
    }

    console.log('\n═══════════════════════════════════════════════════');
    console.log('📊 Test Summary:');
    console.log(`📋 Poll ID: ${pollId}`);
    console.log(`📍 Contract Address: ${CONTRACT_ADDRESS}`);
    console.log(`🔑 Account: ${account.address.toString()}`);
    console.log(`🎯 Data Integrity: ${allTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`🔗 Explorer: https://buildnet-explorer.massa.net/address/${CONTRACT_ADDRESS}`);
    console.log('═══════════════════════════════════════════════════');

    return allTestsPassed;

  } catch (error) {
    console.error('💥 Test failed:', error);
    console.log('\n🔧 Troubleshooting Steps:');
    console.log('1. Check if the contract is properly deployed');
    console.log('2. Verify the private key has sufficient MASSA balance');
    console.log('3. Ensure network connectivity to buildnet');
    console.log('4. Check contract address is correct');
    return false;
  }
}

// Execute test if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testPollCreateAndRetrieve().then(success => {
    if (success) {
      console.log('\n🎉 Integration test completed successfully!');
      process.exit(0);
    } else {
      console.log('\n❌ Integration test failed!');
      process.exit(1);
    }
  }).catch(error => {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  });
}

export { testPollCreateAndRetrieve };