import 'dotenv/config';
import { Account } from '@massalabs/massa-web3';

console.log('🔍 Testing Account Retrieval Consistency\n');

// Show what's in .env
console.log('📄 Private Key from .env:', process.env.PRIVATE_KEY);
console.log();

// Get account multiple times
console.log('🔐 Testing Account.fromEnv() consistency...\n');

for (let i = 1; i <= 3; i++) {
  const account = await Account.fromEnv();
  console.log(`Test ${i}:`);
  console.log(`   Address: ${account.address}`);
  console.log();
}

console.log('✅ Account address should be the SAME every time for the same private key.');
console.log('✅ The address is derived from the private key, so it never changes.');
console.log();
console.log('💡 Different addresses you might see:');
console.log('   AU... = Wallet/User address (from private key)');
console.log('   AS... = Smart contract address (derived during deployment)');