import 'dotenv/config';
import {
  Account,
  Args,
  Mas,
  JsonRpcProvider,
} from '@massalabs/massa-web3';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Contract Management Utilities
 * - Pause/Unpause contract
 * - Transfer admin
 * - Get contract info
 * - Set version
 */

interface DeploymentInfo {
  address: string;
  version: string;
}

async function getContractAddress(): Promise<string> {
  const deploymentPath = path.join(process.cwd(), 'deployment.json');

  if (fs.existsSync(deploymentPath)) {
    const deployment: DeploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, 'utf-8'));
    return deployment.address;
  }

  // Fallback to .env
  if (process.env.CONTRACT_ADDRESS) {
    return process.env.CONTRACT_ADDRESS;
  }

  throw new Error('Contract address not found. Deploy contract first.');
}

async function pauseContract() {
  console.log('⏸️  Pausing contract...\n');

  const account = await Account.fromEnv();
  const provider = JsonRpcProvider.buildnet(account);
  const contractAddress = await getContractAddress();

  console.log(`Contract: ${contractAddress}`);
  console.log(`Admin: ${account.address()}\n`);

  const result = await account.callSC({
    target: contractAddress,
    func: 'pause',
    parameter: new Args().serialize(),
    coins: 0n,
    fee: Mas.fromString('0.01'),
  });

  console.log('✅ Contract paused successfully!');
  console.log('   Transaction:', result);
}

async function unpauseContract() {
  console.log('▶️  Unpausing contract...\n');

  const account = await Account.fromEnv();
  const provider = JsonRpcProvider.buildnet(account);
  const contractAddress = await getContractAddress();

  console.log(`Contract: ${contractAddress}`);
  console.log(`Admin: ${account.address()}\n`);

  const result = await account.callSC({
    target: contractAddress,
    func: 'unpause',
    parameter: new Args().serialize(),
    coins: 0n,
    fee: Mas.fromString('0.01'),
  });

  console.log('✅ Contract unpaused successfully!');
  console.log('   Transaction:', result);
}

async function getContractInfo() {
  console.log('📊 Fetching contract information...\n');

  const provider = JsonRpcProvider.buildnet();
  const contractAddress = await getContractAddress();

  console.log(`Contract: ${contractAddress}\n`);

  // Get admin
  try {
    await provider.readSC({
      target: contractAddress,
      func: 'getAdmin',
      parameter: new Args().serialize(),
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    const events = await provider.getEvents({
      smartContractAddress: contractAddress,
    });

    console.log('📢 Contract Info:');
    for (const event of events.slice(-3)) {
      console.log(`   ${event.data}`);
    }
  } catch (error) {
    console.error('Error fetching info:', error);
  }
}

async function transferAdmin(newAdmin: string) {
  console.log('👤 Transferring admin rights...\n');

  const account = await Account.fromEnv();
  const contractAddress = await getContractAddress();

  console.log(`Contract: ${contractAddress}`);
  console.log(`Current Admin: ${account.address()}`);
  console.log(`New Admin: ${newAdmin}\n`);

  const args = new Args().addString(newAdmin);

  const result = await account.callSC({
    target: contractAddress,
    func: 'transferAdmin',
    parameter: args.serialize(),
    coins: 0n,
    fee: Mas.fromString('0.01'),
  });

  console.log('✅ Admin transferred successfully!');
  console.log('   Transaction:', result);
}

async function setVersion(version: string) {
  console.log('🔢 Setting contract version...\n');

  const account = await Account.fromEnv();
  const contractAddress = await getContractAddress();

  console.log(`Contract: ${contractAddress}`);
  console.log(`New Version: ${version}\n`);

  const args = new Args().addString(version);

  const result = await account.callSC({
    target: contractAddress,
    func: 'setVersion',
    parameter: args.serialize(),
    coins: 0n,
    fee: Mas.fromString('0.01'),
  });

  console.log('✅ Version updated successfully!');
  console.log('   Transaction:', result);

  // Update local deployment.json
  const deploymentPath = path.join(process.cwd(), 'deployment.json');
  if (fs.existsSync(deploymentPath)) {
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf-8'));
    deployment.version = version;
    fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
    console.log('   Updated deployment.json');
  }
}

// Main command handler
async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'pause':
      await pauseContract();
      break;

    case 'unpause':
      await unpauseContract();
      break;

    case 'info':
      await getContractInfo();
      break;

    case 'transfer-admin':
      const newAdmin = process.argv[3];
      if (!newAdmin) {
        console.error('❌ Error: Please provide new admin address');
        console.log('Usage: npm run manage transfer-admin <address>');
        process.exit(1);
      }
      await transferAdmin(newAdmin);
      break;

    case 'set-version':
      const version = process.argv[3];
      if (!version) {
        console.error('❌ Error: Please provide version string');
        console.log('Usage: npm run manage set-version <version>');
        process.exit(1);
      }
      await setVersion(version);
      break;

    default:
      console.log('📋 Massa Polls Contract Management\n');
      console.log('Available commands:');
      console.log('  npm run manage pause              - Pause the contract');
      console.log('  npm run manage unpause            - Unpause the contract');
      console.log('  npm run manage info               - Get contract information');
      console.log('  npm run manage transfer-admin <addr> - Transfer admin rights');
      console.log('  npm run manage set-version <ver>  - Update contract version\n');
      process.exit(0);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Command failed:', error);
    process.exit(1);
  });