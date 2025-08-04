#!/usr/bin/env node

// Test script to list all polls stored in the contract with detailed formatting
import 'dotenv/config';
import {
  Account,
  Args,
  Mas,
  JsonRpcProvider,
} from '@massalabs/massa-web3';

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

// Helper function to parse poll data from event string
function parsePollData(pollDataStr) {
  // Format: id|title|description|option1||option2||option3|creator|startTime|endTime|status|voteCount
  const parts = pollDataStr.split('|');
  
  if (parts.length < 8) {
    return null;
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
    return null;
  }

  // Reconstruct options by joining parts between index 3 and creator
  const optionsParts = parts.slice(3, creatorIndex);
  const optionsString = optionsParts.join('|');
  const options = optionsString.split('||').filter(opt => opt.length > 0);

  return {
    id: parts[0],
    title: parts[1],
    description: parts[2],
    options: options,
    creator: parts[creatorIndex],
    startTime: parseInt(parts[creatorIndex + 1]),
    endTime: parseInt(parts[creatorIndex + 2]),
    status: parseInt(parts[creatorIndex + 3]),
    voteCount: parts[creatorIndex + 4] ? parts[creatorIndex + 4].split(',').map(v => parseInt(v)) : []
  };
}

// Helper function to format poll status
function formatStatus(status) {
  switch (status) {
    case 0: return '🟢 ACTIVE';
    case 1: return '🔴 CLOSED';
    case 2: return '⚫ ENDED';
    default: return `❓ UNKNOWN (${status})`;
  }
}

// Helper function to format timestamp
function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleString();
}

// Helper function to calculate remaining time
function getRemainingTime(endTime) {
  const now = Date.now();
  const remaining = endTime - now;
  
  if (remaining <= 0) {
    return '⏰ Expired';
  }
  
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `⏳ ${days}d ${hours % 24}h remaining`;
  } else if (hours > 0) {
    return `⏳ ${hours}h ${minutes}m remaining`;
  } else {
    return `⏳ ${minutes}m remaining`;
  }
}

async function listAllPolls() {
  console.log('📋 Listing All Polls in Contract');
  console.log('═════════════════════════════════════════════════════');
  console.log(`📍 Contract Address: ${CONTRACT_ADDRESS}`);
  console.log(`🌐 Network: Massa Buildnet`);
  console.log(`🔗 Explorer: https://buildnet-explorer.massa.net/address/${CONTRACT_ADDRESS}`);
  console.log('═════════════════════════════════════════════════════');

  try {
    // Create account from private key
    const account = await Account.fromPrivateKey(process.env.PRIVATE_KEY);
    console.log(`🔑 Using account: ${account.address.toString()}`);

    // Connect to buildnet
    const provider = JsonRpcProvider.buildnet(account);
    console.log('🌐 Connected to Massa buildnet');

    // Call getAllPolls function
    console.log('\n📊 Fetching all polls from contract...');
    
    await provider.callSC({
      target: CONTRACT_ADDRESS,
      func: 'getAllPolls',
      parameter: new Args().serialize(),
      coins: 0n,
      fee: Mas.fromString('0.01'),
    });

    // Wait for the call to complete and events to be generated
    console.log('⏳ Waiting for contract response...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Get all events from the contract
    const events = await provider.getEvents({
      smartContractAddress: CONTRACT_ADDRESS,
    });

    console.log(`📋 Found ${events.length} total contract events`);

    // Filter for poll-related events
    const pollCountEvent = events.find(event => event.data.includes('Total polls:'));
    const pollDataEvents = events.filter(event => event.data.startsWith('Poll ') && event.data.includes('|'));

    if (!pollCountEvent) {
      console.log('❌ Could not find total polls count in events');
      return false;
    }

    // Extract poll count
    const pollCountMatch = pollCountEvent.data.match(/Total polls: (\d+)/);
    const totalPolls = pollCountMatch ? parseInt(pollCountMatch[1]) : 0;

    console.log('\n📊 Poll Summary:');
    console.log(`   📈 Total Polls: ${totalPolls}`);
    console.log(`   📋 Poll Data Events Found: ${pollDataEvents.length}`);

    if (totalPolls === 0) {
      console.log('\n📭 No polls found in the contract');
      console.log('💡 Create some polls first with: npm run create-poll');
      return true;
    }

    console.log('\n🗳️  DETAILED POLL LISTING:');
    console.log('═════════════════════════════════════════════════════');

    // Parse and display each poll
    const polls = [];
    
    for (const event of pollDataEvents) {
      // Extract poll data from event (format: "Poll X: polldata")
      const pollDataMatch = event.data.match(/Poll \d+: (.+)/);
      if (pollDataMatch) {
        const pollData = parsePollData(pollDataMatch[1]);
        if (pollData) {
          polls.push(pollData);
        }
      }
    }

    // Sort polls by ID
    polls.sort((a, b) => parseInt(a.id) - parseInt(b.id));

    polls.forEach((poll, index) => {
      console.log(`\n📝 Poll #${poll.id}`);
      console.log(`   📋 Title: "${poll.title}"`);
      console.log(`   📄 Description: "${poll.description}"`);
      console.log(`   📊 Status: ${formatStatus(poll.status)}`);
      console.log(`   👤 Creator: ${poll.creator}`);
      console.log(`   📅 Created: ${formatTimestamp(poll.startTime)}`);
      console.log(`   ⏰ Ends: ${formatTimestamp(poll.endTime)}`);
      console.log(`   ${getRemainingTime(poll.endTime)}`);
      
      console.log(`   🗳️  Options (${poll.options.length}):`);
      poll.options.forEach((option, optIndex) => {
        const votes = poll.voteCount[optIndex] || 0;
        const percentage = poll.voteCount.length > 0 ? 
          ((votes / poll.voteCount.reduce((sum, v) => sum + v, 0)) * 100).toFixed(1) : 0;
        console.log(`      ${optIndex + 1}. "${option}" - ${votes} votes (${percentage}%)`);
      });
      
      const totalVotes = poll.voteCount.reduce((sum, v) => sum + v, 0);
      console.log(`   📊 Total Votes: ${totalVotes}`);
      
      if (index < polls.length - 1) {
        console.log('   ─────────────────────────────────────────────────');
      }
    });

    // Summary statistics
    console.log('\n📈 STATISTICS:');
    console.log('═════════════════════════════════════════════════════');
    
    const activePolls = polls.filter(p => p.status === 0).length;
    const closedPolls = polls.filter(p => p.status === 1).length;
    const endedPolls = polls.filter(p => p.status === 2).length;
    const totalVotes = polls.reduce((sum, p) => sum + p.voteCount.reduce((s, v) => s + v, 0), 0);
    const avgVotesPerPoll = polls.length > 0 ? (totalVotes / polls.length).toFixed(1) : 0;
    
    console.log(`   🟢 Active Polls: ${activePolls}`);
    console.log(`   🔴 Closed Polls: ${closedPolls}`);
    console.log(`   ⚫ Ended Polls: ${endedPolls}`);
    console.log(`   🗳️  Total Votes Cast: ${totalVotes}`);
    console.log(`   📊 Average Votes per Poll: ${avgVotesPerPoll}`);
    
    // Find most popular poll
    if (polls.length > 0) {
      const mostVoted = polls.reduce((max, poll) => {
        const pollVotes = poll.voteCount.reduce((sum, v) => sum + v, 0);
        const maxVotes = max.voteCount.reduce((sum, v) => sum + v, 0);
        return pollVotes > maxVotes ? poll : max;
      });
      const mostVotedCount = mostVoted.voteCount.reduce((sum, v) => sum + v, 0);
      console.log(`   🏆 Most Popular: Poll #${mostVoted.id} "${mostVoted.title}" (${mostVotedCount} votes)`);
    }

    console.log('\n═════════════════════════════════════════════════════');
    console.log('✅ Poll listing completed successfully!');
    console.log(`🔗 View contract on explorer: https://buildnet-explorer.massa.net/address/${CONTRACT_ADDRESS}`);
    
    return true;

  } catch (error) {
    console.error('💥 Failed to list polls:', error);
    console.log('\n🔧 Troubleshooting Steps:');
    console.log('1. Check if the contract is properly deployed');
    console.log('2. Verify the contract address is correct in .env');
    console.log('3. Ensure network connectivity to buildnet');
    console.log('4. Check if there are any polls created: npm run create-poll');
    return false;
  }
}

// Execute test if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  listAllPolls().then(success => {
    if (success) {
      console.log('\n🎉 Poll listing completed successfully!');
      process.exit(0);
    } else {
      console.log('\n❌ Poll listing failed!');
      process.exit(1);
    }
  }).catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
}

export { listAllPolls };