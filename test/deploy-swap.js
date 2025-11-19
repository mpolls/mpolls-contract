#!/usr/bin/env node

// Deploy the MPOLLS Swap Contract
import 'dotenv/config';
import {
  Account,
  Args,
  Mas,
  SmartContract,
  JsonRpcProvider,
} from '@massalabs/massa-web3';
import fs from 'fs';
import path from 'path';

async function deploySwap() {
  console.log('🔄 Deploying MPOLLS Swap Contract...');
  console.log('════════════════════════════════════════');

  try {
    // Get token contract address from environment
    const tokenContractAddress = process.env.TOKEN_CONTRACT_ADDRESS;
    if (!tokenContractAddress) {
      throw new Error('TOKEN_CONTRACT_ADDRESS not found in .env file. Please deploy the token contract first.');
    }

    console.log(`🪙 Token Contract: ${tokenContractAddress}`);

    // Create account from private key
    const account = await Account.fromPrivateKey(process.env.PRIVATE_KEY);
    console.log(`📍 Deploying from account: ${account.address}`);

    // Connect to buildnet
    const provider = JsonRpcProvider.buildnet(account);
    console.log('🌐 Connected to Massa buildnet');

    // Get contract bytecode
    const contractPath = path.join(process.cwd(), 'build', 'swap.wasm');

    if (!fs.existsSync(contractPath)) {
      throw new Error(`Swap contract bytecode not found at ${contractPath}. Please build the contract first with: npm run build`);
    }

    const byteCode = fs.readFileSync(contractPath);
    console.log(`📦 Loaded swap contract bytecode (${byteCode.length} bytes)`);

    // Prepare constructor arguments (token contract address)
    const constructorArgs = new Args().addString(tokenContractAddress);

    console.log('⏳ Deploying swap contract to blockchain...');

    // Deploy the contract
    const contract = await SmartContract.deploy(
      provider,
      byteCode,
      constructorArgs,
      {
        coins: Mas.fromString('0.1'), // Send coins to contract for storage costs
        fee: Mas.fromString('0.01'),
        maxGas: BigInt(2000000000)
      },
    );

    console.log('✅ Swap contract deployed successfully!');
    console.log('════════════════════════════════════════');
    console.log(`📍 Swap Contract Address: ${contract.address}`);
    console.log('════════════════════════════════════════');
    console.log();
    console.log('📝 Next Steps:');
    console.log('   1. Copy the swap contract address above');
    console.log('   2. Add it to your .env files:');
    console.log(`      Contract .env: SWAP_CONTRACT_ADDRESS=${contract.address}`);
    console.log(`      DApp .env.local: VITE_SWAP_CONTRACT_ADDRESS=${contract.address}`);
    console.log('   3. Approve the swap contract to spend your MPOLLS tokens:');
    console.log(`      - Call approve on token contract with swap contract address`);
    console.log('   4. Add initial liquidity to the pool:');
    console.log(`      - Call addLiquidity with MASSA and MPOLLS amounts`);
    console.log('   5. Start swapping!');
    console.log('════════════════════════════════════════');

    // Wait a bit for the transaction to be included
    console.log('⏳ Waiting for deployment confirmation...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check for deployment events
    try {
      const events = await provider.getEvents({
        smartContractAddress: contract.address,
      });

      if (events && events.length > 0) {
        console.log('📋 Swap Contract Events:');
        events.forEach((event, index) => {
          console.log(`   ${index + 1}. ${event.data}`);
        });
      } else {
        console.log('ℹ️  No events found yet (contract may still be processing)');
      }
    } catch (eventError) {
      console.log('⚠️  Could not fetch events:', eventError.message);
    }

    console.log();
    console.log('🎉 Swap deployment complete!');
    console.log();
    console.log('Swap Details:');
    console.log('═════════════');
    console.log('Pool: MPOLLS/MASSA');
    console.log('Spread: 2.5%');
    console.log('Formula: Constant Product AMM (x * y = k)');
    console.log(`Owner: ${account.address}`);
    console.log();

    return contract.address;
  } catch (error) {
    console.error('❌ Error deploying swap contract:', error);
    if (error.message) {
      console.error('Error details:', error.message);
    }
    process.exit(1);
  }
}

// Run deployment
deploySwap();
