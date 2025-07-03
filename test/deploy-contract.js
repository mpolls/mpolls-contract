#!/usr/bin/env node

// Deploy the Massa polls contract from the dapp directory
import 'dotenv/config';
import {
  Account,
  Args,
  Mas,
  SmartContract,
  JsonRpcProvider,
} from '@massalabs/massa-web3';
import fs from 'fs';
import path from 'path';

async function deployContract() {
  console.log('🚀 Deploying Massa Polls Contract...');
  console.log('════════════════════════════════════════');

  try {
    // Create account from private key
    const account = await Account.fromPrivateKey(process.env.PRIVATE_KEY);
    console.log(`📍 Deploying from account: ${account.address}`);

    // Connect to buildnet
    const provider = JsonRpcProvider.buildnet(account);
    console.log('🌐 Connected to Massa buildnet');

    // Get contract bytecode
    const contractPath = '../mpolls-contract/build/main.wasm';
    const fullPath = path.resolve(contractPath);
    
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Contract bytecode not found at ${fullPath}. Please build the contract first with: npm run build in mpolls-contract directory`);
    }

    const byteCode = fs.readFileSync(fullPath);
    console.log(`📦 Loaded contract bytecode (${byteCode.length} bytes)`);

    // Prepare constructor arguments (empty for this contract)
    const constructorArgs = new Args();

    console.log('⏳ Deploying contract to blockchain...');

    // Deploy the contract
    const contract = await SmartContract.deploy(
      provider,
      byteCode,
      constructorArgs,
      { 
        coins: Mas.fromString('0.01'),
        fee: Mas.fromString('0.01')
      },
    );

    console.log('✅ Contract deployed successfully!');
    console.log('════════════════════════════════════════');
    console.log(`📍 Contract Address: ${contract.address}`);
    console.log('════════════════════════════════════════');

    // Wait a bit for the transaction to be included
    console.log('⏳ Waiting for deployment confirmation...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check for deployment events
    try {
      const events = await provider.getEvents({
        smartContractAddress: contract.address,
      });

      if (events && events.length > 0) {
        console.log('📋 Contract Events:');
        events.forEach((event, index) => {
          console.log(`   ${index + 1}. ${event.data}`);
        });
      } else {
        console.log('ℹ️  No events found yet (contract may still be processing)');
      }
    } catch (eventError) {
      console.log('⚠️  Could not fetch events:', eventError.message);
    }

    // Update the dapp with the new contract address
    console.log('\n🔧 Updating dapp configuration...');
    
    const contractInteractionPath = './src/utils/contractInteraction.ts';
    let contractCode = fs.readFileSync(contractInteractionPath, 'utf8');
    
    // Replace the old contract address with the new one
    const oldAddress = 'AS12jYTN2iddXPrUruw65M7imA9nfDaGozXGjtPoi5b456EzegSSa';
    contractCode = contractCode.replace(oldAddress, contract.address);
    
    fs.writeFileSync(contractInteractionPath, contractCode);
    console.log('✅ Updated contract address in dapp');

    // Create/update a .env file with the contract address
    const envContent = `# Massa Polls Contract Configuration
MASSA_POLLS_CONTRACT_ADDRESS=${contract.address}
MASSA_NETWORK=buildnet
`;
    
    fs.writeFileSync('.env.local', envContent);
    console.log('✅ Created .env.local with contract address');

    console.log('\n🎉 Deployment Complete!');
    console.log('════════════════════════════════════════');
    console.log('📋 Next Steps:');
    console.log('   1. Start your dapp: npm run dev');
    console.log('   2. Connect your wallet (MassaStation or Bearby)');
    console.log('   3. Try creating a poll to test the deployment');
    console.log('   4. View on explorer: https://buildnet-explorer.massa.net/address/' + contract.address);
    console.log('════════════════════════════════════════');

    return contract.address;

  } catch (error) {
    console.error('💥 Deployment failed:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Make sure the contract is built: cd ../mpolls-contract && npm run build');
    console.log('   2. Check that you have enough MASSA for deployment');
    console.log('   3. Verify network connectivity to buildnet');
    process.exit(1);
  }
}

// Run deployment if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  deployContract()
    .then(address => {
      console.log(`\n✨ Contract successfully deployed at: ${address}`);
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { deployContract };