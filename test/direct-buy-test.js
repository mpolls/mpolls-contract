#!/usr/bin/env node

import 'dotenv/config';
import {
  Account,
  Args,
  Mas,
  JsonRpcProvider,
} from '@massalabs/massa-web3';

const TOKEN_CONTRACT_ADDRESS = 'AS12u3neY6CN9AtAvtaNBz74sHHfvpma5kWFXvikhuAv2Tmse7RA8';

// Use a DIFFERENT private key for testing
// This simulates a "new" wallet
const TEST_KEY = 'S1mK6EE97sVmYH49TKbRforce7Y6VUvP38zzy47oKMPbcg4YmuH';  

async function directBuyTest() {
  console.log('🧪 Testing direct buy from NEW wallet...');
  console.log('═══════════════════════════════════════════════');

  try {
    const account = await Account.fromPrivateKey(TEST_KEY);
    const provider = JsonRpcProvider.buildnet(account);
    
    console.log(`📍 Test wallet: ${account.address}`);
    console.log(`🪙 Token Contract: ${TOKEN_CONTRACT_ADDRESS}`);
    console.log();

    // Buy 1 MASSA worth of tokens
    console.log('💰 Attempting to buy tokens with 1 MASSA...');
    
    try {
      const result = await provider.callSC({
        target: TOKEN_CONTRACT_ADDRESS,
        func: 'buyTokens',
        parameter: new Args().serialize(),
        coins: Mas.fromString('1'),
        fee: Mas.fromString('0.01'),
        maxGas: BigInt(3000000000),
      });

      console.log(`✅ Purchase successful!`);
      console.log(`   Operation ID: ${result.id}`);
      
      // Wait for confirmation
      await new Promise(resolve => setTimeout(resolve, 8000));
      
      // Check events
      const events = await provider.getEvents({
        smartContractAddress: TOKEN_CONTRACT_ADDRESS,
      });
      
      const recentEvents = events.slice(-5);
      console.log();
      console.log('📋 Recent events:');
      recentEvents.forEach((event, i) => {
        console.log(`   ${i + 1}. ${event.data}`);
      });
      
    } catch (txError) {
      console.error('❌ Transaction failed:', txError.message);
      if (txError.stack) {
        console.error('Stack:', txError.stack.split('\n').slice(0, 5).join('\n'));
      }
    }

  } catch (error) {
    console.error('❌ Setup error:', error.message);
  }
}

directBuyTest();
