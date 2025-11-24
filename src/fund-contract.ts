import 'dotenv/config';
import {
  Account,
  Mas,
  JsonRpcProvider,
} from '@massalabs/massa-web3';

const account = await Account.fromEnv();
const provider = JsonRpcProvider.buildnet(account);

// Get contract address from command line argument or use default
const contractAddress = process.argv[2] || process.env.VITE_POLLS_CONTRACT_ADDRESS;

if (!contractAddress) {
  console.error('Please provide contract address as argument or set VITE_POLLS_CONTRACT_ADDRESS in .env');
  process.exit(1);
}

console.log('Funding contract...');
console.log(`From account: ${account.address}`);
console.log(`To contract: ${contractAddress}`);

const amount = Mas.fromString('10'); // Fund with 10 MASSA

try {
  const txId = await provider.sendTransaction({
    amount,
    recipientAddress: contractAddress,
    fee: Mas.fromString('0.01'),
  });

  console.log(`✅ Sent ${amount} MASSA to contract`);
  console.log(`Transaction ID: ${txId}`);
  console.log('Waiting for confirmation...');

  // Wait a bit for the transaction to be processed
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Check contract balance
  const balanceInfo = await provider.getAccountBalance(contractAddress);
  console.log(`Contract balance: ${balanceInfo.final} nanoMassa (${Mas.fromString(balanceInfo.final.toString(), 9)} MASSA)`);
} catch (error) {
  console.error('Error funding contract:', error);
  process.exit(1);
}
