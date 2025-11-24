import 'dotenv/config';
import {
  Account,
  JsonRpcProvider,
} from '@massalabs/massa-web3';

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || process.env.VITE_POLLS_CONTRACT_ADDRESS;
const POLL_ID = process.argv[2] || '1';

if (!CONTRACT_ADDRESS) {
  console.error('❌ CONTRACT_ADDRESS not found in environment variables');
  process.exit(1);
}

async function checkDistributionStatus() {
  console.log('🔍 Checking Auto-Distribution Status');
  console.log('═══════════════════════════════════════════════');
  console.log(`📍 Contract Address: ${CONTRACT_ADDRESS}`);
  console.log(`📊 Poll ID: ${POLL_ID}`);
  console.log('');

  try {
    const provider = JsonRpcProvider.buildnet();

    // Fetch recent events related to this poll
    console.log('📜 Recent Contract Events:');
    console.log('─────────────────────────────────────────────');

    const events = await provider.getEvents({
      smartContractAddress: CONTRACT_ADDRESS,
    });

    if (events && events.length > 0) {
      console.log(`\nFound ${events.length} total contract events`);
      console.log('\n🔍 Filtering events for deferred calls and distribution...\n');

      // Filter events related to this poll and distribution
      const relevantEvents = events.filter(event =>
        event.data.includes(`poll ${POLL_ID}`) ||
        event.data.includes(`Poll ${POLL_ID}`) ||
        event.data.includes('#' + POLL_ID) ||
        event.data.includes('DEBUG') ||
        event.data.includes('Deferred call') ||
        event.data.includes('Distributing rewards') ||
        event.data.includes('Distribution') ||
        event.data.includes('scheduled') ||
        event.data.includes('auto-distribution') ||
        event.data.includes('Auto-Distribute')
      );

      if (relevantEvents.length > 0) {
        console.log(`📌 Found ${relevantEvents.length} relevant events:\n`);
        relevantEvents.slice(0, 30).forEach((event, index) => {
          // Format timestamp if available
          const timestamp = event.context?.call_stack?.[0]?.timestamp_millis
            ? new Date(event.context.call_stack[0].timestamp_millis).toLocaleString()
            : 'Unknown time';

          console.log(`${index + 1}. [${timestamp}]`);
          console.log(`   ${event.data}`);
          console.log('');
        });
      } else {
        console.log('ℹ️  No specific events found for this poll and distribution');
        console.log('\n📋 Showing last 10 contract events:\n');
        events.slice(0, 10).forEach((event, index) => {
          console.log(`${index + 1}. ${event.data}`);
          console.log('');
        });
      }
    } else {
      console.log('ℹ️  No events found');
    }

    // Summary with instructions
    console.log('\n═══════════════════════════════════════════════');
    console.log('📋 What to Look For:');
    console.log('─────────────────────────────────────────────');
    console.log('✅ "Poll closed with auto-distribution scheduled" = Deferred call registered');
    console.log('✅ "🔍 DEBUG" messages = Deferred call setup details');
    console.log('✅ "⏰ Deferred call triggered" = Distribution started');
    console.log('✅ "Distributing rewards for poll" = Rewards being distributed');
    console.log('✅ "✅ Deferred call registered" = Registration successful');
    console.log('');
    console.log('💡 Check your wallet balance before and after the scheduled time');
    console.log('💡 Distribution occurs automatically via Massa blockchain');
    console.log('💡 Actual execution may be ±16-32 seconds from scheduled time');
    console.log('═══════════════════════════════════════════════\n');

  } catch (error: any) {
    console.error('\n💥 Error checking distribution status:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run the check
checkDistributionStatus()
  .then(() => {
    console.log('✨ Check complete!');
    console.log('💡 Run this command again after the scheduled distribution time to see execution events\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
