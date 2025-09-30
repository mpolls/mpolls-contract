import 'dotenv/config';
import { Account, JsonRpcProvider } from '@massalabs/massa-web3';

console.log('💰 Checking Account Balance...\n');

const account = await Account.fromEnv();
const provider = JsonRpcProvider.buildnet();

console.log(`📍 Address: ${account.address}`);

try {
  const addressInfo = await provider.getAddresses([account.address]);

  console.log('\n📊 Balance Information:');

  if (addressInfo && addressInfo.length > 0) {
    const info = addressInfo[0];

    console.log('   Final Balance:', info.final_balance);
    console.log('   Candidate Balance:', info.candidate_balance);

    // Parse balance (format might be in nanoMAS)
    const finalBalance = parseFloat(info.final_balance);
    const candidateBalance = parseFloat(info.candidate_balance);

    console.log('\n💵 Balance Details:');
    console.log(`   Final: ${finalBalance} MAS`);
    console.log(`   Candidate: ${candidateBalance} MAS`);

    console.log('\n📝 Notes:');
    console.log('   - Final balance: Confirmed/finalized tokens');
    console.log('   - Candidate balance: Pending/unconfirmed tokens');
    console.log('   - You need at least 0.1-0.2 MAS for deployment');

    if (finalBalance < 0.1) {
      console.log('\n⚠️  Balance is LOW! You may need more tokens for deployment.');
      console.log('   Request tokens: !faucet AU1Pd3bod1Js2xD71GLFd1Q1dA8tnugsHroL54Rn7SzYY5KiozfS');
    } else {
      console.log('\n✅ Balance looks sufficient for deployment!');
    }
  } else {
    console.log('⚠️  Could not retrieve balance information');
  }

} catch (error) {
  console.error('Error checking balance:', error);
}