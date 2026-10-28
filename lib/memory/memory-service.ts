import { createServerSupabaseClient } from "../supabase/server";

export type MemoryCategory =
  | "skills_experience"
  | "career_goals"
  | "projects"
  | "preferences"
  | "language_style"
  | "user_instructions";

export interface UserMemoryItem {
  id: string;
  userId: string;
  category: MemoryCategory;
  key: string;
  structuredValue: Record<string, any>;
  summary: string;
  sourceType: "conversation" | "file" | "explicit_correction" | "manual";
  sourceReference?: string;
  confidence: "confirmed" | "inferred";
  status: "active" | "superseded" | "archived";
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
}

export interface MemoryRevision {
  id: string;
  memoryId: string;
  userId: string;
  previousValue: any;
  newValue: any;
  changeReason: string;
  sourceReference?: string;
  approved: boolean;
  createdAt: string;
}

export interface MemoryPreferences {
  userId: string;
  memoryEnabled: boolean;
  requireConfirmation: boolean;
  retentionDays?: number;
  allowedCategories: MemoryCategory[];
  updatedAt: string;
}

export interface CandidateMemory {
  category: MemoryCategory;
  key: string;
  structuredValue: Record<string, any>;
  summary: string;
  sourceType: "conversation" | "file" | "explicit_correction" | "manual";
  sourceReference?: string;
  confidence: "confirmed" | "inferred";
}

// In-Memory & Persistent fallback store for seamless cross-conversation memory
const inMemoryStore: Map<string, UserMemoryItem> = new Map();
const inMemoryRevisions: Map<string, MemoryRevision[]> = new Map();
const inMemoryPreferences: Map<string, MemoryPreferences> = new Map();

export class MemoryService {
  /**
   * Retrieve memory preferences for a user (default enabled)
   */
  static async getMemoryPreferences(userId: string): Promise<MemoryPreferences> {
    const cleanId = userId.trim();
    if (inMemoryPreferences.has(cleanId)) {
      return inMemoryPreferences.get(cleanId)!;
    }

    const defaultPrefs: MemoryPreferences = {
      userId: cleanId,
      memoryEnabled: true,
      requireConfirmation: false,
      allowedCategories: [
        "skills_experience",
        "career_goals",
        "projects",
        "preferences",
        "language_style",
        "user_instructions",
      ],
      updatedAt: new Date().toISOString(),
    };

    try {
      const supabase = createServerSupabaseClient();
      const { data } = await supabase
        .from("user_memory_preferences")
        .select("*")
        .eq("user_id", cleanId)
        .maybeSingle();

      if (data) {
        const loaded: MemoryPreferences = {
          userId: data.user_id,
          memoryEnabled: data.memory_enabled,
          requireConfirmation: data.require_confirmation,
          retentionDays: data.retention_days || undefined,
          allowedCategories: (data.allowed_categories || []) as MemoryCategory[],
          updatedAt: data.updated_at,
        };
        inMemoryPreferences.set(cleanId, loaded);
        return loaded;
      }
    } catch {}

    inMemoryPreferences.set(cleanId, defaultPrefs);
    return defaultPrefs;
  }

  /**
   * Update memory preferences for a user
   */
  static async updateMemoryPreferences(
    userId: string,
    updates: Partial<MemoryPreferences>
  ): Promise<MemoryPreferences> {
    const current = await this.getMemoryPreferences(userId);
    const updated: MemoryPreferences = {
      ...current,
      ...updates,
      userId: current.userId,
      updatedAt: new Date().toISOString(),
    };

    inMemoryPreferences.set(current.userId, updated);

    try {
      const supabase = createServerSupabaseClient();
      await supabase.from("user_memory_preferences").upsert({
        user_id: updated.userId,
        memory_enabled: updated.memoryEnabled,
        require_confirmation: updated.requireConfirmation,
        retention_days: updated.retentionDays || null,
        allowed_categories: updated.allowedCategories,
        updated_at: updated.updatedAt,
      });
    } catch {}

    return updated;
  }

  /**
   * Extract candidate memories from user prompt or file content
   */
  static async extractCandidateMemories(
    userId: string,
    text: string,
    source: {
      type: "conversation" | "file" | "explicit_correction" | "manual";
      reference?: string;
    }
  ): Promise<CandidateMemory[]> {
    const prefs = await this.getMemoryPreferences(userId);
    if (!prefs.memoryEnabled) return [];

    const candidates: CandidateMemory[] = [];
    const normalized = text.toLowerCase();

    // 1. Skill Extraction (Programming, Frameworks, Cloud, Databases)
    const KNOWN_SKILLS = [
      "python", "javascript", "typescript", "react", "next.js", "node.js",
      "vue", "angular", "java", "c++", "c#", "go", "golang", "rust",
      "sql", "postgresql", "postgres", "mongodb", "redis", "aws", "azure",
      "gcp", "docker", "kubernetes", "graphql", "tailwind", "fastapi",
      "django", "flask", "pytorch", "tensorflow", "solidity", "linux", "git"
    ];

    const detectedSkills = KNOWN_SKILLS.filter((skill) => {
      const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(?:\\b|(?<=\\s))${escaped}(?:\\b|(?=\\s|$|[.,!?]))`, "i");
      return regex.test(text);
    });

    // Check if learning or adding a new skill explicitly
    const hasSkillDeclaration =
      /\b(learned|learning|know|proficient in|skilled in|experience with|added|mastered|study|working with)\b/i.test(text) ||
      source.type === "file" ||
      source.reference?.toLowerCase().includes("resume");

    if (detectedSkills.length > 0 && hasSkillDeclaration) {
      const properSkills = detectedSkills.map((s) => {
        if (s === "javascript") return "JavaScript";
        if (s === "typescript") return "TypeScript";
        if (s === "python") return "Python";
        if (s === "react") return "React";
        if (s === "next.js") return "Next.js";
        if (s === "node.js") return "Node.js";
        if (s === "postgresql" || s === "postgres") return "PostgreSQL";
        if (s === "mongodb") return "MongoDB";
        if (s === "aws") return "AWS";
        if (s === "gcp") return "GCP";
        if (s === "docker") return "Docker";
        if (s === "kubernetes") return "Kubernetes";
        if (s === "golang" || s === "go") return "Go";
        return s.charAt(0).toUpperCase() + s.slice(1);
      });

      candidates.push({
        category: "skills_experience",
        key: "technical_skills",
        structuredValue: {
          skills: properSkills,
          lastAdded: source.type === "conversation" ? properSkills : undefined,
        },
        summary: `Technical Skills: ${properSkills.join(", ")}`,
        sourceType: source.type,
        sourceReference: source.reference || "Chat discussion",
        confidence: "confirmed",
      });
    }

    // 2. Career Goals / Role Preferences
    const roleMatch = text.match(
      /(?:looking for|interested in|aiming for|target role|target title|aspiring|career goal is|work as(?: an?| a)?)\s+([a-zA-Z0-9\s\-]{3,35})(?:\.|\n|,|$)/i
    );
    if (roleMatch && roleMatch[1]) {
      const targetRole = roleMatch[1].trim();
      candidates.push({
        category: "career_goals",
        key: "target_role",
        structuredValue: { role: targetRole },
        summary: `Target Career Role: ${targetRole}`,
        sourceType: source.type,
        sourceReference: source.reference || "Conversation",
        confidence: "confirmed",
      });
    }

    // 3. Work Experience / Professional Background
    const expMatch = text.match(
      /(?:experience|worked as|work experience|background as|currently working as)\s*:?\s*([a-zA-Z0-9\s\-,]{5,60})(?:\.|\n|$)/i
    );
    if (expMatch && expMatch[1]) {
      const experienceSummary = expMatch[1].trim();
      candidates.push({
        category: "skills_experience",
        key: "work_experience",
        structuredValue: { experience: experienceSummary },
        summary: `Experience: ${experienceSummary}`,
        sourceType: source.type,
        sourceReference: source.reference || "Resume/Profile",
        confidence: "confirmed",
      });
    }

    // 4. Projects & Ongoing Work
    const projMatch = text.match(
      /(?:projects?|built|building|developed|developing)\s*:?\s*([a-zA-Z0-9\s\-,]{5,80})(?:\.|\n|$)/i
    );
    if (projMatch && projMatch[1]) {
      const projectDetails = projMatch[1].trim();
      candidates.push({
        category: "projects",
        key: "portfolio_projects",
        structuredValue: { project: projectDetails },
        summary: `Project: ${projectDetails}`,
        sourceType: source.type,
        sourceReference: source.reference || "Portfolio",
        confidence: "confirmed",
      });
    }

    // 5. Preferred Response Language & Style
    if (/\b(answer in tamil|reply in tamil|tamil la|tamilil)\b/i.test(normalized)) {
      candidates.push({
        category: "language_style",
        key: "preferred_language",
        structuredValue: { language: "Tamil / Tanglish" },
        summary: "User prefers communication in Tamil / Tanglish when comfortable",
        sourceType: "explicit_correction",
        sourceReference: "User direct instruction",
        confidence: "confirmed",
      });
    } else if (/\b(concise mode|be concise|short answers|bullet points only)\b/i.test(normalized)) {
      candidates.push({
        category: "language_style",
        key: "communication_style",
        structuredValue: { style: "Concise & Bullet Points" },
        summary: "User prefers concise answers formatted with bullet points",
        sourceType: "explicit_correction",
        sourceReference: "User preference",
        confidence: "confirmed",
      });
    }

    return candidates;
  }

  /**
   * Merge candidate memory with existing memory records
   */
  static async mergeMemoryUpdate(
    userId: string,
    candidate: CandidateMemory
  ): Promise<{
    memory: UserMemoryItem;
    revision?: MemoryRevision;
    action: "created" | "merged" | "updated" | "unchanged";
  }> {
    const cleanUserId = userId.trim();
    const prefs = await this.getMemoryPreferences(cleanUserId);
    if (!prefs.memoryEnabled) {
      throw new Error("Memory is disabled by user preferences.");
    }

    // Find existing memory for this key
    const allUserMemories = await this.getAllUserMemories(cleanUserId);
    const existing = allUserMemories.find(
      (m) => m.category === candidate.category && m.key === candidate.key && m.status === "active"
    );

    const now = new Date().toISOString();

    // CASE 1: No existing memory -> Create initial memory
    if (!existing) {
      const newMemory: UserMemoryItem = {
        id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId: cleanUserId,
        category: candidate.category,
        key: candidate.key,
        structuredValue: candidate.structuredValue,
        summary: candidate.summary,
        sourceType: candidate.sourceType,
        sourceReference: candidate.sourceReference,
        confidence: candidate.confidence,
        status: "active",
        createdAt: now,
        updatedAt: now,
        lastUsedAt: now,
      };

      inMemoryStore.set(newMemory.id, newMemory);

      const revision: MemoryRevision = {
        id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        memoryId: newMemory.id,
        userId: cleanUserId,
        previousValue: null,
        newValue: newMemory.structuredValue,
        changeReason: `Initial capture from ${candidate.sourceReference || candidate.sourceType}`,
        sourceReference: candidate.sourceReference,
        approved: true,
        createdAt: now,
      };

      const revList = inMemoryRevisions.get(newMemory.id) || [];
      inMemoryRevisions.set(newMemory.id, [revision, ...revList]);

      // Try database sync
      try {
        const supabase = createServerSupabaseClient();
        await supabase.from("user_memories").insert({
          id: newMemory.id,
          user_id: newMemory.userId,
          category: newMemory.category,
          key: newMemory.key,
          structured_value: newMemory.structuredValue,
          summary: newMemory.summary,
          source_type: newMemory.sourceType,
          source_reference: newMemory.sourceReference,
          confidence: newMemory.confidence,
          status: newMemory.status,
          created_at: newMemory.createdAt,
          updated_at: newMemory.updatedAt,
        });
        await supabase.from("memory_revisions").insert({
          id: revision.id,
          memory_id: revision.memoryId,
          user_id: revision.userId,
          previous_value: null,
          new_value: revision.newValue,
          change_reason: revision.changeReason,
          source_reference: revision.sourceReference,
          approved: revision.approved,
          created_at: revision.createdAt,
        });
      } catch {}

      return { memory: newMemory, revision, action: "created" };
    }

    // CASE 2: Skill Accumulation / Merging
    if (candidate.category === "skills_experience" && candidate.key === "technical_skills") {
      const existingSkills: string[] = existing.structuredValue.skills || [];
      const incomingSkills: string[] = candidate.structuredValue.skills || [];

      // Find novel skills not present previously
      const newSkills = incomingSkills.filter(
        (inc) => !existingSkills.some((ex) => ex.toLowerCase() === inc.toLowerCase())
      );

      if (newSkills.length === 0) {
        return { memory: existing, action: "unchanged" };
      }

      // Merge and preserve prior skills
      const mergedSkills = [...existingSkills, ...newSkills];
      const updatedSummary = `Technical Skills: ${mergedSkills.join(", ")} (added ${newSkills.join(", ")})`;

      const updatedMemory: UserMemoryItem = {
        ...existing,
        structuredValue: {
          skills: mergedSkills,
          previouslyKnown: existingSkills,
          recentlyAdded: newSkills,
        },
        summary: updatedSummary,
        sourceType: candidate.sourceType,
        sourceReference: candidate.sourceReference || existing.sourceReference,
        updatedAt: now,
        lastUsedAt: now,
      };

      inMemoryStore.set(updatedMemory.id, updatedMemory);

      const revision: MemoryRevision = {
        id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        memoryId: updatedMemory.id,
        userId: cleanUserId,
        previousValue: existing.structuredValue,
        newValue: updatedMemory.structuredValue,
        changeReason: `Added new skills: ${newSkills.join(", ")}`,
        sourceReference: candidate.sourceReference || "Conversation",
        approved: true,
        createdAt: now,
      };

      const revList = inMemoryRevisions.get(updatedMemory.id) || [];
      inMemoryRevisions.set(updatedMemory.id, [revision, ...revList]);

      try {
        const supabase = createServerSupabaseClient();
        await supabase
          .from("user_memories")
          .update({
            structured_value: updatedMemory.structuredValue,
            summary: updatedMemory.summary,
            source_type: updatedMemory.sourceType,
            source_reference: updatedMemory.sourceReference,
            updated_at: updatedMemory.updatedAt,
            last_used_at: updatedMemory.lastUsedAt,
          })
          .eq("id", updatedMemory.id);

        await supabase.from("memory_revisions").insert({
          id: revision.id,
          memory_id: revision.memoryId,
          user_id: revision.userId,
          previous_value: revision.previousValue,
          new_value: revision.newValue,
          change_reason: revision.changeReason,
          source_reference: revision.sourceReference,
          approved: revision.approved,
          created_at: revision.createdAt,
        });
      } catch {}

      return { memory: updatedMemory, revision, action: "merged" };
    }

    // CASE 3: Explicit correction or value update for other keys
    const updatedMemory: UserMemoryItem = {
      ...existing,
      structuredValue: candidate.structuredValue,
      summary: candidate.summary,
      sourceType: candidate.sourceType,
      sourceReference: candidate.sourceReference || existing.sourceReference,
      updatedAt: now,
      lastUsedAt: now,
    };

    inMemoryStore.set(updatedMemory.id, updatedMemory);

    const revision: MemoryRevision = {
      id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      memoryId: updatedMemory.id,
      userId: cleanUserId,
      previousValue: existing.structuredValue,
      newValue: updatedMemory.structuredValue,
      changeReason: `Updated value from ${candidate.sourceReference || candidate.sourceType}`,
      sourceReference: candidate.sourceReference,
      approved: true,
      createdAt: now,
    };

    const revList = inMemoryRevisions.get(updatedMemory.id) || [];
    inMemoryRevisions.set(updatedMemory.id, [revision, ...revList]);

    try {
      const supabase = createServerSupabaseClient();
      await supabase
        .from("user_memories")
        .update({
          structured_value: updatedMemory.structuredValue,
          summary: updatedMemory.summary,
          source_type: updatedMemory.sourceType,
          source_reference: updatedMemory.sourceReference,
          updated_at: updatedMemory.updatedAt,
        })
        .eq("id", updatedMemory.id);

      await supabase.from("memory_revisions").insert({
        id: revision.id,
        memory_id: revision.memoryId,
        user_id: revision.userId,
        previous_value: revision.previousValue,
        new_value: revision.newValue,
        change_reason: revision.changeReason,
        source_reference: revision.sourceReference,
        approved: revision.approved,
        created_at: revision.createdAt,
      });
    } catch {}

    return { memory: updatedMemory, revision, action: "updated" };
  }

  /**
   * Retrieve relevant memories for an inbound question or request
   */
  static async retrieveRelevantMemories(
    userId: string,
    query: string,
    limit = 5
  ): Promise<UserMemoryItem[]> {
    const cleanUserId = userId.trim();
    const prefs = await this.getMemoryPreferences(cleanUserId);
    if (!prefs.memoryEnabled) return [];

    const allMemories = await this.getAllUserMemories(cleanUserId);
    const activeMemories = allMemories.filter((m) => m.status === "active");

    if (activeMemories.length === 0) return [];

    const normalizedQuery = query.toLowerCase();

    // Topic relevance classification
    const isCareerOrJobQuery = /\b(company|companies|role|roles|job|jobs|career|hire|profile|suit|suitable|apply|resume|work|salary)\b/i.test(normalizedQuery);
    const isTechOrCodeQuery = /\b(code|coding|build|stack|tech|architecture|framework|library|develop|software|project|api)\b/i.test(normalizedQuery);
    const isLanguageQuery = /\b(tamil|english|speak|reply|style|language|format)\b/i.test(normalizedQuery);

    const scored = activeMemories.map((mem) => {
      let score = 0;

      if (isCareerOrJobQuery && (mem.category === "skills_experience" || mem.category === "career_goals")) {
        score += 10;
      }

      if (isTechOrCodeQuery && (mem.category === "skills_experience" || mem.category === "projects")) {
        score += 8;
      }

      if (isLanguageQuery && mem.category === "language_style") {
        score += 10;
      }

      // Keyword matches between query and memory summary/structured data
      const summaryTokens = mem.summary.toLowerCase().split(/\s+/);
      for (const token of summaryTokens) {
        if (token.length > 3 && normalizedQuery.includes(token)) {
          score += 2;
        }
      }

      if (mem.structuredValue.skills && Array.isArray(mem.structuredValue.skills)) {
        for (const skill of mem.structuredValue.skills) {
          if (normalizedQuery.includes(skill.toLowerCase())) {
            score += 5;
          }
        }
      }

      return { mem, score };
    });

    const relevant = scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.mem);

    // Update lastUsedAt timestamp
    if (relevant.length > 0) {
      const now = new Date().toISOString();
      for (const m of relevant) {
        m.lastUsedAt = now;
        inMemoryStore.set(m.id, m);
      }
    }

    return relevant;
  }

  /**
   * Build memory context string to inject into LLM system prompt
   */
  static async buildMemoryContext(
    userId: string,
    query: string
  ): Promise<{ contextText: string; retrievedMemories: UserMemoryItem[] }> {
    const memories = await this.retrieveRelevantMemories(userId, query);

    if (memories.length === 0) {
      return { contextText: "", retrievedMemories: [] };
    }

    const itemsText = memories
      .map((m) => {
        const sourceLabel = m.sourceReference ? ` (Source: ${m.sourceReference})` : "";
        return `- [${m.category.replace("_", " ").toUpperCase()}]${sourceLabel}: ${m.summary}`;
      })
      .join("\n");

    const contextText = `PERSISTENT USER MEMORY & ACCUMULATED PROFILE:
The following verified personal information was recalled across previous conversations and documents:
${itemsText}

INSTRUCTION: Use this recalled knowledge naturally to personalize and ground your answer. You do not need to ask the user to re-upload previously processed files or repeat previously declared skills.`;

    return { contextText, retrievedMemories: memories };
  }

  /**
   * Get all memories for a user
   */
  static async getAllUserMemories(userId: string): Promise<UserMemoryItem[]> {
    const cleanUserId = userId.trim();

    // Check database if available
    try {
      const supabase = createServerSupabaseClient();
      const { data } = await supabase
        .from("user_memories")
        .select("*")
        .eq("user_id", cleanUserId)
        .order("updated_at", { ascending: false });

      if (data && data.length > 0) {
        const loaded: UserMemoryItem[] = data.map((d: any) => ({
          id: d.id,
          userId: d.user_id,
          category: d.category as MemoryCategory,
          key: d.key,
          structuredValue: d.structured_value || {},
          summary: d.summary,
          sourceType: d.source_type,
          sourceReference: d.source_reference,
          confidence: d.confidence,
          status: d.status,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
          lastUsedAt: d.last_used_at,
        }));

        for (const m of loaded) {
          inMemoryStore.set(m.id, m);
        }
        return loaded;
      }
    } catch {}

    // Fallback to in-memory store
    return Array.from(inMemoryStore.values())
      .filter((m) => m.userId === cleanUserId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  /**
   * Archive a single memory item
   */
  static async archiveMemory(userId: string, memoryId: string): Promise<boolean> {
    const cleanUserId = userId.trim();
    const mem = inMemoryStore.get(memoryId);
    if (mem && mem.userId === cleanUserId) {
      mem.status = "archived";
      mem.updatedAt = new Date().toISOString();
      inMemoryStore.set(memoryId, mem);

      try {
        const supabase = createServerSupabaseClient();
        await supabase
          .from("user_memories")
          .update({ status: "archived", updated_at: mem.updatedAt })
          .eq("id", memoryId)
          .eq("user_id", cleanUserId);
      } catch {}

      return true;
    }
    return false;
  }

  /**
   * Permanently delete a memory item
   */
  static async deleteUserMemory(userId: string, memoryId: string): Promise<boolean> {
    const cleanUserId = userId.trim();
    const mem = inMemoryStore.get(memoryId);
    if (mem && mem.userId === cleanUserId) {
      inMemoryStore.delete(memoryId);
      inMemoryRevisions.delete(memoryId);

      try {
        const supabase = createServerSupabaseClient();
        await supabase.from("user_memories").delete().eq("id", memoryId).eq("user_id", cleanUserId);
      } catch {}

      return true;
    }
    return false;
  }

  /**
   * Clear all personal memories for a user
   */
  static async clearAllMemories(userId: string): Promise<number> {
    const cleanUserId = userId.trim();
    let count = 0;

    Array.from(inMemoryStore.entries()).forEach(([id, mem]) => {
      if (mem.userId === cleanUserId) {
        inMemoryStore.delete(id);
        inMemoryRevisions.delete(id);
        count++;
      }
    });

    try {
      const supabase = createServerSupabaseClient();
      await supabase.from("user_memories").delete().eq("user_id", cleanUserId);
    } catch {}

    return count;
  }

  /**
   * Retrieve revisions / audit log for a memory item
   */
  static async getMemoryRevisions(userId: string, memoryId: string): Promise<MemoryRevision[]> {
    const cleanUserId = userId.trim();
    const mem = inMemoryStore.get(memoryId);
    if (!mem || mem.userId !== cleanUserId) return [];

    return inMemoryRevisions.get(memoryId) || [];
  }
}
