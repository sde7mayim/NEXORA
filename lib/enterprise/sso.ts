import crypto from "crypto";

export type SsoProtocol = "saml" | "oidc";

export interface SsoConfiguration {
  orgId: string;
  protocol: SsoProtocol;
  idpIssuer: string;
  ssoLoginUrl: string;
  spEntityId: string;
  acsUrl: string;
  certificatePem?: string;
  clientId?: string;
  clientSecretConfigured: boolean;
  isActive: boolean;
  verifiedAt?: string;
  updatedAt: string;
}

export interface SsoValidationResult {
  valid: boolean;
  claims?: {
    email: string;
    name?: string;
    issuer: string;
    audience: string;
    sessionIndex?: string;
  };
  error?: string;
}

export class SsoService {
  private static configs: Map<string, SsoConfiguration> = new Map([
    [
      "ws-default",
      {
        orgId: "ws-default",
        protocol: "saml",
        idpIssuer: "https://identity.okta.com/app/exk12345/sso/saml",
        ssoLoginUrl: "https://identity.okta.com/app/exk12345/sso/saml/login",
        spEntityId: "https://app.nexora.ai/saml/sp",
        acsUrl: "https://app.nexora.ai/api/auth/sso/callback",
        certificatePem: "-----BEGIN CERTIFICATE-----\nMIIDXTCCAkWgAwIBAgIJAL0k7\n-----END CERTIFICATE-----",
        clientSecretConfigured: false,
        isActive: true,
        verifiedAt: "2026-10-10T12:00:00Z",
        updatedAt: "2026-10-10T12:00:00Z",
      },
    ],
  ]);

  /**
   * Generates a cryptographically random state and nonce pair to guard against CSRF & replay.
   */
  static generateAuthRequestParams(): { state: string; nonce: string } {
    return {
      state: crypto.randomBytes(16).toString("hex"),
      nonce: crypto.randomBytes(16).toString("hex"),
    };
  }

  /**
   * Retrieves SSO configuration for an organization.
   */
  static getConfig(orgId: string): SsoConfiguration | undefined {
    return this.configs.get(orgId);
  }

  /**
   * Updates or saves SSO configuration.
   */
  static saveConfig(params: {
    orgId: string;
    protocol: SsoProtocol;
    idpIssuer: string;
    ssoLoginUrl: string;
    certificatePem?: string;
    clientId?: string;
    clientSecret?: string;
  }): SsoConfiguration {
    // Protocol validation
    if (!params.idpIssuer.startsWith("http://") && !params.idpIssuer.startsWith("https://")) {
      throw new Error("Invalid IdP Issuer URI. Must be an HTTP(S) URL.");
    }
    if (!params.ssoLoginUrl.startsWith("http://") && !params.ssoLoginUrl.startsWith("https://")) {
      throw new Error("Invalid SSO Login URL. Must be an HTTP(S) URL.");
    }

    const config: SsoConfiguration = {
      orgId: params.orgId,
      protocol: params.protocol,
      idpIssuer: params.idpIssuer.trim(),
      ssoLoginUrl: params.ssoLoginUrl.trim(),
      spEntityId: "https://app.nexora.ai/saml/sp",
      acsUrl: "https://app.nexora.ai/api/auth/sso/callback",
      certificatePem: params.certificatePem?.trim(),
      clientId: params.clientId?.trim(),
      clientSecretConfigured: Boolean(params.clientSecret),
      isActive: false, // Must be verified before active
      updatedAt: new Date().toISOString(),
    };

    this.configs.set(params.orgId, config);
    return config;
  }

  /**
   * Validates inbound SAML/OIDC response tokens with clock skew, issuer, and audience validation.
   */
  static validateInboundAssertion(
    orgId: string,
    assertion: {
      issuer: string;
      audience: string;
      notBefore?: number;
      notOnOrAfter?: number;
      email: string;
      name?: string;
    }
  ): SsoValidationResult {
    const config = this.configs.get(orgId);
    if (!config) {
      return { valid: false, error: "SSO is not configured for this organization." };
    }

    // 1. Validate Issuer
    if (assertion.issuer !== config.idpIssuer) {
      return {
        valid: false,
        error: `SSO Issuer mismatch. Expected '${config.idpIssuer}', received '${assertion.issuer}'.`,
      };
    }

    // 2. Validate Audience / SP Entity ID
    if (assertion.audience !== config.spEntityId) {
      return {
        valid: false,
        error: `SSO Audience mismatch. Expected '${config.spEntityId}', received '${assertion.audience}'.`,
      };
    }

    // 3. Validate Time Claims & Clock Skew (60-second tolerance)
    const now = Math.floor(Date.now() / 1000);
    const clockSkewSeconds = 60;

    if (assertion.notBefore && now + clockSkewSeconds < assertion.notBefore) {
      return { valid: false, error: "SAML assertion is not yet valid (NotBefore claim violated)." };
    }

    if (assertion.notOnOrAfter && now - clockSkewSeconds >= assertion.notOnOrAfter) {
      return { valid: false, error: "SAML assertion has expired (NotOnOrAfter claim violated)." };
    }

    if (!assertion.email || !assertion.email.includes("@")) {
      return { valid: false, error: "Assertion is missing a valid NameID/email attribute." };
    }

    return {
      valid: true,
      claims: {
        email: assertion.email,
        name: assertion.name,
        issuer: assertion.issuer,
        audience: assertion.audience,
        sessionIndex: `sess_${Date.now()}`,
      },
    };
  }

  /**
   * Marks SSO configuration as verified and active.
   */
  static verifyConfiguration(orgId: string): SsoConfiguration {
    const config = this.configs.get(orgId);
    if (!config) throw new Error("SSO Configuration not found.");

    config.isActive = true;
    config.verifiedAt = new Date().toISOString();
    config.updatedAt = new Date().toISOString();
    return config;
  }
}
