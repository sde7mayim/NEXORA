import { ModelCapabilities, NexoraModelRoute } from "./types";
import { createHash } from "crypto";

export type ModelPackageLifecycleStatus =
  | "draft"
  | "testing"
  | "published"
  | "deprecated"
  | "retired";

export interface ModelRouteDefinition {
  externalModelId: string;
  routeRole: "primary" | "fallback";
  priority: number;
  weight?: number;
}

export interface ModelReleasePackageManifest {
  packageId: string;
  modelFamily: "nexora-swift" | "nexora-core" | "nexora-reason" | "nexora-vision" | string;
  version: string; // e.g. "1.0.0"
  displayName: string;
  description: string;
  releaseNotes: string;
  changelog: string[];
  compatibleAppVersions: string; // semver constraint e.g. ">=0.4.0"
  capabilities: ModelCapabilities;
  routes: ModelRouteDefinition[];
  status: ModelPackageLifecycleStatus;
  author: string;
  createdAt: string;
  publishedAt?: string;
  checksum?: string;
}

export interface ModelPackageAuditEntry {
  id: string;
  timestamp: string;
  action: "create_draft" | "publish" | "deprecate" | "retire" | "rollback" | "validate";
  packageId: string;
  modelFamily: string;
  version: string;
  actor: string;
  details: string;
  previousVersion?: string;
}

export interface VersionDiff {
  packageIdA: string;
  packageIdB: string;
  versionA: string;
  versionB: string;
  capabilityChanges: Record<string, { from: boolean; to: boolean }>;
  routeChanges: {
    addedRoutes: ModelRouteDefinition[];
    removedRoutes: ModelRouteDefinition[];
    priorityChanged: Array<{ modelId: string; from: number; to: number }>;
  };
  notesChanged: boolean;
}

/**
 * Seed repository of official Nexora release packages.
 */
const INITIAL_PACKAGES: ModelReleasePackageManifest[] = [
  {
    packageId: "pkg-nexora-swift-1.0.0",
    modelFamily: "nexora-swift",
    version: "1.0.0",
    displayName: "Nexora Swift 1.0",
    description: "Ultra-low latency streaming model engineered for rapid assistance, writing, and summaries.",
    releaseNotes: "Initial general availability release of Nexora Swift with Anthropic Haiku primary routing and multi-cloud fallback.",
    changelog: [
      "Sub-400ms initial token latency via Claude 3.5 Haiku",
      "Seamless failover to GPT-4o-mini and Gemini 1.5 Flash",
      "Full JSON output and web search tool support",
    ],
    compatibleAppVersions: ">=0.4.0",
    capabilities: {
      supportsStreaming: true,
      supportsTools: true,
      supportsVision: false,
      supportsDocumentInput: true,
      supportsWebSearch: true,
      supportsJsonOutput: true,
    },
    routes: [
      { externalModelId: "anthropic:claude-3-5-haiku", routeRole: "primary", priority: 1 },
      { externalModelId: "openai:gpt-4o-mini", routeRole: "fallback", priority: 2 },
      { externalModelId: "gemini:gemini-1.5-flash", routeRole: "fallback", priority: 3 },
    ],
    status: "published",
    author: "Nexora AI Platform Team",
    createdAt: "2026-10-21T00:00:00Z",
    publishedAt: "2026-10-21T00:00:00Z",
  },
  {
    packageId: "pkg-nexora-core-1.0.0",
    modelFamily: "nexora-core",
    version: "1.0.0",
    displayName: "Nexora Core 1.0",
    description: "Balanced, general-purpose multi-modal intelligence for daily workflows, coding, and document analysis.",
    releaseNotes: "Initial general availability release of Nexora Core with 1M token context capacity.",
    changelog: [
      "High-throughput Gemini 1.5 Flash primary engine",
      "Cross-vendor fallback to GPT-4o-mini and Claude 3.5 Haiku",
      "Comprehensive multi-modal document reasoning",
    ],
    compatibleAppVersions: ">=0.4.0",
    capabilities: {
      supportsStreaming: true,
      supportsTools: true,
      supportsVision: true,
      supportsDocumentInput: true,
      supportsWebSearch: true,
      supportsJsonOutput: true,
    },
    routes: [
      { externalModelId: "gemini:gemini-1.5-flash", routeRole: "primary", priority: 1 },
      { externalModelId: "openai:gpt-4o-mini", routeRole: "fallback", priority: 2 },
      { externalModelId: "anthropic:claude-3-5-haiku", routeRole: "fallback", priority: 3 },
    ],
    status: "published",
    author: "Nexora AI Platform Team",
    createdAt: "2026-10-21T00:00:00Z",
    publishedAt: "2026-10-21T00:00:00Z",
  },
  {
    packageId: "pkg-nexora-reason-1.0.0",
    modelFamily: "nexora-reason",
    version: "1.0.0",
    displayName: "Nexora Reason 1.0",
    description: "Deep analytical intelligence engineered for multi-step math, architectural planning, and code synthesis.",
    releaseNotes: "Initial general availability release of Nexora Reason with Claude 3.5 Sonnet advanced reasoning engine.",
    changelog: [
      "Industry-leading reasoning and synthesis via Claude 3.5 Sonnet",
      "Enterprise fallback to GPT-4o flagship and Gemini 1.5 Pro",
      "Comprehensive multi-step code analysis and tool execution",
    ],
    compatibleAppVersions: ">=0.4.0",
    capabilities: {
      supportsStreaming: true,
      supportsTools: true,
      supportsVision: true,
      supportsDocumentInput: true,
      supportsWebSearch: true,
      supportsJsonOutput: true,
    },
    routes: [
      { externalModelId: "anthropic:claude-3-5-sonnet", routeRole: "primary", priority: 1 },
      { externalModelId: "openai:gpt-4o", routeRole: "fallback", priority: 2 },
      { externalModelId: "gemini:gemini-1.5-pro", routeRole: "fallback", priority: 3 },
    ],
    status: "published",
    author: "Nexora AI Platform Team",
    createdAt: "2026-10-21T00:00:00Z",
    publishedAt: "2026-10-21T00:00:00Z",
  },
  {
    packageId: "pkg-nexora-vision-1.0.0",
    modelFamily: "nexora-vision",
    version: "1.0.0",
    displayName: "Nexora Vision 1.0",
    description: "High-acuity multimodal reasoning across complex diagrams, UI mockups, documents, and technical imagery.",
    releaseNotes: "Initial general availability release of Nexora Vision with GPT-4o multi-modal visual analysis.",
    changelog: [
      "High-resolution image understanding via GPT-4o Omni",
      "Secondary visual document verification via Claude 3.5 Sonnet",
      "Large-format diagram and technical document interpretation",
    ],
    compatibleAppVersions: ">=0.4.0",
    capabilities: {
      supportsStreaming: true,
      supportsTools: true,
      supportsVision: true,
      supportsDocumentInput: true,
      supportsWebSearch: true,
      supportsJsonOutput: true,
    },
    routes: [
      { externalModelId: "openai:gpt-4o", routeRole: "primary", priority: 1 },
      { externalModelId: "anthropic:claude-3-5-sonnet", routeRole: "fallback", priority: 2 },
      { externalModelId: "gemini:gemini-1.5-flash", routeRole: "fallback", priority: 3 },
    ],
    status: "published",
    author: "Nexora AI Platform Team",
    createdAt: "2026-10-21T00:00:00Z",
    publishedAt: "2026-10-21T00:00:00Z",
  },
];

export class ModelReleasePackageManager {
  private static packages: Map<string, ModelReleasePackageManifest> = new Map();
  private static activeFamilyVersions: Map<string, string> = new Map(); // familySlug -> packageId
  private static auditLogs: ModelPackageAuditEntry[] = [];
  private static initialized = false;

  private static ensureInitialized() {
    if (this.initialized) return;
    for (const pkg of INITIAL_PACKAGES) {
      pkg.checksum = this.calculateChecksum(pkg);
      this.packages.set(pkg.packageId, { ...pkg });
      if (pkg.status === "published") {
        this.activeFamilyVersions.set(pkg.modelFamily, pkg.packageId);
      }
    }
    this.initialized = true;
  }

  /**
   * Generates a deterministic SHA-256 checksum of manifest contents.
   */
  static calculateChecksum(manifest: Omit<ModelReleasePackageManifest, "checksum">): string {
    const payload = JSON.stringify({
      packageId: manifest.packageId,
      modelFamily: manifest.modelFamily,
      version: manifest.version,
      capabilities: manifest.capabilities,
      routes: manifest.routes,
      compatibleAppVersions: manifest.compatibleAppVersions,
    });
    return createHash("sha256").update(payload).digest("hex");
  }

  /**
   * Validates manifest structure, route integrity, and semver compliance.
   */
  static validateManifest(manifest: Partial<ModelReleasePackageManifest>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!manifest.packageId || typeof manifest.packageId !== "string") {
      errors.push("Missing or invalid packageId.");
    }
    if (!manifest.modelFamily || typeof manifest.modelFamily !== "string") {
      errors.push("Missing or invalid modelFamily.");
    }
    if (!manifest.version || !/^\d+\.\d+\.\d+$/.test(manifest.version)) {
      errors.push("Version must follow strict Semantic Versioning (e.g. 1.0.0).");
    }
    if (!manifest.displayName || manifest.displayName.trim().length === 0) {
      errors.push("Display name is required.");
    }
    if (!manifest.routes || !Array.isArray(manifest.routes) || manifest.routes.length === 0) {
      errors.push("Manifest must declare at least one route definition.");
    } else {
      const hasPrimary = manifest.routes.some((r) => r.routeRole === "primary");
      if (!hasPrimary) {
        errors.push("Manifest routes must include at least one primary route target.");
      }
    }
    if (!manifest.capabilities) {
      errors.push("Capabilities specification is required.");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Returns all available packages in the repository.
   */
  static listPackages(filter?: {
    family?: string;
    status?: ModelPackageLifecycleStatus;
  }): ModelReleasePackageManifest[] {
    this.ensureInitialized();
    let list = Array.from(this.packages.values());
    if (filter?.family) {
      list = list.filter((p) => p.modelFamily === filter.family);
    }
    if (filter?.status) {
      list = list.filter((p) => p.status === filter.status);
    }
    return list;
  }

  /**
   * Retrieves a package by its ID.
   */
  static getPackage(packageId: string): ModelReleasePackageManifest | undefined {
    this.ensureInitialized();
    return this.packages.get(packageId);
  }

  /**
   * Retrieves the currently active published package for a given family.
   */
  static getActivePackageForFamily(familySlug: string): ModelReleasePackageManifest | undefined {
    this.ensureInitialized();
    const pkgId = this.activeFamilyVersions.get(familySlug);
    if (!pkgId) return undefined;
    return this.packages.get(pkgId);
  }

  /**
   * Registers and publishes a new release package manifest.
   */
  static publishPackage(
    manifest: ModelReleasePackageManifest,
    actor: string
  ): { success: boolean; error?: string; package?: ModelReleasePackageManifest } {
    this.ensureInitialized();

    const validation = this.validateManifest(manifest);
    if (!validation.valid) {
      return { success: false, error: validation.errors.join("; ") };
    }

    const existing = this.packages.get(manifest.packageId);
    if (existing && existing.status === "published") {
      return {
        success: false,
        error: `Published package '${manifest.packageId}' is immutable. Create a new version to publish updates.`,
      };
    }

    const previousPkgId = this.activeFamilyVersions.get(manifest.modelFamily);
    const previousPkg = previousPkgId ? this.packages.get(previousPkgId) : undefined;

    const publishedPkg: ModelReleasePackageManifest = {
      ...manifest,
      status: "published",
      publishedAt: new Date().toISOString(),
      checksum: this.calculateChecksum(manifest),
    };

    this.packages.set(publishedPkg.packageId, publishedPkg);
    this.activeFamilyVersions.set(publishedPkg.modelFamily, publishedPkg.packageId);

    // Record audit log
    this.auditLogs.unshift({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      action: "publish",
      packageId: publishedPkg.packageId,
      modelFamily: publishedPkg.modelFamily,
      version: publishedPkg.version,
      actor,
      details: `Published model package ${publishedPkg.displayName} (${publishedPkg.version}).`,
      previousVersion: previousPkg?.version,
    });

    return { success: true, package: publishedPkg };
  }

  /**
   * Rolls back a model family to a previous published package version.
   */
  static rollback(
    familySlug: string,
    targetVersion: string,
    actor: string,
    reason?: string
  ): { success: boolean; error?: string; activePackage?: ModelReleasePackageManifest } {
    this.ensureInitialized();

    const candidate = Array.from(this.packages.values()).find(
      (p) => p.modelFamily === familySlug && p.version === targetVersion
    );

    if (!candidate) {
      return {
        success: false,
        error: `No package found for family '${familySlug}' with version '${targetVersion}'.`,
      };
    }

    const currentPkgId = this.activeFamilyVersions.get(familySlug);
    const currentPkg = currentPkgId ? this.packages.get(currentPkgId) : undefined;

    this.activeFamilyVersions.set(familySlug, candidate.packageId);

    this.auditLogs.unshift({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      action: "rollback",
      packageId: candidate.packageId,
      modelFamily: familySlug,
      version: targetVersion,
      actor,
      details: `Rolled back family '${familySlug}' to version ${targetVersion}. Reason: ${reason || "Operational rollback."}`,
      previousVersion: currentPkg?.version,
    });

    return { success: true, activePackage: candidate };
  }

  /**
   * Compares two package versions and returns a detailed diff.
   */
  static compareVersions(packageIdA: string, packageIdB: string): VersionDiff | null {
    this.ensureInitialized();
    const pkgA = this.packages.get(packageIdA);
    const pkgB = this.packages.get(packageIdB);
    if (!pkgA || !pkgB) return null;

    const capKeys = Object.keys(pkgA.capabilities) as Array<keyof ModelCapabilities>;
    const capabilityChanges: Record<string, { from: boolean; to: boolean }> = {};
    for (const k of capKeys) {
      if (pkgA.capabilities[k] !== pkgB.capabilities[k]) {
        capabilityChanges[k] = { from: pkgA.capabilities[k], to: pkgB.capabilities[k] };
      }
    }

    const mapA = new Map(pkgA.routes.map((r) => [r.externalModelId, r]));
    const mapB = new Map(pkgB.routes.map((r) => [r.externalModelId, r]));

    const addedRoutes: ModelRouteDefinition[] = [];
    const removedRoutes: ModelRouteDefinition[] = [];
    const priorityChanged: Array<{ modelId: string; from: number; to: number }> = [];

    for (const [id, rB] of Array.from(mapB.entries())) {
      const rA = mapA.get(id);
      if (!rA) {
        addedRoutes.push(rB);
      } else if (rA.priority !== rB.priority) {
        priorityChanged.push({ modelId: id, from: rA.priority, to: rB.priority });
      }
    }
    for (const [id, rA] of Array.from(mapA.entries())) {
      if (!mapB.has(id)) {
        removedRoutes.push(rA);
      }
    }

    return {
      packageIdA,
      packageIdB,
      versionA: pkgA.version,
      versionB: pkgB.version,
      capabilityChanges,
      routeChanges: { addedRoutes, removedRoutes, priorityChanged },
      notesChanged: pkgA.releaseNotes !== pkgB.releaseNotes,
    };
  }

  /**
   * Retrieves immutable audit log of release changes.
   */
  static getAuditLogs(): ModelPackageAuditEntry[] {
    this.ensureInitialized();
    return [...this.auditLogs];
  }
}
