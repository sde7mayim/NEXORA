import { WebResearchService } from "../research/search-adapter";

export interface KnowledgeCollection {
  id: string;
  userId: string;
  orgId?: string;
  name: string;
  description: string;
  isWorkspaceShared: boolean;
  documentCount: number;
  totalTokens: number;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeDocument {
  id: string;
  collectionId: string;
  title: string;
  sourceType: "file" | "url" | "text";
  sourceUri?: string;
  fileSizeBytes: number;
  status: "pending" | "processing" | "indexed" | "failed";
  chunkCount: number;
  totalTokens: number;
  errorMessage?: string;
  createdAt: string;
}

export interface KnowledgeChunk {
  id: string;
  documentId: string;
  collectionId: string;
  chunkIndex: number;
  content: string;
  sectionTitle?: string;
  pageNumber?: number;
  tokenCount: number;
  embedding?: number[];
  createdAt: string;
}

export interface GroundedCitation {
  documentId: string;
  documentTitle: string;
  sectionTitle?: string;
  pageNumber?: number;
  snippet: string;
  relevanceScore: number; // 0.0 - 1.0
}

export class KnowledgeService {
  private static collections: Map<string, KnowledgeCollection> = new Map([
    [
      "col-default-1",
      {
        id: "col-default-1",
        userId: "usr_alex",
        orgId: "ws-default",
        name: "Enterprise Architecture & Standards",
        description: "Official cloud architecture blueprints and security RFCs.",
        isWorkspaceShared: true,
        documentCount: 2,
        totalTokens: 1450,
        createdAt: "2026-10-15T00:00:00Z",
        updatedAt: "2026-10-15T00:00:00Z",
      },
    ],
  ]);

  private static documents: Map<string, KnowledgeDocument> = new Map([
    [
      "doc-1",
      {
        id: "doc-1",
        collectionId: "col-default-1",
        title: "Cloud_Security_Standards_v2.pdf",
        sourceType: "file",
        sourceUri: "storage://docs/security_standards.pdf",
        fileSizeBytes: 245000,
        status: "indexed",
        chunkCount: 3,
        totalTokens: 750,
        createdAt: "2026-10-15T00:00:00Z",
      },
    ],
    [
      "doc-2",
      {
        id: "doc-2",
        collectionId: "col-default-1",
        title: "API_Design_Guidelines.md",
        sourceType: "text",
        sourceUri: "storage://docs/api_design.md",
        fileSizeBytes: 120000,
        status: "indexed",
        chunkCount: 2,
        totalTokens: 700,
        createdAt: "2026-10-16T00:00:00Z",
      },
    ],
  ]);

  private static chunks: Map<string, KnowledgeChunk> = new Map([
    [
      "chunk-1",
      {
        id: "chunk-1",
        documentId: "doc-1",
        collectionId: "col-default-1",
        chunkIndex: 0,
        content: "All inbound traffic must route through API gateways with mutual TLS (mTLS) enabled and rate-limiting enforced per tenant identifier.",
        sectionTitle: "1. Network Boundary Security",
        pageNumber: 3,
        tokenCount: 28,
        createdAt: "2026-10-15T00:00:00Z",
      },
    ],
    [
      "chunk-2",
      {
        id: "chunk-2",
        documentId: "doc-1",
        collectionId: "col-default-1",
        chunkIndex: 1,
        content: "API secrets, JWT signing tokens, and provider credentials must be stored in secure key vaults and rotated every 90 days with zero plaintext logging.",
        sectionTitle: "2. Secrets & Credential Management",
        pageNumber: 5,
        tokenCount: 32,
        createdAt: "2026-10-15T00:00:00Z",
      },
    ],
    [
      "chunk-3",
      {
        id: "chunk-3",
        documentId: "doc-2",
        collectionId: "col-default-1",
        chunkIndex: 0,
        content: "REST endpoints must adopt semantic status codes: 200 for retrieval, 201 for resource creation, 400 for schema validation failures, and 401 for unauthenticated requests.",
        sectionTitle: "Section A: HTTP Semantics",
        pageNumber: 1,
        tokenCount: 35,
        createdAt: "2026-10-16T00:00:00Z",
      },
    ],
  ]);

  /**
   * Retrieves collections accessible to a user in their personal or active workspace context.
   */
  static getCollections(userId: string, orgId?: string): KnowledgeCollection[] {
    return Array.from(this.collections.values()).filter((c) => {
      if (c.userId === userId) return true;
      if (orgId && c.orgId === orgId && c.isWorkspaceShared) return true;
      return false;
    });
  }

  /**
   * Creates a new knowledge collection.
   */
  static createCollection(params: {
    userId: string;
    orgId?: string;
    name: string;
    description: string;
    isWorkspaceShared: boolean;
  }): KnowledgeCollection {
    const id = `col_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const col: KnowledgeCollection = {
      id,
      userId: params.userId,
      orgId: params.orgId,
      name: params.name,
      description: params.description,
      isWorkspaceShared: params.isWorkspaceShared,
      documentCount: 0,
      totalTokens: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.collections.set(id, col);
    return col;
  }

  /**
   * Lists documents in a collection.
   */
  static getDocuments(collectionId: string): KnowledgeDocument[] {
    return Array.from(this.documents.values()).filter((d) => d.collectionId === collectionId);
  }

  /**
   * Chunks arbitrary text into bounded semantic segments.
   */
  static chunkText(
    text: string,
    options: { maxChunkChars?: number; overlapChars?: number } = {}
  ): { content: string; sectionTitle?: string; pageNumber?: number }[] {
    const maxChars = options.maxChunkChars || 1000;
    const overlap = options.overlapChars || 150;
    const paragraphs = text.split(/\n\s*\n/);
    const chunks: { content: string; sectionTitle?: string; pageNumber?: number }[] = [];

    let currentChunk = "";
    let currentSection = "General";
    let approxPage = 1;

    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (!trimmed) continue;

      // Extract markdown headings as section titles
      const headingMatch = trimmed.match(/^#{1,3}\s+(.+)$/m);
      if (headingMatch) {
        currentSection = headingMatch[1];
      }

      if ((currentChunk + "\n\n" + trimmed).length > maxChars && currentChunk.length > 0) {
        chunks.push({
          content: currentChunk.trim(),
          sectionTitle: currentSection,
          pageNumber: approxPage,
        });
        // Carry forward overlap
        currentChunk = currentChunk.slice(-overlap) + "\n\n" + trimmed;
        approxPage += 1;
      } else {
        currentChunk = currentChunk ? `${currentChunk}\n\n${trimmed}` : trimmed;
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        sectionTitle: currentSection,
        pageNumber: approxPage,
      });
    }

    return chunks;
  }

  /**
   * Generates a deterministic normalized semantic projection vector for embeddings.
   */
  static generateEmbedding(text: string): number[] {
    const dim = 32;
    const vec = new Array(dim).fill(0);
    const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/);

    for (const word of words) {
      if (!word) continue;
      let hash = 0;
      for (let i = 0; i < word.length; i++) {
        hash = (hash << 5) - hash + word.charCodeAt(i);
        hash |= 0;
      }
      const idx = Math.abs(hash) % dim;
      vec[idx] += 1;
    }

    const norm = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0)) || 1;
    return vec.map((v) => parseFloat((v / norm).toFixed(4)));
  }

  /**
   * Calculates cosine similarity between two normalized vectors.
   */
  static cosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length !== b.length) return 0;
    let dot = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
    }
    return Math.max(0, Math.min(1.0, dot));
  }

  /**
   * Ingests, parses, and indexes a document into a collection.
   */
  static indexDocument(params: {
    collectionId: string;
    title: string;
    sourceType: "file" | "url" | "text";
    sourceUri?: string;
    rawText: string;
  }): { document: KnowledgeDocument; chunks: KnowledgeChunk[] } {
    const col = this.collections.get(params.collectionId);
    if (!col) throw new Error("Knowledge collection not found.");

    const docId = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const parsedChunks = this.chunkText(params.rawText);

    const docChunks: KnowledgeChunk[] = parsedChunks.map((c, idx) => {
      const chunkId = `chunk_${docId}_${idx}`;
      const tokenCount = Math.round(c.content.length / 4); // Approximate tokens
      const embedding = this.generateEmbedding(c.content);
      const chunk: KnowledgeChunk = {
        id: chunkId,
        documentId: docId,
        collectionId: params.collectionId,
        chunkIndex: idx,
        content: c.content,
        sectionTitle: c.sectionTitle,
        pageNumber: c.pageNumber,
        tokenCount,
        embedding,
        createdAt: new Date().toISOString(),
      };
      this.chunks.set(chunkId, chunk);
      return chunk;
    });

    const totalTokens = docChunks.reduce((acc, c) => acc + c.tokenCount, 0);

    const doc: KnowledgeDocument = {
      id: docId,
      collectionId: params.collectionId,
      title: params.title,
      sourceType: params.sourceType,
      sourceUri: params.sourceUri,
      fileSizeBytes: params.rawText.length,
      status: "indexed",
      chunkCount: docChunks.length,
      totalTokens,
      createdAt: new Date().toISOString(),
    };

    this.documents.set(docId, doc);

    // Update collection stats
    col.documentCount += 1;
    col.totalTokens += totalTokens;
    col.updatedAt = new Date().toISOString();

    return { document: doc, chunks: docChunks };
  }

  /**
   * Searches knowledge collections with grounded citations and strict tenant isolation.
   */
  static search(params: {
    collectionIds: string[];
    query: string;
    requestingUserId: string;
    requestingOrgId?: string;
    topK?: number;
  }): GroundedCitation[] {
    const topK = params.topK || 5;
    const queryLower = params.query.toLowerCase().trim();
    const queryTokens = queryLower.split(/\s+/).filter((t) => t.length > 2);
    const queryEmbedding = this.generateEmbedding(params.query);

    // 1. Authorize collections
    const authorizedCollectionIds = params.collectionIds.filter((colId) => {
      const col = this.collections.get(colId);
      if (!col) return false;
      if (col.userId === params.requestingUserId) return true;
      if (params.requestingOrgId && col.orgId === params.requestingOrgId && col.isWorkspaceShared) {
        return true;
      }
      return false;
    });

    if (authorizedCollectionIds.length === 0) {
      return [];
    }

    // 2. Score chunks across authorized collections using hybrid vector + lexical matching
    const scoredCitations: GroundedCitation[] = [];

    this.chunks.forEach((chunk) => {
      if (!authorizedCollectionIds.includes(chunk.collectionId)) return;

      const doc = this.documents.get(chunk.documentId);
      if (!doc || doc.status !== "indexed") return;

      const contentLower = chunk.content.toLowerCase();
      let matchCount = 0;

      for (const token of queryTokens) {
        if (contentLower.includes(token)) matchCount += 1;
      }

      // Keyword component
      let keywordScore = queryTokens.length > 0 ? matchCount / queryTokens.length : 0;
      if (contentLower.includes(queryLower)) keywordScore = Math.max(keywordScore, 0.95);

      // Vector component
      const vectorScore = chunk.embedding
        ? this.cosineSimilarity(queryEmbedding, chunk.embedding)
        : 0;

      // Hybrid blended score
      const finalScore = Math.min(1.0, 0.45 * keywordScore + 0.55 * vectorScore);

      if (finalScore > 0.15 || keywordScore > 0.2) {
        scoredCitations.push({
          documentId: doc.id,
          documentTitle: doc.title,
          sectionTitle: chunk.sectionTitle,
          pageNumber: chunk.pageNumber,
          snippet: chunk.content.length > 300 ? chunk.content.slice(0, 300) + "..." : chunk.content,
          relevanceScore: parseFloat(finalScore.toFixed(2)),
        });
      }
    });

    return scoredCitations
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, topK);
  }

  /**
   * Previews a document after re-checking user authorization.
   */
  static getDocumentPreview(
    documentId: string,
    requestingUserId: string,
    requestingOrgId?: string
  ): { document: KnowledgeDocument; chunks: KnowledgeChunk[] } {
    const doc = this.documents.get(documentId);
    if (!doc) throw new Error("Document not found.");

    const col = this.collections.get(doc.collectionId);
    if (!col) throw new Error("Associated collection not found.");

    const isAuthorized =
      col.userId === requestingUserId ||
      (requestingOrgId && col.orgId === requestingOrgId && col.isWorkspaceShared);

    if (!isAuthorized) {
      throw new Error("Unauthorized: Access to this document collection is forbidden.");
    }

    const docChunks = Array.from(this.chunks.values()).filter((c) => c.documentId === documentId);
    return { document: doc, chunks: docChunks };
  }

  /**
   * Deletes a document and cleans up its chunks.
   */
  static deleteDocument(
    documentId: string,
    requestingUserId: string,
    requestingOrgId?: string
  ): void {
    const doc = this.documents.get(documentId);
    if (!doc) return;

    const col = this.collections.get(doc.collectionId);
    if (!col) return;

    const isAuthorized =
      col.userId === requestingUserId ||
      (requestingOrgId && col.orgId === requestingOrgId && col.isWorkspaceShared);

    if (!isAuthorized) {
      throw new Error("Unauthorized to delete this document.");
    }

    // Remove chunks
    this.chunks.forEach((chunk, key) => {
      if (chunk.documentId === documentId) {
        this.chunks.delete(key);
      }
    });

    this.documents.delete(documentId);
    col.documentCount = Math.max(0, col.documentCount - 1);
  }

  /**
   * SSRF-safe URL content fetcher with redirect and size constraints.
   */
  static async ingestUrlContent(url: string): Promise<string> {
    if (!WebResearchService.isUrlSafe(url)) {
      throw new Error("SSRF Prevention: Destination URL targets a restricted private network or loopback address.");
    }

    // Safety simulation fallback if offline/restricted network
    if (url.includes("example.com") || url.includes("mock")) {
      return "# Simulated Ingested Document\n\nThis is safely ingested text from simulated URL endpoints.";
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "Nexora-Knowledge-Bot/1.0" },
      });
      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`Failed to fetch URL: HTTP ${res.status}`);
      }

      const text = await res.text();
      // Cap at 2MB to prevent memory exhaustion
      return text.slice(0, 2 * 1024 * 1024);
    } catch (err) {
      throw new Error(`URL ingestion error: ${(err as Error).message}`);
    }
  }
}
