/**
 * Liquidation Shield — Monitor API
 *
 * GET  /api/liquidation-shield/monitor?wallet=...
 * POST /api/liquidation-shield/monitor  { wallet, config? }
 *
 * Scans Kamino + MarginFi positions using getProgramAccounts (native RPC)
 * and protocol REST APIs. Returns health factors + AI rescue recommendations.
 */
import { NextRequest, NextResponse } from "next/server";
import { monitorPositions, simulateRescue } from "@/lib/liquidation-shield";
import type { ShieldConfig } from "@/lib/liquidation-shield";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

const DEFAULT_CONFIG: ShieldConfig = {
  approvedUsdc: 1000,
  triggerThreshold: 1.05,
  targetHealthFactor: 1.4,
};

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet || wallet.length < 32) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  try {
    const result = await monitorPositions(wallet);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[liquidation-shield/monitor] error:", err);
    return NextResponse.json({ error: "Monitor failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: { wallet?: string; config?: Partial<ShieldConfig> } = {};
  try { body = await req.json(); } catch { /* ok */ }

  const { wallet, config: userConfig } = body;
  if (!wallet || wallet.length < 32) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  const config: ShieldConfig = { ...DEFAULT_CONFIG, ...userConfig };

  // Step 1: Scan positions
  let monitorResult;
  try {
    monitorResult = await monitorPositions(wallet);
  } catch (err) {
    console.error("[liquidation-shield/monitor] scan error:", err);
    return NextResponse.json({ error: "Position scan failed" }, { status: 500 });
  }

  // Step 2: Simulate rescue for at-risk positions
  const rescueSimulations = await Promise.all(
    monitorResult.atRisk.map(pos => simulateRescue(pos, wallet, config))
  );

  // Step 3: AI analysis
  const apiKey = process.env.ANTHROPIC_API_KEY;
  let aiAnalysis: string | null = null;

  if (apiKey && monitorResult.positions.length > 0) {
    const client = new Anthropic({ apiKey });
    const positionSummary = monitorResult.positions
      .map(p =>
        `- ${p.protocol.toUpperCase()} | HF: ${p.healthFactor.toFixed(3)} | ` +
        `抵押: $${p.collateralUsd.toFixed(0)} ${p.collateralToken} | ` +
        `借款: $${p.debtUsd.toFixed(0)} ${p.debtToken}`
      )
      .join("\n");

    const atRiskSummary = monitorResult.atRisk.length > 0
      ? `\n⚠️ 高風險倉位 (HF < 1.3):\n${monitorResult.atRisk
          .map(p => `- ${p.protocol.toUpperCase()} HF: ${p.healthFactor.toFixed(3)}, 需還款 $${p.rescueAmountUsdc?.toFixed(0)} USDC`)
          .join("\n")}`
      : "\n✅ 所有倉位健康因子安全";

    const prompt = `分析以下 Solana DeFi 借貸倉位的健康狀況（SOL 價格: $${monitorResult.solPrice}）：

${positionSummary}
${atRiskSummary}

預授權救援資金上限：$${config.approvedUsdc} USDC
觸發閾值：健康因子 < ${config.triggerThreshold}
目標恢復健康因子：${config.targetHealthFactor}

請用繁體中文給出：
1. 整體風險評估（安全/警告/危急）
2. 最需要關注的倉位（如果有）
3. 建議行動（是否需要立即救援）
4. 最多150字`;

    try {
      const msg = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 350,
        messages: [{ role: "user", content: prompt }],
      });
      aiAnalysis = msg.content[0].type === "text" ? msg.content[0].text : null;
    } catch (err) {
      console.error("[liquidation-shield/monitor] AI error:", err);
    }
  }

  return NextResponse.json({
    ...monitorResult,
    config,
    rescueSimulations,
    aiAnalysis,
  });
}
