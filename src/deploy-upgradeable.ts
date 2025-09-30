import 'dotenv/config';
import {
  Account,
  Args,
  Mas,
  SmartContract,
  JsonRpcProvider,
} from '@massalabs/massa-web3';
import { getScByteCode } from './utils';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Deploy the upgradeable polls contract
 * This script deploys the contract and saves the address for future upgrades
 */

async function main() {
  console.log('🚀 Deploying Upgradeable Massa Polls Contract...\n');

  const account = await Account.fromEnv();
  const provider = JsonRpcProvider.buildnet(account);

  console.log('📋 Deployment Configuration:');
  console.log(`   Network: Massa Buildnet`);
  console.log(`   Deployer: ${account.address()}`);
  console.log(`   Balance: Checking...\n`);

  // Get bytecode
  const byteCode = getScByteCode('build', 'main.wasm');
  console.log(`✅ Contract bytecode loaded (${byteCode.length} bytes)\n`);

  // Deploy contract with empty constructor args
  console.log('📤 Deploying contract to blockchain...');
  const constructorArgs = new Args();

  const contract = await SmartContract.deploy(
    provider,
    byteCode,
    constructorArgs,
    {
      coins: Mas.fromString('0.1'), // Fund contract with initial balance
      fee: Mas.fromString('0.01')
    },
  );

  console.log('\n✅ CONTRACT DEPLOYED SUCCESSFULLY!\n');
  console.log('📍 Contract Address:', contract.address);
  console.log('🔗 Explorer:', `https://buildnet-explorer.massa.net/address/${contract.address}`);

  // Save contract address to file
  const deploymentInfo = {
    address: contract.address,
    deployer: account.address(),
    deployedAt: new Date().toISOString(),
    network: 'buildnet',
    version: '1.0.0',
    upgradeable: true
  };

  const deploymentPath = path.join(process.cwd(), 'deployment.json');
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log('\n💾 Deployment info saved to:', deploymentPath);

  // Update .env file with new contract address
  const envPath = path.join(process.cwd(), '.env');
  let envContent = '';

  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');

    // Update or add CONTRACT_ADDRESS
    if (envContent.includes('CONTRACT_ADDRESS=')) {
      envContent = envContent.replace(
        /CONTRACT_ADDRESS=.*/,
        `CONTRACT_ADDRESS=${contract.address}`
      );
    } else {
      envContent += `\nCONTRACT_ADDRESS=${contract.address}`;
    }
  } else {
    envContent = `CONTRACT_ADDRESS=${contract.address}\n`;
  }

  fs.writeFileSync(envPath, envContent);
  console.log('📝 .env file updated with new contract address\n');

  // Wait for events
  console.log('⏳ Waiting for deployment events...\n');
  await new Promise(resolve => setTimeout(resolve, 5000));

  const events = await provider.getEvents({
    smartContractAddress: contract.address,
  });

  if (events.length > 0) {
    console.log('📢 Deployment Events:');
    for (const event of events) {
      console.log(`   - ${event.data}`);
    }
  }

  console.log('\n✨ Deployment Complete!\n');
  console.log('📋 Next Steps:');
  console.log('   1. Update your frontend .env with the new contract address');
  console.log('   2. Verify the contract admin address');
  console.log('   3. Test basic functionality (create poll, vote, create project)');
  console.log('   4. For future upgrades, use: npm run upgrade\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  });