import { describe, it, expect } from "vitest";
import { AuditLogger } from "@/lib/audit/logger";
import { SsoService } from "@/lib/enterprise/sso";

describe("Enterprise Governance, Audit Logs & SSO Protocol", () => {
  it("should record immutable audit events and support search and CSV export", () => {
    const record = AuditLogger.log({
      orgId: "ws-test-org",
      actorId: "usr_auditor",
      actorEmail: "auditor@enterprise.com",
      action: "policy.updated",
      targetType: "spending_cap",
      targetId: "cap_1",
      details: { newCap: 75000 },
    });

    expect(record.id).toBeDefined();
    expect(record.timestamp).toBeDefined();

    const searchResults = AuditLogger.search({
      orgId: "ws-test-org",
      action: "policy.updated",
    });
    expect(searchResults.length).toBeGreaterThan(0);
    expect(searchResults[0].actorEmail).toBe("auditor@enterprise.com");

    const csv = AuditLogger.exportCsv("ws-test-org");
    expect(csv).toContain("Timestamp,Action,Actor");
    expect(csv).toContain("auditor@enterprise.com");
  });

  it("should validate SSO configuration parameters and reject malformed URIs", () => {
    expect(() => {
      SsoService.saveConfig({
        orgId: "ws-bad-uri",
        protocol: "saml",
        idpIssuer: "invalid-uri-scheme",
        ssoLoginUrl: "https://idp.example.com/sso",
      });
    }).toThrow(/Invalid IdP Issuer URI/);
  });

  it("should validate inbound SAML/OIDC assertions against issuer, audience, and time claims", () => {
    const config = SsoService.saveConfig({
      orgId: "ws-sso-verified",
      protocol: "saml",
      idpIssuer: "https://idp.okta.com/app/123",
      ssoLoginUrl: "https://idp.okta.com/app/123/sso",
    });

    const now = Math.floor(Date.now() / 1000);

    // 1. Valid Assertion
    const validResult = SsoService.validateInboundAssertion("ws-sso-verified", {
      issuer: "https://idp.okta.com/app/123",
      audience: config.spEntityId,
      email: "engineer@enterprise.com",
      name: "Lead Engineer",
      notBefore: now - 30,
      notOnOrAfter: now + 300,
    });

    expect(validResult.valid).toBe(true);
    expect(validResult.claims?.email).toBe("engineer@enterprise.com");

    // 2. Issuer Mismatch should fail
    const badIssuerResult = SsoService.validateInboundAssertion("ws-sso-verified", {
      issuer: "https://malicious-idp.com",
      audience: config.spEntityId,
      email: "engineer@enterprise.com",
    });
    expect(badIssuerResult.valid).toBe(false);
    expect(badIssuerResult.error).toContain("SSO Issuer mismatch");

    // 3. Expired Assertion should fail
    const expiredResult = SsoService.validateInboundAssertion("ws-sso-verified", {
      issuer: "https://idp.okta.com/app/123",
      audience: config.spEntityId,
      email: "engineer@enterprise.com",
      notOnOrAfter: now - 120, // Expired beyond 60s skew tolerance
    });
    expect(expiredResult.valid).toBe(false);
    expect(expiredResult.error).toContain("expired");
  });
});
