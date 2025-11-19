#!/usr/bin/env node

// Deploy a fresh Massa polls contract - always deploys new contract and updates .env
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

async function deployFreshContract() {
  console.log('🚀 Deploying Fresh Massa Polls Contract...');
  console.log('══════════════════════════════════════════════');

  try {
    // Validate required environment variables
    if (!process.env.PRIVATE_KEY) {
      throw new Error('PRIVATE_KEY not found in .env file');
    }

    // Create account from private key
    const account = await Account.fromPrivateKey(process.env.PRIVATE_KEY);
    console.log(`📍 Deploying from account: ${account.address}`);

    // Connect to buildnet
    const provider = JsonRpcProvider.buildnet(account);
    console.log('🌐 Connected to Massa buildnet');

    // Get contract bytecode
    const contractPath = './build/main.wasm';
    const fullPath = path.resolve(contractPath);
    
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Contract bytecode not found at ${fullPath}. Please build the contract first with: npm run build`);
    }

    const byteCode = fs.readFileSync(fullPath);
    console.log(`📦 Loaded contract bytecode (${byteCode.length} bytes)`);

    // Show previous contract address if exists
    if (process.env.CONTRACT_ADDRESS) {
      console.log(`📋 Previous contract: ${process.env.CONTRACT_ADDRESS}`);
      console.log('🔄 Deploying new contract (old one will remain on chain)');
    }

    // Prepare constructor arguments (empty for this contract)
    const constructorArgs = new Args();

    console.log('⏳ Deploying fresh contract to blockchain...');
    const deployStartTime = Date.now();

    // Deploy the contract
    const contract = await SmartContract.deploy(
      provider,
      byteCode,
      constructorArgs,
      {
        coins: Mas.fromString('0.1'), // Increased for storage costs
        fee: Mas.fromString('0.01')
      },
    );

    const deployTime = Date.now() - deployStartTime;
    console.log('✅ Contract deployed successfully!');
    console.log('══════════════════════════════════════════════');
    console.log(`📍 New Contract Address: ${contract.address}`);
    console.log(`⏱️  Deployment Time: ${deployTime}ms`);
    console.log('══════════════════════════════════════════════');

    // Wait for deployment confirmation
    console.log('⏳ Waiting for deployment confirmation...');
    await new Promise(resolve => setTimeout(resolve, 8000));

    // Check for deployment events
    console.log('📋 Checking deployment events...');
    try {
      const events = await provider.getEvents({
        smartContractAddress: contract.address,
      });

      if (events && events.length > 0) {
        console.log(`✅ Found ${events.length} contract events:`);
        events.forEach((event, index) => {
          console.log(`   ${index + 1}. ${event.data}`);
        });
      } else {
        console.log('⚠️  No events found yet (contract may still be processing)');
      }
    } catch (eventError) {
      console.log('⚠️  Could not fetch events:', eventError.message);
    }

    // Update .env file with the new contract address
    console.log('\\n🔧 Updating .env file with new contract address...');
    
    const envPath = './.env';
    let envContent = '';
    
    // Read existing .env if it exists
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Update or add CONTRACT_ADDRESS
    const contractAddressRegex = /^CONTRACT_ADDRESS=.*$/m;
    const newContractLine = `CONTRACT_ADDRESS="${contract.address}"`;
    
    if (contractAddressRegex.test(envContent)) {
      // Replace existing CONTRACT_ADDRESS
      envContent = envContent.replace(contractAddressRegex, newContractLine);
      console.log('✅ Updated existing CONTRACT_ADDRESS in .env');
    } else {
      // Add new CONTRACT_ADDRESS
      if (envContent && !envContent.endsWith('\\n')) {
        envContent += '\\n';
      }
      envContent += newContractLine + '\\n';
      console.log('✅ Added CONTRACT_ADDRESS to .env');
    }
    
    fs.writeFileSync(envPath, envContent);

    // Create deployment log
    const deploymentInfo = {
      address: contract.address,
      deployedAt: new Date().toISOString(),
      deployedBy: account.address,
      network: 'buildnet',
      deploymentTimeMs: deployTime
    };
    
    const logPath = './deployment-log.json';
    let deploymentLog = [];
    
    if (fs.existsSync(logPath)) {
      deploymentLog = JSON.parse(fs.readFileSync(logPath, 'utf8'));
    }
    
    deploymentLog.push(deploymentInfo);
    fs.writeFileSync(logPath, JSON.stringify(deploymentLog, null, 2));
    console.log('✅ Added deployment info to deployment-log.json');

    console.log('\\n🎉 Fresh Contract Deployment Complete!');
    console.log('══════════════════════════════════════════════');
    console.log('📋 What was deployed:');
    console.log(`   📍 Contract Address: ${contract.address}`);
    console.log(`   🔑 Deployed by: ${account.address}`);
    console.log(`   🌐 Network: Massa Buildnet`);
    console.log(`   📅 Deployed at: ${new Date().toLocaleString()}`);
    console.log('');
    console.log('📋 Next Steps:');
    console.log('   1. Fund the contract: npm run fund-contract');
    console.log('   2. Test contract: npm run create-poll');
    console.log('   3. Retrieve polls: npm run get-polls');
    console.log('   4. Run integration test: npm run test-create-retrieve');
    console.log(`   5. View on explorer: https://buildnet-explorer.massa.net/address/${contract.address}`);
    console.log('══════════════════════════════════════════════');

    return contract.address;

  } catch (error) {
    console.error('💥 Fresh deployment failed:', error);
    console.log('\\n🔧 Troubleshooting:');
    console.log('   1. Ensure contract is built: npm run build');
    console.log('   2. Check MASSA balance for deployment fees');
    console.log('   3. Verify network connectivity to buildnet');
    console.log('   4. Ensure PRIVATE_KEY is set in .env file');
    console.log('   5. Try again - network issues can cause temporary failures');
    process.exit(1);
  }
}

// Run deployment if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  deployFreshContract()
    .then(address => {
      console.log(`\\n✨ Fresh contract successfully deployed at: ${address}`);
      console.log('🔄 All test scripts will now use the new contract address');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Deployment script failed:', error);
      process.exit(1);
    });
}

export { deployFreshContract };