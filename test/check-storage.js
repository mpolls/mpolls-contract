#!/usr/bin/env node

import 'dotenv/config';
import {
  Account,
  Args,
  JsonRpcProvider,
} from '@massalabs/massa-web3';

const TOKEN_CONTRACT_ADDRESS = 'AS12u3neY6CN9AtAvtaNBz74sHHfvpma5kWFXvikhuAv2Tmse7RA8';

async function checkStorage() {
  console.log('🔍 Checking contract storage...');
  console.log('═══════════════════════════════════════════════');

  try {
    const account = await Account.fromPrivateKey(process.env.PRIVATE_KEY);
    const provider = JsonRpcProvider.buildnet(account);
    
    // Try to call totalSupply to see what it returns
    console.log('Calling totalSupply()...');
    try {
      const result = await provider.readSC({
        target: TOKEN_CONTRACT_ADDRESS,
        func: 'totalSupply',
        parameter: new Args().serialize(),
      });
      console.log('Result:', result);
    } catch (e) {
      console.log('Error calling totalSupply:', e.message);
    }
    
    console.log();
    console.log('Calling buyTokens with 0.01 MASSA...');
    try {
      // This will fail but show us the error
      const result = await provider.readSC({
        target: TOKEN_CONTRACT_ADDRESS,
        func: 'buyTokens',
        parameter: new Args().serialize(),
        coins: BigInt(10000000), // 0.01 MASSA in nanoMASSA
      });
      console.log('Result:', result);
    } catch (e) {
      console.log('Error:', e.message);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkStorage();
