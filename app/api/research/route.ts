import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { WebResearchService } from "@/lib/research/search-adapter";
import { EntitlementEngine } from "@/lib/entitlements/engine";
import { PlanTier } from "@/lib/entitlements/types";

const ResearchSchema = z.object({
  query: z.string().min(2).max(500),
  planTier: z.enum(["free", "pro", "enterprise"]).default("free"),
  maxResults: z.number().min(1).max(10).default(5),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = ResearchSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid research query", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { query, planTier, maxResults } = parsed.data;

    // Check plan research quota
    const quota = EntitlementEngine.checkResearchQuota(planTier as PlanTier, 0);
    if (!quota.allowed) {
      return NextResponse.json({ error: quota.reason }, { status: 429 });
    }

    const results = await WebResearchService.searchWeb(query, maxResults);

    return NextResponse.json({
      query,
      sourcesCount: results.length,
      sources: results,
      citations: results.map((r, i) => ({
        index: i + 1,
        title: r.title,
        url: r.url,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Web research failed" },
      { status: 500 }
    );
  }
}
