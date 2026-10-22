"use client";

import { useState, useRef, useEffect } from "react";
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
} from "lucide-react";
import { NEXORA_MODEL_FAMILIES, EXTERNAL_MODELS } from "@/lib/ai/model-registry";
import { ConversationStore, Conversation, ConversationMessage } from "@/lib/chat/conversation-store";
import { ModelDetailsModal } from "@/components/model-details-modal";
import { MarkdownRenderer } from "@/components/markdown-renderer";

export default function ChatWorkspacePage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string>("");
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState("nexora-core");
  const [includeWebSearch, setIncludeWebSearch] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [inspectingModelId, setInspectingModelId] = useState<string | null>(null);

  // Drawer / History state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchFilter, setSearchFilter] = useState("");
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editTitleInput, setEditTitleInput] = useState("");
  const [capabilityError, setCapabilityError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load conversations on mount
  useEffect(() => {
    const list = ConversationStore.getConversations();
    setConversations(list);
    if (list.length > 0) {
      setActiveConvId(list[0].id);
      setMessages(list[0].messages);
      setSelectedModel(list[0].modelSelected || "nexora-core");
    }
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectConversation = (conv: Conversation) => {
    if (isStreaming) return;
    setActiveConvId(conv.id);
    setMessages(conv.messages);
    setSelectedModel(conv.modelSelected || "nexora-core");
    setCapabilityError(null);
  };

  const handleNewConversation = () => {
    if (isStreaming) return;
    const newConv = ConversationStore.createConversation("New Conversation", selectedModel);
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
    ConversationStore.renameConversation(id, editTitleInput.trim());
    setConversations(ConversationStore.getConversations());
    setEditingTitleId(null);
  };

  const handleDeleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    ConversationStore.deleteConversation(id);
    const updated = ConversationStore.getConversations();
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
    ConversationStore.togglePin(id);
    setConversations(ConversationStore.getConversations());
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
    ConversationStore.saveMessage(activeConvId, userMessage);
    setConversations(ConversationStore.getConversations());

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
              ConversationStore.saveMessage(activeConvId, updatedAssistantMsg);
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
        ConversationStore.saveMessage(activeConvId, errorAssistantMsg);
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
      setConversations(ConversationStore.getConversations());
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      setAttachments((prev) => [...prev, ...selected]);
    }
  };

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchFilter.toLowerCase())
  );

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

            {/* Conversations List */}
            <div className="space-y-1 overflow-y-auto max-h-[calc(100vh-230px)] pr-1">
              {filteredConversations.map((conv) => {
                const isActive = conv.id === activeConvId;
                const isEditing = editingTitleId === conv.id;

                return (
                  <div
                    key={conv.id}
                    onClick={() => selectConversation(conv)}
                    className={`group flex items-center justify-between px-2.5 py-2 rounded-xl text-xs cursor-pointer transition-colors ${
                      isActive
                        ? "bg-indigo-600/20 text-white border border-indigo-500/30 font-medium"
                        : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate flex-1">
                      {conv.isPinned && <Pin className="w-3 h-3 text-indigo-400 shrink-0 fill-indigo-400/20" />}
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
                          className="bg-slate-900 px-1 py-0.5 rounded text-white text-xs w-full focus:outline-none border border-indigo-500"
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
              })}
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
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 mx-auto flex items-center justify-center shadow-lg">
                  <Sparkles className="w-6 h-6" />
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
                    className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold ${
                      msg.role === "user"
                        ? "bg-zinc-800 text-zinc-200"
                        : "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    }`}
                  >
                    {msg.role === "user" ? "U" : <Sparkles className="w-3.5 h-3.5" />}
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-zinc-200">
                          {msg.role === "user" ? "You" : "Nexora Assistant"}
                        </span>
                        {msg.modelUsed && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-400 font-mono">
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

            {/* Input Box */}
            <div className="relative rounded-2xl glass-card border border-white/10 p-2 flex items-end gap-2 focus-within:border-indigo-500/50 transition-colors">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                multiple
                accept=".pdf,.txt,.md,.csv,.docx"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
                title="Attach document (PDF, DOCX, CSV, TXT, MD)"
              >
                <Paperclip className="w-4 h-4" />
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
                className="flex-1 max-h-32 bg-transparent text-sm text-white placeholder-zinc-500 resize-none focus:outline-none py-1.5 px-1"
              />

              {isStreaming ? (
                <button
                  onClick={handleStop}
                  className="p-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 transition-colors"
                  title="Stop response"
                >
                  <Square className="w-4 h-4 fill-white" />
                </button>
              ) : (
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!input.trim() && attachments.length === 0}
                  className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white shadow-md shadow-indigo-600/20 transition-all"
                  title="Send message"
                >
                  <Send className="w-4 h-4" />
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
