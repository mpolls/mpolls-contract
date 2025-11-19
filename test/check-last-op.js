#!/usr/bin/env node
import 'dotenv/config';
import { JsonRpcProvider } from '@massalabs/massa-web3';

const BUILDNET_URL = 'https://buildnet.massa.net/api/v2';

const response = await fetch(BUILDNET_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'get_operations',
    params: [['O12tBRXjL1hrv1v27HZBxb9oMutho9K3VMwa6Q1H3MnzRgoQT1Pc']]
  })
});

const data = await response.json();
if (data.result && data.result[0]) {
  const op = data.result[0];
  console.log('Operation found:');
  console.log('  Final:', op.is_operation_final);
  console.log('  In blocks:', op.in_blocks);
  if (op.operation?.content?.op?.CallSC) {
    console.log('  Max gas:', op.operation.content.op.CallSC.max_gas);
  }
}
