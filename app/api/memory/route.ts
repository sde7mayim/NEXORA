import { NextRequest, NextResponse } from "next/server";
import { MemoryService, CandidateMemory } from "@/lib/memory/memory-service";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function getAuthenticatedUserId(req: NextRequest): Promise<string> {
  // 0. Check search params or header for client-provided userId
  const { searchParams } = new URL(req.url);
  const paramUser = searchParams.get("userId");
  if (paramUser && paramUser !== "usr_anonymous" && paramUser !== "usr_guest") {
    return paramUser.toLowerCase().trim();
  }

  // 1. Try Supabase user session
  try {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase.auth.getUser();
    if (data.user?.email) {
      return data.user.email.toLowerCase().trim();
    }
  } catch {}

  // 2. Try remembered account cookie
  const cookieUser = req.cookies.get("nexora_remembered_account")?.value;
  if (cookieUser) {
    return decodeURIComponent(cookieUser).toLowerCase().trim();
  }

  return "usr_guest";
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(req);
    const memories = await MemoryService.getAllUserMemories(userId);
    const preferences = await MemoryService.getMemoryPreferences(userId);

    return NextResponse.json({ memories, preferences });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to load memory" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(req);
    const body = await req.json();

    if (body.action === "extract_and_merge") {
      const candidates = await MemoryService.extractCandidateMemories(
        userId,
        body.text || "",
        {
          type: body.sourceType || "conversation",
          reference: body.sourceReference || "User message",
        }
      );

      const merged = [];
      for (const candidate of candidates) {
        const res = await MemoryService.mergeMemoryUpdate(userId, candidate);
        merged.push(res);
      }

      return NextResponse.json({ candidates, merged });
    }

    if (body.action === "manual_create") {
      const candidate: CandidateMemory = {
        category: body.category,
        key: body.key,
        structuredValue: body.structuredValue || {},
        summary: body.summary,
        sourceType: "manual",
        sourceReference: "User manually added in settings",
        confidence: "confirmed",
      };

      const result = await MemoryService.mergeMemoryUpdate(userId, candidate);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to process memory update" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(req);
    const body = await req.json();

    if (body.preferences) {
      const updated = await MemoryService.updateMemoryPreferences(userId, body.preferences);
      return NextResponse.json({ preferences: updated });
    }

    if (body.action === "archive" && body.memoryId) {
      const success = await MemoryService.archiveMemory(userId, body.memoryId);
      return NextResponse.json({ success });
    }

    if (body.action === "update" && body.memoryId && body.summary) {
      const all = await MemoryService.getAllUserMemories(userId);
      const target = all.find((m) => m.id === body.memoryId);
      if (target) {
        const candidate: CandidateMemory = {
          category: target.category,
          key: target.key,
          structuredValue: body.structuredValue || target.structuredValue,
          summary: body.summary,
          sourceType: "explicit_correction",
          sourceReference: "User correction in settings",
          confidence: "confirmed",
        };
        const result = await MemoryService.mergeMemoryUpdate(userId, candidate);
        return NextResponse.json(result);
      }
    }

    return NextResponse.json({ error: "Unknown PUT action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to update memory" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(req);
    const { searchParams } = new URL(req.url);
    const memoryId = searchParams.get("id");

    if (memoryId) {
      const success = await MemoryService.deleteUserMemory(userId, memoryId);
      return NextResponse.json({ success, deletedId: memoryId });
    }

    // Clear all memories if no specific ID provided
    const count = await MemoryService.clearAllMemories(userId);
    return NextResponse.json({ success: true, clearedCount: count });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to delete memory" },
      { status: 500 }
    );
  }
}
