import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { WebResearchService } from "@/lib/research/search-adapter";
import { EntitlementEngine } from "@/lib/entitlements/engine";
import { PlanTier } from "@/lib/entitlements/types";

const ResearchSchema = z.object({
  query: z.string().min(2).max(500),
  planTier: z.enum(["free", "pro", "family", "enterprise"]).default("free"),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(30).default(10),
  sortBy: z.enum(["relevance", "date"]).default("relevance"),
  maxResults: z.number().min(1).max(50).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = ResearchSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid research query parameters", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { query, planTier, page, pageSize, sortBy, maxResults } = parsed.data;

    // Check plan research quota
    const quota = EntitlementEngine.checkResearchQuota(planTier as PlanTier, 0);
    if (!quota.allowed) {
      return NextResponse.json({ error: quota.reason }, { status: 429 });
    }

    const effectivePageSize = maxResults || pageSize;

    const research = await WebResearchService.executeBroadResearch({
      query,
      page,
      pageSize: effectivePageSize,
      sortBy,
      maxCandidates: 45,
    });

    return NextResponse.json({
      query: research.query,
      queryType: research.queryType,
      subqueries: research.subqueries,
      totalResults: research.totalResults,
      sourcesCount: research.sources.length,
      page: research.page,
      pageSize: research.pageSize,
      hasMore: research.hasMore,
      sources: research.sources,
      citations: research.citations,
      provider: research.provider,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Web research failed" },
      { status: 500 }
    );
  }
}
