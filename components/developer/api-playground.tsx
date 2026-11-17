"use client";

import React, { useState, useEffect } from "react";
import {
  Play,
  Copy,
  Check,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Code2,
  Terminal,
  Activity,
  Layers,
  Sparkles,
  Send,
  Eye,
  Sliders,
  CheckCircle2,
  AlertCircle,
  FileText,
  Key,
  Download,
} from "lucide-react";
import {
  API_ENDPOINTS,
  ApiEndpointDoc,
  generateCurlSnippet,
  generateJavaScriptSnippet,
  generateTypeScriptSnippet,
  generatePythonSnippet,
} from "./doc-data";
import { SanitizedApiKey } from "@/lib/developer/api-keys";

interface ApiPlaygroundProps {
  initialEndpointId?: string;
  activeKeys: SanitizedApiKey[];
  userId: string;
}

export function ApiPlayground({
  initialEndpointId = "chat-completions",
  activeKeys,
  userId,
}: ApiPlaygroundProps) {
  const [selectedEndpointId, setSelectedEndpointId] = useState<string>(initialEndpointId);
  const [activeKeyInput, setActiveKeyInput] = useState<string>("");
  const [useSandboxMode, setUseSandboxMode] = useState<boolean>(true);
  const [liveConfirmAccepted, setLiveConfirmAccepted] = useState<boolean>(false);

  // Form parameters per endpoint
  const [chatModel, setChatModel] = useState<string>("nexora-core");
  const [chatPrompt, setChatPrompt] = useState<string>("Explain how modern distributed systems handle consensus in two sentences.");
  const [chatTemperature, setChatTemperature] = useState<number>(0.7);
  const [chatMaxTokens, setChatMaxTokens] = useState<number>(1024);

  const [imagePrompt, setImagePrompt] = useState<string>("Cyberpunk neon city street in heavy rain with vibrant reflections, 8k resolution");
  const [imageAspectRatio, setImageAspectRatio] = useState<string>("1:1");
  const [imageStyle, setImageStyle] = useState<string>("photorealistic");
  const [imageQuality, setImageQuality] = useState<string>("standard");

  const [musicPrompt, setMusicPrompt] = useState<string>("Uplifting acoustic guitar melody with warm percussion and upbeat tempo");
  const [musicGenre, setMusicGenre] = useState<string>("Acoustic Melody");
  const [musicMood, setMusicMood] = useState<string>("Uplifting");
  const [musicDuration, setMusicDuration] = useState<number>(30);
  const [musicIsInstrumental, setMusicIsInstrumental] = useState<boolean>(true);

  const [videoPrompt, setVideoPrompt] = useState<string>("Cinematic fly-through of a futuristic metropolis at sunset");
  const [videoDuration, setVideoDuration] = useState<number>(5);
  const [videoAspectRatio, setVideoAspectRatio] = useState<string>("16:9");

  const [lyricsPrompt, setLyricsPrompt] = useState<string>("Overcoming doubt and achieving personal greatness together");
  const [lyricsGenre, setLyricsGenre] = useState<string>("Pop / Modern Melody");
  const [lyricsMood, setLyricsMood] = useState<string>("Inspiring");
  const [lyricsVocalStyle, setLyricsVocalStyle] = useState<"Male" | "Female" | "Duet">("Duet");

  // View state: 'form' vs 'raw_json'
  const [inputMode, setInputMode] = useState<"form" | "json">("form");
  const [customJsonBody, setCustomJsonBody] = useState<string>("");

  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseHeaders, setResponseHeaders] = useState<Record<string, string>>({});
  const [responseJson, setResponseJson] = useState<any>(null);
  const [responseLatency, setResponseLatency] = useState<number | null>(null);
  const [activeResponseTab, setActiveResponseTab] = useState<"json" | "headers" | "code">("json");
  const [codeLang, setCodeLang] = useState<"curl" | "javascript" | "typescript" | "python">("curl");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Sync if initialEndpointId changes
  useEffect(() => {
    if (initialEndpointId) {
      setSelectedEndpointId(initialEndpointId);
    }
  }, [initialEndpointId]);

  const currentEndpoint = API_ENDPOINTS.find((ep) => ep.id === selectedEndpointId) || API_ENDPOINTS[0];
  const isMultimodal = ["image-generations", "music-generations", "video-generations"].includes(selectedEndpointId);

  // Build the effective payload based on current form controls
  const buildCurrentPayload = (): Record<string, any> => {
    if (inputMode === "json" && customJsonBody.trim()) {
      try {
        return JSON.parse(customJsonBody);
      } catch {
        // Fallback to form
      }
    }

    switch (selectedEndpointId) {
      case "chat-completions":
        return {
          model: chatModel,
          messages: [
            { role: "system", content: "You are an AI developer assistant integrated into Nexora." },
            { role: "user", content: chatPrompt },
          ],
          temperature: chatTemperature,
          max_tokens: chatMaxTokens,
        };
      case "image-generations":
        return {
          prompt: imagePrompt,
          aspect_ratio: imageAspectRatio,
          style: imageStyle,
          quality: imageQuality,
          provider: "auto",
        };
      case "music-generations":
        return {
          prompt: musicPrompt,
          genre: musicGenre,
          mood: musicMood,
          duration_seconds: musicDuration,
          is_instrumental: musicIsInstrumental,
        };
      case "video-generations":
        return {
          prompt: videoPrompt,
          duration_seconds: videoDuration,
          aspect_ratio: videoAspectRatio,
        };
      case "lyrics-generations":
        return {
          prompt: lyricsPrompt,
          genre: lyricsGenre,
          mood: lyricsMood,
          vocalStyle: lyricsVocalStyle,
          language: "English",
        };
      case "usage-summary":
        return {};
      case "models-list":
      default:
        return {};
    }
  };

  const currentPayload = buildCurrentPayload();

  // Reset custom JSON when switching endpoints
  const handleSelectEndpoint = (id: string) => {
    setSelectedEndpointId(id);
    setResponseStatus(null);
    setResponseJson(null);
    setResponseHeaders({});
    setResponseLatency(null);
    setCustomJsonBody("");
    setLiveConfirmAccepted(false);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Execute Request against real API route
  const handleExecute = async () => {
    if (isMultimodal && !useSandboxMode && !liveConfirmAccepted) {
      return;
    }

    try {
      setIsExecuting(true);
      setResponseStatus(null);
      setResponseJson(null);
      setResponseHeaders({});
      setResponseLatency(null);

      const startTime = performance.now();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Determine API key header:
      // If user typed a custom key, use it.
      // If sandbox mode is checked, use a valid synthetic test token or pass sandbox header.
      if (activeKeyInput.trim()) {
        headers["Authorization"] = `Bearer ${activeKeyInput.trim()}`;
      } else if (useSandboxMode) {
        // Safe sandbox token prefix recognized by Nexora auth
        headers["Authorization"] = `Bearer nx_test_sandbox_playground_${Date.now()}`;
      } else {
        // Fallback for live calls: pick first active live key if available or prompt
        const activeLiveKey = activeKeys.find((k) => k.environment === "live" && !k.revokedAt);
        if (activeLiveKey) {
          // Send key identifier for developer session authentication
          headers["x-developer-user-id"] = userId;
        }
      }

      let fetchUrl = currentEndpoint.path;
      const fetchOptions: RequestInit = {
        method: currentEndpoint.method,
        headers,
      };

      if (currentEndpoint.method === "POST") {
        fetchOptions.body = JSON.stringify(currentPayload);
      }

      const res = await fetch(fetchUrl, fetchOptions);
      const endTime = performance.now();
      setResponseLatency(Math.round(endTime - startTime));
      setResponseStatus(res.status);

      // Collect headers
      const resHeaders: Record<string, string> = {};
      res.headers.forEach((val, key) => {
        resHeaders[key] = val;
      });
      setResponseHeaders(resHeaders);

      let data: any;
      try {
        data = await res.json();
      } catch {
        data = { message: await res.text() };
      }
      setResponseJson(data);
    } catch (err: any) {
      setResponseStatus(500);
      setResponseJson({
        error: {
          message: err?.message || "Network request failed",
          type: "client_fetch_error",
        },
      });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar: Endpoint Selector & Execution Controls */}
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Endpoint:
          </label>
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/5 border border-white/10 overflow-x-auto max-w-full">
            {API_ENDPOINTS.map((ep) => {
              const isSelected = selectedEndpointId === ep.id;
              return (
                <button
                  key={ep.id}
                  onClick={() => handleSelectEndpoint(ep.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${isSelected
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                    }`}
                >
                  <span
                    className={`text-[9px] font-mono font-bold px-1 rounded ${ep.method === "POST" ? "bg-indigo-400/20 text-indigo-200" : "bg-emerald-400/20 text-emerald-200"
                      }`}
                  >
                    {ep.method}
                  </span>
                  <span>{ep.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sandbox Mode Switch */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            onClick={() => {
              setUseSandboxMode(!useSandboxMode);
              setLiveConfirmAccepted(false);
            }}
            className={`cursor-pointer px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-2 transition-all ${useSandboxMode
              ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-300"
              : "bg-amber-950/30 border-amber-500/40 text-amber-300"
              }`}
          >
            {useSandboxMode ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sandbox Mode (₹0 Cost)</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Live Mode (Active Inference)</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Multimodal Warning Banner if Live Mode is Selected */}
      {isMultimodal && !useSandboxMode && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Potentially Billable Generation Warning</span>
          </div>
          <p className="text-[11px] text-zinc-300 leading-relaxed">
            You are in <strong>Live Mode</strong> on a multimodal media generation endpoint (
            <code className="text-white font-mono">{currentEndpoint.path}</code>). Live requests trigger GPU synthesis and consume allocation units. To test schemas and parameter validations safely with zero cost, switch to <strong>Sandbox Mode</strong>.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-medium text-amber-200">
              <input
                type="checkbox"
                checked={liveConfirmAccepted}
                onChange={(e) => setLiveConfirmAccepted(e.target.checked)}
                className="rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-0"
              />
              <span>I understand and wish to execute a live generation request</span>
            </label>
          </div>
        </div>
      )}

      {/* Two Column Workbench: Left Config, Right Response Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Request Configuration & Inputs */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
            {/* Header: Key & Input Mode Switcher */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold text-white uppercase tracking-wider">
                  Request Parameters
                </span>
              </div>

              {currentEndpoint.method === "POST" && (
                <div className="flex items-center gap-1 p-0.5 rounded-lg bg-white/5 border border-white/10 text-[11px]">
                  <button
                    onClick={() => setInputMode("form")}
                    className={`px-2.5 py-0.5 rounded font-medium transition-all ${inputMode === "form" ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-white"
                      }`}
                  >
                    Form View
                  </button>
                  <button
                    onClick={() => {
                      setInputMode("json");
                      setCustomJsonBody(JSON.stringify(currentPayload, null, 2));
                    }}
                    className={`px-2.5 py-0.5 rounded font-medium transition-all ${inputMode === "json" ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-white"
                      }`}
                  >
                    JSON View
                  </button>
                </div>
              )}
            </div>

            {/* API Key Input (Stored strictly in component memory) */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300 flex items-center justify-between">
                <span>API Key Authorization (Optional Override):</span>
                <span className="text-[10px] text-zinc-500">Kept in component memory only</span>
              </label>
              <input
                type="password"
                placeholder={useSandboxMode ? "nx_test_... (Sandbox token used automatically)" : "nx_live_... (Enter your key)"}
                value={activeKeyInput}
                onChange={(e) => setActiveKeyInput(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 font-mono focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* FORM VIEW CONTROLS */}
            {inputMode === "form" ? (
              <div className="space-y-4 pt-1">
                {/* 1. Chat Completions Controls */}
                {selectedEndpointId === "chat-completions" && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-300">Model Family:</label>
                      <select
                        value={chatModel}
                        onChange={(e) => setChatModel(e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="nexora-core">nexora-core (Balanced reasoning & general tasks)</option>
                        <option value="nexora-chat">nexora-chat (Everyday conversational speed)</option>
                        <option value="nexora-swift">nexora-swift (Ultra-low latency completions)</option>
                        <option value="nexora-reason">nexora-reason (Deep multi-step reasoning)</option>
                        <option value="nexora-vision">nexora-vision (Multimodal vision comprehension)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-300">User Message Prompt:</label>
                      <textarea
                        rows={3}
                        value={chatPrompt}
                        onChange={(e) => setChatPrompt(e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-zinc-400">Temperature ({chatTemperature})</label>
                        <input
                          type="range"
                          min="0"
                          max="1.5"
                          step="0.1"
                          value={chatTemperature}
                          onChange={(e) => setChatTemperature(parseFloat(e.target.value))}
                          className="w-full accent-indigo-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-zinc-400">Max Tokens ({chatMaxTokens})</label>
                        <input
                          type="range"
                          min="128"
                          max="4096"
                          step="128"
                          value={chatMaxTokens}
                          onChange={(e) => setChatMaxTokens(parseInt(e.target.value, 10))}
                          className="w-full accent-indigo-500"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* 2. Image Generations Controls */}
                {selectedEndpointId === "image-generations" && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-300">Image Description Prompt:</label>
                      <textarea
                        rows={3}
                        value={imagePrompt}
                        onChange={(e) => setImagePrompt(e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-zinc-400">Aspect Ratio:</label>
                        <select
                          value={imageAspectRatio}
                          onChange={(e) => setImageAspectRatio(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                        >
                          <option value="1:1">1:1 (Square)</option>
                          <option value="16:9">16:9 (Landscape)</option>
                          <option value="9:16">9:16 (Portrait)</option>
                          <option value="4:3">4:3 (Standard)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-zinc-400">Art Style:</label>
                        <select
                          value={imageStyle}
                          onChange={(e) => setImageStyle(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                        >
                          <option value="photorealistic">Photorealistic</option>
                          <option value="cinematic">Cinematic</option>
                          <option value="anime">Anime</option>
                          <option value="digital-art">Digital Art</option>
                          <option value="neon-cyberpunk">Neon Cyberpunk</option>
                          <option value="minimalist">Minimalist</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-zinc-400">Quality:</label>
                        <select
                          value={imageQuality}
                          onChange={(e) => setImageQuality(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                        >
                          <option value="standard">Standard</option>
                          <option value="hd">HD High Detail</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {/* 3. Music Generations Controls */}
                {selectedEndpointId === "music-generations" && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-300">Music Prompt / Theme:</label>
                      <textarea
                        rows={2}
                        value={musicPrompt}
                        onChange={(e) => setMusicPrompt(e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-zinc-400">Genre:</label>
                        <input
                          type="text"
                          value={musicGenre}
                          onChange={(e) => setMusicGenre(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-zinc-400">Mood:</label>
                        <input
                          type="text"
                          value={musicMood}
                          onChange={(e) => setMusicMood(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                        <input
                          type="checkbox"
                          checked={musicIsInstrumental}
                          onChange={(e) => setMusicIsInstrumental(e.target.checked)}
                          className="rounded border-white/20 bg-white/5 text-indigo-500"
                        />
                        <span>Instrumental Only (No Vocals)</span>
                      </label>
                      <span className="text-zinc-500 font-mono text-[11px]">{musicDuration}s track</span>
                    </div>
                  </>
                )}

                {/* 4. Video Generations Controls */}
                {selectedEndpointId === "video-generations" && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-300">Cinematic Prompt:</label>
                      <textarea
                        rows={3}
                        value={videoPrompt}
                        onChange={(e) => setVideoPrompt(e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-zinc-400">Duration (Seconds):</label>
                        <select
                          value={videoDuration}
                          onChange={(e) => setVideoDuration(parseInt(e.target.value, 10))}
                          className="w-full px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                        >
                          <option value="5">5 seconds</option>
                          <option value="10">10 seconds</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-zinc-400">Aspect Ratio:</label>
                        <select
                          value={videoAspectRatio}
                          onChange={(e) => setVideoAspectRatio(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                        >
                          <option value="16:9">16:9 (Landscape)</option>
                          <option value="9:16">9:16 (Vertical)</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {/* 5. Lyrics Generations Controls */}
                {selectedEndpointId === "lyrics-generations" && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-300">Song Arc / Narrative Theme:</label>
                      <textarea
                        rows={2}
                        value={lyricsPrompt}
                        onChange={(e) => setLyricsPrompt(e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-zinc-400">Genre:</label>
                        <input
                          type="text"
                          value={lyricsGenre}
                          onChange={(e) => setLyricsGenre(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-zinc-400">Mood:</label>
                        <input
                          type="text"
                          value={lyricsMood}
                          onChange={(e) => setLyricsMood(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-zinc-400">Vocal Style:</label>
                        <select
                          value={lyricsVocalStyle}
                          onChange={(e) => setLyricsVocalStyle(e.target.value as any)}
                          className="w-full px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Duet">Duet</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {/* GET Endpoints notice */}
                {currentEndpoint.method === "GET" && (
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 text-xs text-zinc-400">
                    This endpoint accepts query parameters and retrieves data via HTTP GET. No request body is required.
                  </div>
                )}
              </div>
            ) : (
              /* RAW JSON VIEW */
              <div className="space-y-2 pt-1">
                <textarea
                  rows={10}
                  value={customJsonBody}
                  onChange={(e) => setCustomJsonBody(e.target.value)}
                  className="w-full p-3 bg-black/60 border border-white/10 rounded-xl font-mono text-xs text-indigo-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}

            {/* Action Bar: Send Request Button */}
            <div className="pt-2 flex items-center justify-between border-t border-white/10">
              <button
                onClick={() => {
                  setCustomJsonBody("");
                  setInputMode("form");
                }}
                className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>

              <button
                onClick={handleExecute}
                disabled={isExecuting || (isMultimodal && !useSandboxMode && !liveConfirmAccepted)}
                className={`px-5 py-2.5 rounded-xl text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-lg active:scale-95 ${isMultimodal && !useSandboxMode && !liveConfirmAccepted
                  ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                  : isExecuting
                    ? "bg-indigo-700 text-zinc-300"
                    : "bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 shadow-indigo-600/30"
                  }`}
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Executing Request...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Test Request</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Response Inspector & Live Code Snippets */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4 min-h-[460px] flex flex-col justify-between">
            <div className="space-y-4">
              {/* Response Header Status Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white uppercase tracking-wider">
                    Response Inspector
                  </span>
                  {responseStatus !== null && (
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border ${responseStatus >= 200 && responseStatus < 300
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        : responseStatus === 429
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                        }`}
                    >
                      HTTP {responseStatus}
                    </span>
                  )}
                  {responseLatency !== null && (
                    <span className="text-[11px] font-mono text-zinc-400">
                      ({responseLatency} ms)
                    </span>
                  )}
                </div>

                {/* Response View Tabs */}
                <div className="flex items-center gap-1 p-0.5 rounded-lg bg-white/5 border border-white/10 text-[11px]">
                  <button
                    onClick={() => setActiveResponseTab("json")}
                    className={`px-2.5 py-0.5 rounded font-medium transition-all ${activeResponseTab === "json" ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-white"
                      }`}
                  >
                    JSON Body
                  </button>
                  <button
                    onClick={() => setActiveResponseTab("headers")}
                    className={`px-2.5 py-0.5 rounded font-medium transition-all ${activeResponseTab === "headers" ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-white"
                      }`}
                  >
                    Headers ({Object.keys(responseHeaders).length})
                  </button>
                  <button
                    onClick={() => setActiveResponseTab("code")}
                    className={`px-2.5 py-0.5 rounded font-medium transition-all ${activeResponseTab === "code" ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-white"
                      }`}
                  >
                    Code Snippet
                  </button>
                </div>
              </div>

              {/* Tab 1: JSON Body Viewer */}
              {activeResponseTab === "json" && (
                <div>
                  {isExecuting ? (
                    <div className="p-12 flex flex-col items-center justify-center gap-3 text-zinc-400 text-xs">
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                      <span>Sending request to {currentEndpoint.path}...</span>
                    </div>
                  ) : responseJson !== null ? (
                    <div className="space-y-3">
                      {/* Interactive Visual Media Preview if media is returned */}
                      {(() => {
                        const imgUrl = (responseJson as any)?.data?.[0]?.url;
                        const mediaUrl = (responseJson as any)?.media_url;
                        const isImage = selectedEndpointId === "image-generations" && imgUrl;
                        const isMusic = selectedEndpointId === "music-generations" && mediaUrl;
                        const isVideo = selectedEndpointId === "video-generations" && mediaUrl;

                        if (!isImage && !isMusic && !isVideo) return null;

                        return (
                          <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Live Generated Media Output</span>
                              </span>
                              <a
                                href={imgUrl || mediaUrl}
                                download={`nexora-${selectedEndpointId}-${Date.now()}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-[10px] text-zinc-300 flex items-center gap-1 transition-all"
                              >
                                <Download className="w-3 h-3" />
                                <span>Download</span>
                              </a>
                            </div>

                            {isImage && (
                              <div className="relative rounded-lg overflow-hidden border border-white/10 bg-black/40 flex items-center justify-center max-h-[220px]">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={imgUrl}
                                  alt="Generated output"
                                  className="max-h-[220px] w-auto object-contain rounded"
                                />
                              </div>
                            )}

                            {isMusic && (
                              <div className="p-2 rounded-lg bg-black/40 border border-white/10">
                                <audio controls src={mediaUrl} className="w-full h-8" />
                              </div>
                            )}

                            {isVideo && (
                              <div className="relative rounded-lg overflow-hidden border border-white/10 bg-black/40 flex items-center justify-center max-h-[220px]">
                                <video
                                  controls
                                  autoPlay
                                  loop
                                  muted
                                  src={mediaUrl}
                                  className="max-h-[220px] w-auto rounded"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      <div className="relative rounded-xl bg-black/60 border border-white/10 p-3 font-mono text-xs overflow-x-auto max-h-[380px]">
                        <div className="absolute top-2 right-2">
                          <button
                            onClick={() => copyToClipboard(JSON.stringify(responseJson, null, 2), "resp-json")}
                            className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-[10px] text-zinc-300 flex items-center gap-1 transition-all"
                          >
                            {copiedKey === "resp-json" ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                        <pre className="text-zinc-300">
                          <code>{JSON.stringify(responseJson, null, 2)}</code>
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div className="p-12 flex flex-col items-center justify-center gap-2 text-zinc-500 text-xs text-center">
                      <Terminal className="w-8 h-8 text-zinc-600" />
                      <div>Ready to execute. Select parameters on the left and click Send.</div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Response Headers Inspector */}
              {activeResponseTab === "headers" && (
                <div className="rounded-xl bg-black/60 border border-white/10 p-3 max-h-[380px] overflow-y-auto">
                  {Object.keys(responseHeaders).length > 0 ? (
                    <table className="w-full text-left text-xs font-mono">
                      <tbody className="divide-y divide-white/5 text-zinc-300">
                        {Object.entries(responseHeaders).map(([key, val]) => (
                          <tr key={key}>
                            <td className="p-2 text-indigo-300 font-semibold align-top">{key}</td>
                            <td className="p-2 text-zinc-400 break-all">{val}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-8 text-center text-xs text-zinc-500">
                      No response headers yet. Send a request to inspect HTTP response headers.
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Generated Code Snippet reflecting playground values */}
              {activeResponseTab === "code" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400">Reflects your active configuration:</span>
                    <div className="flex items-center gap-1 p-0.5 rounded-lg bg-white/5 border border-white/10 text-[11px]">
                      {(["curl", "javascript", "typescript", "python"] as const).map((lang) => (
                        <button
                          key={lang}
                          onClick={() => setCodeLang(lang)}
                          className={`px-2 py-0.5 rounded font-medium transition-all ${codeLang === lang ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-white"
                            }`}
                        >
                          {lang === "curl" ? "cURL" : lang === "javascript" ? "JS" : lang === "typescript" ? "TS" : "Python"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="relative rounded-xl bg-black/60 border border-white/10 p-3 font-mono text-xs overflow-x-auto max-h-[340px]">
                    <div className="absolute top-2 right-2">
                      <button
                        onClick={() => {
                          let snippet = "";
                          if (codeLang === "curl") snippet = generateCurlSnippet(currentEndpoint, currentPayload);
                          else if (codeLang === "javascript") snippet = generateJavaScriptSnippet(currentEndpoint, currentPayload);
                          else if (codeLang === "typescript") snippet = generateTypeScriptSnippet(currentEndpoint, currentPayload);
                          else snippet = generatePythonSnippet(currentEndpoint, currentPayload);
                          copyToClipboard(snippet, "pg-code");
                        }}
                        className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-[10px] text-zinc-300 flex items-center gap-1 transition-all"
                      >
                        {copiedKey === "pg-code" ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="text-zinc-300 leading-relaxed">
                      <code>
                        {codeLang === "curl"
                          ? generateCurlSnippet(currentEndpoint, currentPayload)
                          : codeLang === "javascript"
                            ? generateJavaScriptSnippet(currentEndpoint, currentPayload)
                            : codeLang === "typescript"
                              ? generateTypeScriptSnippet(currentEndpoint, currentPayload)
                              : generatePythonSnippet(currentEndpoint, currentPayload)}
                      </code>
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom info: safe sandbox indicator */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zero Plaintext Key Storage Policy</span>
              </div>
              <div>Sandbox Quotas Enforced</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
