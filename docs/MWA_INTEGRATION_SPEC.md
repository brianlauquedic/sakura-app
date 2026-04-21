# MWA Integration · Design Spec

**Status:** design approved, implementation not started
**Owner:** Sakura core team
**Prereq for:** Colosseum Frontier 2026 mobile demo (Phantom/Backpack iOS agent mode)

---

## Why this exists

Sakura's four target wallets (Phantom · Backpack · Abstract · Infinex) all ship
agent mode **mobile-first** in H1 2026. A desktop-only `window.solana` path
cannot service a single agent-mode user. Without Mobile Wallet Adapter (MWA)
integration, Sakura is provably unusable on the device where agentic DeFi
will actually happen. At demo day, the evaluator opens the iOS app, and the
story ends or continues right there.

## What MWA is

Mobile Wallet Adapter is the Solana Foundation protocol that lets a mobile
dApp (web or native) request transaction signing from a wallet app on the
same device. It replaces the desktop `window.solana` provider with a
sandboxed pairing + signing flow that traverses the Android intent system
(Android) or the URI scheme / Universal Link (iOS).

Wire protocol summary:
1. **Authorize** — dApp declares identity, requested permissions, chain (`solana:devnet` / `solana:mainnet-beta`). Wallet returns a cloned `auth_token` + selected account(s).
2. **Sign transactions** — dApp hands over unsigned `VersionedTransaction` byte blobs; wallet returns signed byte blobs.
3. **Re-authorize** — same `auth_token` can be refreshed for later sessions without a second user tap.

Sakura never needs `signMessage` or `signAndSendTransaction` — signing is
enough; we submit via our own RPC (Helius with Triton fallback, per
`lib/rpc.ts`).

## Packages

```
@solana-mobile/mobile-wallet-adapter-protocol
@solana-mobile/mobile-wallet-adapter-protocol-web3js
@solana-mobile/wallet-adapter-mobile      # React-side convenience wrapper
```

License: Apache-2.0 across the board, safe to ship.

## Integration target

Sakura-app is a **Next.js PWA**, not a React Native app. For mobile demo we
have two implementation paths:

### Path A · PWA-on-mobile (short-term, demo-grade)

Use `@solana-mobile/wallet-adapter-mobile` inside the existing Next.js app;
it exposes a `SolanaMobileWalletAdapter` that speaks MWA over the mobile
browser. On Android this works today through Chrome. **On iOS, MWA support
is wallet-side and only partial** — Phantom iOS supports it via the Solana
mobile wallet standard; Backpack iOS does not yet as of 2026-Q1. This is
the path we take for the Colosseum demo.

### Path B · Native React Native app (H2 2026)

Ship `SakuraMobile.app` as a dedicated React Native target consuming the
same `lib/insurance-pool.ts` + `lib/zk-proof.ts`. This gives full native
MWA support including signing delegated to system-level intents. Scoped
OUT for the hackathon; noted here so the v0.3 TypeScript modules stay
platform-agnostic (no browser globals baked into `lib/`).

**This spec covers Path A.** Path B is future work.

## Implementation surface (Path A)

### 1. New context provider

`contexts/MobileWalletContext.tsx` — sibling to the existing
`contexts/WalletContext.tsx`. Exposes the same shape:

```typescript
interface MobileWallet {
  connected: boolean;
  publicKey: PublicKey | null;
  authorize: () => Promise<void>;
  deauthorize: () => Promise<void>;
  signTransaction: (tx: VersionedTransaction) => Promise<VersionedTransaction>;
  signAllTransactions: (txs: VersionedTransaction[]) => Promise<VersionedTransaction[]>;
}
```

Internally uses `transact(async wallet => ...)` from the
`@solana-mobile/mobile-wallet-adapter-protocol-web3js` package.

### 2. Platform dispatcher in the existing WalletContext

`contexts/WalletContext.tsx` already provides a unified wallet API
(Phantom desktop path). Add a `useIsMobile()` hook that checks
`window.matchMedia("(pointer: coarse)")` + `navigator.userAgent` for
iOS/Android, and **delegates to the MobileWalletContext** when the
device is mobile + touch-primary:

```typescript
function useWallet() {
  const mobile = useIsMobile();
  return mobile ? useMobileWallet() : useDesktopWallet();
}
```

Existing call sites in `components/WalletConnect.tsx` are untouched;
the dispatcher swap is internal.

### 3. App identity declaration

MWA requires a declared app identity the wallet shows the user during
the pairing tap. Add to `MobileWalletContext`:

```typescript
const APP_IDENTITY = {
  name: "Sakura",
  uri: "https://www.sakuraaai.com",
  icon: "/logo-bijin.png",
};
```

Wallet shows `name` + `icon` when the user approves the pairing. `uri`
scopes the `auth_token` to this origin (prevents token reuse across apps).

### 4. Transaction submit path

Sign with MWA → submit via existing `getConnection()` (not via MWA's
optional `signAndSendTransaction` since we already have reliable RPC
fallback in `lib/rpc.ts`, Module 16 pattern). Submission flow:

```typescript
const signed = await wallet.signTransaction(tx);
const conn = await getConnection("confirmed");
const sig = await conn.sendRawTransaction(signed.serialize());
await conn.confirmTransaction({ signature: sig, ...(await conn.getLatestBlockhash()) });
```

### 5. Demo day gating

Add a mobile-first banner on the `/` landing page that, when `useIsMobile()`
returns true, displays `"Connect via Phantom mobile" / "Connect via Backpack mobile"`
instead of desktop Phantom/OKX pills.

## Files to create / modify

| Path | Action | LOC |
|---|---|---|
| `contexts/MobileWalletContext.tsx` | create | ~160 |
| `contexts/WalletContext.tsx` | edit — add dispatcher | ~30 added |
| `hooks/useIsMobile.ts` | create | ~25 |
| `components/WalletConnect.tsx` | edit — mobile pill variant | ~40 changed |
| `package.json` | add 3 deps | 3 lines |

Total: ~260 LOC changed, ~3 files new, zero changes to `programs/`,
`circuits/`, `lib/zk-proof.ts`, `lib/insurance-pool.ts`, or `app/api/*`.
The MWA integration is a wallet-adapter shim, not a protocol change.

## Account-layout + on-chain considerations

**None.** MWA is purely a signing transport. The on-chain instruction
set (`sign_intent`, `execute_with_intent_proof`) and the Groth16
verification path are unchanged. An MWA-signed `sign_intent`
transaction is byte-identical to a desktop-Phantom-signed one from the
program's perspective — the program only sees bytes + an Ed25519
signature.

## Testing plan

1. **Dev · desktop simulation** — `@solana-mobile/wallet-adapter-mobile`
   ships a test harness. Run in Chrome with touch emulation, confirm
   authorize + signTransaction complete without exceptions.
2. **Dev · Android device** — Phantom Android test channel + Chrome
   on Pixel. Run the Sakura flow: authorize → sign_intent → generate
   proof → execute_with_intent_proof. Verify Intent PDA exists on
   devnet after.
3. **Dev · iOS device** — Phantom iOS. Known limitation: MWA on iOS
   uses URI scheme hand-off; Safari works, WKWebView embeds do not.
   Test Safari specifically.
4. **Demo day fallback** — if the iOS path fails live, demo on a
   desktop browser (already proven, already shipped) and show the
   Android device as the mobile confirmation. Do not promise iOS
   Backpack on stage.

## Failure modes + mitigation

| Failure | Why it happens | Mitigation |
|---|---|---|
| iOS Safari opens Phantom, Phantom opens, pairing hangs | Universal Link not registered / Phantom version outdated | Force-update Phantom to latest before demo; test twice on pre-stage device |
| `auth_token` expires between sign_intent and execute_with_intent_proof | Session lifetime is wallet-side and short | Re-authorize silently on second call — MWA supports `reauthorize` flow |
| User has multiple Solana wallets installed | Wallet chooser UX on Android | Declare `APP_IDENTITY.uri` so only wallets matching our scope appear |
| Pyth account gets overwritten between mobile sign + submit | Phone network latency adds 1–3 s | Our post-Pyth-then-submit window is already < 60s; fine for 150-slot Pyth cutoff |

## Estimate

- Implementation: **3 days single engineer** (matches earlier planning
  spec; no change now that I've read the code structure).
- Testing on Android + iOS: **1 day**.
- Demo rehearsal: **1 day** (screen-record the iOS + Android flow for the
  evaluator packet).

Total: **5 days** to ship-ready for Colosseum demo.

## Out of scope (explicitly deferred to Path B)

- Dedicated React Native Sakura app.
- Push notifications for intent-expiry warnings.
- Biometric-gated intent signing (Face ID / Touch ID second factor).
- WalletConnect as a fallback for wallets without MWA.

These are all v1.0 (post-hackathon) concerns. The H1 2026 bet is
"four-wallet agent mode compatible", not "best-in-class mobile UX".
