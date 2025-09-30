import 'dotenv/config';
import { Account, JsonRpcProvider, Mas } from '@massalabs/massa-web3';

console.log('💰 Checking Account Balance...\n');

const account = await Account.fromEnv();
const provider = JsonRpcProvider.buildnet(account);

console.log(`📍 Address: ${account.address}`);

try {
  // Use the balance method on the account
  const balance = await account.balance();

  console.log('\n📊 Balance Information:');
  console.log('   Final Balance:', balance.final);
  console.log('   Candidate Balance:', balance.candidate);

  // Convert to MAS from nanoMAS
  const finalMas = Mas.fromString(balance.final.toString());
  const candidateMas = Mas.fromString(balance.candidate.toString());

  console.log('\n💵 Balance in MAS:');
  console.log(`   Final: ${finalMas} MAS`);
  console.log(`   Candidate: ${candidateMas} MAS`);

  console.log('\n📝 Notes:');
  console.log('   - Final balance: Confirmed/finalized tokens');
  console.log('   - Candidate balance: Pending/unconfirmed tokens');
  console.log('   - You need at least 0.1 MAS for deployment');

  const finalValue = parseFloat(balance.final.toString());
  const minRequired = 100000000; // 0.1 MAS in nanoMAS

  if (finalValue < minRequired) {
    console.log('\n⚠️  Balance might be LOW for deployment!');
    console.log(`   You have: ${finalValue} nanoMAS`);
    console.log(`   Recommended: ${minRequired} nanoMAS (0.1 MAS)`);
  } else {
    console.log('\n✅ Balance looks sufficient for deployment!');
  }

} catch (error: any) {
  console.error('Error checking balance:', error.message);

  // Alternative: Check via explorer API
  console.log('\n🔍 Trying alternative method...');
  console.log(`   Check balance manually at:`);
  console.log(`   https://buildnet-explorer.massa.net/address/${account.address}`);
}