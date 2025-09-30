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
 * Proxy Pattern Deployment for Massa Polls
 *
 * This script deploys:
 * 1. Implementation contract (main.wasm) - contains the actual logic
 * 2. Proxy contract (proxy.wasm) - forwards calls to implementation
 *
 * The proxy address remains constant across upgrades.
 * Only the implementation address changes when upgrading.
 */

interface ProxyDeploymentInfo {
  proxyAddress: string;
  implementationAddress: string;
  deployer: string;
  deployedAt: string;
  network: string;
  version: string;
}

async function main() {
  console.log('🚀 DEPLOYING Massa Polls with Proxy Pattern...\n');

  const account = await Account.fromEnv();
  const provider = JsonRpcProvider.buildnet(account);

  console.log('📋 Deployment Configuration:');
  console.log(`   Network: Massa Buildnet`);
  console.log(`   Deployer: ${account.address}\n`);

  // Step 1: Deploy Implementation Contract
  console.log('📦 Step 1: Deploying Implementation Contract...');
  const implementationByteCode = getScByteCode('build', 'main.wasm');
  console.log(`   Bytecode loaded: ${implementationByteCode.length} bytes`);

  const implementationArgs = new Args();
  const implementationContract = await SmartContract.deploy(
    provider,
    implementationByteCode,
    implementationArgs,
    {
      coins: Mas.fromString('0.1'),
      fee: Mas.fromString('0.01')
    },
  );

  console.log('✅ Implementation deployed!');
  console.log(`   Address: ${implementationContract.address}\n`);

  // Wait a bit for the implementation to be ready
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Step 2: Deploy Proxy Contract
  console.log('📦 Step 2: Deploying Proxy Contract...');
  const proxyByteCode = getScByteCode('build', 'proxy.wasm');
  console.log(`   Bytecode loaded: ${proxyByteCode.length} bytes`);

  // Proxy constructor needs the implementation address
  const proxyArgs = new Args().addString(implementationContract.address);

  const proxyContract = await SmartContract.deploy(
    provider,
    proxyByteCode,
    proxyArgs,
    {
      coins: Mas.fromString('0.1'),
      fee: Mas.fromString('0.01')
    },
  );

  console.log('✅ Proxy deployed!');
  console.log(`   Address: ${proxyContract.address}\n`);

  // Save deployment info
  const deploymentInfo: ProxyDeploymentInfo = {
    proxyAddress: proxyContract.address,
    implementationAddress: implementationContract.address,
    deployer: account.address,
    deployedAt: new Date().toISOString(),
    network: 'buildnet',
    version: '1.0.0'
  };

  const deploymentPath = path.join(process.cwd(), 'proxy-deployment.json');
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log('💾 Deployment info saved to proxy-deployment.json\n');

  // Update .env with proxy address
  const envPath = path.join(process.cwd(), '.env');
  let envContent = '';

  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');

    if (envContent.includes('CONTRACT_ADDRESS=')) {
      envContent = envContent.replace(
        /CONTRACT_ADDRESS=.*/,
        `CONTRACT_ADDRESS=${proxyContract.address}`
      );
    } else {
      envContent += `\nCONTRACT_ADDRESS=${proxyContract.address}`;
    }
  } else {
    envContent = `CONTRACT_ADDRESS=${proxyContract.address}\n`;
  }

  fs.writeFileSync(envPath, envContent);
  console.log('📝 .env file updated with proxy address\n');

  // Wait for events
  console.log('⏳ Waiting for deployment events...\n');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Get events from both contracts
  const proxyEvents = await provider.getEvents({
    smartContractAddress: proxyContract.address,
  });

  const implementationEvents = await provider.getEvents({
    smartContractAddress: implementationContract.address,
  });

  if (proxyEvents.length > 0) {
    console.log('📢 Proxy Events:');
    for (const event of proxyEvents) {
      console.log(`   - ${event.data}`);
    }
    console.log();
  }

  if (implementationEvents.length > 0) {
    console.log('📢 Implementation Events:');
    for (const event of implementationEvents) {
      console.log(`   - ${event.data}`);
    }
    console.log();
  }

  console.log('✨ Proxy Deployment Complete!\n');
  console.log('📋 Deployment Summary:');
  console.log(`   🔷 Proxy Address: ${proxyContract.address}`);
  console.log(`      (This is the address you use in your frontend)`);
  console.log(`   🔷 Implementation: ${implementationContract.address}`);
  console.log(`      (This changes on upgrades)\n`);
  console.log('🔗 Explorer Links:');
  console.log(`   Proxy: https://buildnet-explorer.massa.net/address/${proxyContract.address}`);
  console.log(`   Implementation: https://buildnet-explorer.massa.net/address/${implementationContract.address}\n`);
  console.log('📱 Next Steps:');
  console.log('   1. Update your frontend .env with the proxy address:');
  console.log(`      CONTRACT_ADDRESS=${proxyContract.address}`);
  console.log('   2. Test all functionality through the proxy');
  console.log('   3. For upgrades, use: npm run upgrade-proxy\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  });