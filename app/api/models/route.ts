import { NextRequest, NextResponse } from "next/server";
import { ModelRegistry } from "@/lib/ai/model-registry";
import { ModelRouter } from "@/lib/ai/router";
import { ProviderStatusService, AIProviderKey } from "@/lib/ai/provider-status";
import { PlanTier } from "@/lib/entitlements/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const plan = (searchParams.get("plan") || "free") as PlanTier;

  const eligible = ModelRegistry.getEligibleModelsForPlan(plan);
  const providerStatuses = ProviderStatusService.getSafeStatusSummary();
  const defaultModelId = ModelRouter.getDefaultModelSelection(plan);

  const enhancedExternalModels = eligible.externalModels.map((m) => {
    const isConfigured = ProviderStatusService.isConfigured(m.providerKey as AIProviderKey);
    const status = providerStatuses[m.providerKey as AIProviderKey]?.state || "not_configured";
    return {
      ...m,
      isConfigured,
      status,
    };
  });

  const enhancedNexoraModels = eligible.nexoraModels.map((f) => {
    const candidateRoutes = ModelRouter.resolveRoutes(f.slug, plan);
    const hasConfiguredProvider = candidateRoutes.some((r) =>
      ProviderStatusService.isConfigured(r.externalModel.providerKey as AIProviderKey)
    );
    return {
      ...f,
      isAvailable: hasConfiguredProvider,
    };
  });

  return NextResponse.json({
    plan,
    defaultModelId,
    providerStatuses,
    nexoraModels: enhancedNexoraModels,
    externalModels: enhancedExternalModels,
  });
}
