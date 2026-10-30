"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
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
  Zap,
  ArrowUpRight,
  Shield,
  MessageSquare,
  Menu,
  LogOut,
  Layers,
  FolderOpen,
  CreditCard,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { NEXORA_MODEL_FAMILIES, EXTERNAL_MODELS } from "@/lib/ai/model-registry";
import {
  ConversationStore,
  Conversation,
  ConversationMessage,
  ConversationAttachment,
} from "@/lib/chat/conversation-store";
import { ModelDetailsModal } from "@/components/model-details-modal";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { EntityCard } from "@/components/chat/entity-card";
import { EntityCardData } from "@/lib/ai/entities/entity-types";
import { CreativeArtifactCard } from "@/components/chat/creative-artifact-card";
import { CreativeComposerDrawer } from "@/components/chat/creative-composer-drawer";
import { CreativeArtifact, CreativeArtifactType } from "@/lib/ai/creative/creative-types";
import { createClient } from "@/lib/supabase/client";
import { SavedAccountManager } from "@/lib/auth/saved-accounts";
import { NexoraLogo } from "@/components/nexora-logo";
import { getAppVersionDisplay } from "@/lib/version";

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

const STARTER_PROMPTS = [
  {
    icon: Sparkles,
    category: "Architecture & Code",
    title: "Multi-Model Comparison",
    description: "Compare OpenAI GPT-4o vs Claude 3.5 Sonnet for enterprise system design & API refactoring.",
    prompt: "Compare OpenAI GPT-4o vs Claude 3.5 Sonnet for enterprise system design & API refactoring. Detail their strengths in latency, reasoning depth, and context limits.",
    gradient: "from-blue-500/10 via-indigo-500/10 to-violet-500/5 hover:border-indigo-500/40",
    iconColor: "text-indigo-400",
  },
  {
    icon: Search,
    category: "Live Web Research",
    title: "Market & Tech Breakthroughs",
    description: "Search live verified web citations on the latest multi-agent framework architectures.",
    prompt: "Search the web for the latest advancements and production benchmarks in multi-agent AI systems in 2026. Provide verified citations.",
    gradient: "from-emerald-500/10 via-teal-500/10 to-cyan-500/5 hover:border-emerald-500/40",
    iconColor: "text-emerald-400",
    enableWeb: true,
  },
  {
    icon: FileText,
    category: "Document Intelligence",
    title: "Executive Synthesis & QA",
    description: "Synthesize complex business disclosures or research documents into high-signal takeaways.",
    prompt: "Draft a high-impact executive briefing comparing cloud infrastructure unit economics, GPU cluster utilization, and inference cost optimizations.",
    gradient: "from-amber-500/10 via-orange-500/10 to-rose-500/5 hover:border-amber-500/40",
    iconColor: "text-amber-400",
  },
  {
    icon: Zap,
    category: "Full-Stack Engineering",
    title: "Fault-Tolerant API Architecture",
    description: "Generate production TypeScript handlers with circuit breakers, retries, and schema validation.",
    prompt: "Generate a production-grade TypeScript API handler in Next.js 14 featuring a resilient circuit breaker, exponential backoff retries, and strict Zod runtime schema validation.",
    gradient: "from-purple-500/10 via-pink-500/10 to-indigo-500/5 hover:border-purple-500/40",
    iconColor: "text-purple-400",
  },
];

export default function ChatWorkspacePage() {
  const router = useRouter();
  const pathname = usePathname();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string>("");
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("");
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const [currentUserPlan, setCurrentUserPlan] = useState<"free" | "pro" | "family" | "enterprise">("enterprise");
  const [avatarInitial, setAvatarInitial] = useState<string>("U");
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState("nexora-core");
  const [providerStatuses, setProviderStatuses] = useState<Record<string, { isConfigured: boolean; state: string }>>({});
  const [defaultModelId, setDefaultModelId] = useState<string>("nexora-core");
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

  // Creative Studio State
  const [isCreativeDrawerOpen, setIsCreativeDrawerOpen] = useState(false);
  const [pendingCreativeRequest, setPendingCreativeRequest] = useState<{
    type: CreativeArtifactType;
    prompt: string;
    options: Record<string, any>;
  } | null>(null);

  // Drawer / History state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editTitleInput, setEditTitleInput] = useState("");
  const [capabilityError, setCapabilityError] = useState<string | null>(null);

  const mobileMenuBtnRef = useRef<HTMLButtonElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOwner =
    currentUserEmail.toLowerCase().trim() === "thzcreterz05@gmail.com" ||
    currentUserEmail.toLowerCase().trim() === "sde7mayim@gmail.com";

  const handleSignOut = async () => {
    try {
      SavedAccountManager.clearRememberedAccount();
      const supabase = createClient();
      await supabase.auth.signOut().catch(() => {});
    } catch {}
    router.push("/login");
  };

  const navigation = [
    { name: "Chat", href: "/app", icon: MessageSquare },
    { name: "Models", href: "/app/models", icon: Layers },
    { name: "Files", href: "/app/files", icon: FolderOpen },
    { name: "Web Research", href: "/app/research", icon: Search },
    { name: "Billing & Plans", href: "/app/billing", icon: CreditCard },
    { name: "Settings", href: "/app/settings", icon: Settings },
    ...(isOwner
      ? [{ name: "Admin Console", href: "/app/admin", icon: ShieldCheck, badge: "Owner" }]
      : []),
  ];

  // Auto-collapse desktop conversation history drawer on tablet & screens < 1280px
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 1280) {
      setSidebarOpen(true);
    }
  }, []);

  // Fetch provider configuration status and recommended default model
  useEffect(() => {
    let isSubscribed = true;
    async function loadModelStatuses() {
      try {
        const res = await fetch(`/api/models?plan=${currentUserPlan}`);
        if (res.ok && isSubscribed) {
          const data = await res.json();
          if (data.providerStatuses) {
            setProviderStatuses(data.providerStatuses);
          }
          if (data.defaultModelId) {
            setDefaultModelId(data.defaultModelId);
            setSelectedModel((prev) => {
              if (prev.startsWith("openai:") && !data.providerStatuses?.openai?.isConfigured) return data.defaultModelId;
              if (prev.startsWith("anthropic:") && !data.providerStatuses?.anthropic?.isConfigured) return data.defaultModelId;
              if (prev.startsWith("gemini:") && !data.providerStatuses?.gemini?.isConfigured) return data.defaultModelId;
              return prev;
            });
          }
        }
      } catch (err) {
        console.warn("[App] Could not load provider statuses:", err);
      }
    }
    loadModelStatuses();
    return () => {
      isSubscribed = false;
    };
  }, [currentUserPlan]);

  // Lock body scroll and listen for Escape key when mobile unified drawer is open
  useEffect(() => {
    if (mobileDrawerOpen) {
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setMobileDrawerOpen(false);
          mobileMenuBtnRef.current?.focus();
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", handleKeyDown);
      };
    } else {
      document.body.style.overflow = "";
    }
  }, [mobileDrawerOpen]);

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
      const remembered = SavedAccountManager.getRememberedAccount();
      let activeEmail = remembered?.email ? remembered.email.toLowerCase().trim() : "guest";
      let activeName = remembered?.name || "";

      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (data.user?.email) {
          const supaEmail = data.user.email.toLowerCase().trim();
          if (!remembered?.email || remembered.email.toLowerCase().trim() === supaEmail) {
            activeEmail = supaEmail;
            activeName = data.user.user_metadata?.full_name || supaEmail.split("@")[0];
          }
        }
      } catch {}

      if (!isMounted) return;
      const cleanName = activeName || (activeEmail !== "guest" ? activeEmail.split("@")[0] : "Nexora User");
      setCurrentUserEmail(activeEmail);
      setCurrentUserName(cleanName);
      setAvatarInitial(cleanName ? cleanName[0].toUpperCase() : "U");
      if (activeEmail === "thzcreterz05@gmail.com" || activeEmail === "sde7mayim@gmail.com") {
        setCurrentUserPlan("enterprise");
      }

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
        const remembered = SavedAccountManager.getRememberedAccount();
        const activeRememberedEmail = remembered?.email ? remembered.email.toLowerCase().trim() : null;
        const sessionEmail = session?.user?.email?.toLowerCase().trim();

        // If user explicitly signed into an account, use that account
        const newEmail = activeRememberedEmail || sessionEmail || "guest";
        const name = remembered?.name || session?.user?.user_metadata?.full_name || (newEmail !== "guest" ? newEmail.split("@")[0] : "Nexora User");

        if (isMounted) {
          setCurrentUserEmail(newEmail);
          setCurrentUserName(name);
          setAvatarInitial(name ? name[0].toUpperCase() : "U");
          if (newEmail === "thzcreterz05@gmail.com" || newEmail === "sde7mayim@gmail.com") {
            setCurrentUserPlan("enterprise");
          }

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
    setMobileDrawerOpen(false);
  };

  const handleNewConversation = () => {
    if (isStreaming) return;
    const newConv = ConversationStore.createConversation("New Conversation", selectedModel, currentUserEmail);
    setConversations([newConv, ...conversations]);
    setActiveConvId(newConv.id);
    setMessages([]);
    setCapabilityError(null);
    setMobileDrawerOpen(false);
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

    // Ensure an active conversation exists
    let convId = activeConvId;
    if (!convId) {
      const newConv = ConversationStore.createConversation("New Conversation", selectedModel, currentUserEmail);
      convId = newConv.id;
      setActiveConvId(convId);
      setConversations(ConversationStore.getConversations(currentUserEmail));
    }

    // Process attachments to extract textual content for context-aware QA
    const processedAttachments: ConversationAttachment[] = [];
    const filesForPayload: Array<{ id?: string; name: string; type?: string; size?: number; content?: string }> = [];

    for (const file of attachments) {
      try {
        const isTextBased =
          /\.(md|markdown|txt|csv|json|js|jsx|ts|tsx|py|html|css|yaml|yml|xml|sql|sh|env)$/i.test(file.name) ||
          file.type.startsWith("text/") ||
          file.type.includes("json") ||
          file.type.includes("csv");

        let content = "";
        if (isTextBased) {
          content = await file.text();
        } else {
          // Attempt parsing through /api/files for binary docs (e.g. PDF/DOCX)
          const fd = new FormData();
          fd.append("file", file);
          fd.append("conversationId", convId);
          fd.append("userId", currentUserEmail || "guest");
          fd.append("planTier", currentUserPlan);
          const uploadRes = await fetch("/api/files", { method: "POST", body: fd });
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            content = uploadData.fullText || uploadData.extractedSnippet || "";
          }
        }

        const attItem: ConversationAttachment = {
          name: file.name,
          size: file.size,
          mimeType: file.type || "text/plain",
          content: content || undefined,
        };
        processedAttachments.push(attItem);

        filesForPayload.push({
          name: file.name,
          size: file.size,
          type: file.type,
          content: content || undefined,
        });

        // Register document in conversation store
        if (content) {
          ConversationStore.addDocument(
            convId,
            {
              fileName: file.name,
              fileSizeBytes: file.size,
              mimeType: file.type || "text/plain",
              fullText: content,
            },
            currentUserEmail
          );
        }
      } catch (err) {
        console.warn("[App] Attachment extraction warning:", file.name, err);
        processedAttachments.push({
          name: file.name,
          size: file.size,
          mimeType: file.type,
        });
      }
    }

    const userMsgId = `msg_${Date.now()}`;
    const userMessage: ConversationMessage = {
      id: userMsgId,
      role: "user",
      content: textToSend,
      createdAt: new Date().toISOString(),
      attachments: processedAttachments,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    if (!retryContent) setInput("");
    setAttachments([]);
    setIsStreaming(true);

    // Persist user message to store
    ConversationStore.saveMessage(convId, userMessage, currentUserEmail);
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
          conversationId: convId,
          modelSelectionId: selectedModel,
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
            attachments: m.attachments,
          })),
          files: filesForPayload.length > 0 ? filesForPayload : undefined,
          includeWebSearch,
          planTier: currentUserPlan || "pro",
          userId: currentUserEmail || "usr_anonymous",
          creativeStudioRequest: pendingCreativeRequest || undefined,
        }),
      });

      // Clear pending creative action after dispatching
      if (pendingCreativeRequest) setPendingCreativeRequest(null);

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
      let entityCardsList: EntityCardData[] = [];
      let creativeArtifactsList: CreativeArtifact[] = [];

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

              if (data.type === "entityCards" || data.entityCards) {
                entityCardsList = data.entityCards;
              }

              if (data.type === "creativeArtifacts" || data.creativeArtifacts) {
                creativeArtifactsList = data.creativeArtifacts;
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
                entityCards: entityCardsList.length > 0 ? entityCardsList : undefined,
                creativeArtifacts: creativeArtifactsList.length > 0 ? creativeArtifactsList : undefined,
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
          conversationId: activeConvId,
          modelSelectionId: modelToUse,
          messages: previousMessages.map((m) => ({
            role: m.role,
            content: m.content,
            attachments: m.attachments,
          })),
          includeWebSearch,
          planTier: currentUserPlan || "pro",
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
      let entityCardsList: EntityCardData[] = [];
      let creativeArtifactsList: CreativeArtifact[] = [];

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
              if (data.type === "entityCards" || data.entityCards) entityCardsList = data.entityCards;
              if (data.type === "creativeArtifacts" || data.creativeArtifacts) creativeArtifactsList = data.creativeArtifacts;
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
                entityCards: entityCardsList.length > 0 ? entityCardsList : undefined,
                creativeArtifacts: creativeArtifactsList.length > 0 ? creativeArtifactsList : undefined,
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

  const handleCreativeAction = (action: string, payload?: any) => {
    if ((action === "generate-song-from-lyrics" || action === "convert-to-song") && payload) {
      setPendingCreativeRequest({
        type: "music",
        prompt: `Generate an original ${payload.genre || "Tamil Melody"} song titled "${payload.title}" with exact lyrics`,
        options: {
          title: payload.title,
          genre: payload.genre,
          mood: payload.mood,
          tempoBpm: payload.tempoBpm,
          keySignature: payload.keySignature,
          vocalStyle: payload.vocalStyle,
          instruments: payload.instruments,
          language: payload.language,
          fullExactLyrics: payload.lyrics,
          lyricsSnippet: payload.lyrics?.slice(0, 300),
        },
      });
      handleSendMessage(
        `Generate an original ${payload.genre || "Tamil Melody"} song track using these exact lyrics titled "${payload.title}".`
      );
    } else if (action === "variation" && payload) {
      setPendingCreativeRequest({
        type: "image",
        prompt: payload.prompt,
        options: {
          aspectRatio: payload.aspectRatio,
          style: payload.style,
          seed: Math.floor(Math.random() * 1000000),
        },
      });
      setInput(`Create a visual variation of: ${payload.prompt}`);
    } else if (action === "regenerate-music" && payload) {
      setPendingCreativeRequest({
        type: "music",
        prompt: payload.prompt,
        options: { genre: payload.genre },
      });
      setInput(`Regenerate audio track for: ${payload.prompt}`);
    } else if ((action === "retry-image" || action === "retry") && payload) {
      setPendingCreativeRequest({
        type: "image",
        prompt: payload.prompt,
        options: {
          aspectRatio: payload.aspectRatio || "1:1",
          style: payload.style || "realistic",
          seed: Math.floor(Math.random() * 1000000),
        },
      });
      handleSendMessage(`Generate an image of: ${payload.prompt}`);
    }
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
        onClick={() => {
          selectConversation(conv);
          setMobileDrawerOpen(false);
        }}
        className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[14.5px] cursor-pointer transition-colors ${
          isActive
            ? "bg-indigo-600/20 text-white border border-indigo-500/30 font-semibold shadow-sm"
            : "text-zinc-300 hover:bg-white/5 hover:text-white"
        }`}
      >
        <div className="flex items-center gap-2 truncate flex-1 min-w-0">
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
              className="bg-slate-900 px-2.5 py-1 rounded-lg text-white text-xs w-full focus:outline-none border border-indigo-500"
            />
          ) : (
            <span className="truncate">{conv.title}</span>
          )}
        </div>

        {!isEditing && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditingTitleId(conv.id);
                setEditTitleInput(conv.title);
              }}
              className="p-1 hover:text-white text-zinc-400"
              title="Rename"
            >
              <Edit2 className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => handleTogglePin(conv.id, e)}
              className="p-1 hover:text-white text-zinc-400"
              title={conv.isPinned ? "Unpin" : "Pin"}
            >
              <Pin className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => handleDeleteConversation(conv.id, e)}
              className="p-1 hover:text-rose-400 text-zinc-400"
              title="Delete"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderDesktopHistoryContent = () => (
    <div className="flex flex-col h-full justify-between space-y-3">
      <div className="space-y-3">
        {/* Drawer Header with + New Chat Action & Collapse Button */}
        <div className="flex items-center justify-between pb-2.5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Chats
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 border border-white/5">
              {conversations.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleNewConversation}
              className="p-1.5 text-zinc-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors flex items-center gap-1 text-xs font-medium"
              title="Start new conversation"
            >
              <Plus className="w-4 h-4 text-indigo-400" />
            </button>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              title="Collapse history drawer"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Filter */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search chats..."
            className="w-full pl-8 pr-2.5 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500 placeholder-zinc-500"
          />
        </div>

        {/* Date-Grouped Conversations List */}
        <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-230px)] pr-1">
          {conversationGroups.pinned.length > 0 && (
            <div className="space-y-1">
              <div className="px-2 text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <Pin className="w-3.5 h-3.5 fill-indigo-400/20" />
                <span>Pinned</span>
              </div>
              {conversationGroups.pinned.map(renderConversationItem)}
            </div>
          )}

          {conversationGroups.today.length > 0 && (
            <div className="space-y-1">
              <div className="px-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
                Today
              </div>
              {conversationGroups.today.map(renderConversationItem)}
            </div>
          )}

          {conversationGroups.yesterday.length > 0 && (
            <div className="space-y-1">
              <div className="px-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
                Yesterday
              </div>
              {conversationGroups.yesterday.map(renderConversationItem)}
            </div>
          )}

          {conversationGroups.previous7Days.length > 0 && (
            <div className="space-y-1">
              <div className="px-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
                Previous 7 Days
              </div>
              {conversationGroups.previous7Days.map(renderConversationItem)}
            </div>
          )}

          {conversationGroups.older.length > 0 && (
            <div className="space-y-1">
              <div className="px-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
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
    </div>
  );

  return (
    <div className="flex h-full bg-slate-950 relative overflow-hidden">
      {/* ==================================================================== */}
      {/* DESKTOP CONVERSATION HISTORY DRAWER                                  */}
      {/* ==================================================================== */}
      {sidebarOpen ? (
        <aside className="hidden md:flex w-64 border-r border-white/5 bg-slate-950/90 flex-col justify-between p-3 shrink-0">
          {renderDesktopHistoryContent()}
        </aside>
      ) : (
        /* Desktop Collapsed Open Button */
        <button
          onClick={() => setSidebarOpen(true)}
          className="hidden md:block p-2 m-2 h-fit text-zinc-400 hover:text-white glass-card rounded-xl border border-white/5 shrink-0"
          title="Open conversation history"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>
      )}

      {/* ==================================================================== */}
      {/* UNIFIED MOBILE DRAWER (Slide-over Navigation & Conversation History) */}
      {/* ==================================================================== */}
      {mobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Frosted Backdrop */}
          <div
            onClick={() => setMobileDrawerOpen(false)}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div className="relative w-80 max-w-[85vw] glass-drawer border-r border-white/10 p-4 flex flex-col justify-between shadow-2xl z-50 overflow-y-auto animate-in slide-in-from-left duration-250">
            <div className="space-y-4">
              {/* Brand & Close */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <NexoraLogo size="sm" />
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-white/10 min-w-[40px] min-h-[40px] flex items-center justify-center transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Workspace Plan Indicator */}
              <div className="flex items-center justify-between px-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-semibold text-zinc-300 capitalize">{currentUserPlan} Workspace</span>
                </div>
                {isOwner && (
                  <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/15 px-2 py-0.5 rounded-md border border-indigo-500/25">
                    Owner
                  </span>
                )}
              </div>

              {/* Primary New Conversation Action */}
              <button
                onClick={handleNewConversation}
                className="shimmer-btn w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-98 transition-all"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>New Conversation</span>
              </button>

              {/* Search chats */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Search chats..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500 placeholder-zinc-500"
                />
              </div>

              {/* Scrollable Conversation List */}
              <div className="space-y-3 overflow-y-auto max-h-[35vh] pr-1 touch-scroll">
                {conversationGroups.pinned.length > 0 && (
                  <div className="space-y-1">
                    <div className="px-2 text-[11px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                      <Pin className="w-3 h-3 fill-indigo-400/20" />
                      <span>Pinned</span>
                    </div>
                    {conversationGroups.pinned.map(renderConversationItem)}
                  </div>
                )}

                {conversationGroups.today.length > 0 && (
                  <div className="space-y-1">
                    <div className="px-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                      Today
                    </div>
                    {conversationGroups.today.map(renderConversationItem)}
                  </div>
                )}

                {conversationGroups.yesterday.length > 0 && (
                  <div className="space-y-1">
                    <div className="px-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                      Yesterday
                    </div>
                    {conversationGroups.yesterday.map(renderConversationItem)}
                  </div>
                )}

                {conversationGroups.previous7Days.length > 0 && (
                  <div className="space-y-1">
                    <div className="px-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                      Previous 7 Days
                    </div>
                    {conversationGroups.previous7Days.map(renderConversationItem)}
                  </div>
                )}

                {conversationGroups.older.length > 0 && (
                  <div className="space-y-1">
                    <div className="px-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                      Older
                    </div>
                    {conversationGroups.older.map(renderConversationItem)}
                  </div>
                )}

                {filteredConversations.length === 0 && (
                  <div className="text-center py-4 text-zinc-500 text-xs">
                    No conversations found
                  </div>
                )}
              </div>

              {/* Workspace Navigation Links */}
              <div className="pt-2 border-t border-white/10 space-y-1">
                <div className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  Workspace
                </div>
                {navigation.map((item) => {
                  const active = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileDrawerOpen(false)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                        active
                          ? "bg-indigo-600/20 text-white font-semibold border border-indigo-500/30"
                          : "text-zinc-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.name}</span>
                      </div>
                      {(item as any).badge && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {(item as any).badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Mobile Drawer User Footer */}
            <div className="pt-4 mt-2 border-t border-white/10 space-y-2 shrink-0">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-white/5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/35 flex items-center justify-center text-indigo-300 text-xs font-bold shrink-0">
                    {avatarInitial}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-white truncate">{currentUserName}</span>
                    <span className="text-[11px] text-zinc-400 truncate">{currentUserEmail}</span>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  title="Sign out"
                  aria-label="Sign out"
                  className="text-zinc-400 hover:text-rose-400 p-2 rounded-lg hover:bg-white/5 transition-colors shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
              <div className="text-[10px] text-zinc-500 text-center font-mono">
                {getAppVersionDisplay()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MAIN CHAT STAGE                                                      */}
      {/* ==================================================================== */}
      <div className="flex-1 min-w-0 max-w-full flex flex-col h-full overflow-hidden">
        {/* Single Compact Top Controls Bar */}
        <header className="px-3 py-2 md:px-4 md:py-2.5 border-b border-white/10 glass-topbar flex items-center justify-between z-20 shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            {/* Mobile Unified Drawer Hamburger Trigger */}
            <button
              ref={mobileMenuBtnRef}
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Open menu and conversations"
              className="md:hidden p-2 -ml-1 text-zinc-300 hover:text-white rounded-xl hover:bg-white/10 min-w-[40px] min-h-[40px] flex items-center justify-center active:scale-95 transition-all shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Mobile Nexora Identity */}
            <div className="md:hidden flex items-center shrink-0 mr-1">
              <NexoraLogo size="xs" showText={false} />
            </div>

            {/* Model Selector & Inspector */}
            <div className="relative">
              <button
                onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl sm:rounded-2xl bg-slate-900/90 border border-white/10 hover:border-white/20 text-white text-xs sm:text-sm font-semibold transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="capitalize truncate max-w-[105px] xs:max-w-[140px] sm:max-w-none">
                  {selectedModel
                    .replace("nexora-", "Nexora ")
                    .replace("openai:", "OpenAI ")
                    .replace("anthropic:", "Anthropic ")}
                </span>
                <ChevronDown className="w-3 h-3 text-zinc-400 shrink-0" />
              </button>

              {modelDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 sm:w-80 rounded-2xl glass-panel border border-white/15 shadow-2xl p-2.5 space-y-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Nexora Branded Profiles
                  </div>
                  {NEXORA_MODEL_FAMILIES.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => {
                        setSelectedModel(f.slug);
                        setModelDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm flex items-center justify-between transition-colors ${
                        selectedModel === f.slug
                          ? "bg-indigo-600 text-white font-medium"
                          : "text-zinc-300 hover:bg-white/5"
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-sm">{f.displayName} 1.0</div>
                        <div className="text-xs text-zinc-400 line-clamp-1">{f.description}</div>
                      </div>
                      {selectedModel === f.slug && <Check className="w-4 h-4 shrink-0" />}
                    </button>
                  ))}

                  <div className="px-2.5 pt-2 border-t border-white/5 text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Direct Foundation Models
                  </div>
                  {EXTERNAL_MODELS.map((m) => {
                    const statusObj = providerStatuses[m.providerKey];
                    const isConfigured = statusObj ? statusObj.isConfigured : true;
                    return (
                      <button
                        key={m.id}
                        onClick={() => {
                          if (!isConfigured) {
                            setCapabilityError(
                              `${m.displayName} requires ${m.providerKey.toUpperCase()}_API_KEY which is not configured in .env.local. Configure it or choose an available model.`
                            );
                          }
                          setSelectedModel(m.id);
                          setModelDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm flex items-center justify-between transition-colors ${
                          selectedModel === m.id
                            ? "bg-indigo-600 text-white font-medium"
                            : "text-zinc-300 hover:bg-white/5"
                        } ${!isConfigured ? "opacity-75" : ""}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              isConfigured ? "bg-emerald-400 shadow-sm shadow-emerald-400/50" : "bg-amber-400/80"
                            }`}
                            title={isConfigured ? "Configured & Ready" : "API Key Not Set"}
                          />
                          <div>
                            <div className="font-semibold text-sm flex items-center gap-1.5">
                              {m.displayName}
                              {!isConfigured && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                                  No Key
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-zinc-400">{m.providerKey.toUpperCase()}</div>
                          </div>
                        </div>
                        {selectedModel === m.id && <Check className="w-4 h-4 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Model Details Inspector Trigger */}
            <button
              onClick={() => setInspectingModelId(selectedModel)}
              className="p-1.5 sm:p-2 text-zinc-400 hover:text-indigo-400 rounded-xl hover:bg-white/5 transition-colors shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center"
              title="Inspect model routing details & capabilities"
              aria-label="Model information"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Mobile Web Research Icon Toggle */}
            <button
              onClick={() => setIncludeWebSearch(!includeWebSearch)}
              className={`sm:hidden p-2 rounded-xl border transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center relative ${
                includeWebSearch
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  : "bg-slate-900 text-zinc-400 border-white/10 hover:text-white"
              }`}
              title={includeWebSearch ? "Web Research enabled" : "Enable Web Research"}
              aria-label="Toggle web research"
            >
              <Search className="w-4 h-4" />
              {includeWebSearch && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
              )}
            </button>

            {/* Desktop Web Research Button */}
            <button
              onClick={() => setIncludeWebSearch(!includeWebSearch)}
              className={`hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-2xl text-sm font-semibold border transition-colors ${
                includeWebSearch
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  : "bg-slate-900 text-zinc-300 border-white/10 hover:text-white"
              }`}
              title="Augment query with verified live web citations"
            >
              <Search className="w-4 h-4" />
              <span>Web Research</span>
              {includeWebSearch && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
            </button>

            {/* Mobile Quick New Chat Button */}
            <button
              onClick={handleNewConversation}
              className="md:hidden p-2 text-indigo-300 hover:text-white rounded-xl hover:bg-white/10 active:scale-95 transition-all min-w-[40px] min-h-[40px] flex items-center justify-center"
              title="New conversation"
              aria-label="New conversation"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </header>

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
        <div className="flex-1 min-w-0 max-w-full overflow-y-auto touch-scroll p-3 sm:p-6 space-y-6">
          <div className="max-w-3xl mx-auto space-y-6 min-w-0 max-w-full">
            {messages.length === 0 ? (
              <div className="text-center py-12 sm:py-16 space-y-6">
                <div className="relative inline-block">
                  <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-white/10 mx-auto flex items-center justify-center shadow-2xl p-3 glow-accent">
                    <Image src="/nexora-logo.png?v=3" alt="Nexora" width={42} height={42} className="object-contain" priority unoptimized />
                  </div>
                  <div className="absolute -inset-1 rounded-3xl bg-indigo-500/20 blur-xl -z-10 animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-white tracking-tight">
                    What can we build or research today?
                  </h3>
                  <p className="text-sm text-zinc-400 max-w-md mx-auto">
                    Select a curated starter workflow below or type your prompt to begin multi-model reasoning.
                  </p>
                </div>

                {/* Starter Prompts Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-2">
                  {STARTER_PROMPTS.map((p, idx) => {
                    const Icon = p.icon;
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          setInput(p.prompt);
                          if (p.enableWeb) setIncludeWebSearch(true);
                        }}
                        className={`group p-4 rounded-2xl glass-card bg-gradient-to-br ${p.gradient} border border-white/10 hover:border-white/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl text-left flex flex-col justify-between`}
                      >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-white/5 text-zinc-300 border border-white/10">
                                {p.category}
                              </span>
                              <ArrowUpRight className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" />
                            </div>
                            <h4 className="text-base font-semibold text-white group-hover:text-indigo-300 transition-colors flex items-center gap-2">
                              <Icon className={`w-4 h-4 ${p.iconColor}`} />
                              <span>{p.title}</span>
                            </h4>
                            <p className="text-sm text-zinc-400 leading-relaxed line-clamp-2">
                              {p.description}
                            </p>
                          </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <div key={msg.id} className="flex gap-2.5 sm:gap-3.5 group animate-in fade-in duration-200 min-w-0 max-w-full">
                    <div
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl shrink-0 flex items-center justify-center text-base font-bold shadow-md ${
                        msg.role === "user"
                          ? "bg-gradient-to-br from-zinc-700 to-zinc-900 text-zinc-100 border border-white/10"
                          : "bg-slate-900 border border-indigo-500/30 p-1.5 shadow-indigo-600/20"
                      }`}
                    >
                      {msg.role === "user" ? (
                        "U"
                      ) : (
                        <Image src="/nexora-logo.png?v=3" alt="Nexora" width={24} height={24} className="object-contain sm:w-[26px] sm:h-[26px]" unoptimized />
                      )}
                    </div>

                  <div className="flex-1 min-w-0 max-w-full space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                        <span className="text-base font-semibold text-zinc-100 truncate">
                          {msg.role === "user" ? "You" : "Nexora Assistant"}
                        </span>
                        {msg.modelUsed && (
                          <span className="text-xs px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-zinc-800/90 text-zinc-300 font-mono truncate">
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

                    {/* Multimodal AI Creative Studio Artifacts (Image, Edited Image, Lyrics, Music, Voice) */}
                    {msg.creativeArtifacts && msg.creativeArtifacts.length > 0 && (
                      <div className="mt-4 space-y-4">
                        {msg.creativeArtifacts.map((art, artIdx) => (
                          <CreativeArtifactCard
                            key={art.id || artIdx}
                            artifact={art}
                            onAction={handleCreativeAction}
                          />
                        ))}
                      </div>
                    )}

                    {/* Rich Conversational Entity Cards */}
                    {msg.entityCards && msg.entityCards.length > 0 && (
                      <div className="mt-4 space-y-4">
                        {msg.entityCards.map((card, cardIdx) => (
                          <EntityCard key={card.id || cardIdx} card={card} />
                        ))}
                      </div>
                    )}

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
              ))}

              {messages.length === 1 && messages[0].role === "assistant" && (
                <div className="pt-4 space-y-3.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Suggested Starter Workflows</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                    {STARTER_PROMPTS.map((p, idx) => {
                      const Icon = p.icon;
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            setInput(p.prompt);
                            if (p.enableWeb) setIncludeWebSearch(true);
                          }}
                          className={`group p-4 rounded-2xl glass-card bg-gradient-to-br ${p.gradient} border border-white/10 hover:border-white/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl text-left flex flex-col justify-between`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 border border-white/5">
                                {p.category}
                              </span>
                              <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white transition-colors" />
                            </div>
                            <h4 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors flex items-center gap-2">
                              <Icon className={`w-4 h-4 ${p.iconColor}`} />
                              <span>{p.title}</span>
                            </h4>
                            <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
                              {p.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
            <div ref={messagesEndRef} className="h-6 shrink-0" />
          </div>
        </div>

        {/* Message Composer */}
        <div className="p-3 md:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] border-t border-white/10 bg-slate-950/90 backdrop-blur-xl z-20 shrink-0">
          <div className="max-w-3xl mx-auto space-y-2">
            {/* Grounded Active Documents in this Conversation */}
            {(() => {
              const activeConv = conversations.find((c) => c.id === activeConvId);
              const activeDocs = activeConv?.activeDocuments || [];
              if (activeDocs.length === 0) return null;
              return (
                <div className="flex flex-wrap items-center gap-2 p-2 px-3 rounded-xl bg-indigo-950/40 border border-indigo-500/20 text-xs">
                  <div className="flex items-center gap-1.5 text-indigo-300 font-semibold shrink-0">
                    <FileText className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Document Context:</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {activeDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-xs text-zinc-200"
                      >
                        <span className="font-mono truncate max-w-[180px] sm:max-w-xs" title={doc.fileName}>
                          {doc.fileName}
                        </span>
                        {doc.fileSizeBytes && (
                          <span className="text-[10px] text-zinc-400">
                            ({(doc.fileSizeBytes / 1024).toFixed(1)} KB)
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            ConversationStore.removeDocument(activeConvId, doc.id || doc.fileName, currentUserEmail);
                            setConversations(ConversationStore.getConversations(currentUserEmail));
                          }}
                          className="text-zinc-400 hover:text-rose-400 p-0.5 ml-0.5 transition-colors"
                          title="Remove document from conversation context"
                          aria-label="Remove document from context"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Active Attachment Pills */}
            {attachments.length > 0 && (
              <div className="flex flex-nowrap sm:flex-wrap gap-2 pb-1 overflow-x-auto touch-scroll">
                {attachments.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 text-xs shrink-0"
                  >
                    <FileText className="w-3 h-3" />
                    <span className="truncate max-w-[140px] sm:max-w-xs">{file.name}</span>
                    <button
                      onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                      className="hover:text-white p-0.5"
                      aria-label="Remove attachment"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* AI Creative Studio Drawer */}
            <CreativeComposerDrawer
              isOpen={isCreativeDrawerOpen}
              onClose={() => setIsCreativeDrawerOpen(false)}
              onSubmitCreative={(type, promptText, opts) => {
                setPendingCreativeRequest({ type, prompt: promptText, options: opts });
                setInput(promptText);
              }}
            />

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
              className={`relative rounded-2xl glass-composer border transition-all p-2 sm:p-3 flex items-end gap-2 sm:gap-2.5 shadow-xl ${
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
                className="p-2 sm:p-2.5 text-zinc-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors shrink-0 min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] flex items-center justify-center"
                title="Attach universal file (Documents, Spreadsheets, Code, Media, Archives)"
                aria-label="Attach file"
              >
                <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              <button
                type="button"
                onClick={() => setIsCreativeDrawerOpen(!isCreativeDrawerOpen)}
                className={`p-2 sm:p-2.5 rounded-xl transition-all shrink-0 min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] flex items-center justify-center ${
                  isCreativeDrawerOpen
                    ? "bg-purple-500/25 text-purple-300 border border-purple-500/40 shadow-lg shadow-purple-500/20"
                    : "text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                }`}
                title="AI Creative Studio (Image, Lyrics, Music, Voice)"
                aria-label="AI Creative Studio"
              >
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
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
                className="flex-1 max-h-36 bg-transparent text-[16px] sm:text-[17px] text-white placeholder-zinc-500 resize-none focus:outline-none py-1.5 sm:py-2 px-1 sm:px-2 leading-relaxed"
              />

              {isStreaming ? (
                <button
                  onClick={handleStop}
                  className="p-2.5 sm:p-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 transition-colors shrink-0 min-w-[40px] min-h-[40px] flex items-center justify-center"
                  title="Stop response"
                  aria-label="Stop response"
                >
                  <Square className="w-4 h-4 sm:w-5 sm:h-5 fill-white" />
                </button>
              ) : (
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!input.trim() && attachments.length === 0}
                  className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 disabled:opacity-40 disabled:hover:from-indigo-500 disabled:hover:to-violet-600 text-white shadow-md shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95 shrink-0 min-w-[40px] min-h-[40px] flex items-center justify-center"
                  title="Send message"
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              )}
            </div>

            {/* Helper status & keyboard shortcut bar */}
            <div className="flex items-center justify-between px-2 pt-1 text-[11px] sm:text-xs text-zinc-400">
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-zinc-300 font-medium truncate max-w-[170px] sm:max-w-none">
                    {selectedModel.replace("nexora-", "Nexora ").replace("openai:", "OpenAI ").replace("anthropic:", "Anthropic ")}
                  </span>
                </span>
                {includeWebSearch && (
                  <span className="hidden xs:flex items-center gap-1 text-emerald-400 font-medium">
                    <Search className="w-3 h-3" />
                    <span>Web Research</span>
                  </span>
                )}
                {pendingCreativeRequest && (
                  <span className="flex items-center gap-1 text-purple-400 font-semibold bg-purple-500/15 px-2 py-0.5 rounded-full border border-purple-500/30 text-[10px]">
                    <Sparkles className="w-3 h-3" />
                    <span>Creative: {pendingCreativeRequest.type}</span>
                    <button
                      onClick={() => setPendingCreativeRequest(null)}
                      className="ml-1 text-zinc-400 hover:text-white font-bold"
                      title="Clear creative action"
                    >
                      ×
                    </button>
                  </span>
                )}
              </div>
              <div className="hidden sm:flex items-center gap-2 text-zinc-400 font-mono text-xs">
                <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10">↵ Send</span>
                <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10">Shift + ↵ Newline</span>
              </div>
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
