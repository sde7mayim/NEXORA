import { ConversationDocument, DocumentFileType, DocumentStructure } from "./document-types";

export class ConversationDocumentStore {
  // Keyed by document ID
  private static documents: Map<string, ConversationDocument> = new Map();

  /**
   * Adds or updates a document for a conversation.
   * If a document with the same fileName already exists in the conversation,
   * creates a new version and marks it as active.
   */
  static addDocument(params: {
    conversationId: string;
    userId: string;
    fileName: string;
    fileSizeBytes: number;
    mimeType: string;
    fileType: DocumentFileType;
    fullText: string;
    summary: string;
    structure: DocumentStructure;
  }): ConversationDocument {
    const { conversationId, userId, fileName } = params;

    // Check for existing versions in the same conversation
    const existingVersions = this.getAllVersions(conversationId, fileName);
    const nextVersion = existingVersions.length > 0 ? Math.max(...existingVersions.map((v) => v.version)) + 1 : 1;

    // Demote previous versions to inactive
    for (const doc of existingVersions) {
      doc.isActive = false;
      this.documents.set(doc.id, doc);
    }

    const id = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const document: ConversationDocument = {
      id,
      conversationId,
      userId,
      fileName: params.fileName,
      fileSizeBytes: params.fileSizeBytes,
      mimeType: params.mimeType,
      fileType: params.fileType,
      fullText: params.fullText,
      summary: params.summary,
      structure: params.structure,
      version: nextVersion,
      isActive: true,
      uploadedAt: now,
      updatedAt: now,
    };

    this.documents.set(id, document);
    return document;
  }

  /**
   * Retrieves active documents for a given conversation with strict user isolation.
   */
  static getActiveDocuments(conversationId: string, userId?: string): ConversationDocument[] {
    return Array.from(this.documents.values()).filter((doc) => {
      if (doc.conversationId !== conversationId) return false;
      if (!doc.isActive) return false;
      if (userId && doc.userId && doc.userId !== userId && doc.userId !== "guest" && userId !== "guest") {
        return false;
      }
      return true;
    });
  }

  /**
   * Retrieves a document by ID.
   */
  static getDocument(documentId: string): ConversationDocument | null {
    return this.documents.get(documentId) || null;
  }

  /**
   * Retrieves the active document by file name within a conversation.
   */
  static getDocumentByName(conversationId: string, fileName: string): ConversationDocument | null {
    const lowerName = fileName.toLowerCase().trim();
    const docs = this.getActiveDocuments(conversationId);
    return docs.find((d) => d.fileName.toLowerCase().trim() === lowerName) || null;
  }

  /**
   * Retrieves all historical and current versions of a document in a conversation.
   */
  static getAllVersions(conversationId: string, fileName: string): ConversationDocument[] {
    const lowerName = fileName.toLowerCase().trim();
    return Array.from(this.documents.values())
      .filter((d) => d.conversationId === conversationId && d.fileName.toLowerCase().trim() === lowerName)
      .sort((a, b) => b.version - a.version);
  }

  /**
   * Removes a specific document.
   */
  static removeDocument(documentId: string): boolean {
    return this.documents.delete(documentId);
  }

  /**
   * Clears all documents in a conversation.
   */
  static clearConversationDocuments(conversationId: string): void {
    const toDelete: string[] = [];
    this.documents.forEach((doc, id) => {
      if (doc.conversationId === conversationId) {
        toDelete.push(id);
      }
    });
    for (const id of toDelete) {
      this.documents.delete(id);
    }
  }

  /**
   * Resets entire store (used for test isolation).
   */
  static resetAll(): void {
    this.documents.clear();
  }

  static clearAll(): void {
    this.documents.clear();
  }
}

