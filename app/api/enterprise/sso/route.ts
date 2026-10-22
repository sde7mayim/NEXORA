import { NextRequest, NextResponse } from "next/server";
import { SsoService } from "@/lib/enterprise/sso";
import { AuditLogger } from "@/lib/audit/logger";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId") || "ws-default";
    const config = SsoService.getConfig(orgId);
    return NextResponse.json({ config: config || null });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.action === "test_assertion") {
      const result = SsoService.validateInboundAssertion(body.orgId || "ws-default", {
        issuer: body.issuer,
        audience: body.audience,
        email: body.email,
        name: body.name,
        notBefore: body.notBefore,
        notOnOrAfter: body.notOnOrAfter,
      });
      return NextResponse.json({ result });
    }

    const {
      orgId = "ws-default",
      protocol = "saml",
      idpIssuer,
      ssoLoginUrl,
      certificatePem,
      clientId,
      clientSecret,
      verifyNow = false,
    } = body;

    if (!idpIssuer || !ssoLoginUrl) {
      return NextResponse.json(
        { error: "idpIssuer and ssoLoginUrl are required endpoints." },
        { status: 400 }
      );
    }

    const savedConfig = SsoService.saveConfig({
      orgId,
      protocol,
      idpIssuer,
      ssoLoginUrl,
      certificatePem,
      clientId,
      clientSecret,
    });

    if (verifyNow) {
      SsoService.verifyConfiguration(orgId);
      AuditLogger.log({
        orgId,
        actorId: "usr_alex",
        actorEmail: "alex@acme.com",
        action: "sso.verified",
        targetType: "sso_configuration",
        targetId: orgId,
        details: { protocol, idpIssuer },
      });
    }

    return NextResponse.json({ config: SsoService.getConfig(orgId) });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
