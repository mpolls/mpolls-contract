# Complete Swap Contract Deployment Guide

This guide walks you through deploying and configuring the MPOLLS/MASSA swap contract step by step.

## Prerequisites

✅ Node.js and npm installed
✅ Massa wallet with MASSA for gas fees
✅ Private key in `.env` file
✅ Token contract already deployed (or deploy it first)

## Step-by-Step Deployment

### Step 1: Verify Environment Setup

Check your `.env` file in the contract directory:

```bash
cd /Users/east/workspace/massa/mpolls-contract
cat .env
```

Your `.env` should contain:
```env
PRIVATE_KEY=S1xxx...  # Your wallet private key
TOKEN_CONTRACT_ADDRESS=AS1xxx...  # MPOLLS token contract (deploy first if needed)
```

If you don't have the token contract deployed yet:
```bash
npm run deploy-token
# Copy the address and add to .env as TOKEN_CONTRACT_ADDRESS
```

### Step 2: Build All Contracts

```bash
npm run build
```

Expected output:
```
4 files to compile
contract to compile assembly/contracts/proxy.ts
contract to compile assembly/contracts/swap.ts
contract to compile assembly/contracts/token.ts
contract to compile assembly/contracts/main.ts
```

### Step 3: Deploy Swap Contract

```bash
npm run deploy-swap
```

Expected output:
```
🔄 Deploying MPOLLS Swap Contract...
🪙 Token Contract: AS1xxx...
📍 Deploying from account: AU1xxx...
🌐 Connected to Massa buildnet
✅ Swap contract deployed successfully!
📍 Swap Contract Address: AS1yyy...
```

**IMPORTANT:** Copy the swap contract address (AS1yyy...)

### Step 4: Update Environment Files

#### Contract .env file
Add the swap contract address to `/Users/east/workspace/massa/mpolls-contract/.env`:
```env
PRIVATE_KEY=S1xxx...
TOKEN_CONTRACT_ADDRESS=AS1xxx...
SWAP_CONTRACT_ADDRESS=AS1yyy...  # ← Add this line
```

#### DApp .env.local file
Update `/Users/east/workspace/massa/mpolls-dapp/.env.local`:
```env
VITE_TOKEN_CONTRACT_ADDRESS=AS1xxx...
VITE_SWAP_CONTRACT_ADDRESS=AS1yyy...  # ← Add this line
```

### Step 5: Approve Swap Contract (Permission Step)

This allows the swap contract to transfer MPOLLS tokens on your behalf:

```bash
npm run approve-swap
```

Expected output:
```
🔐 Approving Swap Contract to Spend MPOLLS Tokens...
🪙 Token Contract: AS1xxx...
🔄 Swap Contract: AS1yyy...
📍 Your address: AU1zzz...
✅ Approval transaction submitted successfully!
📋 Recent Token Contract Events:
   1. Approval: AU1zzz... approved AS1yyy... for amount: 18446744073709551615
```

**What this does:**
- Gives the swap contract permission to move MPOLLS tokens from your account
- Required for adding liquidity (you need to transfer MPOLLS to the pool)
- Users will also need to approve before swapping MPOLLS → MASSA

### Step 6: Add Initial Liquidity

Now add MASSA and MPOLLS to create the liquidity pool:

```bash
npm run add-liquidity
```

Expected output:
```
💧 Adding Liquidity to Swap Pool...
🔄 Swap Contract: AS1yyy...
📍 Your address: AU1zzz...

📊 Liquidity to Add:
   MASSA:  100 MASSA
   MPOLLS: 10,000 MPOLLS
   Rate:   1 MASSA ≈ 100 MPOLLS

✅ Liquidity transaction submitted successfully!
📋 Swap Contract Events:
   1. Liquidity added: 100 MASSA + 10000 MPOLLS
   2. New reserves: 100 MASSA, 10000 MPOLLS
```

**Note:** You can customize the liquidity amounts by editing `test/add-liquidity.js`

### Step 7: Verify Pool Status

Check that everything is working by testing a quote:

You can create a simple test script or use the DApp to:
1. Navigate to the Swap page
2. Check pool reserves are displayed
3. Try getting a quote (no actual swap needed)

## Configuration Options

### Adjusting Initial Liquidity

Edit `/Users/east/workspace/massa/mpolls-contract/test/add-liquidity.js`:

```javascript
// Line ~30-31
const massaAmount = 100; // Change this (e.g., 50, 200, 1000)
const mpollsAmount = 10000; // Change this (e.g., 5000, 20000, 100000)

// The ratio determines the initial exchange rate:
// 1 MASSA = (mpollsAmount / massaAmount) MPOLLS
```

Examples:
- **100 MASSA + 10,000 MPOLLS** → 1 MASSA = 100 MPOLLS (similar to old rate)
- **50 MASSA + 10,000 MPOLLS** → 1 MASSA = 200 MPOLLS (MPOLLS cheaper)
- **200 MASSA + 10,000 MPOLLS** → 1 MASSA = 50 MPOLLS (MPOLLS more expensive)

After editing, run:
```bash
npm run add-liquidity
```

### Adding More Liquidity Later

You can add liquidity anytime by running:
```bash
npm run add-liquidity
```

The new liquidity will be added to existing reserves.

## Troubleshooting

### Error: "Insufficient allowance"
**Solution:** Run `npm run approve-swap` first

### Error: "Insufficient balance"
**Problem:** You don't have enough MPOLLS or MASSA
**Solution:**
- Check your balance
- For MPOLLS: Use the token contract to mint or buy tokens
- For MASSA: Get more from faucet or transfer from another wallet

### Error: "TOKEN_CONTRACT_ADDRESS not found"
**Solution:** Make sure you've added it to `.env`:
```bash
echo "TOKEN_CONTRACT_ADDRESS=AS1xxx..." >> .env
```

### Error: "SWAP_CONTRACT_ADDRESS not found"
**Solution:** Deploy the swap contract first:
```bash
npm run deploy-swap
```

### No events showing after deployment
**Solution:** Wait a bit longer (5-10 seconds) and try checking events manually

## Testing the Swap

### Option 1: Using the DApp

1. Start the DApp:
   ```bash
   cd /Users/east/workspace/massa/mpolls-dapp
   npm run dev
   ```

2. Open in browser (usually http://localhost:5173)

3. Click "Swap" in navigation

4. Connect wallet

5. Try a small swap:
   - Enter 1 MASSA
   - See ~97.5 MPOLLS output (100 minus 2.5% spread)
   - Click "Swap"

### Option 2: Using Contract Calls

Create a test script or use the events to verify:

```bash
# Check pool reserves
# Create a script that calls getReserves()

# Check a quote
# Create a script that calls getQuoteMassaToMpolls(1000000000) // 1 MASSA
```

## Summary of Commands

Here's the complete flow:

```bash
# 1. Build contracts
npm run build

# 2. Deploy swap contract
npm run deploy-swap
# → Copy the address to .env files

# 3. Approve swap contract
npm run approve-swap

# 4. Add initial liquidity
npm run add-liquidity

# Done! The swap is now live
```

## Next Steps

After successful deployment:

1. ✅ Test swaps in both directions (MASSA → MPOLLS, MPOLLS → MASSA)
2. ✅ Monitor pool metrics (reserves, volume, price impact)
3. ✅ Adjust liquidity if needed
4. ✅ Share the swap page with users
5. ✅ Consider adding more liquidity for lower slippage

## Security Notes

- **Owner Controls**: As the deployer, you can:
  - Add/remove liquidity
  - Pause/unpause swaps
  - Transfer ownership

- **User Requirements**: Users need to:
  - Approve swap contract before swapping MPOLLS → MASSA
  - Have sufficient balance + gas fees

- **Spread**: 2.5% spread on all swaps (hardcoded in contract)

## Support

If you encounter issues:
1. Check the error message carefully
2. Verify all environment variables are set
3. Ensure you have enough MASSA for gas fees
4. Check transaction events on Massa explorer
5. Review the troubleshooting section above

For contract addresses and network info:
- Network: Massa Buildnet
- Explorer: https://explorer.massa.net/
- Check your transactions using your wallet address
