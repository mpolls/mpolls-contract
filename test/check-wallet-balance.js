#!/usr/bin/env node

import {
  JsonRpcProvider,
} from '@massalabs/massa-web3';

const WALLET_ADDRESS = 'AU1DbRNoEXae2FQqhMAaGbqPPsXe1rGVHXdYFn7e2K2TcUoGo8Ci';

async function checkBalance() {
  console.log('💰 Checking MASSA balance...');
  console.log('═══════════════════════════════════════════════');

  try {
    const provider = JsonRpcProvider.buildnet();
    
    const addressInfo = await provider.getAddresses([WALLET_ADDRESS]);
    
    if (addressInfo && addressInfo.length > 0) {
      const info = addressInfo[0];
      const balanceInMassa = Number(info.balance) / 1e9;
      
      console.log(`Address: ${WALLET_ADDRESS}`);
      console.log(`Balance: ${balanceInMassa} MASSA`);
      console.log(`Balance (raw): ${info.balance}`);
      
      if (balanceInMassa < 1.1) {
        console.log();
        console.log('⚠️  WARNING: Balance might be too low!');
        console.log('   You need at least ~1.1 MASSA to buy 1 MASSA worth of tokens');
        console.log('   (1 MASSA for tokens + ~0.1 for gas fees)');
      } else {
        console.log();
        console.log('✅ Balance looks good!');
      }
    } else {
      console.log('❌ Could not fetch address info');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkBalance();
