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
 * Proxy Upgrade Script
 *
 * This script:
 * 1. Deploys a new implementation contract
 * 2. Calls upgradeTo() on the proxy to point to the new implementation
 * 3. The proxy address stays the same - no frontend changes needed!
 */

interface ProxyDeploymentInfo {
  proxyAddress: string;
  implementationAddress: string;
  deployer: string;
  deployedAt: string;
  network: string;
  version: string;
  previousImplementations?: string[];
}

async function main() {
  console.log('🔄 UPGRADING Massa Polls Implementation...\n');

  const account = await Account.fromEnv();
  const provider = JsonRpcProvider.buildnet(account);

  // Load previous deployment info
  const deploymentPath = path.join(process.cwd(), 'proxy-deployment.json');

  if (!fs.existsSync(deploymentPath)) {
    console.error('❌ No proxy deployment found!');
    console.error('   Run "npm run deploy:proxy" first to deploy the proxy.\n');
    process.exit(1);
  }

  const previousDeployment: ProxyDeploymentInfo = JSON.parse(
    fs.readFileSync(deploymentPath, 'utf-8')
  );

  console.log('📋 Current Deployment:');
  console.log(`   Proxy: ${previousDeployment.proxyAddress}`);
  console.log(`   Implementation: ${previousDeployment.implementationAddress}`);
  console.log(`   Version: ${previousDeployment.version}\n`);

  console.log('📋 Upgrade Configuration:');
  console.log(`   Network: Massa Buildnet`);
  console.log(`   Deployer: ${account.address}\n`);

  // Step 1: Deploy new implementation
  console.log('📦 Step 1: Deploying New Implementation...');
  const implementationByteCode = getScByteCode('build', 'main.wasm');
  console.log(`   Bytecode loaded: ${implementationByteCode.length} bytes`);

  const implementationArgs = new Args();
  const newImplementation = await SmartContract.deploy(
    provider,
    implementationByteCode,
    implementationArgs,
    {
      coins: Mas.fromString('0.1'),
      fee: Mas.fromString('0.01')
    },
  );

  console.log('✅ New implementation deployed!');
  console.log(`   Address: ${newImplementation.address}\n`);

  // Wait for implementation to be ready
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Step 2: Upgrade proxy to point to new implementation
  console.log('🔄 Step 2: Upgrading Proxy...');

  const proxy = new SmartContract(provider, previousDeployment.proxyAddress);
  const upgradeArgs = new Args().addString(newImplementation.address);

  try {
    await proxy.call(
      'upgradeTo',
      upgradeArgs,
      {
        coins: Mas.fromString('0'),
        fee: Mas.fromString('0.01')
      }
    );

    console.log('✅ Proxy upgraded successfully!\n');
  } catch (error) {
    console.error('❌ Failed to upgrade proxy:', error);
    console.error('\nMake sure you are the proxy admin!\n');
    process.exit(1);
  }

  // Determine new version number
  const versionParts = previousDeployment.version.split('.');
  const major = parseInt(versionParts[0] || '1');
  const minor = parseInt(versionParts[1] || '0');
  const newVersion = `${major}.${minor + 1}.0`;

  // Update deployment info
  const previousImplementations = previousDeployment.previousImplementations || [];
  previousImplementations.push(previousDeployment.implementationAddress);

  const updatedDeployment: ProxyDeploymentInfo = {
    ...previousDeployment,
    implementationAddress: newImplementation.address,
    version: newVersion,
    previousImplementations,
    deployedAt: new Date().toISOString()
  };

  fs.writeFileSync(deploymentPath, JSON.stringify(updatedDeployment, null, 2));
  console.log(`💾 Deployment info updated (version ${newVersion})\n`);

  // Wait for events
  console.log('⏳ Waiting for upgrade events...\n');
  await new Promise(resolve => setTimeout(resolve, 5000));

  const proxyEvents = await provider.getEvents({
    smartContractAddress: previousDeployment.proxyAddress,
  });

  const implementationEvents = await provider.getEvents({
    smartContractAddress: newImplementation.address,
  });

  if (proxyEvents.length > 0) {
    console.log('📢 Proxy Events:');
    for (const event of proxyEvents) {
      console.log(`   - ${event.data}`);
    }
    console.log();
  }

  if (implementationEvents.length > 0) {
    console.log('📢 New Implementation Events:');
    for (const event of implementationEvents) {
      console.log(`   - ${event.data}`);
    }
    console.log();
  }

  console.log('✨ Upgrade Complete!\n');
  console.log('📋 Upgrade Summary:');
  console.log(`   🔷 Proxy Address: ${previousDeployment.proxyAddress}`);
  console.log(`      (UNCHANGED - no frontend update needed!)`);
  console.log(`   🔷 Old Implementation: ${previousDeployment.implementationAddress}`);
  console.log(`   🔷 New Implementation: ${newImplementation.address}`);
  console.log(`   🔷 Version: ${previousDeployment.version} → ${newVersion}\n`);
  console.log('🔗 Explorer Links:');
  console.log(`   Proxy: https://buildnet-explorer.massa.net/address/${previousDeployment.proxyAddress}`);
  console.log(`   New Implementation: https://buildnet-explorer.massa.net/address/${newImplementation.address}\n`);
  console.log('✅ No frontend changes needed!');
  console.log('   Your frontend is still using: ' + previousDeployment.proxyAddress);
  console.log('   The proxy now forwards calls to the new implementation.\n');

  // Save upgrade history
  const historyPath = path.join(process.cwd(), 'upgrade-history.json');
  let history: any[] = [];

  if (fs.existsSync(historyPath)) {
    history = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
  }

  history.push({
    proxyAddress: previousDeployment.proxyAddress,
    oldImplementation: previousDeployment.implementationAddress,
    newImplementation: newImplementation.address,
    version: newVersion,
    timestamp: new Date().toISOString(),
    deployer: account.address
  });

  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
  console.log('📚 Upgrade history saved\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Upgrade failed:', error);
    process.exit(1);
  });