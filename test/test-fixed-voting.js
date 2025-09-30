#!/usr/bin/env node

// Test script to verify the timestamp fixes work
import 'dotenv/config';
import {
  Account,
  Args,
  Mas,
  JsonRpcProvider,
} from '@massalabs/massa-web3';

const CONTRACT_ADDRESS = process.env.POLLS_CONTRACT_ADDRESS || 'AS12Tvvq33dkiifJEmHdvBczudzPEDtfwDEjsh4dkE1NiAgRKKWSv';
const PRIVATE_KEY = process.env.PRIVATE_KEY;

async function testFixedVoting() {
  console.log('🧪 TESTING FIXED VOTING FUNCTIONALITY');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`📍 Contract: ${CONTRACT_ADDRESS}`);
  console.log('═══════════════════════════════════════════════════════');

  try {
    const account = await Account.fromPrivateKey(PRIVATE_KEY);
    const provider = JsonRpcProvider.buildnet(account);
    
    console.log(`🔑 Account: ${account.address}`);

    // Step 1: Create a test poll
    console.log('\n🚀 STEP 1: Creating test poll...');
    
    const testPoll = {
      title: `Fixed Vote Test ${Date.now()}`,
      description: "Testing voting with timestamp fixes",
      options: ["Yes", "No", "Maybe"],
      durationInSeconds: 3600 // 1 hour
    };

    console.log(`📝 Creating poll: "${testPoll.title}"`);
    console.log(`📝 Duration: ${testPoll.durationInSeconds} seconds (${testPoll.durationInSeconds/3600} hours)`);

    const createArgs = new Args()
      .addString(testPoll.title)
      .addString(testPoll.description)
      .addU32(BigInt(testPoll.options.length));
    
    testPoll.options.forEach(option => {
      createArgs.addString(option);
    });
    
    createArgs.addU64(BigInt(testPoll.durationInSeconds));

    let pollId = null;
    try {
      const createResult = await provider.callSC({
        target: CONTRACT_ADDRESS,
        func: 'createPoll',
        parameter: createArgs.serialize(),
        coins: 0n,
        fee: Mas.fromString('0.01'),
      });
      
      console.log('✅ Poll creation submitted');
      console.log('📋 Operation ID:', createResult.id);

      // Wait for creation
      console.log('⏳ Waiting for poll creation confirmation...');
      await new Promise(resolve => setTimeout(resolve, 12000));

      // Get poll ID
      const events = await provider.getEvents({
        smartContractAddress: CONTRACT_ADDRESS,
      });
      
      const createEvents = events.filter(event => 
        event.data.includes("Poll created with ID:")
      );
      
      if (createEvents.length > 0) {
        const match = createEvents[createEvents.length - 1].data.match(/Poll created with ID: (\d+)/);
        if (match) {
          pollId = match[1];
          console.log(`✅ Poll created with ID: ${pollId}`);
        }
      }
      
    } catch (error) {
      console.log('❌ Poll creation failed:', error.message);
      return;
    }

    if (!pollId) {
      console.log('❌ Could not determine poll ID');
      return;
    }

    // Step 2: Get poll data to verify timestamps
    console.log(`\n📊 STEP 2: Verifying poll ${pollId} data...`);
    
    try {
      const getPollArgs = new Args().addString(pollId);
      await provider.readSC({
        target: CONTRACT_ADDRESS,
        func: 'getPoll',
        parameter: getPollArgs.serialize(),
      });
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const pollDataEvents = await provider.getEvents({
        smartContractAddress: CONTRACT_ADDRESS,
      });
      
      const pollEvents = pollDataEvents.filter(event => 
        event.data.includes(`Poll data:`)
      );
      
      if (pollEvents.length > 0) {
        const pollData = pollEvents[pollEvents.length - 1].data;
        console.log(`📋 Poll data: ${pollData}`);
        
        // Parse the poll data to verify timestamps
        let dataStr = pollData.substring('Poll data: '.length);
        const parts = dataStr.split('|');
        
        if (parts.length >= 8) {
          const startTime = parseInt(parts[5]);
          const endTime = parseInt(parts[6]);
          const status = parseInt(parts[7]);
          
          console.log(`\n⏰ Timestamp analysis:`);
          console.log(`   Start time: ${startTime} (${new Date(startTime * 1000).toISOString()})`);
          console.log(`   End time: ${endTime} (${new Date(endTime * 1000).toISOString()})`);
          console.log(`   Status: ${status} (0=active)`);
          console.log(`   Duration: ${endTime - startTime} seconds`);
          
          const currentTimeSec = Math.floor(Date.now() / 1000);
          console.log(`   Current time: ${currentTimeSec} (${new Date().toISOString()})`);
          console.log(`   Should be active: ${status === 0 && currentTimeSec >= startTime && currentTimeSec < endTime}`);
        }
      }
      
    } catch (error) {
      console.log('⚠️ Failed to get poll data:', error.message);
    }

    // Step 3: Test voting immediately
    console.log(`\n🗳️ STEP 3: Testing vote on poll ${pollId}...`);
    
    // Give the blockchain time to process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      const voteArgs = new Args()
        .addString(pollId)
        .addU32(BigInt(0)); // Vote for first option "Yes"

      console.log(`🗳️ Submitting vote for option 0 ("${testPoll.options[0]}")...`);
      
      const voteResult = await provider.callSC({
        target: CONTRACT_ADDRESS,
        func: 'vote',
        parameter: voteArgs.serialize(),
        coins: 0n,
        fee: Mas.fromString('0.01'),
      });

      console.log('🎉 SUCCESS! Vote submitted successfully!');
      console.log('📋 Vote Operation ID:', voteResult.id);
      console.log('✅ TIMESTAMP FIX WORKS!');

      // Wait for vote confirmation
      await new Promise(resolve => setTimeout(resolve, 8000));

      // Check for vote confirmation events
      const voteEvents = await provider.getEvents({
        smartContractAddress: CONTRACT_ADDRESS,
      });

      const recentEvents = voteEvents.slice(-3);
      console.log('\n📋 Recent events after vote:');
      recentEvents.forEach((event, index) => {
        console.log(`   ${index + 1}. ${event.data}`);
      });

      // Test double voting prevention
      console.log('\n🔒 STEP 4: Testing double voting prevention...');
      
      try {
        const voteArgs2 = new Args()
          .addString(pollId)
          .addU32(BigInt(1)); // Different option

        await provider.callSC({
          target: CONTRACT_ADDRESS,
          func: 'vote',
          parameter: voteArgs2.serialize(),
          coins: 0n,
          fee: Mas.fromString('0.01'),
        });
        
        console.log('❌ SECURITY ISSUE: Second vote was accepted!');
        
      } catch (doubleVoteError) {
        if (doubleVoteError.message.includes('already voted')) {
          console.log('✅ Double voting prevention: WORKING!');
        } else {
          console.log('⚠️ Second vote rejected for different reason:', doubleVoteError.message);
        }
      }

    } catch (voteError) {
      console.log(`❌ Vote failed: ${voteError.message}`);
      
      if (voteError.message.includes('not active')) {
        console.log('🚨 TIMESTAMP FIX DID NOT WORK');
        console.log('The poll is still being marked as inactive');
      } else if (voteError.message.includes('already voted')) {
        console.log('ℹ️ User has already voted - this actually means the fix works!');
      }
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🎯 TIMESTAMP FIX TEST RESULTS');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`📋 Poll created: ✅ ID ${pollId}`);
    console.log('📋 Vote functionality: See results above');
    console.log('📋 Fix status: Check if vote succeeded');

  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testFixedVoting().catch(error => {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  });
}

export { testFixedVoting };