# Proxy Pattern for Massa Polls

This project implements an upgradeable proxy pattern for the Massa Polls smart contract. The proxy pattern allows you to upgrade the contract logic without changing the contract address that users interact with.

## How It Works

1. **Proxy Contract** (`proxy.ts`) - A lightweight contract that:
   - Stores the address of the implementation contract
   - Forwards all function calls to the implementation
   - Provides `upgradeTo()` function to change the implementation
   - Maintains a constant address that never changes

2. **Implementation Contract** (`main.ts`) - Contains the actual business logic:
   - All the polls and projects functionality
   - Can be upgraded to new versions
   - Address changes with each upgrade, but users don't interact with it directly

## Deployment

### Initial Deployment (First Time Only)

```bash
npm run deploy:proxy
```

This will:
1. Deploy the implementation contract (`main.wasm`)
2. Deploy the proxy contract (`proxy.wasm`) pointing to the implementation
3. Save the proxy address to `.env` and `proxy-deployment.json`
4. **Use the proxy address** in your frontend - this never changes!

### Upgrading the Contract

When you need to upgrade the contract logic:

```bash
npm run upgrade:proxy
```

This will:
1. Deploy a new implementation contract with updated code
2. Call `upgradeTo()` on the proxy to point to the new implementation
3. **The proxy address stays the same** - no frontend changes needed!
4. Update `proxy-deployment.json` with the new implementation address

## Frontend Integration

**Important:** Your frontend should always use the **proxy address**, not the implementation address.

1. After running `npm run deploy:proxy`, copy the proxy address
2. Update your dapp's `.env` file:
   ```
   CONTRACT_ADDRESS=<PROXY_ADDRESS>
   ```
3. The proxy address never changes, even after upgrades!

## Key Files

- `assembly/contracts/proxy.ts` - The proxy contract
- `assembly/contracts/main.ts` - The implementation contract
- `src/deploy-proxy.ts` - Deployment script
- `src/upgrade-proxy.ts` - Upgrade script
- `proxy-deployment.json` - Stores deployment info (proxy + implementation addresses)
- `upgrade-history.json` - Tracks all upgrades

## Workflow

### For New Projects
```bash
# 1. Build and deploy with proxy
npm run deploy:proxy

# 2. Copy the proxy address to your frontend .env
# CONTRACT_ADDRESS=<PROXY_ADDRESS>

# 3. Your dapp is ready!
```

### For Upgrades
```bash
# 1. Make changes to assembly/contracts/main.ts

# 2. Upgrade the implementation
npm run upgrade:proxy

# 3. No frontend changes needed! The proxy handles it.
```

## Admin Functions

The proxy has its own admin functions (separate from the implementation):

- `getImplementation()` - View current implementation address
- `upgradeTo(newImplementation)` - Upgrade to new implementation (admin only)
- `getAdmin()` - View proxy admin address
- `transferAdmin(newAdmin)` - Transfer proxy admin rights (admin only)

## Security

- Only the proxy admin can upgrade the implementation
- The proxy admin is set to the deployer address during deployment
- Admin rights can be transferred using `transferAdmin()`
- Each upgrade is logged in `upgrade-history.json`

## Benefits

✅ **No Frontend Changes** - The proxy address stays constant
✅ **Easy Upgrades** - Just run `npm run upgrade:proxy`
✅ **Version Control** - Track all upgrades in history
✅ **Safe** - Only admin can upgrade
✅ **Data Preservation** - All data stays in the implementation contract

## Troubleshooting

**Q: After upgrading, my frontend still shows old data**
A: Clear your browser cache and refresh. The proxy forwards calls to the new implementation immediately.

**Q: I get "Only admin can call this function" when upgrading**
A: Make sure you're using the same wallet that deployed the proxy initially.

**Q: Can I migrate data from the old non-proxy deployment?**
A: No automatic migration. The new proxy deployment starts fresh. This is why you mentioned you don't mind losing old data.

## Example Upgrade Flow

```bash
# Initial deployment
$ npm run deploy:proxy
✅ Proxy deployed: AS12abc...xyz
✅ Implementation: AS12def...uvw

# Update your dapp .env
CONTRACT_ADDRESS=AS12abc...xyz

# Later, when you need to upgrade...
$ npm run upgrade:proxy
✅ New Implementation: AS12ghi...rst
✅ Proxy still at: AS12abc...xyz (unchanged)

# Your dapp continues to work - no changes needed!
```