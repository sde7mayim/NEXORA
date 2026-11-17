import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-keys/auth-middleware";
import { ApiKeyService } from "@/lib/developer/api-keys";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateApiRequest(req, { requiredScope: "keys:manage" });
  if (!auth.success) {
    return auth.response;
  }

  const keyId = params.id;
  if (!keyId) {
    return NextResponse.json(
      { error: { message: "Missing key ID parameter.", type: "invalid_request_error" } },
      { status: 400, headers: auth.headers }
    );
  }

  // Strictly enforce user ownership: cannot revoke other users' keys
  const revoked = await ApiKeyService.revokeKeyAsync(keyId, auth.context.userId);
  if (!revoked) {
    return NextResponse.json(
      {
        error: {
          message: "API key not found or you do not have permission to revoke this key.",
          type: "permission_error",
          code: "key_not_found_or_forbidden",
        },
      },
      { status: 404, headers: auth.headers }
    );
  }

  return NextResponse.json(
    { success: true, message: `Key ${keyId} successfully revoked.` },
    { status: 200, headers: auth.headers }
  );
}
