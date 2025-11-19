#!/usr/bin/env node

// Check operation status on buildnet
import 'dotenv/config';
import {
  JsonRpcProvider
} from '@massalabs/massa-web3';

const BUILDNET_URL = 'https://buildnet.massa.net/api/v2';

async function checkOperation() {
  const operationId = process.argv[2] || 'O12MgLvQ5PkMev2sJpdvcHc3zUQvY8caujgYUBUN776UexHs9q5T';

  console.log('🔍 Checking Operation Status on Buildnet...');
  console.log('════════════════════════════════════════');
  console.log(`Operation ID: ${operationId}`);
  console.log();

  try {
    // Connect to buildnet
    const provider = JsonRpcProvider.buildnet();
    console.log('🌐 Connected to Massa buildnet');
    console.log(`   RPC URL: ${BUILDNET_URL}`);
    console.log();

    // Method 1: Try to get operation info
    console.log('📡 Method 1: Querying operation info...');
    try {
      const response = await fetch(BUILDNET_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'get_operations',
          params: [[operationId]]
        })
      });

      const data = await response.json();

      if (data.result && data.result.length > 0) {
        const op = data.result[0];
        console.log('✅ Operation found!');
        console.log();
        console.log('Operation Details:');
        console.log('─────────────────────────────────────────');
        console.log(`ID: ${op.id || operationId}`);
        console.log(`In Pool: ${op.in_pool || 'N/A'}`);
        console.log(`In Blocks: ${op.in_blocks ? op.in_blocks.join(', ') : 'Not yet in block'}`);
        console.log(`Final: ${op.is_final ? 'Yes ✓' : 'No (pending)'}`);
        console.log(`Operation Executed: ${op.is_operation_final !== undefined ? op.is_operation_final : 'N/A'}`);

        if (op.operation) {
          console.log();
          console.log('Operation Content:');
          console.log(`  Fee: ${op.operation.fee || 'N/A'}`);
          console.log(`  Expire Period: ${op.operation.expire_period || 'N/A'}`);

          if (op.operation.op) {
            console.log(`  Type: ${op.operation.op.type || 'CallSC'}`);
            if (op.operation.op.target_addr) {
              console.log(`  Target: ${op.operation.op.target_addr}`);
            }
            if (op.operation.op.target_func) {
              console.log(`  Function: ${op.operation.op.target_func}`);
            }
            if (op.operation.op.coins) {
              const coins = BigInt(op.operation.op.coins);
              const massa = Number(coins) / 1_000_000_000;
              console.log(`  Coins Sent: ${massa} MASSA`);
            }
          }
        }

        console.log();
        console.log('Full Response:');
        console.log(JSON.stringify(op, null, 2));
      } else if (data.error) {
        console.log('❌ RPC Error:', data.error.message || data.error);
      } else {
        console.log('⚠️  Operation not found or not yet included');
      }
    } catch (err) {
      console.log('❌ Error with Method 1:', err.message);
    }

    console.log();
    console.log('─────────────────────────────────────────');

    // Method 2: Check events from the swap contract
    console.log('📡 Method 2: Checking swap contract events...');
    const swapContract = process.env.SWAP_CONTRACT_ADDRESS;

    if (swapContract) {
      const events = await provider.getEvents({
        smartContractAddress: swapContract,
      });

      console.log(`✅ Found ${events.length} events from swap contract`);

      if (events.length > 0) {
        console.log();
        console.log('Recent Events:');
        events.slice(-5).forEach((event, index) => {
          console.log(`  ${index + 1}. ${event.data}`);
        });
      }
    }

    console.log();
    console.log('─────────────────────────────────────────');

    // Method 3: Check current node status
    console.log('📡 Method 3: Checking node status...');
    try {
      const statusResponse = await fetch(BUILDNET_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'get_status',
          params: []
        })
      });

      const statusData = await statusResponse.json();

      if (statusData.result) {
        console.log('✅ Node Status:');
        console.log(`  Node ID: ${statusData.result.node_id || 'N/A'}`);
        console.log(`  Version: ${statusData.result.version || 'N/A'}`);
        console.log(`  Current Cycle: ${statusData.result.current_cycle || 'N/A'}`);
        console.log(`  Current Time: ${statusData.result.current_time || 'N/A'}`);
        console.log(`  Network: ${statusData.result.network || 'buildnet'}`);
      }
    } catch (err) {
      console.log('⚠️  Could not fetch node status:', err.message);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

checkOperation();
