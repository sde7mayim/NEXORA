import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

interface StoredConversation {
  id: string;
  title: string;
  modelSelected: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    modelUsed?: string;
  }>;
}

// In-memory conversation registry (bridges with Supabase table `conversations` when live)
const memoryConversations = new Map<string, StoredConversation>();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    const conv = memoryConversations.get(id);
    if (!conv) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }
    return NextResponse.json({ conversation: conv });
  }

  const list = Array.from(memoryConversations.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return NextResponse.json({ conversations: list });
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const id = json.id || `conv_${Date.now()}`;
    const newConv: StoredConversation = {
      id,
      title: json.title || "New Conversation",
      modelSelected: json.modelSelected || "nexora-core",
      isPinned: !!json.isPinned,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: json.messages || [],
    };

    memoryConversations.set(id, newConv);
    return NextResponse.json({ conversation: newConv }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Conversation ID required" }, { status: 400 });
  }

  memoryConversations.delete(id);
  return NextResponse.json({ success: true, deletedId: id });
}
