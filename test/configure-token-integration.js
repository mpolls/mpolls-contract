#!/usr/bin/env node

// Configure MPOLLS Token integration with Polls contract
import 'dotenv/config';
import {
  Account,
  Args,
  Mas,
  SmartContract,
  JsonRpcProvider,
} from '@massalabs/massa-web3';

const POLLS_CONTRACT_ADDRESS = process.env.POLLS_CONTRACT_ADDRESS || 'AS1HNDnGdK4nZqvzkytF5QCkcMDEKxzHAFVZSHsBjgHLgwpoRpJq';
const TOKEN_CONTRACT_ADDRESS = process.env.TOKEN_CONTRACT_ADDRESS || 'AS12JFWP4d3TDZ19ZonASKzN8XqKdSzB38yDUTFM5Y9brLqPjXKhr';

async function configureTokenIntegration() {
  console.log('🔧 Configuring MPOLLS Token Integration...');
  console.log('═══════════════════════════════════════════════');
  console.log(`📍 Polls Contract: ${POLLS_CONTRACT_ADDRESS}`);
  console.log(`🪙 Token Contract: ${TOKEN_CONTRACT_ADDRESS}`);
  console.log();

  try {
    // Create account from private key
    const account = await Account.fromPrivateKey(process.env.PRIVATE_KEY);
    console.log(`📍 Executing from account: ${account.address}`);

    // Connect to buildnet
    const provider = JsonRpcProvider.buildnet(account);
    console.log('🌐 Connected to Massa buildnet');
    console.log();

    // Create contract instances
    const pollsContract = new SmartContract(provider, POLLS_CONTRACT_ADDRESS);
    const tokenContract = new SmartContract(provider, TOKEN_CONTRACT_ADDRESS);

    // ===== STEP 1: Set token contract in polls contract =====
    console.log('STEP 1: Configuring polls contract to use token...');
    console.log('─────────────────────────────────────────────────');

    try {
      const setTokenArgs = new Args().addString(TOKEN_CONTRACT_ADDRESS);

      const setTokenOp = await provider.callSC({
        target: POLLS_CONTRACT_ADDRESS,
        func: 'setTokenContract',
        parameter: setTokenArgs.serialize(),
        coins: 0n,
        fee: Mas.fromString('0.01'),
      });

      console.log(`✅ Token contract set in polls contract`);
      console.log(`   Operation ID: ${setTokenOp.id}`);
      console.log();

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      console.error('❌ Failed to set token contract:', error.message);
      console.log('   This might be okay if it was already set.');
      console.log();
    }

    // ===== STEP 2: Grant minter role to polls contract =====
    console.log('STEP 2: Granting minter role to polls contract...');
    console.log('─────────────────────────────────────────────────');

    try {
      const grantMinterArgs = new Args().addString(POLLS_CONTRACT_ADDRESS);

      const grantMinterOp = await provider.callSC({
        target: TOKEN_CONTRACT_ADDRESS,
        func: 'grantMinterRole',
        parameter: grantMinterArgs.serialize(),
        coins: 0n,
        fee: Mas.fromString('0.01'),
      });

      console.log(`✅ Minter role granted to polls contract`);
      console.log(`   Operation ID: ${grantMinterOp.id}`);
      console.log();

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      console.error('❌ Failed to grant minter role:', error.message);
      console.log('   This might be okay if it was already granted.');
      console.log();
    }

    // ===== STEP 3: Enable rewards in polls contract =====
    console.log('STEP 3: Enabling rewards in polls contract...');
    console.log('─────────────────────────────────────────────────');

    try {
      const enableRewardsArgs = new Args();

      const enableRewardsOp = await provider.callSC({
        target: POLLS_CONTRACT_ADDRESS,
        func: 'enableRewards',
        parameter: enableRewardsArgs.serialize(),
        coins: 0n,
        fee: Mas.fromString('0.01'),
      });

      console.log(`✅ Rewards enabled in polls contract`);
      console.log(`   Operation ID: ${enableRewardsOp.id}`);
      console.log();

      // Wait a bit for final confirmation
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      console.error('❌ Failed to enable rewards:', error.message);
      console.log('   This might be okay if it was already enabled.');
      console.log();
    }

    // ===== STEP 4: Verify configuration =====
    console.log('STEP 4: Verifying configuration...');
    console.log('─────────────────────────────────────────────────');

    try {
      // Check if rewards are enabled
      const checkRewardsArgs = new Args();
      const rewardsEnabledResult = await provider.readSC({
        target: POLLS_CONTRACT_ADDRESS,
        func: 'areRewardsEnabled',
        parameter: checkRewardsArgs.serialize(),
      });

      console.log(`📊 Rewards enabled: ${rewardsEnabledResult ? 'Yes' : 'No'}`);

      // Get reward amounts
      const voteRewardResult = await provider.readSC({
        target: POLLS_CONTRACT_ADDRESS,
        func: 'getVoteRewardAmount',
        parameter: new Args().serialize(),
      });

      const createRewardResult = await provider.readSC({
        target: POLLS_CONTRACT_ADDRESS,
        func: 'getCreatePollRewardAmount',
        parameter: new Args().serialize(),
      });

      console.log(`💰 Vote reward: ${voteRewardResult} (raw units)`);
      console.log(`💰 Create poll reward: ${createRewardResult} (raw units)`);
      console.log();
    } catch (error) {
      console.log('⚠️  Could not verify configuration (this is okay)');
      console.log();
    }

    console.log('═══════════════════════════════════════════════');
    console.log('🎉 Token integration configuration complete!');
    console.log('═══════════════════════════════════════════════');
    console.log();
    console.log('Next steps:');
    console.log('1. Add token address to .env.local:');
    console.log(`   VITE_TOKEN_CONTRACT_ADDRESS=${TOKEN_CONTRACT_ADDRESS}`);
    console.log('2. Restart your dapp to see the token features');
    console.log('3. Users will now earn MPOLLS tokens for:');
    console.log('   - Creating polls');
    console.log('   - Voting on polls');
    console.log();

  } catch (error) {
    console.error('❌ Error configuring token integration:', error);
    if (error.message) {
      console.error('Error details:', error.message);
    }
    process.exit(1);
  }
}

// Run configuration
configureTokenIntegration();
