"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import {
  Sparkles,
  Send,
  Square,
  Copy,
  Check,
  RefreshCw,
  Search,
  Paperclip,
  X,
  FileText,
  ExternalLink,
  ChevronDown,
  Info,
  Pin,
  Trash2,
  Edit2,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  AlertCircle,
  MoreHorizontal,
  Volume2,
  VolumeX,
  Download,
  Lightbulb,
  BookOpen,
} from "lucide-react";
import { NEXORA_MODEL_FAMILIES, EXTERNAL_MODELS } from "@/lib/ai/model-registry";
import { ConversationStore, Conversation, ConversationMessage } from "@/lib/chat/conversation-store";
import { ModelDetailsModal } from "@/components/model-details-modal";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { createClient } from "@/lib/supabase/client";
import { SavedAccountManager } from "@/lib/auth/saved-accounts";

const AVAILABLE_ACTION_MODELS = [
  {
    id: "nexora-swift",
    name: "Nexora Swift",
    badge: "Ultra-Fast",
    desc: "Sub-second responsiveness for quick everyday assistance, summaries & drafting.",
    color: "text-purple-400 bg-purple-500/10 border-purple-500/30",
    version: "1.0",
  },
  {
    id: "nexora-core",
    name: "Nexora Core",
    badge: "Balanced Flagship",
    desc: "Balanced general-purpose intelligence, reasoning, coding, & document QA.",
    color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30",
    version: "1.0",
  },
  {
    id: "nexora-reason",
    name: "Nexora Reason",
    badge: "Deep Reasoning",
    desc: "Deep multi-step analytical intelligence, architectural planning, & code synthesis.",
    color: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    version: "1.0",
  },
  {
    id: "nexora-vision",
    name: "Nexora Vision",
    badge: "Multimodal Acuity",
    desc: "High-acuity visual reasoning across diagrams, UI mockups, documents, & images.",
    color: "text-sky-400 bg-sky-500/10 border-sky-500/30",
    version: "1.0",
  },
  {
    id: "gemini:gemini-1.5-flash",
    name: "Gemini 1.5 Flash",
    badge: "Google Flash",
    desc: "Ultra-fast response latency with massive 1M context capacity.",
    color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
    version: "1.5",
  },
  {
    id: "openai:gpt-4o-mini",
    name: "GPT-4o Mini",
    badge: "OpenAI",
    desc: "Fast, everyday conversational intelligence with vision.",
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    version: "Omni-Mini",
  },
  {
    id: "anthropic:claude-3-5-sonnet",
    name: "Claude 3.5 Sonnet",
    badge: "Anthropic",
    desc: "Sophisticated engineering reasoning and nuanced writing.",
    color: "text-orange-400 bg-orange-500/10 border-orange-500/30",
    version: "3.5",
  },
  {
    id: "openai:gpt-4o",
    name: "GPT-4o (Omni)",
    badge: "OpenAI Flagship",
    desc: "Flagship multimodal intelligence for high-complexity analysis.",
    color: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
    version: "Omni",
  },
];

export default function ChatWorkspacePage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string>("");
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("");
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState("nexora-core");
  const [includeWebSearch, setIncludeWebSearch] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [inspectingModelId, setInspectingModelId] = useState<string | null>(null);

  // Interactive Message Actions State
  const [openModelMenuMsgId, setOpenModelMenuMsgId] = useState<string | null>(null);
  const [openMoreMenuMsgId, setOpenMoreMenuMsgId] = useState<string | null>(null);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);

  const [isDragging, setIsDragging] = useState(false);

  // Drawer / History state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchFilter, setSearchFilter] = useState("");
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editTitleInput, setEditTitleInput] = useState("");
  const [capabilityError, setCapabilityError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const groupConversationsByDate = (convList: Conversation[]) => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 86400000;
    const startOfLast7Days = startOfToday - 6 * 86400000;

    const groups: {
      pinned: Conversation[];
      today: Conversation[];
      yesterday: Conversation[];
      previous7Days: Conversation[];
      older: Conversation[];
    } = {
      pinned: [],
      today: [],
      yesterday: [],
      previous7Days: [],
      older: [],
    };

    for (const c of convList) {
      if (c.isPinned) {
        groups.pinned.push(c);
        continue;
      }
      const time = new Date(c.updatedAt || c.createdAt).getTime();
      if (time >= startOfToday) {
        groups.today.push(c);
      } else if (time >= startOfYesterday) {
        groups.yesterday.push(c);
      } else if (time >= startOfLast7Days) {
        groups.previous7Days.push(c);
      } else {
        groups.older.push(c);
      }
    }
    return groups;
  };

  // Load conversations isolated strictly to active user account
  useEffect(() => {
    let isMounted = true;

    async function syncUserConversations() {
      let activeEmail = "guest";
      const remembered = SavedAccountManager.getRememberedAccount();
      if (remembered?.email) {
        activeEmail = remembered.email.toLowerCase().trim();
      }
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (data.user?.email) {
          activeEmail = data.user.email.toLowerCase().trim();
        }
      } catch {}

      if (!isMounted) return;
      setCurrentUserEmail(activeEmail);
      const list = ConversationStore.getConversations(activeEmail);
      setConversations(list);
      if (list.length > 0) {
        setActiveConvId(list[0].id);
        setMessages(list[0].messages);
        setSelectedModel(list[0].modelSelected || "nexora-core");
      } else {
        setActiveConvId("");
        setMessages([]);
      }
    }

    syncUserConversations();

    try {
      const supabase = createClient();
      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        const newEmail =
          session?.user?.email?.toLowerCase().trim() ||
          SavedAccountManager.getRememberedAccount()?.email ||
          "guest";
        if (isMounted) {
          setCurrentUserEmail(newEmail);
          const list = ConversationStore.getConversations(newEmail);
          setConversations(list);
          if (list.length > 0) {
            setActiveConvId(list[0].id);
            setMessages(list[0].messages);
            setSelectedModel(list[0].modelSelected || "nexora-core");
          } else {
            setActiveConvId("");
            setMessages([]);
          }
        }
      });
      return () => {
        isMounted = false;
        authListener.subscription.unsubscribe();
      };
    } catch {
      return () => {
        isMounted = false;
      };
    }
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Global click to close open action menus and speech cleanup
  useEffect(() => {
    const handleGlobalClick = () => {
      setOpenModelMenuMsgId(null);
      setOpenMoreMenuMsgId(null);
    };
    window.addEventListener("click", handleGlobalClick);
    return () => {
      window.removeEventListener("click", handleGlobalClick);
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const selectConversation = (conv: Conversation) => {
    if (isStreaming) return;
    setActiveConvId(conv.id);
    setMessages(conv.messages);
    setSelectedModel(conv.modelSelected || "nexora-core");
    setCapabilityError(null);
  };

  const handleNewConversation = () => {
    if (isStreaming) return;
    const newConv = ConversationStore.createConversation("New Conversation", selectedModel, currentUserEmail);
    setConversations([newConv, ...conversations]);
    setActiveConvId(newConv.id);
    setMessages([]);
    setCapabilityError(null);
  };

  const handleRename = (id: string) => {
    if (!editTitleInput.trim()) {
      setEditingTitleId(null);
      return;
    }
    ConversationStore.renameConversation(id, editTitleInput.trim(), currentUserEmail);
    setConversations(ConversationStore.getConversations(currentUserEmail));
    setEditingTitleId(null);
  };

  const handleDeleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    ConversationStore.deleteConversation(id, currentUserEmail);
    const updated = ConversationStore.getConversations(currentUserEmail);
    setConversations(updated);
    if (activeConvId === id) {
      if (updated.length > 0) {
        selectConversation(updated[0]);
      } else {
        handleNewConversation();
      }
    }
  };

  const handleTogglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    ConversationStore.togglePin(id, currentUserEmail);
    setConversations(ConversationStore.getConversations(currentUserEmail));
  };

  const handleSendMessage = async (retryContent?: string) => {
    const textToSend = retryContent || input;
    if ((!textToSend.trim() && attachments.length === 0) || isStreaming) return;

    setCapabilityError(null);

    // Capability check: If user selected Swift (which does not support vision) and attaches files
    if (selectedModel === "nexora-swift" && attachments.some((f) => f.type.startsWith("image/"))) {
      setCapabilityError(
        "Nexora Swift does not support image analysis. Please switch to 'Nexora Vision' or 'GPT-4o'."
      );
      return;
    }

    const userMsgId = `msg_${Date.now()}`;
    const userMessage: ConversationMessage = {
      id: userMsgId,
      role: "user",
      content: textToSend,
      createdAt: new Date().toISOString(),
      attachments: attachments.map((f) => ({ name: f.name, size: f.size })),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    if (!retryContent) setInput("");
    setAttachments([]);
    setIsStreaming(true);

    // Persist user message to store
    ConversationStore.saveMessage(activeConvId, userMessage, currentUserEmail);
    setConversations(ConversationStore.getConversations(currentUserEmail));

    const assistantMsgId = `msg_ast_${Date.now()}`;
    const initialAssistantMessage: ConversationMessage = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      modelUsed: selectedModel,
      createdAt: new Date().toISOString(),
    };

    setMessages([...newMessages, initialAssistantMessage]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          modelSelectionId: selectedModel,
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          includeWebSearch,
          planTier: "pro",
          userId: currentUserEmail || "usr_anonymous",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");

      if (!reader) throw new Error("No readable stream received.");

      let accumulatedText = "";
      let modelAttribution = selectedModel;
      let citationsList: Array<{ title: string; url: string; snippet: string }> = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.replace("data: ", ""));

              if (data.type === "citations") {
                citationsList = data.citations;
              }

              if (data.text) {
                accumulatedText += data.text;
              }

              if (data.modelUsed) {
                modelAttribution = data.modelUsed;
              }

              if (data.error) {
                accumulatedText += `\n[Error: ${data.error}]`;
              }

              const updatedAssistantMsg: ConversationMessage = {
                id: assistantMsgId,
                role: "assistant",
                content: accumulatedText,
                modelUsed: modelAttribution,
                createdAt: new Date().toISOString(),
                citations: citationsList.length > 0 ? citationsList : undefined,
              };

              setMessages((prev) =>
                prev.map((msg) => (msg.id === assistantMsgId ? updatedAssistantMsg : msg))
              );

              // Persist incremental progress
              ConversationStore.saveMessage(activeConvId, updatedAssistantMsg, currentUserEmail);
            } catch {
              // Ignore partial JSON
            }
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name !== "AbortError") {
        const errorMsg = (err as Error).message || "Connection failed";
        const errorAssistantMsg: ConversationMessage = {
          id: assistantMsgId,
          role: "assistant",
          content: `*Request error: ${errorMsg}. If provider API keys are not yet configured in this environment, add them to .env.local.*`,
          modelUsed: selectedModel,
          createdAt: new Date().toISOString(),
        };

        setMessages((prev) =>
          prev.map((msg) => (msg.id === assistantMsgId ? errorAssistantMsg : msg))
        );
        ConversationStore.saveMessage(activeConvId, errorAssistantMsg, currentUserEmail);
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
      setConversations(ConversationStore.getConversations(currentUserEmail));
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRegenerate = async (targetMsgId: string, overrideModel?: string) => {
    if (isStreaming) return;
    const modelToUse = overrideModel || selectedModel;
    if (overrideModel) setSelectedModel(overrideModel);

    const targetIdx = messages.findIndex((m) => m.id === targetMsgId);
    if (targetIdx < 0) return;

    // Keep all messages preceding this assistant message
    const previousMessages = messages.slice(0, targetIdx);
    if (previousMessages.length === 0) return;

    setIsStreaming(true);
    setOpenModelMenuMsgId(null);
    setOpenMoreMenuMsgId(null);

    const assistantMsgId = `msg_ast_${Date.now()}`;
    const initialAssistantMessage: ConversationMessage = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      modelUsed: modelToUse,
      createdAt: new Date().toISOString(),
    };

    const nextMessages = [...previousMessages, initialAssistantMessage];
    setMessages(nextMessages);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          modelSelectionId: modelToUse,
          messages: previousMessages.map((m) => ({ role: m.role, content: m.content })),
          includeWebSearch,
          planTier: "pro",
          userId: currentUserEmail || "usr_anonymous",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      if (!reader) throw new Error("No readable stream received.");

      let accumulatedText = "";
      let modelAttribution = modelToUse;
      let citationsList: Array<{ title: string; url: string; snippet: string }> = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.replace("data: ", ""));
              if (data.type === "citations") citationsList = data.citations;
              if (data.text) accumulatedText += data.text;
              if (data.modelUsed) modelAttribution = data.modelUsed;
              if (data.error) accumulatedText += `\n[Error: ${data.error}]`;

              const updatedAssistantMsg: ConversationMessage = {
                id: assistantMsgId,
                role: "assistant",
                content: accumulatedText,
                modelUsed: modelAttribution,
                createdAt: new Date().toISOString(),
                citations: citationsList.length > 0 ? citationsList : undefined,
              };

              setMessages((prev) =>
                prev.map((msg) => (msg.id === assistantMsgId ? updatedAssistantMsg : msg))
              );

              ConversationStore.saveMessage(activeConvId, updatedAssistantMsg, currentUserEmail);
            } catch {}
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name !== "AbortError") {
        const errorMsg = (err as Error).message || "Connection failed";
        const errorAssistantMsg: ConversationMessage = {
          id: assistantMsgId,
          role: "assistant",
          content: `*Request error: ${errorMsg}.*`,
          modelUsed: modelToUse,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) =>
          prev.map((msg) => (msg.id === assistantMsgId ? errorAssistantMsg : msg))
        );
        ConversationStore.saveMessage(activeConvId, errorAssistantMsg, currentUserEmail);
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
      setConversations(ConversationStore.getConversations(currentUserEmail));
    }
  };

  const handleDownloadMarkdown = (content: string, id: string) => {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nexora-response-${id.slice(-6)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleToggleSpeech = (msgId: string, content: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }
    window.speechSynthesis.cancel();
    const plain = content
      .replace(/[#*`_~\[\]()>-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const utterance = new SpeechSynthesisUtterance(plain);
    utterance.rate = 1.0;
    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);
    setSpeakingMsgId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  const handleQuickFollowUp = (promptText: string) => {
    setOpenMoreMenuMsgId(null);
    handleSendMessage(promptText);
  };

  const handleDropFiles = (files: FileList | File[]) => {
    const selected = Array.from(files);
    setAttachments((prev) => [...prev, ...selected]);
  };

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchFilter.toLowerCase())
  );
  const conversationGroups = groupConversationsByDate(filteredConversations);

  const renderConversationItem = (conv: Conversation) => {
    const isActive = conv.id === activeConvId;
    const isEditing = editingTitleId === conv.id;

    return (
      <div
        key={conv.id}
        onClick={() => selectConversation(conv)}
        className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-sm cursor-pointer transition-colors ${
          isActive
            ? "bg-indigo-600/20 text-white border border-indigo-500/30 font-semibold"
            : "text-zinc-300 hover:bg-white/5 hover:text-white"
        }`}
      >
        <div className="flex items-center gap-2.5 truncate flex-1">
          {conv.isPinned && <Pin className="w-3.5 h-3.5 text-indigo-400 shrink-0 fill-indigo-400/20" />}
          {isEditing ? (
            <input
              type="text"
              autoFocus
              value={editTitleInput}
              onChange={(e) => setEditTitleInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename(conv.id);
                if (e.key === "Escape") setEditingTitleId(null);
              }}
              onBlur={() => handleRename(conv.id)}
              className="bg-slate-900 px-2 py-1 rounded text-white text-sm w-full focus:outline-none border border-indigo-500"
            />
          ) : (
            <span className="truncate">{conv.title}</span>
          )}
        </div>

        {!isEditing && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditingTitleId(conv.id);
                setEditTitleInput(conv.title);
              }}
              className="p-1 hover:text-white"
              title="Rename"
            >
              <Edit2 className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => handleTogglePin(conv.id, e)}
              className="p-1 hover:text-white"
              title={conv.isPinned ? "Unpin" : "Pin"}
            >
              <Pin className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => handleDeleteConversation(conv.id, e)}
              className="p-1 hover:text-rose-400"
              title="Delete"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full bg-slate-950 relative overflow-hidden">
      {/* ==================================================================== */}
      {/* CONVERSATION HISTORY DRAWER (Collapsible)                            */}
      {/* ==================================================================== */}
      {sidebarOpen ? (
        <aside className="w-64 border-r border-white/5 bg-slate-950/90 flex flex-col justify-between p-3 shrink-0">
          <div className="space-y-3">
            {/* Drawer Header & Collapse Button */}
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Chat History
              </span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 text-zinc-400 hover:text-white rounded hover:bg-white/5"
                title="Collapse sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>

            {/* New Conversation Button */}
            <button
              onClick={handleNewConversation}
              className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>New Conversation</span>
            </button>

            {/* Search Filter */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search chats..."
                className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Date-Grouped Conversations List */}
            <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-230px)] pr-1">
              {conversationGroups.pinned.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1">
                    <Pin className="w-3 h-3 fill-indigo-400/20" />
                    <span>Pinned</span>
                  </div>
                  {conversationGroups.pinned.map(renderConversationItem)}
                </div>
              )}

              {conversationGroups.today.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Today
                  </div>
                  {conversationGroups.today.map(renderConversationItem)}
                </div>
              )}

              {conversationGroups.yesterday.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Yesterday
                  </div>
                  {conversationGroups.yesterday.map(renderConversationItem)}
                </div>
              )}

              {conversationGroups.previous7Days.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Previous 7 Days
                  </div>
                  {conversationGroups.previous7Days.map(renderConversationItem)}
                </div>
              )}

              {conversationGroups.older.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Older
                  </div>
                  {conversationGroups.older.map(renderConversationItem)}
                </div>
              )}

              {filteredConversations.length === 0 && (
                <div className="text-center py-6 text-zinc-500 text-xs">
                  No conversations found
                </div>
              )}
            </div>
          </div>
        </aside>
      ) : (
        /* Collapsed Open Button */
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 m-2 h-fit text-zinc-400 hover:text-white glass-card rounded-xl border border-white/5"
          title="Open conversation history"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>
      )}

      {/* ==================================================================== */}
      {/* MAIN CHAT STAGE                                                      */}
      {/* ==================================================================== */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Controls Bar */}
        <div className="px-4 py-2.5 border-b border-white/5 bg-slate-900/40 flex items-center justify-between z-20">
          {/* Model Selector & Inspector */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 hover:border-white/20 text-white text-xs font-medium transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span className="capitalize font-semibold">
                  {selectedModel
                    .replace("nexora-", "Nexora ")
                    .replace("openai:", "OpenAI ")
                    .replace("anthropic:", "Anthropic ")}
                </span>
                <ChevronDown className="w-3 h-3 text-zinc-400" />
              </button>

              {modelDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 rounded-2xl glass-panel border border-white/10 shadow-2xl p-2 space-y-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Nexora Branded Profiles
                  </div>
                  {NEXORA_MODEL_FAMILIES.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => {
                        setSelectedModel(f.slug);
                        setModelDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                        selectedModel === f.slug
                          ? "bg-indigo-600 text-white font-medium"
                          : "text-zinc-300 hover:bg-white/5"
                      }`}
                    >
                      <div>
                        <div className="font-semibold">{f.displayName} 1.0</div>
                        <div className="text-[10px] text-zinc-400 line-clamp-1">{f.description}</div>
                      </div>
                      {selectedModel === f.slug && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}

                  <div className="px-2 pt-2 border-t border-white/5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Direct Foundation Models
                  </div>
                  {EXTERNAL_MODELS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setSelectedModel(m.id);
                        setModelDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                        selectedModel === m.id
                          ? "bg-indigo-600 text-white font-medium"
                          : "text-zinc-300 hover:bg-white/5"
                      }`}
                    >
                      <div>
                        <div className="font-semibold">{m.displayName}</div>
                        <div className="text-[10px] text-zinc-400">{m.providerKey.toUpperCase()}</div>
                      </div>
                      {selectedModel === m.id && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Model Details Inspector Trigger */}
            <button
              onClick={() => setInspectingModelId(selectedModel)}
              className="p-1.5 text-zinc-400 hover:text-indigo-400 rounded-lg hover:bg-white/5 transition-colors"
              title="Inspect model routing details & capabilities"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>

          {/* Web Research Toggle */}
          <button
            onClick={() => setIncludeWebSearch(!includeWebSearch)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
              includeWebSearch
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                : "bg-slate-900 text-zinc-400 border-white/5 hover:text-white"
            }`}
            title="Augment query with verified live web citations"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Web Research</span>
            {includeWebSearch && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
          </button>
        </div>

        {/* Capability Error Banner */}
        {capabilityError && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>{capabilityError}</span>
            </div>
            <button onClick={() => setCapabilityError(null)} className="hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Message Stream Stage */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.length === 0 ? (
              <div className="text-center py-24 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-white/10 mx-auto flex items-center justify-center shadow-xl p-2.5 drop-shadow-[0_4px_16px_rgba(59,130,246,0.35)]">
                  <Image src="/nexora-logo.png?v=3" alt="Nexora" width={36} height={36} className="object-contain" priority unoptimized />
                </div>
                <h3 className="text-lg font-bold text-white">Start a New Multi-Model Chat</h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  Type your prompt below, toggle live web research, or attach files for document reasoning.
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="flex gap-3 group">
                  <div
                    className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-sm font-bold ${
                      msg.role === "user"
                        ? "bg-zinc-800 text-zinc-100"
                        : "bg-slate-900 border border-white/10 p-1.5 shadow-md shadow-indigo-600/20"
                    }`}
                  >
                    {msg.role === "user" ? (
                      "U"
                    ) : (
                      <Image src="/nexora-logo.png?v=3" alt="Nexora" width={22} height={22} className="object-contain" unoptimized />
                    )}
                  </div>

                  <div className="flex-1 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm font-semibold text-zinc-100">
                          {msg.role === "user" ? "You" : "Nexora Assistant"}
                        </span>
                        {msg.modelUsed && (
                          <span className="text-xs px-2.5 py-0.5 rounded-md bg-zinc-800/90 text-zinc-300 font-mono">
                            {msg.modelUsed}
                          </span>
                        )}
                      </div>

                      {msg.role === "assistant" && msg.content && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => copyToClipboard(msg.content, msg.id)}
                            className="p-1 text-zinc-500 hover:text-white"
                            title="Copy full text"
                          >
                            {copiedId === msg.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Attachments preview */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {msg.attachments.map((att, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/5 text-[11px] text-indigo-300"
                          >
                            <FileText className="w-3 h-3" />
                            <span>{att.name}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Content formatted with rich markdown and syntax code blocks */}
                    <MarkdownRenderer content={msg.content} />

                    {/* Citations */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-3 p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-1.5">
                        <span className="text-[10px] uppercase font-bold text-indigo-400 flex items-center gap-1">
                          <Search className="w-3 h-3" />
                          Verified Web Citations
                        </span>
                        <div className="space-y-1">
                          {msg.citations.map((c, i) => (
                            <a
                              key={i}
                              href={c.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between text-xs text-zinc-300 hover:text-indigo-300 transition-colors p-1 rounded hover:bg-white/5"
                            >
                              <span className="truncate pr-2">[{i + 1}] {c.title}</span>
                              <ExternalLink className="w-3 h-3 shrink-0 text-zinc-500" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Interactive Action Bar (ChatGPT / Gemini style): Copy, Reload, Change Model, More Options */}
                    {msg.role === "assistant" && msg.content && !isStreaming && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-white/5 text-xs text-zinc-400">
                        {/* 1. Copy Action */}
                        <button
                          onClick={() => copyToClipboard(msg.content, msg.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 hover:text-white transition-all text-xs font-semibold"
                          title="Copy full response"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-4 h-4 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>

                        {/* 2. Reload / Regenerate Action */}
                        <button
                          onClick={() => handleRegenerate(msg.id)}
                          disabled={isStreaming}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 hover:text-white transition-all text-xs font-semibold disabled:opacity-50"
                          title="Regenerate this response"
                        >
                          <RefreshCw className="w-4 h-4" />
                          <span>Reload</span>
                        </button>

                        {/* 3. Change Model Action & Dropdown */}
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMoreMenuMsgId(null);
                              setOpenModelMenuMsgId(openModelMenuMsgId === msg.id ? null : msg.id);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-indigo-200 border border-indigo-500/20 transition-all text-xs font-semibold"
                            title="Change model and regenerate"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Change Model</span>
                            <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                          </button>

                          {openModelMenuMsgId === msg.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute left-0 bottom-full mb-2 w-64 rounded-xl bg-slate-900 border border-white/10 shadow-2xl p-2 z-40 backdrop-blur-xl space-y-1"
                            >
                              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                                Switch Model &amp; Regenerate
                              </div>
                              {AVAILABLE_ACTION_MODELS.map((model) => (
                                <button
                                  key={model.id}
                                  onClick={() => handleRegenerate(msg.id, model.id)}
                                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white/5 text-left transition-colors group/item"
                                >
                                  <div>
                                    <div className="text-xs font-semibold text-white group-hover/item:text-indigo-300 transition-colors flex items-center gap-1.5">
                                      <span>{model.name}</span>
                                      <span className={`text-[9px] px-1.5 py-0.2 rounded border font-mono ${model.color}`}>
                                        {model.badge}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-zinc-400 leading-tight mt-0.5 line-clamp-1">
                                      {model.desc}
                                    </p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* 4. More Options Action Dropdown */}
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenModelMenuMsgId(null);
                              setOpenMoreMenuMsgId(openMoreMenuMsgId === msg.id ? null : msg.id);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 hover:text-white transition-all text-[11px] font-medium"
                            title="More options"
                          >
                            <MoreHorizontal className="w-3.5 h-3.5" />
                            <span>More</span>
                          </button>

                          {openMoreMenuMsgId === msg.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute left-0 bottom-full mb-2 w-56 rounded-xl bg-slate-900 border border-white/10 shadow-2xl p-1.5 z-40 backdrop-blur-xl space-y-1"
                            >
                              <button
                                onClick={() => handleQuickFollowUp("Explain the above response in simpler, beginner-friendly terms with intuitive analogies.")}
                                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-white/5 text-left text-xs text-zinc-200 hover:text-white transition-colors"
                              >
                                <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                <span>Explain Simpler</span>
                              </button>
                              <button
                                onClick={() => handleQuickFollowUp("Provide a comprehensive, technical deep dive on the above topic with architecture and practical examples.")}
                                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-white/5 text-left text-xs text-zinc-200 hover:text-white transition-colors"
                              >
                                <BookOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                <span>Deep Dive / Expand</span>
                              </button>
                              <button
                                onClick={() => handleQuickFollowUp("Summarize the key takeaways and conclusions of the above response into concise bullet points.")}
                                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-white/5 text-left text-xs text-zinc-200 hover:text-white transition-colors"
                              >
                                <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                <span>Summarize Key Points</span>
                              </button>
                              <div className="h-px bg-white/10 my-1" />
                              <button
                                onClick={() => {
                                  handleDownloadMarkdown(msg.content, msg.id);
                                  setOpenMoreMenuMsgId(null);
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-white/5 text-left text-xs text-zinc-200 hover:text-white transition-colors"
                              >
                                <Download className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span>Download Markdown (.md)</span>
                              </button>
                              <button
                                onClick={() => {
                                  handleToggleSpeech(msg.id, msg.content);
                                  setOpenMoreMenuMsgId(null);
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-white/5 text-left text-xs text-zinc-200 hover:text-white transition-colors"
                              >
                                {speakingMsgId === msg.id ? (
                                  <>
                                    <VolumeX className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                    <span className="text-rose-300">Stop Reading</span>
                                  </>
                                ) : (
                                  <>
                                    <Volume2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                    <span>Read Aloud</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Message Composer */}
        <div className="p-4 border-t border-white/5 bg-slate-950 z-20">
          <div className="max-w-3xl mx-auto space-y-2">
            {/* Active Attachment Pills */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 pb-1">
                {attachments.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 text-xs"
                  >
                    <FileText className="w-3 h-3" />
                    <span className="truncate max-w-xs">{file.name}</span>
                    <button
                      onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                      className="hover:text-white p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input Box with Drag & Drop */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  handleDropFiles(e.dataTransfer.files);
                }
              }}
              className={`relative rounded-2xl glass-card border transition-all p-2.5 sm:p-3 flex items-end gap-2.5 shadow-xl ${
                isDragging
                  ? "border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/30"
                  : "border-white/10 focus-within:border-indigo-500/50"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  if (e.target.files) handleDropFiles(e.target.files);
                }}
                multiple
                accept=".pdf,.docx,.doc,.txt,.md,.csv,.xlsx,.xls,.json,.xml,.yaml,.yml,.ts,.tsx,.js,.jsx,.py,.java,.c,.cpp,.cs,.go,.rs,.sql,.html,.css,.png,.jpg,.jpeg,.webp,.gif,.svg,.mp3,.wav,.m4a,.ogg,.mp4,.webm,.zip,.tar,.gz"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 text-zinc-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors shrink-0"
                title="Attach universal file (Documents, Spreadsheets, Code, Media, Archives)"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={`Message ${selectedModel.replace("nexora-", "Nexora ")}... (Shift+Enter for newline)`}
                rows={1}
                className="flex-1 max-h-36 bg-transparent text-base text-white placeholder-zinc-500 resize-none focus:outline-none py-2 px-1.5 leading-relaxed"
              />

              {isStreaming ? (
                <button
                  onClick={handleStop}
                  className="p-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 transition-colors shrink-0"
                  title="Stop response"
                >
                  <Square className="w-5 h-5 fill-white" />
                </button>
              ) : (
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!input.trim() && attachments.length === 0}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 disabled:opacity-40 disabled:hover:from-indigo-500 disabled:hover:to-violet-600 text-white shadow-md shadow-indigo-600/20 transition-all shrink-0"
                  title="Send message"
                >
                  <Send className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Model Details Inspector Modal */}
      <ModelDetailsModal
        modelId={inspectingModelId}
        onClose={() => setInspectingModelId(null)}
      />
    </div>
  );
}
