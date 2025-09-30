# Massa Polls - Upgradeable Contract Guide

## 🎯 Overview

The Massa Polls contract now supports upgradeable architecture with admin controls, version management, and emergency pause functionality.

### Key Features

✅ **Admin Control** - Only admin can perform critical operations
✅ **Version Tracking** - Track contract versions across upgrades
✅ **Emergency Pause** - Pause contract in case of issues
✅ **Upgrade Path** - Deploy new versions while preserving admin control
✅ **Project Support** - Group polls into projects

---

## 📋 Contract Management

### Admin Functions

The contract deployer automatically becomes the admin with special privileges:

```typescript
// Admin-only functions:
- pause()              // Emergency stop
- unpause()            // Resume operations
- transferAdmin()      // Transfer admin rights
- setVersion()         // Update version number
```

### Version Control

The contract tracks its version:
- Initial deployment: `v1.0.0`
- Each upgrade increments version automatically
- Version visible via `getVersion()`

---

## 🚀 Deployment & Upgrade

### Initial Deployment

Deploy the contract with upgrade support:

```bash
cd mpolls-contract

# Build and deploy upgradeable contract
npm run deploy-upgradeable
```

This will:
1. Deploy the contract to Buildnet
2. Set you as admin
3. Initialize version 1.0.0
4. Save deployment info to `deployment.json`
5. Update `.env` with contract address

### Upgrading the Contract

When you need to upgrade (add features, fix bugs):

```bash
# 1. Make your changes to assembly/contracts/main.ts

# 2. Run upgrade script
npm run upgrade
```

The upgrade process:
1. Deploys new contract with updated code
2. Increments version (1.0.0 → 1.1.0)
3. Saves new address to `deployment.json`
4. Tracks upgrade history in `upgrade-history.json`
5. Updates `.env` with new address

**Important:** Each upgrade creates a NEW contract. Old data stays on the previous contract address.

---

## 🛠️ Management Commands

### Pause Contract (Emergency)

```bash
npm run pause
```

When paused:
- ❌ Cannot create polls
- ❌ Cannot vote
- ❌ Cannot create projects
- ✅ Can still read data
- ✅ Admin can unpause

### Unpause Contract

```bash
npm run unpause
```

### Get Contract Info

```bash
npm run contract-info
```

Shows:
- Contract address
- Admin address
- Current version
- Pause status

### Transfer Admin Rights

```bash
npm run manage transfer-admin <new-admin-address>
```

Example:
```bash
npm run manage transfer-admin AU12abc...xyz
```

### Set Version Manually

```bash
npm run manage set-version "1.2.0"
```

---

## 📊 Upgrade Strategy

### How Upgrades Work

Massa doesn't have Ethereum-style proxy contracts, so we use a **redeployment strategy**:

```
┌─────────────────────────────────────────────────┐
│  Contract V1.0.0 (Address: ABC123...)           │
│  - Contains: Polls #1-100, Projects #1-5        │
│  - Status: PAUSED after upgrade                 │
└─────────────────────────────────────────────────┘
                    ↓ Upgrade
┌─────────────────────────────────────────────────┐
│  Contract V1.1.0 (Address: XYZ789...)           │
│  - Fresh start: No old data                     │
│  - New features: Enhanced functionality         │
│  - Admin: Transferred from V1.0.0               │
└─────────────────────────────────────────────────┘
```

### Data Considerations

**What happens to old data?**
- Old polls/votes/projects remain on the previous contract
- They're immutable and permanently accessible
- Frontend can read from both contracts if needed

**Fresh Start Approach (Recommended):**
- Each upgrade starts clean
- Users create new polls on new contract
- Old polls remain viewable but in read-only mode

**Dual Contract Approach (Advanced):**
- Frontend reads from both old and new contracts
- Display historical polls from old contract
- New polls go to new contract
- Requires frontend logic to handle multiple addresses

---

## 🔄 Upgrade Workflow

### Step-by-Step Upgrade Process

1. **Prepare the Upgrade**
   ```bash
   # Make changes to contract code
   vim assembly/contracts/main.ts

   # Test locally
   npm run build
   ```

2. **Pause Old Contract** (Optional but recommended)
   ```bash
   npm run pause
   ```

3. **Deploy New Version**
   ```bash
   npm run upgrade
   ```

4. **Verify Deployment**
   ```bash
   npm run contract-info
   ```

5. **Update Frontend**
   ```bash
   cd ../mpolls-dapp

   # Update .env with new contract address
   echo "VITE_POLLS_CONTRACT_ADDRESS=<new-address>" > .env

   # Rebuild and test
   npm run dev
   ```

6. **Test New Features**
   - Create test poll
   - Vote on poll
   - Create project
   - Verify all functionality

7. **Monitor**
   - Check explorer for transactions
   - Monitor for errors
   - Verify users can interact

---

## 📁 Files Created

### Deployment Files

- `deployment.json` - Current contract deployment info
- `upgrade-history.json` - Track all upgrades
- `.env` - Contract addresses and config

### Scripts

- `src/deploy-upgradeable.ts` - Initial deployment
- `src/upgrade-contract.ts` - Upgrade to new version
- `src/manage-contract.ts` - Admin management commands

---

## 🧪 Testing Upgrades

### Local Testing

```bash
# 1. Deploy initial version
npm run deploy-upgradeable

# 2. Create some test data
npm run create-poll

# 3. Make changes to contract
# Edit assembly/contracts/main.ts

# 4. Test upgrade
npm run upgrade

# 5. Verify new contract works
npm run contract-info
npm run get-polls
```

---

## 🚨 Emergency Procedures

### Contract Compromised

1. **Immediately pause:**
   ```bash
   npm run pause
   ```

2. **Deploy fixed version:**
   ```bash
   npm run upgrade
   ```

3. **Update frontend to new address**

4. **Announce to users**

### Lost Admin Access

If you lose admin private key:
- Old contract becomes immutable (no admin functions)
- Deploy new contract (you become admin of new one)
- Update frontend to new address
- Old data remains accessible but unmodifiable

---

## 📈 Version History Format

`upgrade-history.json` tracks all upgrades:

```json
[
  {
    "from": "initial",
    "to": "AS1abc...",
    "version": "1.0.0",
    "timestamp": "2025-01-15T10:30:00Z",
    "deployer": "AU12def..."
  },
  {
    "from": "AS1abc...",
    "to": "AS1xyz...",
    "version": "1.1.0",
    "timestamp": "2025-02-20T14:15:00Z",
    "deployer": "AU12def..."
  }
]
```

---

## 💡 Best Practices

1. **Always test upgrades on testnet first**
2. **Announce upgrades to users in advance**
3. **Pause old contract after upgrade** (prevents confusion)
4. **Keep upgrade history documented**
5. **Backup deployment.json and .env files**
6. **Use semantic versioning** (MAJOR.MINOR.PATCH)
7. **Test all features after upgrade**
8. **Monitor the new contract for 24h after upgrade**

---

## 🔗 Quick Reference

```bash
# Deployment
npm run deploy-upgradeable    # Initial deploy

# Upgrades
npm run upgrade               # Deploy new version

# Management
npm run pause                 # Emergency stop
npm run unpause              # Resume
npm run contract-info        # Get info
npm run manage transfer-admin <addr>
npm run manage set-version <version>

# Testing
npm run create-poll          # Test poll creation
npm run get-polls            # View polls
```

---

## 📞 Support

For issues or questions:
1. Check `upgrade-history.json` for version info
2. Verify contract address in `deployment.json`
3. Review transaction on Massa explorer
4. Check admin address matches your wallet

---

**Contract Version:** 1.0.0
**Last Updated:** January 2025
**Upgrade Strategy:** Redeployment with Admin Control