/**
 * Ghost Run — Simulate API
 *
 * POST /api/ghost-run/simulate
 * Body: { strategy: string, wallet: string }
 *
 * 1. Claude parses NL strategy → StrategyStep[]
 * 2. simulateStrategy() runs each step against real Solana state
 * 3. Returns precise token deltas, gas costs, APY estimates
 */
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { simulateStrategy } from "@/lib/ghost-run";
import type { StrategyStep } from "@/lib/ghost-run";

export const maxDuration = 60;

const PARSE_SYSTEM = `You are a Solana DeFi strategy parser. Convert the user's natural language strategy into a JSON array of steps.

Supported step types:
- swap: exchange one token for another (e.g. SOL→USDC)
- stake: liquid stake SOL (outputs: mSOL, jitoSOL, bSOL)
- lend: deposit into Kamino lending (inputs: USDC, SOL, USDT)

Output ONLY a valid JSON array, no markdown, no explanation. Example:
[
  {"type":"stake","inputToken":"SOL","inputAmount":3,"outputToken":"mSOL","protocol":"Marinade"},
  {"type":"lend","inputToken":"USDC","inputAmount":50,"outputToken":"kUSDC","protocol":"Kamino"}
]

Supported tokens: SOL, USDC, USDT, mSOL, jitoSOL, bSOL
Protocols for stake: Marinade (→mSOL), Jito (→jitoSOL), BlazeStake (→bSOL)
Protocols for lend: Kamino`;

export async function POST(req: NextRequest) {
  let body: { strategy?: string; wallet?: string } = {};
  try { body = await req.json(); } catch { /* ok */ }

  const { strategy, wallet } = body;
  if (!strategy || !wallet) {
    return NextResponse.json({ error: "Missing strategy or wallet" }, { status: 400 });
  }

  // Step 1: Parse NL strategy with Claude
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const client = new Anthropic({ apiKey });
  let steps: StrategyStep[] = [];

  try {
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: PARSE_SYSTEM,
      messages: [{ role: "user", content: strategy }],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text.trim() : "[]";
    // Extract JSON array from response (may have trailing text)
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    steps = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
  } catch (err) {
    console.error("[ghost-run/simulate] parse error:", err);
    return NextResponse.json({ error: "Strategy parse failed" }, { status: 500 });
  }

  if (steps.length === 0) {
    return NextResponse.json({ error: "無法解析策略，請用中文或英文描述您的 DeFi 操作" }, { status: 400 });
  }

  // Step 2: Simulate each step with native Solana RPC
  try {
    const result = await simulateStrategy(steps, wallet);
    return NextResponse.json({ steps, result });
  } catch (err) {
    console.error("[ghost-run/simulate] simulation error:", err);
    return NextResponse.json({ error: "Simulation failed" }, { status: 500 });
  }
}
