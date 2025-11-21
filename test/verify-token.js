#!/usr/bin/env node

import 'dotenv/config';
import {
  Account,
  Args,
  JsonRpcProvider,
} from '@massalabs/massa-web3';

const TOKEN_CONTRACT_ADDRESS = process.env.TOKEN_CONTRACT_ADDRESS || 'AS12u3neY6CN9AtAvtaNBz74sHHfvpma5kWFXvikhuAv2Tmse7RA8';

async function verifyToken() {
  console.log('🔍 Verifying Token Contract...');
  console.log('═══════════════════════════════════════════════');
  console.log(`📍 Token Contract: ${TOKEN_CONTRACT_ADDRESS}`);
  console.log();

  try {
    const account = await Account.fromPrivateKey(process.env.PRIVATE_KEY);
    const provider = JsonRpcProvider.buildnet(account);

    // Call totalSupply
    console.log('📊 Calling totalSupply()...');
    await provider.readSC({
      target: TOKEN_CONTRACT_ADDRESS,
      func: 'totalSupply',
      parameter: new Args().serialize(),
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Get all events
    console.log('📋 Fetching events...');
    const events = await provider.getEvents({
      smartContractAddress: TOKEN_CONTRACT_ADDRESS,
    });

    console.log(`📊 Total events: ${events.length}`);
    console.log();
    console.log('📋 All events:');
    events.forEach((event, index) => {
      console.log(`   ${index + 1}. ${event.data}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

verifyToken();
