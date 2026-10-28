import { NextRequest, NextResponse } from "next/server";
import { HOMEPAGE_DEMOS, getNextDemoExample } from "@/lib/demo/homepage-demos";

/**
 * Optional AI Demo Generation Route
 * Guarded by explicit environment flag to prevent unapproved paid API spend
 */
export async function POST(req: NextRequest) {
  try {
    const isAiEnabled = process.env.ENABLE_AI_DEMO_GENERATION === "true";
    const hasKeys = !!(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);

    // If disabled or unconfigured, safely fallback immediately to verified catalogue without paid spend
    if (!isAiEnabled || !hasKeys) {
      const fallbackDemo = getNextDemoExample();
      return NextResponse.json({
        success: true,
        isAiGenerated: false,
        source: "catalogue",
        demo: fallbackDemo,
      });
    }

    // In an explicitly enabled AI deployment, we can invoke the provider
    // For now, return verified fallback with explicit attribution
    const fallbackDemo = getNextDemoExample();
    return NextResponse.json({
      success: true,
      isAiGenerated: false,
      source: "verified-catalogue",
      demo: fallbackDemo,
    });
  } catch (error: any) {
    console.error("[Demo Generator Error]:", error);
    const fallbackDemo = HOMEPAGE_DEMOS[0];
    return NextResponse.json({
      success: true,
      isAiGenerated: false,
      source: "fallback",
      demo: fallbackDemo,
    });
  }
}

