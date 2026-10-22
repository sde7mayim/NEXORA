import { NextRequest, NextResponse } from "next/server";
import { ApiKeyService } from "@/lib/developer/api-keys";
import { ModelRegistry, NEXORA_MODEL_FAMILIES } from "@/lib/ai/model-registry";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const apiKey = authHeader.replace(/^Bearer\s+/i, "").trim();

  // Validate API key with models:read scope
  const auth = ApiKeyService.authenticateKey(apiKey, "models:read");
  if (!auth.valid) {
    return NextResponse.json({ error: { message: auth.error, type: "authentication_error" } }, { status: 401 });
  }

  // Format OpenAI-compatible model list
  const models = NEXORA_MODEL_FAMILIES.map((family) => {
    const primaryVersion = ModelRegistry.getModelVersion(`${family.slug}@1.0.0`);
    return {
      id: family.slug,
      object: "model",
      created: 1729500000,
      owned_by: "nexora",
      permission: [],
      root: family.slug,
      parent: null,
      description: family.description,
      version: primaryVersion?.versionLabel || "1.0",
      capabilities: primaryVersion?.capabilities || {},
    };
  });

  return NextResponse.json({ object: "list", data: models });
}
