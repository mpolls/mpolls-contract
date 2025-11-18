/**
 * Example deployment script for MPOLLS Token and integration with Polls contract
 *
 * This script demonstrates how to:
 * 1. Deploy the MPOLLS token contract
 * 2. Configure the polls contract to use the token
 * 3. Grant minter role to the polls contract
 * 4. Enable rewards
 */

// Example using the Massa client
// You'll need to adapt this to your specific deployment setup

const deploymentSteps = {
  step1: {
    title: "Deploy MPOLLS Token Contract",
    commands: [
      "npm run build",
      "massa-client deploy_sc --path build/token.wasm --parameter '' --coins 0"
    ],
    note: "Save the deployed token contract address from the output"
  },

  step2: {
    title: "Configure Polls Contract with Token Address",
    description: "Set the token contract address in the polls contract",
    functionCall: {
      contract: "pollsContract",
      function: "setTokenContract",
      parameters: ["<TOKEN_CONTRACT_ADDRESS>"]
    },
    note: "Replace <TOKEN_CONTRACT_ADDRESS> with the address from step 1"
  },

  step3: {
    title: "Grant Minter Role to Polls Contract",
    description: "Allow the polls contract to mint MPOLLS tokens as rewards",
    functionCall: {
      contract: "tokenContract",
      function: "grantMinterRole",
      parameters: ["<POLLS_CONTRACT_ADDRESS>"]
    },
    note: "Replace <POLLS_CONTRACT_ADDRESS> with your polls contract address"
  },

  step4: {
    title: "Enable Rewards in Polls Contract",
    description: "Activate the reward system",
    functionCall: {
      contract: "pollsContract",
      function: "enableRewards",
      parameters: []
    },
    note: "Rewards are now active! Users will receive MPOLLS for voting and creating polls"
  },

  optional: {
    title: "Optional: Adjust Reward Amounts",
    description: "Customize the reward amounts (values in smallest unit - 9 decimals)",
    functionCalls: [
      {
        contract: "pollsContract",
        function: "setVoteRewardAmount",
        parameters: ["25000000000"], // 25 MPOLLS
        note: "Set custom vote reward"
      },
      {
        contract: "pollsContract",
        function: "setCreatePollRewardAmount",
        parameters: ["100000000000"], // 100 MPOLLS
        note: "Set custom poll creation reward"
      }
    ]
  }
};

// Example with massa-web3 (TypeScript/JavaScript)
const exampleCode = `
import { Client, Account } from '@massalabs/massa-web3';

async function deployAndConfigureTokenSystem() {
  // 1. Deploy token contract
  const tokenDeployment = await account.deploySmartContract({
    contractData: tokenWasm,
    constructorArgs: [],
  });
  const tokenAddress = tokenDeployment.address;
  console.log('Token deployed at:', tokenAddress);

  // 2. Set token contract in polls contract
  await pollsContract.call({
    functionName: 'setTokenContract',
    args: [tokenAddress],
  });
  console.log('Token contract configured');

  // 3. Grant minter role to polls contract
  await tokenContract.call({
    functionName: 'grantMinterRole',
    args: [pollsContractAddress],
  });
  console.log('Minter role granted');

  // 4. Enable rewards
  await pollsContract.call({
    functionName: 'enableRewards',
    args: [],
  });
  console.log('Rewards enabled!');

  // 5. Verify configuration
  const isEnabled = await pollsContract.call({
    functionName: 'areRewardsEnabled',
  });
  console.log('Rewards status:', isEnabled);

  const voteReward = await pollsContract.call({
    functionName: 'getVoteRewardAmount',
  });
  console.log('Vote reward:', voteReward, 'MPOLLS (raw units)');

  const createReward = await pollsContract.call({
    functionName: 'getCreatePollRewardAmount',
  });
  console.log('Create poll reward:', createReward, 'MPOLLS (raw units)');
}
`;

console.log("MPOLLS Token Deployment Guide");
console.log("================================\n");

console.log("This file contains deployment steps for the MPOLLS token system.\n");
console.log("See MPOLLS_TOKEN.md for full documentation.\n");

console.log("Deployment Steps:");
console.log("=================\n");

Object.entries(deploymentSteps).forEach(([key, step]) => {
  console.log(`${step.title}`);
  console.log('-'.repeat(step.title.length));
  if (step.description) {
    console.log(step.description);
  }
  if (step.commands) {
    console.log("Commands:");
    step.commands.forEach(cmd => console.log(`  ${cmd}`));
  }
  if (step.functionCall) {
    console.log("Function Call:");
    console.log(`  Contract: ${step.functionCall.contract}`);
    console.log(`  Function: ${step.functionCall.function}`);
    console.log(`  Parameters: ${JSON.stringify(step.functionCall.parameters)}`);
  }
  if (step.functionCalls) {
    step.functionCalls.forEach((fc, idx) => {
      console.log(`\nFunction Call ${idx + 1}:`);
      console.log(`  Contract: ${fc.contract}`);
      console.log(`  Function: ${fc.function}`);
      console.log(`  Parameters: ${JSON.stringify(fc.parameters)}`);
      if (fc.note) console.log(`  Note: ${fc.note}`);
    });
  }
  if (step.note) {
    console.log(`Note: ${step.note}`);
  }
  console.log();
});

console.log("\nExample Code:");
console.log("=============");
console.log(exampleCode);
