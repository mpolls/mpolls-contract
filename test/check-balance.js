#!/usr/bin/env node

import 'dotenv/config';
import {
  JsonRpcProvider,
} from '@massalabs/massa-web3';

const TOKEN_CONTRACT_ADDRESS = 'AS12u3neY6CN9AtAvtaNBz74sHHfvpma5kWFXvikhuAv2Tmse7RA8';

async function checkBalance() {
  console.log('🔍 Checking all token balances from events...');
  console.log('═══════════════════════════════════════════════');

  try {
    const provider = JsonRpcProvider.buildnet();
    
    const events = await provider.getEvents({
      smartContractAddress: TOKEN_CONTRACT_ADDRESS,
    });

    console.log(`📋 Total events: ${events.length}`);
    console.log();
    
    // Parse all events to calculate balances per address
    const balances = new Map();
    
    // Initial supply
    events.forEach(event => {
      if (event.data.includes('Initial supply allocated to:')) {
        const match = event.data.match(/Initial supply allocated to: (\S+)/);
        if (match) {
          const address = match[1];
          balances.set(address, BigInt('1000000000000000000'));
          console.log(`📊 Initial supply: ${address} -> 1,000,000,000 MPOLLS`);
        }
      }
    });
    
    // Buy events
    events.forEach(event => {
      if (event.data.includes('bought') && event.data.includes('MPOLLS tokens')) {
        const addressMatch = event.data.match(/^(\S+) bought/);
        const amountMatch = event.data.match(/bought (\d+) MPOLLS tokens/);
        
        if (addressMatch && amountMatch) {
          const address = addressMatch[1];
          const amount = BigInt(amountMatch[1]) * BigInt(1000000000);
          
          const currentBalance = balances.get(address) || BigInt(0);
          balances.set(address, currentBalance + amount);
          
          console.log(`💰 Buy: ${address} -> +${amountMatch[1]} MPOLLS`);
        }
      }
    });
    
    console.log();
    console.log('═══════════════════════════════════════════════');
    console.log('📊 Final Balances:');
    console.log('═══════════════════════════════════════════════');
    
    balances.forEach((balance, address) => {
      const formatted = (Number(balance) / 1e9).toFixed(9);
      console.log(`${address}: ${formatted} MPOLLS`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkBalance();
