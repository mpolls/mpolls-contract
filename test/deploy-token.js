#!/usr/bin/env node

// Deploy the MPOLLS Token contract
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

async function deployToken() {
  console.log('🪙 Deploying MPOLLS Token Contract...');
  console.log('════════════════════════════════════════');

  try {
    // Create account from private key
    const account = await Account.fromPrivateKey(process.env.PRIVATE_KEY);
    console.log(`📍 Deploying from account: ${account.address}`);

    // Connect to buildnet
    const provider = JsonRpcProvider.buildnet(account);
    console.log('🌐 Connected to Massa buildnet');

    // Get contract bytecode
    const contractPath = path.join(process.cwd(), 'build', 'token.wasm');

    if (!fs.existsSync(contractPath)) {
      throw new Error(`Token contract bytecode not found at ${contractPath}. Please build the contract first with: npm run build`);
    }

    const byteCode = fs.readFileSync(contractPath);
    console.log(`📦 Loaded token contract bytecode (${byteCode.length} bytes)`);

    // Prepare constructor arguments (empty for this contract - constructor handles initialization)
    const constructorArgs = new Args();

    console.log('⏳ Deploying token contract to blockchain...');

    // Deploy the contract
    const contract = await SmartContract.deploy(
      provider,
      byteCode,
      constructorArgs,
      {
        coins: Mas.fromString('0.01'),
        fee: Mas.fromString('0.01')
      },
    );

    console.log('✅ Token contract deployed successfully!');
    console.log('════════════════════════════════════════');
    console.log(`📍 Token Contract Address: ${contract.address}`);
    console.log('════════════════════════════════════════');
    console.log();
    console.log('📝 Next Steps:');
    console.log('   1. Copy the token contract address above');
    console.log('   2. Add it to your .env.local file:');
    console.log(`      VITE_TOKEN_CONTRACT_ADDRESS=${contract.address}`);
    console.log('   3. Configure the polls contract to use this token:');
    console.log(`      - Call setTokenContract("${contract.address}")`);
    console.log('   4. Grant minter role to polls contract:');
    console.log(`      - Call grantMinterRole("<POLLS_CONTRACT_ADDRESS>")`);
    console.log('   5. Enable rewards in polls contract:');
    console.log('      - Call enableRewards()');
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
        console.log('📋 Token Contract Events:');
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
    console.log('🎉 Token deployment complete!');
    console.log();
    console.log('Token Details:');
    console.log('═════════════');
    console.log('Name: MPolls Token');
    console.log('Symbol: MPOLLS');
    console.log('Decimals: 9');
    console.log('Total Supply: 1,000,000,000 MPOLLS');
    console.log(`Owner: ${account.address}`);
    console.log();

    return contract.address;
  } catch (error) {
    console.error('❌ Error deploying token contract:', error);
    if (error.message) {
      console.error('Error details:', error.message);
    }
    process.exit(1);
  }
}

// Run deployment
deployToken();
