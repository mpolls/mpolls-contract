#!/usr/bin/env node

// Approve the swap contract to spend MPOLLS tokens
import 'dotenv/config';
import {
  Account,
  Args,
  Mas,
  JsonRpcProvider,
} from '@massalabs/massa-web3';

async function approveSwapContract() {
  console.log('🔐 Approving Swap Contract to Spend MPOLLS Tokens...');
  console.log('════════════════════════════════════════');

  try {
    // Get addresses from environment
    const tokenContractAddress = process.env.TOKEN_CONTRACT_ADDRESS;
    const swapContractAddress = process.env.SWAP_CONTRACT_ADDRESS;

    if (!tokenContractAddress) {
      throw new Error('TOKEN_CONTRACT_ADDRESS not found in .env file');
    }

    if (!swapContractAddress) {
      throw new Error('SWAP_CONTRACT_ADDRESS not found in .env file. Please deploy swap contract first.');
    }

    console.log(`🪙 Token Contract: ${tokenContractAddress}`);
    console.log(`🔄 Swap Contract: ${swapContractAddress}`);

    // Create account from private key
    const account = await Account.fromPrivateKey(process.env.PRIVATE_KEY);
    console.log(`📍 Your address: ${account.address}`);

    // Connect to buildnet
    const provider = JsonRpcProvider.buildnet(account);
    console.log('🌐 Connected to Massa buildnet');

    // Prepare approval amount (max u64 for unlimited approval)
    // or use a specific amount like 1 billion MPOLLS = 1_000_000_000 * 10^9
    const approvalAmount = BigInt("18446744073709551615"); // Max u64 value for unlimited
    // Or use a specific amount:
    // const approvalAmount = BigInt(1_000_000_000) * BigInt(1_000_000_000); // 1 billion MPOLLS

    console.log(`💰 Approval amount: ${approvalAmount} (smallest units)`);

    // Prepare arguments: spender address and amount
    const args = new Args()
      .addString(swapContractAddress)
      .addU64(approvalAmount);

    console.log('⏳ Calling approve function on token contract...');

    // Call approve function on token contract
    const approveOp = await provider.callSC({
      target: tokenContractAddress,
      func: "approve",
      parameter: args.serialize(),
      coins: 0n,
      fee: Mas.fromString("0.01"),
    });

    console.log('✅ Approval transaction submitted successfully!');
    console.log(`   Operation ID: ${approveOp.id}`);
    console.log('════════════════════════════════════════');
    console.log();
    console.log('⏳ Waiting for confirmation...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check for approval events
    try {
      const events = await provider.getEvents({
        smartContractAddress: tokenContractAddress,
      });

      if (events && events.length > 0) {
        console.log('📋 Recent Token Contract Events:');
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
    console.log('🎉 Approval complete!');
    console.log();
    console.log('The swap contract can now:');
    console.log('  ✓ Transfer MPOLLS tokens from your account (for adding liquidity)');
    console.log('  ✓ Facilitate swaps from MPOLLS to MASSA');
    console.log();
    console.log('📝 Next Steps:');
    console.log('   1. Add initial liquidity to the swap pool');
    console.log('   2. Run: npm run add-liquidity');
    console.log();

  } catch (error) {
    console.error('❌ Error approving swap contract:', error);
    if (error.message) {
      console.error('Error details:', error.message);
    }
    process.exit(1);
  }
}

// Run approval
approveSwapContract();
