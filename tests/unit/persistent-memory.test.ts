import { describe, it, expect, beforeEach } from "vitest";
import { MemoryService, CandidateMemory, UserMemoryItem } from "@/lib/memory/memory-service";

describe("Part A & C: Persistent Personal Memory & Knowledge Merging", () => {
  const userA = "user_sarah@example.com";
  const userB = "user_marcus@example.com";

  beforeEach(async () => {
    // Clear state before each test
    await MemoryService.clearAllMemories(userA);
    await MemoryService.clearAllMemories(userB);
    await MemoryService.updateMemoryPreferences(userA, {
      memoryEnabled: true,
      requireConfirmation: false,
    });
    await MemoryService.updateMemoryPreferences(userB, {
      memoryEnabled: true,
      requireConfirmation: false,
    });
  });

  it("Scenario Step 1: Extracts and saves initial skills, roles, and experience from resume file", async () => {
    const resumeText = `
      John Doe - Senior Frontend Engineer
      Experience: 5 years building scalable web applications with React, TypeScript, and Node.js.
      Education: B.Tech in Computer Science.
      Projects: Built high-throughput e-commerce platform and design system.
    `;

    const candidates = await MemoryService.extractCandidateMemories(userA, resumeText, {
      type: "file",
      reference: "resume_john_doe.pdf",
    });

    expect(candidates.length).toBeGreaterThan(0);
    const skillsCand = candidates.find((c) => c.key === "technical_skills");
    expect(skillsCand).toBeDefined();
    expect(skillsCand?.structuredValue.skills).toEqual(
      expect.arrayContaining(["React", "TypeScript", "Node.js"])
    );
    expect(skillsCand?.sourceReference).toBe("resume_john_doe.pdf");

    // Merge / Save candidate memory
    const result = await MemoryService.mergeMemoryUpdate(userA, skillsCand!);
    expect(result.action).toBe("created");
    expect(result.memory.id).toBeDefined();
    expect(result.memory.status).toBe("active");
    expect(result.memory.structuredValue.skills).toEqual(
      expect.arrayContaining(["React", "TypeScript", "Node.js"])
    );
  });

  it("Scenario Step 2: Merges newly learned Python into existing skills profile without deleting previous skills", async () => {
    // Initial resume skills
    const initialCand: CandidateMemory = {
      category: "skills_experience",
      key: "technical_skills",
      structuredValue: { skills: ["React", "TypeScript", "Node.js"] },
      summary: "Technical Skills: React, TypeScript, Node.js",
      sourceType: "file",
      sourceReference: "resume.pdf",
      confidence: "confirmed",
    };
    await MemoryService.mergeMemoryUpdate(userA, initialCand);

    // Later conversation: "I have also learned Python. Which companies would be suitable for me now?"
    const laterUserPrompt = "I have also learned Python. Which companies would be suitable for me now?";
    const newCandidates = await MemoryService.extractCandidateMemories(userA, laterUserPrompt, {
      type: "conversation",
      reference: "Conversation #2",
    });

    expect(newCandidates.length).toBeGreaterThan(0);
    const pythonCand = newCandidates.find((c) => c.key === "technical_skills");
    expect(pythonCand).toBeDefined();
    expect(pythonCand?.structuredValue.skills).toContain("Python");

    // Merge Python into existing profile
    const mergeResult = await MemoryService.mergeMemoryUpdate(userA, pythonCand!);
    expect(mergeResult.action).toBe("merged");
    expect(mergeResult.memory.structuredValue.skills).toEqual(
      expect.arrayContaining(["React", "TypeScript", "Node.js", "Python"])
    );
    expect(mergeResult.memory.structuredValue.previouslyKnown).toEqual(
      expect.arrayContaining(["React", "TypeScript", "Node.js"])
    );
    expect(mergeResult.memory.structuredValue.recentlyAdded).toContain("Python");

    // Verify revision tracking
    expect(mergeResult.revision).toBeDefined();
    expect(mergeResult.revision?.changeReason).toContain("Python");
    expect(mergeResult.revision?.approved).toBe(true);
  });

  it("Repeated skills deduplicate cleanly without creating redundant entries", async () => {
    const cand1: CandidateMemory = {
      category: "skills_experience",
      key: "technical_skills",
      structuredValue: { skills: ["Python", "Docker"] },
      summary: "Technical Skills: Python, Docker",
      sourceType: "conversation",
      confidence: "confirmed",
    };
    await MemoryService.mergeMemoryUpdate(userA, cand1);

    // Later: repeated statement mentioning Python and Docker again
    const cand2: CandidateMemory = {
      category: "skills_experience",
      key: "technical_skills",
      structuredValue: { skills: ["Python", "Docker"] },
      summary: "Technical Skills: Python, Docker",
      sourceType: "conversation",
      confidence: "confirmed",
    };
    const res2 = await MemoryService.mergeMemoryUpdate(userA, cand2);
    expect(res2.action).toBe("unchanged");

    const all = await MemoryService.getAllUserMemories(userA);
    const skillMems = all.filter((m) => m.key === "technical_skills");
    expect(skillMems.length).toBe(1);
    expect(skillMems[0].structuredValue.skills).toEqual(["Python", "Docker"]);
  });

  it("Explicit corrections update values and record revision provenance", async () => {
    const cand: CandidateMemory = {
      category: "career_goals",
      key: "target_role",
      structuredValue: { role: "Junior Developer" },
      summary: "Target Career Role: Junior Developer",
      sourceType: "conversation",
      confidence: "confirmed",
    };
    await MemoryService.mergeMemoryUpdate(userA, cand);

    // User explicitly corrects: "Actually, my target role is Lead Staff Architect"
    const correction: CandidateMemory = {
      category: "career_goals",
      key: "target_role",
      structuredValue: { role: "Lead Staff Architect" },
      summary: "Target Career Role: Lead Staff Architect",
      sourceType: "explicit_correction",
      sourceReference: "User correction prompt",
      confidence: "confirmed",
    };
    const res = await MemoryService.mergeMemoryUpdate(userA, correction);
    expect(res.action).toBe("updated");
    expect(res.memory.structuredValue.role).toBe("Lead Staff Architect");
    expect(res.revision?.previousValue.role).toBe("Junior Developer");
  });

  it("Scenario Step 3: Retrieves relevant accumulated profile in future conversations without re-uploading", async () => {
    // Save profile with resume skills + added Python
    const initialCand: CandidateMemory = {
      category: "skills_experience",
      key: "technical_skills",
      structuredValue: { skills: ["React", "TypeScript", "Node.js", "Python"] },
      summary: "Technical Skills: React, TypeScript, Node.js, Python (added Python)",
      sourceType: "file",
      sourceReference: "resume.pdf",
      confidence: "confirmed",
    };
    await MemoryService.mergeMemoryUpdate(userA, initialCand);

    // Future conversation: User asks for another company recommendation
    const futureQuery = "Which enterprise companies in Berlin would suit my profile?";
    const contextResult = await MemoryService.buildMemoryContext(userA, futureQuery);

    expect(contextResult.retrievedMemories.length).toBeGreaterThan(0);
    expect(contextResult.contextText).toContain("PERSISTENT USER MEMORY");
    expect(contextResult.contextText).toContain("React, TypeScript, Node.js, Python");
    expect(contextResult.contextText).toContain("resume.pdf");
  });

  it("Does not inject unrelated personal memory into general knowledge queries", async () => {
    const initialCand: CandidateMemory = {
      category: "skills_experience",
      key: "technical_skills",
      structuredValue: { skills: ["Python", "Rust"] },
      summary: "Technical Skills: Python, Rust",
      sourceType: "conversation",
      confidence: "confirmed",
    };
    await MemoryService.mergeMemoryUpdate(userA, initialCand);

    // Unrelated general question: "What is the boiling point of water in Fahrenheit?"
    const generalQuery = "What is the boiling point of water in Fahrenheit?";
    const retrieved = await MemoryService.retrieveRelevantMemories(userA, generalQuery);
    expect(retrieved.length).toBe(0);

    const { contextText } = await MemoryService.buildMemoryContext(userA, generalQuery);
    expect(contextText).toBe("");
  });

  it("Respects memory-disabled preference: prevents memory retrieval and candidate extraction", async () => {
    await MemoryService.updateMemoryPreferences(userA, { memoryEnabled: false });

    // Extraction returns empty
    const candidates = await MemoryService.extractCandidateMemories(
      userA,
      "I have learned Kubernetes and AWS",
      { type: "conversation" }
    );
    expect(candidates.length).toBe(0);

    // Merging throws an authorized error
    const testCand: CandidateMemory = {
      category: "skills_experience",
      key: "technical_skills",
      structuredValue: { skills: ["AWS"] },
      summary: "Technical Skills: AWS",
      sourceType: "conversation",
      confidence: "confirmed",
    };
    await expect(MemoryService.mergeMemoryUpdate(userA, testCand)).rejects.toThrow(
      "Memory is disabled"
    );

    // Retrieval returns empty
    const retrieved = await MemoryService.retrieveRelevantMemories(userA, "Which jobs suit my profile?");
    expect(retrieved.length).toBe(0);
  });

  it("User Isolation: User A cannot retrieve or access User B's memories", async () => {
    const userAMemory: CandidateMemory = {
      category: "skills_experience",
      key: "technical_skills",
      structuredValue: { skills: ["Python", "Django"] },
      summary: "Technical Skills: Python, Django",
      sourceType: "conversation",
      confidence: "confirmed",
    };
    await MemoryService.mergeMemoryUpdate(userA, userAMemory);

    // User B queries
    const userBMemories = await MemoryService.getAllUserMemories(userB);
    expect(userBMemories.length).toBe(0);

    const userBContext = await MemoryService.buildMemoryContext(userB, "What skills do I have?");
    expect(userBContext.retrievedMemories.length).toBe(0);
    expect(userBContext.contextText).toBe("");
  });

  it("Archive and Delete operations function with user-scoped authorization", async () => {
    const cand: CandidateMemory = {
      category: "projects",
      key: "portfolio_projects",
      structuredValue: { project: "E-Commerce App" },
      summary: "Project: E-Commerce App",
      sourceType: "conversation",
      confidence: "confirmed",
    };
    const { memory } = await MemoryService.mergeMemoryUpdate(userA, cand);

    // Archive
    const archived = await MemoryService.archiveMemory(userA, memory.id);
    expect(archived).toBe(true);
    let all = await MemoryService.getAllUserMemories(userA);
    const target = all.find((m) => m.id === memory.id);
    expect(target?.status).toBe("archived");

    // Archived memories are excluded from query retrieval
    const retrieved = await MemoryService.retrieveRelevantMemories(userA, "Tell me about my projects");
    expect(retrieved.some((m) => m.id === memory.id)).toBe(false);

    // Permanently Delete
    const deleted = await MemoryService.deleteUserMemory(userA, memory.id);
    expect(deleted).toBe(true);
    all = await MemoryService.getAllUserMemories(userA);
    expect(all.some((m) => m.id === memory.id)).toBe(false);
  });

  it("Clear all memories deletes every record for that user without affecting others", async () => {
    await MemoryService.mergeMemoryUpdate(userA, {
      category: "skills_experience",
      key: "technical_skills",
      structuredValue: { skills: ["Java"] },
      summary: "Skills: Java",
      sourceType: "conversation",
      confidence: "confirmed",
    });
    await MemoryService.mergeMemoryUpdate(userB, {
      category: "skills_experience",
      key: "technical_skills",
      structuredValue: { skills: ["Go"] },
      summary: "Skills: Go",
      sourceType: "conversation",
      confidence: "confirmed",
    });

    const clearedCount = await MemoryService.clearAllMemories(userA);
    expect(clearedCount).toBeGreaterThan(0);

    const userAMems = await MemoryService.getAllUserMemories(userA);
    expect(userAMems.length).toBe(0);

    const userBMems = await MemoryService.getAllUserMemories(userB);
    expect(userBMems.length).toBe(1);
    expect(userBMems[0].structuredValue.skills).toContain("Go");
  });
});
