/**
 * Sakura MCP · spec-compliant StreamableHTTP + SSE endpoint.
 *
 * Matches the Solana Foundation convention at
 *   github.com/solana-foundation/solana-mcp-official (lib/index.ts)
 * — built on `mcp-handler` (Vercel's) + `@modelcontextprotocol/sdk`.
 *
 * This route lives at a dynamic Next.js segment `app/api/mcp/[transport]/route.ts`,
 * so `mcp-handler` can claim both transports with a single handler:
 *   GET/POST /api/mcp/mcp   → StreamableHTTP transport
 *   GET/POST /api/mcp/sse   → Server-Sent Events transport
 *
 * Consumable by:
 *   • Claude Desktop (native MCP client)
 *   • MCP Inspector (`npx @modelcontextprotocol/inspector`)
 *   • Any @modelcontextprotocol/sdk-based agent
 *
 * Tools are exposed under the Solana-Foundation Title_Case naming
 * convention (`Sakura_Intent_Protocol__Status`). The legacy
 * snake_case-over-JSON-RPC endpoint at /api/mcp remains for
 * backward compatibility with existing integrators.
 *
 * Payment gating (x402 / USDC) is NOT applied on this endpoint —
 * the MCP spec doesn't carry payment headers through the SDK clients,
 * and Claude Desktop can't sign USDC transactions. This endpoint
 * is free, read-only, and identical-capability to the gated route;
 * we rate-limit by IP + Redis instead (see Module 16 reliability).
 */

import { createMcpHandler } from "mcp-handler";
import {
  intentProtocolStatus,
  computeIntentCommitment,
  checkActionBounds,
  intentProtocolStatusParams,
  computeIntentCommitmentParams,
  checkActionBoundsParams,
  SAKURA_TOOL_DESCRIPTIONS,
} from "@/lib/sakura-mcp-tools";

const handler = createMcpHandler(
  (server) => {
    // ── Tool 1: on-chain protocol + user-intent state ──
    server.tool(
      "Sakura_Intent_Protocol__Status",
      SAKURA_TOOL_DESCRIPTIONS.intentProtocolStatus,
      intentProtocolStatusParams,
      async (args) => {
        const result = await intentProtocolStatus(args);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }
    );

    // ── Tool 2: Poseidon-tree intent commitment computation ──
    server.tool(
      "Sakura_Compute_Intent_Commitment",
      SAKURA_TOOL_DESCRIPTIONS.computeIntentCommitment,
      computeIntentCommitmentParams,
      async (args) => {
        const result = await computeIntentCommitment(args);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }
    );

    // ── Tool 3: pre-flight circuit constraint check ──
    server.tool(
      "Sakura_Check_Action_Bounds",
      SAKURA_TOOL_DESCRIPTIONS.checkActionBounds,
      checkActionBoundsParams,
      async (args) => {
        const result = checkActionBounds(args);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }
    );

    // ── Prompt: auto-attach guidance for agents that discover Sakura ──
    server.prompt(
      "sakura_usage_guideline",
      {},
      () => ({
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `
<SAKURA_MCP_USAGE_GUIDELINE>
  <DESCRIPTION>
    Sakura is Solana's AI security layer — a ZK-gated intent commitment primitive.
    Every agent DeFi action must ship with a Groth16 proof that the action sits
    inside the user's signed intent bounds. Verification is native via the
    Solana alt_bn128 pairing syscall.
  </DESCRIPTION>
  <TOOLS>
    - "Sakura_Intent_Protocol__Status": Read on-chain IntentProtocol + user's active Intent.
    - "Sakura_Compute_Intent_Commitment": Derive the 32-byte intent_commitment from 7 policy values (Poseidon tree). Client-verifiable.
    - "Sakura_Check_Action_Bounds": Pre-flight circuit constraint check. Validates (c2/c3/c4/c5) before you spend prover cycles.
  </TOOLS>
  <ORDER>
    1. Call Sakura_Intent_Protocol__Status with the user's wallet to read their active Intent PDA.
    2. For each proposed agent action, call Sakura_Check_Action_Bounds first. If all_pass === false, reject the action. Do not invoke the prover.
    3. When generating a new Intent, call Sakura_Compute_Intent_Commitment with the user's 7 policy values; the client must verify the returned hex against its own local Poseidon computation before signing.
  </ORDER>
</SAKURA_MCP_USAGE_GUIDELINE>
              `.trim(),
            },
          },
        ],
      })
    );
  },
  {
    capabilities: {},
  },
  {
    basePath: "/api/mcp",
    redisUrl: process.env.REDIS_URL,
    maxDuration: 120,
    verboseLogs: process.env.NODE_ENV === "development",
  }
);

export { handler as GET, handler as POST, handler as DELETE };
