import { NextRequest, NextResponse } from "next/server";
import { ModelRegistry } from "@/lib/ai/model-registry";
import { PlanTier } from "@/lib/entitlements/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const plan = (searchParams.get("plan") || "free") as PlanTier;

  const eligible = ModelRegistry.getEligibleModelsForPlan(plan);

  return NextResponse.json({
    plan,
    nexoraModels: eligible.nexoraModels,
    externalModels: eligible.externalModels,
  });
}
