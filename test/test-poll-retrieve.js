#!/usr/bin/env node

// Simple test script to retrieve polls and verify data format
import 'dotenv/config';
import {
  Account,
  Args,
  Mas,
  JsonRpcProvider,
} from '@massalabs/massa-web3';

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

async function testPollRetrieval() {
  console.log('📖 Testing Poll Retrieval Functions');
  console.log('═══════════════════════════════════════════');
  console.log(`📍 Contract Address: ${CONTRACT_ADDRESS}`);
  console.log(`🌐 Network: Massa Buildnet`);
  console.log('═══════════════════════════════════════════');

  try {
    // Create account from private key
    const account = await Account.fromPrivateKey(process.env.PRIVATE_KEY);
    console.log(`🔑 Using account: ${account.address}`);

    // Connect to buildnet
    const provider = JsonRpcProvider.buildnet(account);
    console.log('🌐 Connected to Massa buildnet');

    // Test 1: Get All Polls
    console.log('\n1️⃣ Testing getAllPolls...');
    try {
      await provider.callSC({
        target: CONTRACT_ADDRESS,
        func: 'getAllPolls',
        parameter: new Args().serialize(),
        coins: 0n,
        fee: Mas.fromString('0.01'),
      });

      console.log('✅ getAllPolls called successfully');
      
      // Wait for events
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const events = await provider.getEvents({
        smartContractAddress: CONTRACT_ADDRESS,
      });

      const pollEvents = events.filter(event => 
        event.data.includes('Total polls:') || event.data.includes('Poll ')
      );

      console.log(`📋 Found ${pollEvents.length} poll-related events:`);
      pollEvents.forEach((event, index) => {
        console.log(`   ${index + 1}. ${event.data}`);
      });

    } catch (error) {
      console.log('❌ getAllPolls failed:', error.message);
    }

    // Test 2: Get Specific Poll (if any exist)
    console.log('\n2️⃣ Testing getPoll for poll ID "1"...');
    try {
      const getPollArgs = new Args().addString('1');
      
      await provider.callSC({
        target: CONTRACT_ADDRESS,
        func: 'getPoll',
        parameter: getPollArgs.serialize(),
        coins: 0n,
        fee: Mas.fromString('0.01'),
      });

      console.log('✅ getPoll called successfully');
      
      // Wait for events
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const events = await provider.getEvents({
        smartContractAddress: CONTRACT_ADDRESS,
      });

      const pollDataEvent = events.find(event => 
        event.data.includes('Poll data:') || event.data.includes('Poll 1 not found')
      );

      if (pollDataEvent) {
        console.log('📋 Poll data event:', pollDataEvent.data);
        
        if (pollDataEvent.data.includes('Poll data:')) {
          // Parse poll data
          const pollDataStr = pollDataEvent.data.replace('Poll data: ', '');
          const parts = pollDataStr.split('|');
          
          if (parts.length >= 9) {
            console.log('📦 Parsed poll structure:');
            console.log(`   ID: ${parts[0]}`);
            console.log(`   Title: ${parts[1]}`);
            console.log(`   Description: ${parts[2]}`);
            console.log(`   Options: ${parts[3].split('||').join(', ')}`);
            console.log(`   Creator: ${parts[4]}`);
            console.log(`   Start Time: ${parts[5]}`);
            console.log(`   End Time: ${parts[6]}`);
            console.log(`   Status: ${parts[7]} (0=ACTIVE, 1=CLOSED, 2=ENDED)`);
            console.log(`   Vote Counts: ${parts[8]}`);
          }
        }
      } else {
        console.log('📭 No poll data event found');
      }

    } catch (error) {
      console.log('❌ getPoll failed:', error.message);
    }

    // Test 3: Get Poll Results
    console.log('\n3️⃣ Testing getPollResults for poll ID "1"...');
    try {
      const getResultsArgs = new Args().addString('1');
      
      await provider.callSC({
        target: CONTRACT_ADDRESS,
        func: 'getPollResults',
        parameter: getResultsArgs.serialize(),
        coins: 0n,
        fee: Mas.fromString('0.01'),
      });

      console.log('✅ getPollResults called successfully');
      
      // Wait for events
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const events = await provider.getEvents({
        smartContractAddress: CONTRACT_ADDRESS,
      });

      const resultsEvent = events.find(event => 
        event.data.includes('results:') || event.data.includes('not found')
      );

      if (resultsEvent) {
        console.log('📊 Poll results event:', resultsEvent.data);
      } else {
        console.log('📭 No poll results event found');
      }

    } catch (error) {
      console.log('❌ getPollResults failed:', error.message);
    }

    // Test 4: Check if user has voted
    console.log('\n4️⃣ Testing hasVoted for current account...');
    try {
      const hasVotedArgs = new Args()
        .addString('1')
        .addString(account.address);
      
      await provider.callSC({
        target: CONTRACT_ADDRESS,
        func: 'hasVoted',
        parameter: hasVotedArgs.serialize(),
        coins: 0n,
        fee: Mas.fromString('0.01'),
      });

      console.log('✅ hasVoted called successfully');
      
      // Wait for events
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const events = await provider.getEvents({
        smartContractAddress: CONTRACT_ADDRESS,
      });

      const votedEvent = events.find(event => 
        event.data.includes('has voted on poll')
      );

      if (votedEvent) {
        console.log('🗳️ Vote status event:', votedEvent.data);
      } else {
        console.log('📭 No vote status event found');
      }

    } catch (error) {
      console.log('❌ hasVoted failed:', error.message);
    }

    console.log('\n═══════════════════════════════════════════');
    console.log('🎉 Poll Retrieval Tests Completed');
    console.log(`📍 Contract Address: ${CONTRACT_ADDRESS}`);
    console.log(`🔑 Account: ${account.address}`);
    console.log(`🔗 Explorer: https://buildnet-explorer.massa.net/address/${CONTRACT_ADDRESS}`);
    console.log('═══════════════════════════════════════════');

    return true;

  } catch (error) {
    console.error('💥 Test failed:', error);
    console.log('\n🔧 Troubleshooting Steps:');
    console.log('1. Check if the contract is properly deployed');
    console.log('2. Verify the private key has sufficient MASSA balance');
    console.log('3. Ensure network connectivity to buildnet');
    console.log('4. Create some polls first: npm run create-poll');
    return false;
  }
}

// Execute test if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testPollRetrieval().then(success => {
    if (success) {
      console.log('\n🎉 Poll retrieval test completed!');
      process.exit(0);
    } else {
      console.log('\n❌ Poll retrieval test failed!');
      process.exit(1);
    }
  }).catch(error => {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  });
}

export { testPollRetrieval };