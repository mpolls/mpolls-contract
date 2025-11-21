#!/usr/bin/env node

// Add initial liquidity to the swap pool
import 'dotenv/config';
import {
  Account,
  Args,
  Mas,
  JsonRpcProvider,
} from '@massalabs/massa-web3';

async function addLiquidity() {
  console.log('💧 Adding Liquidity to Swap Pool...');
  console.log('════════════════════════════════════════');

  try {
    // Get swap contract address from environment
    const swapContractAddress = process.env.SWAP_CONTRACT_ADDRESS;

    if (!swapContractAddress) {
      throw new Error('SWAP_CONTRACT_ADDRESS not found in .env file. Please deploy swap contract first.');
    }

    console.log(`🔄 Swap Contract: ${swapContractAddress}`);

    // Create account from private key
    const account = await Account.fromPrivateKey(process.env.PRIVATE_KEY);
    console.log(`📍 Your address: ${account.address}`);

    // Connect to buildnet
    const provider = JsonRpcProvider.buildnet(account);
    console.log('🌐 Connected to Massa buildnet');

    // Configure liquidity amounts
    // These values can be adjusted based on your needs
    const massaAmount = 100; // 100 MASSA
    const mpollsAmount = 10000; // 10,000 MPOLLS

    // This sets an initial rate of: 1 MASSA ≈ 100 MPOLLS

    console.log();
    console.log('📊 Liquidity to Add:');
    console.log(`   MASSA:  ${massaAmount} MASSA`);
    console.log(`   MPOLLS: ${mpollsAmount.toLocaleString()} MPOLLS`);
    console.log(`   Rate:   1 MASSA ≈ ${mpollsAmount / massaAmount} MPOLLS`);
    console.log();

    // Convert to smallest units (9 decimals)
    const massaNano = BigInt(massaAmount) * BigInt(1_000_000_000);
    const mpollsNano = BigInt(mpollsAmount) * BigInt(1_000_000_000);

    // Prepare arguments: MPOLLS amount
    const args = new Args().addU64(mpollsNano);

    console.log('⏳ Adding liquidity to swap pool...');
    console.log(`   (Sending ${massaAmount} MASSA with transaction)`);

    // Call addLiquidity function on swap contract
    // Using higher maxGas to bypass estimation issues
    const addLiqOp = await provider.callSC({
      target: swapContractAddress,
      func: "addLiquidity",
      parameter: args.serialize(),
      coins: massaNano, // Send MASSA with the transaction
      fee: Mas.fromString("0.01"),
      maxGas: BigInt(4200000000), // Set explicit max gas to skip estimation
    });

    console.log('✅ Liquidity transaction submitted successfully!');
    console.log(`   Operation ID: ${addLiqOp.id}`);
    console.log('════════════════════════════════════════');
    console.log();
    console.log('⏳ Waiting for confirmation...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check for liquidity events
    try {
      const events = await provider.getEvents({
        smartContractAddress: swapContractAddress,
      });

      if (events && events.length > 0) {
        console.log('📋 Swap Contract Events:');
        // Show last 5 events
        const recentEvents = events.slice(-5);
        recentEvents.forEach((event, index) => {
          console.log(`   ${index + 1}. ${event.data}`);
        });
      }
    } catch (eventError) {
      console.log('⚠️  Could not fetch events:', eventError.message);
    }

    console.log();
    console.log('🎉 Liquidity added successfully!');
    console.log();
    console.log('The swap pool is now active with:');
    console.log(`  💰 ${massaAmount} MASSA`);
    console.log(`  🪙 ${mpollsAmount.toLocaleString()} MPOLLS`);
    console.log();
    console.log('📝 Users can now:');
    console.log('   ✓ Swap MASSA for MPOLLS');
    console.log('   ✓ Swap MPOLLS for MASSA');
    console.log('   ✓ Get real-time quotes');
    console.log();
    console.log('💡 Tip: You can add more liquidity anytime using this script');
    console.log();

  } catch (error) {
    console.error('❌ Error adding liquidity:', error);
    if (error.message) {
      console.error('Error details:', error.message);
    }
    console.log();
    console.log('📝 Troubleshooting:');
    console.log('   1. Make sure you have approved the swap contract first:');
    console.log('      npm run approve-swap');
    console.log('   2. Ensure you have enough MASSA and MPOLLS balance');
    console.log('   3. Check that SWAP_CONTRACT_ADDRESS is set in .env');
    console.log();
    process.exit(1);
  }
}

// Run
addLiquidity();
