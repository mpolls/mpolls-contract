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
 * Upgrade Strategy for Massa Polls Contract
 *
 * Since Massa doesn't have native delegatecall/proxy patterns like Ethereum,
 * we use a DATA PRESERVATION upgrade strategy:
 *
 * 1. Deploy new contract version with upgraded code
 * 2. Pause the old contract (emergency stop)
 * 3. Admin transfers to new contract
 * 4. Frontend updates to new contract address
 * 5. All storage (polls, votes, projects) remains on old contract but accessible
 *
 * This script automates the deployment of the new version.
 */

interface DeploymentInfo {
  address: string;
  deployer: string;
  deployedAt: string;
  network: string;
  version: string;
  upgradeable: boolean;
  previousVersions?: string[];
}

async function main() {
  console.log('🔄 UPGRADING Massa Polls Contract...\n');

  const account = await Account.fromEnv();
  const provider = JsonRpcProvider.buildnet(account);

  // Load previous deployment info
  const deploymentPath = path.join(process.cwd(), 'deployment.json');
  let previousDeployment: DeploymentInfo | null = null;

  if (fs.existsSync(deploymentPath)) {
    previousDeployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf-8'));
    console.log('📋 Previous Deployment Found:');
    console.log(`   Address: ${previousDeployment.address}`);
    console.log(`   Version: ${previousDeployment.version}`);
    console.log(`   Deployed: ${previousDeployment.deployedAt}\n`);
  } else {
    console.log('⚠️  No previous deployment found. This will be a fresh deployment.\n');
  }

  console.log('📋 Upgrade Configuration:');
  console.log(`   Network: Massa Buildnet`);
  console.log(`   Deployer: ${account.address()}`);

  // Check if deployer is the admin of the old contract
  if (previousDeployment) {
    console.log(`   Previous Contract: ${previousDeployment.address}`);

    // Optionally pause the old contract here
    console.log('\n⚠️  IMPORTANT: Consider pausing the old contract before upgrade');
    console.log('   Run: npm run pause-contract\n');
  }

  // Get new version bytecode
  const byteCode = getScByteCode('build', 'main.wasm');
  console.log(`✅ New contract bytecode loaded (${byteCode.length} bytes)\n`);

  // Deploy new version
  console.log('📤 Deploying upgraded contract to blockchain...');
  const constructorArgs = new Args();

  const newContract = await SmartContract.deploy(
    provider,
    byteCode,
    constructorArgs,
    {
      coins: Mas.fromString('0.1'),
      fee: Mas.fromString('0.01')
    },
  );

  console.log('\n✅ NEW VERSION DEPLOYED SUCCESSFULLY!\n');
  console.log('📍 New Contract Address:', newContract.address);
  console.log('🔗 Explorer:', `https://buildnet-explorer.massa.net/address/${newContract.address}`);

  // Determine new version number
  let newVersion = '1.0.0';
  if (previousDeployment) {
    const versionParts = previousDeployment.version.split('.');
    const major = parseInt(versionParts[0] || '1');
    const minor = parseInt(versionParts[1] || '0');
    newVersion = `${major}.${minor + 1}.0`;
  }

  // Save deployment info
  const previousVersions = previousDeployment?.previousVersions || [];
  if (previousDeployment) {
    previousVersions.push(previousDeployment.address);
  }

  const deploymentInfo: DeploymentInfo = {
    address: newContract.address,
    deployer: account.address(),
    deployedAt: new Date().toISOString(),
    network: 'buildnet',
    version: newVersion,
    upgradeable: true,
    previousVersions
  };

  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved (version ${newVersion})`);

  // Update .env
  const envPath = path.join(process.cwd(), '.env');
  let envContent = '';

  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');

    if (envContent.includes('CONTRACT_ADDRESS=')) {
      envContent = envContent.replace(
        /CONTRACT_ADDRESS=.*/,
        `CONTRACT_ADDRESS=${newContract.address}`
      );
    } else {
      envContent += `\nCONTRACT_ADDRESS=${newContract.address}`;
    }

    // Add previous contract address for reference
    if (previousDeployment && !envContent.includes('PREVIOUS_CONTRACT_ADDRESS=')) {
      envContent += `\nPREVIOUS_CONTRACT_ADDRESS=${previousDeployment.address}`;
    }
  } else {
    envContent = `CONTRACT_ADDRESS=${newContract.address}\n`;
  }

  fs.writeFileSync(envPath, envContent);
  console.log('📝 .env file updated\n');

  // Wait for events
  console.log('⏳ Waiting for deployment events...\n');
  await new Promise(resolve => setTimeout(resolve, 5000));

  const events = await provider.getEvents({
    smartContractAddress: newContract.address,
  });

  if (events.length > 0) {
    console.log('📢 Deployment Events:');
    for (const event of events) {
      console.log(`   - ${event.data}`);
    }
  }

  console.log('\n✨ Upgrade Deployment Complete!\n');
  console.log('📋 Post-Upgrade Checklist:');
  console.log('   ✓ New contract deployed:', newContract.address);
  console.log(`   ✓ Version: ${newVersion}`);

  if (previousDeployment) {
    console.log(`   ⚠️  Old contract: ${previousDeployment.address} (still accessible)`);
    console.log('   ⚠️  Consider pausing the old contract: npm run pause-contract');
  }

  console.log('\n   📱 Update Frontend:');
  console.log('      1. Update ../mpolls-dapp/.env with new CONTRACT_ADDRESS');
  console.log(`      2. New address: ${newContract.address}`);
  console.log('      3. Test all functionality on new contract');

  console.log('\n   📊 Data Access:');
  console.log('      - New contract starts fresh (no old polls/projects)');
  console.log('      - Old data remains accessible on previous contract');
  console.log('      - Consider implementing data migration if needed\n');

  // Save upgrade history
  const historyPath = path.join(process.cwd(), 'upgrade-history.json');
  let history: any[] = [];

  if (fs.existsSync(historyPath)) {
    history = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
  }

  history.push({
    from: previousDeployment?.address || 'initial',
    to: newContract.address,
    version: newVersion,
    timestamp: new Date().toISOString(),
    deployer: account.address()
  });

  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
  console.log('📚 Upgrade history saved to upgrade-history.json\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Upgrade failed:', error);
    process.exit(1);
  });