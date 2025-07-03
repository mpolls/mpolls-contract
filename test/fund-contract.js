#!/usr/bin/env node

// Fund the contract with MASSA tokens so it can pay for storage costs
import 'dotenv/config';
import {
  Account,
  Mas,
  JsonRpcProvider,
} from '@massalabs/massa-web3';

const CONTRACT_ADDRESS = 'AS1S3n9oCcsQmzPLKydnqZAFyhCyVhvaThnC11f7xyMzKDEkjkX6';

async function fundContract() {
  console.log('💰 Funding Contract with MASSA tokens');
  console.log('═══════════════════════════════════════');
  console.log(`📍 Contract Address: ${CONTRACT_ADDRESS}`);
  
  try {
    // Create account from private key
    const account = await Account.fromPrivateKey(process.env.PRIVATE_KEY);
    console.log(`🔑 Using account: ${account.address}`);

    // Connect to buildnet
    const provider = JsonRpcProvider.buildnet(account);
    console.log('🌐 Connected to Massa buildnet');

    // Check account balance first
    console.log('💰 Skipping balance check for now');

    // Fund the contract with 1 MASSA
    const fundAmount = Mas.fromString('1.0');
    console.log(`💸 Sending ${fundAmount} MASSA to contract...`);

    const transferResult = await provider.transfer(
      CONTRACT_ADDRESS,
      fundAmount,
      Mas.fromString('0.01')
    );

    console.log('✅ Contract funded successfully!');
    console.log('📋 Transfer result:', transferResult);

    // Wait for transaction confirmation
    console.log('⏳ Waiting for transfer confirmation...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Check contract balance
    console.log('ℹ️ Skipping contract balance check');

    console.log('\n🎉 Contract funding complete!');
    console.log('The contract should now be able to handle storage costs for poll creation.');

    return true;

  } catch (error) {
    console.error('💥 Contract funding failed:', error);
    return false;
  }
}

// Run funding if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fundContract()
    .then(success => {
      if (success) {
        console.log('\n✨ Contract successfully funded!');
        console.log('🚀 Now try creating a poll through the dapp.');
        process.exit(0);
      } else {
        console.log('\n❌ Contract funding failed!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { fundContract };