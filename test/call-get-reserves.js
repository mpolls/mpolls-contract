#!/usr/bin/env node

// Call getReserves to check pool status
import 'dotenv/config';
import {
  Args,
  Mas,
  JsonRpcProvider,
} from '@massalabs/massa-web3';

async function callGetReserves() {
  console.log('📊 Calling getReserves on Swap Contract...');
  console.log('════════════════════════════════════════');

  try {
    const swapContractAddress = process.env.SWAP_CONTRACT_ADDRESS;

    if (!swapContractAddress) {
      throw new Error('SWAP_CONTRACT_ADDRESS not found in .env file');
    }

    console.log(`🔄 Swap Contract: ${swapContractAddress}`);

    // Connect to buildnet
    const provider = JsonRpcProvider.buildnet();
    console.log('🌐 Connected to Massa buildnet');
    console.log();

    // Call getReserves function
    console.log('⏳ Calling getReserves function...');
    const args = new Args();

    await provider.readSC({
      target: swapContractAddress,
      func: "getReserves",
      parameter: args.serialize(),
      fee: Mas.fromString("0"),
      maxGas: BigInt(2000000000)
    });

    console.log('✅ Function called successfully');
    console.log();

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get events
    console.log('📋 Fetching events...');
    const events = await provider.getEvents({
      smartContractAddress: swapContractAddress,
    });

    if (events && events.length > 0) {
      console.log(`Found ${events.length} total events`);
      console.log();
      console.log('All Events:');
      console.log('─────────────────────────────────────────');
      events.forEach((event, index) => {
        console.log(`${index + 1}. ${event.data}`);
      });
    } else {
      console.log('⚠️  No events found');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response);
    }
    process.exit(1);
  }
}

callGetReserves();
