#!/bin/bash
# Sakura — Mainnet deployment script (W4D26).
#
# Prereqs:
#   1. ~/.config/solana/mainnet-admin.json exists and is funded with
#      ≥ 4 SOL (program is ~340KB → ~2.5 SOL + buffer rent + init fees).
#   2. Devnet E2E has passed: `npx tsx scripts/e2e-intent-execute.ts`.
#   3. VK is baked from the CURRENT circuit artifact
#      (`node scripts/parse-vk-to-rust.js`).
#   4. You have re-run `cargo-build-sbf --manifest-path
#      programs/sakura-insurance/Cargo.toml` AFTER the VK regeneration.
#
# This script is idempotent-ish: if the program ID already exists on
# mainnet, it upgrades in place (requires the upgrade authority to be
# the mainnet-admin keypair). If not, it deploys fresh.
#
# DO NOT RUN WITHOUT reading the last pre-flight checklist below.
set -euo pipefail

# ═══════════════════════════════════════════════════════════════════════
# Configuration
# ═══════════════════════════════════════════════════════════════════════
ADMIN_KP="$HOME/.config/solana/mainnet-admin.json"
PROGRAM_SO="target/deploy/sakura_insurance.so"
PROGRAM_ID="AnszeCRFsBKmT5fBY9WywxGsZZZob8ZPFYqboYXpuYLp"
MAINNET_RPC="${MAINNET_RPC:-https://api.mainnet-beta.solana.com}"

# ═══════════════════════════════════════════════════════════════════════
# Pre-flight
# ═══════════════════════════════════════════════════════════════════════
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Sakura Mainnet Deploy — pre-flight"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ ! -f "$ADMIN_KP" ]]; then
  echo "❌ admin keypair not found at $ADMIN_KP"
  exit 1
fi
if [[ ! -f "$PROGRAM_SO" ]]; then
  echo "❌ program .so not found — run: cargo-build-sbf --manifest-path programs/sakura-insurance/Cargo.toml"
  exit 1
fi

ADMIN_PUBKEY=$(solana-keygen pubkey "$ADMIN_KP")
echo "  admin pubkey : $ADMIN_PUBKEY"
echo "  program id   : $PROGRAM_ID"
echo "  program size : $(ls -lh "$PROGRAM_SO" | awk '{print $5}')"
echo "  rpc          : $MAINNET_RPC"

BALANCE=$(solana balance "$ADMIN_PUBKEY" --url "$MAINNET_RPC" 2>/dev/null | awk '{print $1}')
echo "  balance      : ${BALANCE} SOL"
BALANCE_INT=$(printf '%.0f' "$BALANCE")
if (( BALANCE_INT < 4 )); then
  echo "❌ admin balance < 4 SOL — insufficient for deployment"
  exit 1
fi

# Confirm VK is fresh
VK_AGE_S=$(( $(date +%s) - $(stat -f %m programs/sakura-insurance/src/zk_verifying_key.rs 2>/dev/null || stat -c %Y programs/sakura-insurance/src/zk_verifying_key.rs) ))
SO_AGE_S=$(( $(date +%s) - $(stat -f %m "$PROGRAM_SO" 2>/dev/null || stat -c %Y "$PROGRAM_SO") ))
if (( VK_AGE_S < SO_AGE_S )); then
  echo "❌ zk_verifying_key.rs is NEWER than the built .so"
  echo "   Rebuild: cargo-build-sbf --manifest-path programs/sakura-insurance/Cargo.toml"
  exit 1
fi

# Final human confirm
echo ""
echo "About to deploy to Solana MAINNET. This will consume ~2.5 SOL."
read -rp "Type 'DEPLOY MAINNET' to proceed: " CONFIRM
if [[ "$CONFIRM" != "DEPLOY MAINNET" ]]; then
  echo "Aborted."
  exit 1
fi

# ═══════════════════════════════════════════════════════════════════════
# Deploy
# ═══════════════════════════════════════════════════════════════════════
echo ""
echo "Deploying…"
solana program deploy "$PROGRAM_SO" \
  --program-id "$PROGRAM_ID" \
  --keypair "$ADMIN_KP" \
  --url "$MAINNET_RPC" \
  --upgrade-authority "$ADMIN_KP" \
  --max-sign-attempts 60

echo ""
echo "✓ Deploy landed. View the program:"
echo "  https://solscan.io/account/$PROGRAM_ID"

# ═══════════════════════════════════════════════════════════════════════
# Post-deploy: init_protocol
# ═══════════════════════════════════════════════════════════════════════
echo ""
echo "Next steps (run manually):"
echo "  1. npx tsx scripts/initialize-mainnet.ts  # creates Protocol PDA + fee vault"
echo "  2. Update NEXT_PUBLIC_INSURANCE_PROGRAM_ID in Vercel env → $PROGRAM_ID"
echo "  3. Update NEXT_PUBLIC_SAKURA_PROTOCOL_ADMIN → $ADMIN_PUBKEY"
echo "  4. Flip NEXT_PUBLIC_SOLANA_RPC from devnet to mainnet-beta"
echo "  5. Run a mainnet smoke test with small amounts (\$10 USDC lend)"
