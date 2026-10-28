import { describe, it, expect, beforeEach } from "vitest";
import { ModelReleasePackageManager, ModelReleasePackageManifest } from "../../lib/ai/model-packages";

describe("ModelReleasePackageManager", () => {
  it("initializes with official published packages", () => {
    const pkgs = ModelReleasePackageManager.listPackages();
    expect(pkgs.length).toBeGreaterThanOrEqual(4);

    const swift = ModelReleasePackageManager.getActivePackageForFamily("nexora-swift");
    expect(swift).toBeDefined();
    expect(swift?.version).toBe("1.0.0");
    expect(swift?.status).toBe("published");
  });

  it("calculates deterministic SHA-256 checksums", () => {
    const pkg = ModelReleasePackageManager.getActivePackageForFamily("nexora-core");
    expect(pkg).toBeDefined();
    if (!pkg) return;

    const hash1 = ModelReleasePackageManager.calculateChecksum(pkg);
    const hash2 = ModelReleasePackageManager.calculateChecksum(pkg);
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // SHA-256 hex string
  });

  it("validates manifest structure and rejects invalid versions", () => {
    const invalidPkg: Partial<ModelReleasePackageManifest> = {
      packageId: "test-invalid",
      modelFamily: "nexora-swift",
      version: "invalid_semver", // Invalid
      displayName: "",
      routes: [],
    };

    const res = ModelReleasePackageManager.validateManifest(invalidPkg);
    expect(res.valid).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
  });

  it("enforces immutability on published packages", () => {
    const existing = ModelReleasePackageManager.getActivePackageForFamily("nexora-swift");
    expect(existing).toBeDefined();
    if (!existing) return;

    // Attempting to re-publish the exact same published packageId
    const res = ModelReleasePackageManager.publishPackage(existing, "attacker");
    expect(res.success).toBe(false);
    expect(res.error).toContain("immutable");
  });

  it("supports rolling back a model family to an active version with audit logging", () => {
    const res = ModelReleasePackageManager.rollback(
      "nexora-swift",
      "1.0.0",
      "Joshua Suriyan N",
      "Verified stable performance"
    );

    expect(res.success).toBe(true);
    expect(res.activePackage?.version).toBe("1.0.0");

    const logs = ModelReleasePackageManager.getAuditLogs();
    const rollbackLog = logs.find((l) => l.action === "rollback" && l.modelFamily === "nexora-swift");
    expect(rollbackLog).toBeDefined();
    expect(rollbackLog?.actor).toBe("Joshua Suriyan N");
  });

  it("compares two versions and computes accurate diffs", () => {
    const diff = ModelReleasePackageManager.compareVersions(
      "pkg-nexora-swift-1.0.0",
      "pkg-nexora-core-1.0.0"
    );

    expect(diff).not.toBeNull();
    expect(diff?.versionA).toBe("1.0.0");
    expect(diff?.versionB).toBe("1.0.0");
    expect(diff?.routeChanges.priorityChanged.length).toBeGreaterThan(0);
  });
});
