import { NextRequest, NextResponse } from "next/server";
import { ApiKeyService } from "@/lib/developer/api-keys";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || "usr_alex";
    const orgId = searchParams.get("orgId") || "ws-default";

    const keys = ApiKeyService.getKeys(userId, orgId);
    const summary = ApiKeyService.getUsageSummary(userId);

    return NextResponse.json({ keys, summary });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, scopes, expiresInDays, userId = "usr_alex", orgId = "ws-default" } = body;

    if (!name) {
      return NextResponse.json({ error: "Key name is required." }, { status: 400 });
    }

    const result = ApiKeyService.createApiKey({
      name,
      scopes,
      expiresInDays,
      userId,
      orgId,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const keyId = searchParams.get("id");
    const userId = searchParams.get("userId") || "usr_alex";

    if (!keyId) {
      return NextResponse.json({ error: "keyId is required." }, { status: 400 });
    }

    ApiKeyService.revokeKey(keyId, userId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
