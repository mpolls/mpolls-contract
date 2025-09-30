import 'dotenv/config';
import { Account } from '@massalabs/massa-web3';

const account = await Account.fromEnv();

console.log('📋 Account Information:');
console.log('   Address:', account.address);
console.log('   Public Key:', account.publicKey);
console.log('\n💰 To fund this account, visit:');
console.log('   https://discord.com/channels/828270821042159647/866190913030193172');
console.log('   Or use: https://faucet.buildnet.massa.net/');
console.log('\n📝 In Discord, send:');
console.log(`   !faucet ${account.address}`);