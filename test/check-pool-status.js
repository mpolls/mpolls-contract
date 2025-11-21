#!/usr/bin/env node

// Check swap pool status
import 'dotenv/config';
import {
  Args,
  Mas,
  JsonRpcProvider,
} from '@massalabs/massa-web3';

async function checkPoolStatus() {
  console.log('📊 Checking Swap Pool Status...');
  console.log('════════════════════════════════════════');

  try {
    const swapContractAddress = process.env.SWAP_CONTRACT_ADDRESS;

    if (!swapContractAddress) {
      throw new Error('SWAP_CONTRACT_ADDRESS not found in .env file');
    }

    console.log(`🔄 Swap Contract: ${swapContractAddress}`);

    // Connect to buildnet (read-only, no account needed)
    const provider = JsonRpcProvider.buildnet();
    console.log('🌐 Connected to Massa buildnet');
    console.log();

    // Get events from the contract
    console.log('📋 Fetching contract events...');
    const events = await provider.getEvents({
      smartContractAddress: swapContractAddress,
    });

    if (events && events.length > 0) {
      console.log(`✅ Found ${events.length} total events`);
      console.log();
      console.log('Recent Events (last 10):');
      console.log('─────────────────────────────────────────');

      const recentEvents = events.slice(-10);
      recentEvents.forEach((event, index) => {
        console.log(`${index + 1}. ${event.data}`);
      });

      console.log();

      // Parse reserves from events
      let massaReserve = null;
      let mpollsReserve = null;

      for (let i = events.length - 1; i >= 0; i--) {
        const event = events[i];

        // Look for "New reserves" event
        const reserveMatch = event.data.match(/New reserves: ([\d.]+) MASSA, ([\d.]+) MPOLLS/);
        if (reserveMatch) {
          massaReserve = parseFloat(reserveMatch[1]);
          mpollsReserve = parseFloat(reserveMatch[2]);
          break;
        }

        // Also check for individual reserve events
        if (!massaReserve) {
          const massaMatch = event.data.match(/MASSA Reserve: ([\d.]+)/);
          if (massaMatch) massaReserve = parseFloat(massaMatch[1]);
        }

        if (!mpollsReserve) {
          const mpollsMatch = event.data.match(/MPOLLS Reserve: ([\d.]+)/);
          if (mpollsMatch) mpollsReserve = parseFloat(mpollsMatch[1]);
        }

        if (massaReserve && mpollsReserve) break;
      }

      if (massaReserve !== null && mpollsReserve !== null) {
        console.log('Current Pool Status:');
        console.log('════════════════════════════════════════');
        console.log(`💰 MASSA Reserve:  ${massaReserve.toLocaleString()} MASSA`);
        console.log(`🪙 MPOLLS Reserve: ${mpollsReserve.toLocaleString()} MPOLLS`);
        console.log(`📈 Exchange Rate:  1 MASSA ≈ ${(mpollsReserve / massaReserve).toFixed(2)} MPOLLS`);
        console.log();

        // Calculate what you'd get for various swap amounts (with 2.5% spread)
        console.log('Sample Swap Quotes (including 2.5% spread):');
        console.log('─────────────────────────────────────────');

        const sampleAmounts = [1, 10, 50, 100];
        sampleAmounts.forEach(massa => {
          // Apply 2.5% spread
          const inputAfterSpread = massa * 0.975;
          // Constant product formula
          const output = (mpollsReserve * inputAfterSpread) / (massaReserve + inputAfterSpread);
          console.log(`  ${massa} MASSA → ${output.toFixed(2)} MPOLLS`);
        });
      }

    } else {
      console.log('⚠️  No events found for this contract yet');
    }

  } catch (error) {
    console.error('❌ Error checking pool status:', error.message);
    process.exit(1);
  }
}

checkPoolStatus();
