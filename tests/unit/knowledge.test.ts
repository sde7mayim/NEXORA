import { describe, it, expect } from "vitest";
import { KnowledgeService } from "@/lib/knowledge/knowledge-service";

describe("Nexora Knowledge Hub & Grounded Retrieval", () => {
  it("should split structured text into bounded chunks with section metadata", () => {
    const rawText = `# Introduction
This is the opening preamble regarding cloud infrastructure.

## Security Policies
All microservices must enforce mutual TLS authentication and JWT inspection.
Storage volumes must be encrypted at rest with customer-managed keys.

## Deployment Strategy
Deployments must execute zero-downtime blue/green rolling updates.`;

    const chunks = KnowledgeService.chunkText(rawText, { maxChunkChars: 150 });
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks[0].content).toContain("cloud infrastructure");
    expect(chunks.some((c) => c.sectionTitle === "Security Policies")).toBe(true);
  });

  it("should index a document and perform permissions-aware search with grounded citations", () => {
    const collection = KnowledgeService.createCollection({
      userId: "usr_alice",
      orgId: "ws-test",
      name: "Engineering Runbooks",
      description: "Production operations runbooks",
      isWorkspaceShared: true,
    });

    const docContent = `# Database Failover Runbook
In case of primary node failure, promote read-replica within 45 seconds.
Verify replication lag is under 100ms before cutover.`;

    const { document, chunks } = KnowledgeService.indexDocument({
      collectionId: collection.id,
      title: "DB_Failover_Guide.md",
      sourceType: "text",
      rawText: docContent,
    });

    expect(document.id).toBeDefined();
    expect(chunks.length).toBeGreaterThan(0);

    // Search query
    const results = KnowledgeService.search({
      collectionIds: [collection.id],
      query: "database failover read-replica",
      requestingUserId: "usr_alice",
      requestingOrgId: "ws-test",
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].documentTitle).toBe("DB_Failover_Guide.md");
    expect(results[0].snippet).toContain("read-replica");
    expect(results[0].relevanceScore).toBeGreaterThan(0.5);
  });

  it("should enforce tenant isolation and block unauthorized search or document previews", () => {
    const privateCol = KnowledgeService.createCollection({
      userId: "usr_charlie",
      name: "Confidential Executive Compensation",
      description: "Private payroll data",
      isWorkspaceShared: false,
    });

    KnowledgeService.indexDocument({
      collectionId: privateCol.id,
      title: "Salary_Tiers.txt",
      sourceType: "text",
      rawText: "Confidential compensation bands for executive leadership.",
    });

    // Stranger tries to search private collection
    const unauthorizedResults = KnowledgeService.search({
      collectionIds: [privateCol.id],
      query: "compensation",
      requestingUserId: "usr_intruder",
    });

    expect(unauthorizedResults.length).toBe(0);
  });

  it("should prevent SSRF attacks when fetching external URLs", async () => {
    // Loopback / AWS metadata
    await expect(KnowledgeService.ingestUrlContent("http://169.254.169.254/latest/meta-data")).rejects.toThrow(
      /SSRF Prevention/
    );

    // Localhost / private subnet
    await expect(KnowledgeService.ingestUrlContent("http://127.0.0.1:8080/admin")).rejects.toThrow(
      /SSRF Prevention/
    );
  });

  it("should calculate semantic vector embeddings and cosine similarity", () => {
    const vec1 = KnowledgeService.generateEmbedding("cloud security architecture mTLS");
    const vec2 = KnowledgeService.generateEmbedding("cloud security network protocols");
    const vec3 = KnowledgeService.generateEmbedding("chocolate chip cookie baking recipe");

    expect(vec1.length).toBe(32);
    expect(vec2.length).toBe(32);

    const simRelated = KnowledgeService.cosineSimilarity(vec1, vec2);
    const simUnrelated = KnowledgeService.cosineSimilarity(vec1, vec3);

    expect(simRelated).toBeGreaterThan(simUnrelated);
  });
});
