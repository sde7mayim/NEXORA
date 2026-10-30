"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Download,
  Copy,
  Check,
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  Music,
  Image as ImageIcon,
  Mic,
  FileText,
  Maximize2,
  X,
  Layers,
  ArrowRight,
  Disc3,
  Sliders,
  Share2,
  AlertCircle,
  RefreshCw,
  Edit3,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
} from "lucide-react";
import { CreativeArtifact, CreativeArtifactType } from "@/lib/ai/creative/creative-types";

interface CreativeArtifactCardProps {
  artifact: CreativeArtifact;
  onAction?: (action: string, payload?: any) => void;
}

export function CreativeArtifactCard({ artifact, onAction }: CreativeArtifactCardProps) {
  const [copied, setCopied] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Audio player state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(artifact.musicMetadata?.durationSeconds || 24);
  const [isMuted, setIsMuted] = useState(false);
  const [showOriginalComparison, setShowOriginalComparison] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [showPromptDetails, setShowPromptDetails] = useState(false);

  // Lyrics Studio states
  const initialLyricsText =
    artifact.lyricsMetadata?.sections
      ?.map((s) => `[${s.label}]\n${s.lines.join("\n")}`)
      .join("\n\n") || "";
  const [lyricsText, setLyricsText] = useState(initialLyricsText);
  const [lyricsTitle, setLyricsTitle] = useState(artifact.lyricsMetadata?.title || artifact.title);
  const [lyricsStudioTab, setLyricsStudioTab] = useState<"lyrics" | "style">("lyrics");
  const [isEditingLyrics, setIsEditingLyrics] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState(artifact.lyricsMetadata?.genre || "Tamil Romantic Melody");
  const [selectedMood, setSelectedMood] = useState(artifact.lyricsMetadata?.mood || "Love / Romantic");
  const [selectedVocal, setSelectedVocal] = useState<"Male" | "Female" | "Duet" | "Instrumental">(
    (artifact.lyricsMetadata?.vocalStyle as "Male" | "Female" | "Duet") || "Duet"
  );
  const [selectedBpm, setSelectedBpm] = useState(artifact.lyricsMetadata?.tempoBpm || 84);
  const [selectedKey, setSelectedKey] = useState(artifact.lyricsMetadata?.keySignature || "C Major (Kalyani Raga)");
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>(
    artifact.lyricsMetadata?.instruments || ["Acoustic Guitar", "Flute", "Percussion"]
  );

  // Music Player bound lyrics toggle (visible by default)
  const [showBoundLyrics, setShowBoundLyrics] = useState(true);
  const [volume, setVolume] = useState(1);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
      audioRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const handleReplay = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    setCurrentTime(0);
    audioRef.current.play();
    setIsPlaying(true);
  };

  const handleDownloadLyrics = (title: string, text: string) => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, "_")}_lyrics.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      if (!isNaN(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const seekTime = Number(e.target.value);
    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMedia = (url: string, filename: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = Math.floor(secs % 60);
    return `${mins}:${remaining < 10 ? "0" : ""}${remaining}`;
  };

  // --------------------------------------------------------------------------
  // RENDER: IMAGE & EDITED IMAGE
  // --------------------------------------------------------------------------
  if (artifact.type === "image" || artifact.type === "edited-image") {
    const isEdited = artifact.type === "edited-image";
    const imgMeta = artifact.imageMetadata;
    const currentDisplayUrl =
      isEdited && showOriginalComparison && imgMeta?.originalImagePreviewUrl
        ? imgMeta.originalImagePreviewUrl
        : artifact.mediaUrl || "";

    const isFailed =
      artifact.status === "failed" ||
      imageLoadError ||
      (!currentDisplayUrl && artifact.status !== "processing");

    // ERROR & RETRY VIEW (Prevents showing broken images, rate-limit HTML or broken banners)
    if (isFailed) {
      return (
        <div className="my-3 rounded-2xl overflow-hidden border border-amber-500/30 bg-slate-950/90 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-950/40 via-red-950/20 to-slate-900/60 border-b border-amber-500/20">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white tracking-wide">{artifact.title}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Generation Unavailable
                  </span>
                </div>
                <span className="text-[11px] text-zinc-400">
                  {artifact.subtitle || "Provider Capacity Reached"}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 flex flex-col items-center justify-center text-center space-y-3.5 bg-gradient-to-b from-amber-500/[0.04] to-transparent">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div className="max-w-md space-y-1">
              <h4 className="text-sm font-semibold text-zinc-200">Image Generation Temporarily Busy</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {artifact.errorMessage ||
                  "The upstream AI image generation provider is currently at capacity or encountered a rate limit. No broken image was rendered."}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
              {onAction && (
                <button
                  onClick={() => {
                    setImageLoadError(false);
                    setIsImageLoading(true);
                    onAction("retry-image", {
                      prompt: imgMeta?.prompt || artifact.title,
                      aspectRatio: imgMeta?.aspectRatio || "1:1",
                      style: imgMeta?.style || "realistic",
                    });
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-purple-500/20 transition-all active:scale-95"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Generation</span>
                </button>
              )}

              <button
                onClick={() => handleCopyText(imgMeta?.prompt || artifact.title)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-medium transition-all"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Prompt Copied" : "Copy Prompt"}</span>
              </button>
            </div>

            <div className="pt-2 text-[11px] text-zinc-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
              <span>
                Tip: Configure <code className="text-purple-300">OPENAI_API_KEY</code> (DALL-E 3) in{" "}
                <code className="text-purple-300">.env.local</code> for dedicated, instant generation.
              </span>
            </div>
          </div>

          <div className="px-4 py-2 bg-slate-900/40 border-t border-white/5 text-[11px] text-zinc-400 truncate">
            Prompt: &quot;{imgMeta?.prompt || artifact.title}&quot;
          </div>
        </div>
      );
    }

    return (
      <div className="my-3 rounded-2xl overflow-hidden border border-purple-500/20 bg-slate-950/80 shadow-2xl backdrop-blur-xl transition-all hover:border-purple-500/40">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-950/40 to-slate-900/60 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white tracking-wide">{artifact.title}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  {isEdited ? "AI Edited Image" : imgMeta?.style || "Creative"}
                </span>
              </div>
              <span className="text-[11px] text-zinc-400">{artifact.subtitle}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {isEdited && imgMeta?.originalImagePreviewUrl && (
              <button
                onClick={() => setShowOriginalComparison(!showOriginalComparison)}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                  showOriginalComparison
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    : "bg-white/5 text-zinc-400 hover:text-white"
                }`}
                title="Toggle Before / After"
              >
                {showOriginalComparison ? "Viewing Original" : "Compare Original"}
              </button>
            )}

            <button
              onClick={() => setLightboxOpen(true)}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              title="Full screen view"
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            {artifact.mediaUrl && (
              <button
                onClick={() =>
                  handleDownloadMedia(
                    artifact.mediaUrl!,
                    `nexora-${isEdited ? "edited" : "image"}-${Date.now()}.png`
                  )
                }
                className="p-1.5 text-purple-400 hover:text-purple-300 rounded-lg hover:bg-purple-500/10 transition-colors"
                title="Download image"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Image Display */}
        <div className="relative group bg-zinc-950 flex items-center justify-center overflow-hidden min-h-[260px] max-h-[520px]">
          {currentDisplayUrl ? (
            <>
              {isImageLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-zinc-400 gap-2 bg-zinc-950/80 backdrop-blur-sm z-10">
                  <ImageIcon className="w-8 h-8 animate-pulse text-purple-400" />
                  <span className="text-xs">Loading high-resolution render...</span>
                </div>
              )}
              <img
                src={currentDisplayUrl}
                alt={artifact.title}
                className={`w-full h-auto max-h-[520px] object-contain cursor-pointer transition-transform duration-500 group-hover:scale-[1.01] ${
                  isImageLoading ? "opacity-0" : "opacity-100"
                }`}
                onClick={() => setLightboxOpen(true)}
                onLoad={() => setIsImageLoading(false)}
                onError={() => {
                  setIsImageLoading(false);
                  setImageLoadError(true);
                }}
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-zinc-500 gap-2">
              <ImageIcon className="w-8 h-8 animate-pulse text-purple-400" />
              <span className="text-xs">Generating visual render...</span>
            </div>
          )}

          {/* Overlay Tag */}
          <div className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-[11px] text-zinc-300">
            {imgMeta?.provider}
          </div>
        </div>

        {/* Footer info & prompt */}
        <div className="px-4 py-2.5 bg-slate-900/40 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-zinc-400 truncate max-w-[70%]">
            <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="truncate italic font-mono text-[11px]">
              &quot;{imgMeta?.prompt || artifact.title}&quot;
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onAction && (
              <>
                <button
                  onClick={() =>
                    onAction("retry-image", {
                      prompt: imgMeta?.prompt,
                      aspectRatio: imgMeta?.aspectRatio,
                      style: imgMeta?.style,
                    })
                  }
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all text-[11px]"
                  title="Regenerate this image"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Retry</span>
                </button>
                <button
                  onClick={() =>
                    onAction("variation", {
                      prompt: imgMeta?.prompt,
                      aspectRatio: imgMeta?.aspectRatio,
                      style: imgMeta?.style,
                    })
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 transition-all text-xs font-semibold"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Variation</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Lightbox Modal */}
        {lightboxOpen && artifact.mediaUrl && (
          <div
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => setLightboxOpen(false)}
          >
            <div className="relative max-w-5xl max-h-[90vh] flex flex-col items-center">
              <button
                onClick={() => setLightboxOpen(false)}
                className="absolute top-2 right-2 p-2 rounded-full bg-zinc-900/80 text-white hover:bg-zinc-800 transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={artifact.mediaUrl}
                alt={artifact.title}
                className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER: ORIGINAL LYRICS (NEXORA MUSIC STUDIO LYRICS EDITOR)
  // --------------------------------------------------------------------------
  if (artifact.type === "lyrics" && artifact.lyricsMetadata) {
    const meta = artifact.lyricsMetadata;

    // Parse the current lyrics text into sections for structured rendering
    const parsedSections = lyricsText
      ? lyricsText
          .split(/(?=\[[^\]]+\])/g)
          .map((chunk) => {
            const lines = chunk.trim().split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
            if (lines.length === 0) return null;
            const headerMatch = lines[0].match(/^\[(.*?)\]$/);
            const label = headerMatch ? headerMatch[1] : "Verse";
            const contentLines = headerMatch ? lines.slice(1) : lines;
            return { label, lines: contentLines };
          })
          .filter(Boolean) as Array<{ label: string; lines: string[] }>
      : [];

    const totalLinesCount = lyricsText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("[")).length;

    const availableGenres = [
      "Tamil Romantic Melody",
      "Carnatic Fusion",
      "Tamil Folk / Kuthu",
      "Acoustic Ballad",
      "Western Pop",
      "Cinematic Orchestral",
    ];

    const availableMoods = [
      "Love / Romantic",
      "Melancholy / Sad",
      "Uplifting / Motivational",
      "Energetic / Celebration",
    ];

    const availableVocals: Array<"Duet" | "Male" | "Female" | "Instrumental"> = [
      "Duet",
      "Male",
      "Female",
      "Instrumental",
    ];

    const availableKeys = [
      "C Major (Kalyani Raga)",
      "G Major (Mohanam Raga)",
      "D Minor (Natabhairavi Raga)",
      "D# Minor (Sindhubhairavi)",
      "A Minor (Subhapantuvarali)",
    ];

    const availableInstrumentsList = [
      "Acoustic Guitar",
      "Flute (Venu)",
      "Piano",
      "Nadhaswaram & Thavil",
      "Violin / Strings",
      "Ambient Synth Pad",
    ];

    const toggleInstrument = (inst: string) => {
      if (selectedInstruments.includes(inst)) {
        setSelectedInstruments(selectedInstruments.filter((i) => i !== inst));
      } else {
        setSelectedInstruments([...selectedInstruments, inst]);
      }
    };

    return (
      <div className="my-3 rounded-2xl overflow-hidden border border-emerald-500/25 bg-slate-950/90 shadow-2xl backdrop-blur-xl transition-all hover:border-emerald-500/40">
        {/* Studio Navigation & Metadata Bar */}
        <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-gradient-to-r from-emerald-950/50 via-teal-950/30 to-slate-900/70 border-b border-emerald-500/20 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-inner">
              <Disc3 className="w-4 h-4 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={lyricsTitle}
                  onChange={(e) => setLyricsTitle(e.target.value)}
                  className="bg-transparent font-bold text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-400/50 rounded px-1 -ml-1 border-b border-transparent hover:border-white/20 transition-colors max-w-[280px]"
                  title="Click to edit song title"
                />
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  {meta.language}
                </span>
              </div>
              <span className="text-[11px] text-zinc-400">
                {selectedGenre} • {selectedMood} • {selectedBpm} BPM
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Tab switchers: Lyrics Editor vs Music Style Settings */}
            <div className="flex items-center bg-slate-900/80 p-0.5 rounded-xl border border-white/10 text-xs">
              <button
                onClick={() => setLyricsStudioTab("lyrics")}
                className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                  lyricsStudioTab === "lyrics"
                    ? "bg-emerald-500/20 text-emerald-300 font-semibold shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Lyrics</span>
              </button>
              <button
                onClick={() => setLyricsStudioTab("style")}
                className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                  lyricsStudioTab === "style"
                    ? "bg-indigo-500/20 text-indigo-300 font-semibold shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Music Style</span>
              </button>
            </div>

            <button
              onClick={() => handleCopyText(lyricsText)}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              title="Copy clean lyrics"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={() => {
                const blob = new Blob([lyricsText], { type: "text/plain;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                handleDownloadMedia(url, `${lyricsTitle.replace(/[^\w]/g, "_")}_lyrics.txt`);
              }}
              className="p-1.5 text-emerald-400 hover:text-emerald-300 rounded-lg hover:bg-emerald-500/10 transition-colors"
              title="Download lyrics (.txt)"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* TAB 1: LYRICS EDITOR */}
        {lyricsStudioTab === "lyrics" && (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between text-xs pb-1 border-b border-white/5">
              <div className="flex items-center gap-2 text-zinc-400">
                <span className="text-[11px] font-mono text-emerald-400/90 font-medium">
                  {totalLinesCount} lyric lines • {parsedSections.length} sections
                </span>
                <span className="text-[10px] text-zinc-500">• Line-by-line format</span>
              </div>
              <button
                onClick={() => setIsEditingLyrics(!isEditingLyrics)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  isEditingLyrics
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-white/5 text-zinc-300 hover:text-white hover:bg-white/10"
                }`}
              >
                <Edit3 className="w-3 h-3" />
                <span>{isEditingLyrics ? "Done Editing" : "Edit Lyrics"}</span>
              </button>
            </div>

            {isEditingLyrics ? (
              <div className="space-y-1.5">
                <textarea
                  value={lyricsText}
                  onChange={(e) => setLyricsText(e.target.value)}
                  rows={14}
                  className="w-full p-3.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 text-white font-sans text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-emerald-400/50 resize-y"
                  placeholder="[Pallavi]&#10;Line 1...&#10;Line 2...&#10;&#10;[Chorus]&#10;Chorus line..."
                />
                <span className="text-[11px] text-zinc-500 italic block">
                  Tip: Section headers in brackets like [Pallavi], [Chorus], [Verse 1] guide musical arrangement.
                </span>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[440px] overflow-y-auto pr-1">
                {parsedSections.map((sec, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-2 hover:bg-slate-900/80 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 font-mono">
                        <Music className="w-3 h-3 text-emerald-400" />
                        [{sec.label}]
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {sec.lines.length} lines
                      </span>
                    </div>
                    <div className="space-y-1.5 pl-1">
                      {sec.lines.map((line, lIdx) => (
                        <p
                          key={lIdx}
                          className={`text-sm tracking-wide ${
                            line.startsWith("(")
                              ? "text-zinc-500 italic text-xs"
                              : "text-zinc-100 font-sans leading-relaxed"
                          }`}
                        >
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SEPARATE MUSIC STYLE SETTINGS */}
        {lyricsStudioTab === "style" && (
          <div className="p-4 space-y-4 bg-slate-900/30">
            <div className="text-xs text-zinc-400 pb-1 border-b border-white/5 flex items-center justify-between">
              <span className="font-semibold text-zinc-200">Musical Arrangement Controls</span>
              <span className="text-[10px] text-zinc-500">Lyrics remain intact while adjusting style</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              {/* Genre Selector */}
              <div className="space-y-1.5">
                <label className="text-zinc-400 font-medium">Musical Genre</label>
                <select
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value)}
                  className="w-full p-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-indigo-500"
                >
                  {availableGenres.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mood Selector */}
              <div className="space-y-1.5">
                <label className="text-zinc-400 font-medium">Mood & Emotion</label>
                <select
                  value={selectedMood}
                  onChange={(e) => setSelectedMood(e.target.value)}
                  className="w-full p-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-indigo-500"
                >
                  {availableMoods.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Vocal Style */}
              <div className="space-y-1.5">
                <label className="text-zinc-400 font-medium">Vocal Configuration</label>
                <div className="grid grid-cols-4 gap-1">
                  {availableVocals.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setSelectedVocal(v)}
                      className={`p-1.5 rounded-lg text-center font-medium transition-colors ${
                        selectedVocal === v
                          ? "bg-indigo-600 text-white font-semibold"
                          : "bg-white/5 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Musical Key / Scale */}
              <div className="space-y-1.5">
                <label className="text-zinc-400 font-medium">Raga / Musical Scale</label>
                <select
                  value={selectedKey}
                  onChange={(e) => setSelectedKey(e.target.value)}
                  className="w-full p-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-indigo-500"
                >
                  {availableKeys.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tempo (BPM) Slider */}
            <div className="space-y-2 pt-1 border-t border-white/5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 font-medium">Tempo (Beats Per Minute)</span>
                <span className="font-mono text-emerald-400 font-bold">{selectedBpm} BPM</span>
              </div>
              <input
                type="range"
                min="64"
                max="144"
                step="2"
                value={selectedBpm}
                onChange={(e) => setSelectedBpm(Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            {/* Instrument Preferences */}
            <div className="space-y-2 pt-1 border-t border-white/5 text-xs">
              <span className="text-zinc-400 font-medium block">Arrangement Instruments</span>
              <div className="flex flex-wrap gap-1.5">
                {availableInstrumentsList.map((inst) => {
                  const isChecked = selectedInstruments.includes(inst);
                  return (
                    <button
                      key={inst}
                      type="button"
                      onClick={() => toggleInstrument(inst)}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        isChecked
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-medium"
                          : "bg-white/5 text-zinc-400 border border-transparent hover:text-white"
                      }`}
                    >
                      {inst}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Action bar: GENERATE SONG FROM EXACT LYRICS */}
        <div className="px-4 py-3.5 bg-slate-900/70 border-t border-white/5 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">
              Exact Lyrics Preservation Active
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onAction && (
              <button
                onClick={() =>
                  onAction("generate-song-from-lyrics", {
                    title: lyricsTitle,
                    lyrics: lyricsText,
                    language: meta.language,
                    genre: selectedGenre,
                    mood: selectedMood,
                    vocalStyle: selectedVocal,
                    tempoBpm: selectedBpm,
                    keySignature: selectedKey,
                    instruments: selectedInstruments,
                  })
                }
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:via-teal-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-xl shadow-emerald-500/20 transition-all active:scale-95"
              >
                <Music className="w-4 h-4" />
                <span>Generate Song from Lyrics</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER: MUSIC & AUDIO SONGS (AUDIO RESULT PLAYER)
  // --------------------------------------------------------------------------
  if (artifact.type === "music" && artifact.musicMetadata) {
    const meta = artifact.musicMetadata;

    return (
      <div className="my-3 rounded-2xl overflow-hidden border border-indigo-500/20 bg-slate-950/80 shadow-2xl backdrop-blur-xl transition-all hover:border-indigo-500/40">
        {/* Hidden Audio Element */}
        {artifact.mediaUrl && <audio ref={audioRef} src={artifact.mediaUrl} preload="metadata" />}

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-950/40 to-slate-900/60 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Disc3 className={`w-4 h-4 ${isPlaying ? "animate-spin" : ""}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white tracking-wide">{meta.title}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  {meta.genre}
                </span>
                {meta.vocalStyle && (
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/10">
                    {meta.vocalStyle}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-zinc-400">
                {meta.mood} • {meta.tempoBpm} BPM • {meta.keySignature || "C Major"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {meta.exactLyrics && (
              <button
                onClick={() => setShowBoundLyrics(!showBoundLyrics)}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors flex items-center gap-1 ${
                  showBoundLyrics
                    ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                    : "bg-white/5 text-zinc-400 hover:text-white"
                }`}
                title="View lyrics bound to this track"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{showBoundLyrics ? "Hide Lyrics" : "View Lyrics"}</span>
              </button>
            )}

            {artifact.mediaUrl && (
              <button
                onClick={() =>
                  handleDownloadMedia(
                    artifact.mediaUrl!,
                    `nexora-music-${meta.title.replace(/[^\w]/g, "_")}.wav`
                  )
                }
                className="p-1.5 text-indigo-400 hover:text-indigo-300 rounded-lg hover:bg-indigo-500/10 transition-colors"
                title="Download Track (.wav)"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Audio Player Core Interface */}
        <div className="p-4 space-y-3.5 bg-slate-900/40">
          {/* Waveform Visualization Bars */}
          <div className="h-12 flex items-center justify-between gap-1 px-2 bg-slate-950/60 rounded-xl border border-white/5 overflow-hidden">
            {(meta.waveformSamples || Array.from({ length: 36 }, (_, i) => 0.2 + (i % 5) * 0.15)).map(
              (sample, i) => {
                const isPast = (i / 36) * duration <= currentTime;
                return (
                  <div
                    key={i}
                    style={{ height: `${sample * 100}%` }}
                    className={`w-1 rounded-full transition-colors ${
                      isPast
                        ? "bg-gradient-to-t from-indigo-500 to-purple-400"
                        : "bg-zinc-800 group-hover:bg-zinc-700"
                    } ${isPlaying && isPast ? "animate-pulse" : ""}`}
                  />
                );
              }
            )}
          </div>

          {/* Controls: Play/Pause, Replay, Seekbar, Times, Volume */}
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="p-3 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25 active:scale-95 transition-all"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>

            {/* Replay Track Button */}
            <button
              onClick={handleReplay}
              className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              title="Replay Track"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Seek Bar */}
            <div className="flex-1 space-y-1">
              <input
                type="range"
                min="0"
                max={duration || 30}
                step="0.1"
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-[11px] font-mono text-zinc-400">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Volume Control Slider & Mute Toggle */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleMute}
                className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hidden sm:block"
                title={`Volume ${Math.round((isMuted ? 0 : volume) * 100)}%`}
              />
            </div>
          </div>
        </div>

        {/* Complete Song Lyrics Section Directly Below the Player */}
        {meta.exactLyrics && (
          <div className="border-t border-white/10 bg-slate-950/80">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-slate-900/90 to-indigo-950/40 border-b border-white/5">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-white tracking-wide">
                  Complete Song Lyrics
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-medium">
                  {meta.genre}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyText(meta.exactLyrics!)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
                  title="Copy lyrics to clipboard"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-medium">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleDownloadLyrics(meta.title, meta.exactLyrics!)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
                  title="Download lyrics as text file"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>.txt</span>
                </button>

                <button
                  onClick={() => setShowBoundLyrics(!showBoundLyrics)}
                  className="p-1 text-zinc-400 hover:text-white transition-colors"
                  title={showBoundLyrics ? "Collapse Lyrics" : "Expand Lyrics"}
                >
                  {showBoundLyrics ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Lyrics Content */}
            {showBoundLyrics && (
              <div className="p-4 space-y-4 max-h-[380px] overflow-y-auto">
                {(meta.lyricsSections && meta.lyricsSections.length > 0
                  ? meta.lyricsSections
                  : meta.exactLyrics
                      .split(/(?=\[[^\]]+\])/g)
                      .map((chunk) => {
                        const lines = chunk.trim().split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
                        if (lines.length === 0) return null;
                        const headerMatch = lines[0].match(/^\[(.*?)\]$/);
                        const label = headerMatch ? headerMatch[1] : "Lyrics";
                        const contentLines = headerMatch ? lines.slice(1) : lines;
                        return { label, lines: contentLines };
                      })
                      .filter(Boolean) as Array<{ label: string; lines: string[] }>
                ).map((sec, idx) => (
                  <div key={idx} className="space-y-1.5 border-l-2 border-indigo-500/40 pl-3">
                    <span className="inline-block text-[11px] font-bold text-indigo-400 font-mono tracking-wider">
                      [{sec.label}]
                    </span>
                    <div className="space-y-1">
                      {sec.lines.map((line, lIdx) => (
                        <p
                          key={lIdx}
                          className="text-xs sm:text-sm text-zinc-200 font-sans tracking-wide leading-relaxed"
                        >
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-slate-900/60 border-t border-white/5 flex items-center justify-between text-xs text-zinc-400">
          <span className="text-[11px] font-mono text-zinc-500">{meta.provider}</span>
          {onAction && (
            <button
              onClick={() => onAction("regenerate-music", { prompt: meta.prompt, genre: meta.genre })}
              className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Regenerate Track</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER: VOICE & AUDIO TRANSCRIPTION
  // --------------------------------------------------------------------------
  if (artifact.type === "voice" || artifact.type === "transcription") {
    const isVoice = artifact.type === "voice";

    return (
      <div className="my-3 rounded-2xl overflow-hidden border border-cyan-500/20 bg-slate-950/80 shadow-2xl backdrop-blur-xl transition-all hover:border-cyan-500/40">
        {artifact.mediaUrl && <audio ref={audioRef} src={artifact.mediaUrl} preload="metadata" />}

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-cyan-950/40 to-slate-900/60 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              {isVoice ? <Mic className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white tracking-wide">{artifact.title}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  {isVoice ? "AI Speech Synthesizer" : "Audio Transcription"}
                </span>
              </div>
              <span className="text-[11px] text-zinc-400">{artifact.subtitle}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {artifact.mediaUrl && (
              <button
                onClick={() =>
                  handleDownloadMedia(artifact.mediaUrl!, `nexora-voice-${Date.now()}.wav`)
                }
                className="p-1.5 text-cyan-400 hover:text-cyan-300 rounded-lg hover:bg-cyan-500/10 transition-colors"
                title="Download Audio"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3 bg-slate-900/30 text-xs">
          {isVoice ? (
            <div className="space-y-3">
              <p className="text-zinc-200 italic font-serif text-sm">
                &quot;{artifact.voiceMetadata?.text}&quot;
              </p>
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={togglePlay}
                  className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold flex items-center gap-1.5 shadow-md shadow-cyan-500/20 transition-all active:scale-95"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>{isPlaying ? "Pause Voice" : "Play Voice"}</span>
                </button>
                <span className="font-mono text-zinc-400 text-[11px]">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">
                  Summary & Key Takeaways
                </span>
                <p className="text-zinc-300">{artifact.transcriptionMetadata?.summary}</p>
                <ul className="list-disc list-inside text-zinc-400 space-y-0.5 pt-1">
                  {artifact.transcriptionMetadata?.keyTakeaways.map((k, i) => (
                    <li key={i}>{k}</li>
                  ))}
                </ul>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                    Full Spoken Transcript
                  </span>
                  <button
                    onClick={() => handleCopyText(artifact.transcriptionMetadata?.transcript || "")}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copy</span>
                  </button>
                </div>
                <p className="text-zinc-300 font-mono text-[11px] leading-relaxed">
                  {artifact.transcriptionMetadata?.transcript}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}

