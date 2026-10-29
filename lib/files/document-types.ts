export type DocumentFileType =
  | "markdown"
  | "text"
  | "pdf"
  | "docx"
  | "csv"
  | "code"
  | "json"
  | "unsupported";

export interface DocumentSection {
  id: string;
  heading: string;
  level: number;
  content: string;
  pageNumber?: number;
  tablePresent: boolean;
  listPresent: boolean;
}

export interface DocumentStructure {
  headings: Array<{ level: number; title: string }>;
  sections: DocumentSection[];
  tablesCount: number;
  listsCount: number;
  wordCount: number;
  lineCount: number;
}

export interface ConversationDocument {
  id: string;
  conversationId: string;
  userId: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  fileType: DocumentFileType;
  fullText: string;
  summary: string;
  structure: DocumentStructure;
  version: number;
  isActive: boolean;
  uploadedAt: string;
  updatedAt: string;
}

export type QueryIntent =
  | "summarization"
  | "question_answering"
  | "information_extraction"
  | "explanation"
  | "comparison"
  | "analysis"
  | "lists_and_tables"
  | "step_by_step"
  | "recommendation"
  | "follow_up";

export interface DocumentRetrievalResult {
  targetDocument: ConversationDocument | null;
  intent: QueryIntent;
  mode: "full_document" | "targeted_sections" | "clarification_needed" | "no_document";
  retrievedSections: Array<{
    heading: string;
    content: string;
    relevanceScore: number;
    pageNumber?: number;
  }>;
  clarificationPrompt?: string;
  groundedSystemPrompt: string;
}

