"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Image as ImageIcon,
  Edit3,
  Music,
  Disc3,
  Mic,
  FileAudio,
  X,
  ChevronDown,
  Check,
  Sliders,
  Send,
} from "lucide-react";
import {
  CreativeArtifactType,
  ImageAspectRatio,
  ImageStylePreset,
} from "@/lib/ai/creative/creative-types";

interface CreativeComposerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitCreative: (type: CreativeArtifactType, prompt: string, options: Record<string, any>) => void;
}

export function CreativeComposerDrawer({
  isOpen,
  onClose,
  onSubmitCreative,
}: CreativeComposerDrawerProps) {
  const [activeTab, setActiveTab] = useState<CreativeArtifactType>("image");
  const [prompt, setPrompt] = useState("");

  // Image options
  const [aspectRatio, setAspectRatio] = useState<ImageAspectRatio>("1:1");
  const [style, setStyle] = useState<ImageStylePreset>("cinematic");

  // Edit image options
  const [editOperation, setEditOperation] = useState<
    "remove-bg" | "replace-bg" | "colorize" | "stylize" | "restore"
  >("remove-bg");
  const [targetBackground, setTargetBackground] = useState("beach at sunset");

  // Lyrics options
  const [lyricsLanguage, setLyricsLanguage] = useState("Tamil");
  const [lyricsGenre, setLyricsGenre] = useState("Romantic Melody");
  const [lyricsMood, setLyricsMood] = useState("Love");
  const [lyricsVocal, setLyricsVocal] = useState<"Male" | "Female" | "Duet">("Duet");

  // Music options
  const [musicGenre, setMusicGenre] = useState("Tamil Melody");
  const [musicMood, setMusicMood] = useState("Romantic");
  const [isInstrumental, setIsInstrumental] = useState(true);

  // Voice options
  const [voiceName, setVoiceName] = useState<"nova" | "alloy" | "echo" | "shimmer">("nova");
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let options: Record<string, any> = {};

    switch (activeTab) {
      case "image":
        options = { aspectRatio, style };
        break;
      case "edited-image":
        options = { operation: editOperation, targetBackground };
        break;
      case "lyrics":
        options = {
          language: lyricsLanguage,
          genre: lyricsGenre,
          mood: lyricsMood,
          vocalStyle: lyricsVocal,
        };
        break;
      case "music":
        options = {
          genre: musicGenre,
          mood: musicMood,
          isInstrumental,
        };
        break;
      case "voice":
        options = { voiceName, speed: voiceSpeed };
        break;
      case "transcription":
        options = {};
        break;
    }

    const defaultPrompts: Record<CreativeArtifactType, string> = {
      image: "A futuristic skyline at twilight with neon reflections and holographic bridges",
      "edited-image": "Remove the background and isolate the subject",
      lyrics: "A heartwarming song celebrating unconditional love and morning coffee",
      music: "A soulful romantic melody with acoustic guitar and piano chords",
      voice: "Welcome to Nexora Creative Studio, where multimodal imagination comes to life.",
      transcription: "Transcribe and summarize this audio recording.",
    };

    const finalPrompt = prompt.trim() || defaultPrompts[activeTab];
    onSubmitCreative(activeTab, finalPrompt, options);
    setPrompt("");
    onClose();
  };

  return (
    <div className="mb-3 rounded-2xl border border-purple-500/30 bg-slate-950/95 backdrop-blur-2xl shadow-2xl p-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
      {/* Drawer Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md shadow-purple-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white tracking-wide">Nexora Creative Studio</h4>
            <p className="text-[11px] text-zinc-400">Generate multimodal images, lyrics, music & voice</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Mode Selector Tabs */}
      <div className="flex items-center gap-1.5 pt-3 pb-2 overflow-x-auto no-scrollbar">
        {[
          { id: "image", label: "Create Image", icon: ImageIcon, color: "text-purple-400 bg-purple-500/10 border-purple-500/30" },
          { id: "edited-image", label: "Edit Image", icon: Edit3, color: "text-pink-400 bg-pink-500/10 border-pink-500/30" },
          { id: "lyrics", label: "Write Lyrics", icon: Disc3, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
          { id: "music", label: "Generate Music", icon: Music, color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30" },
          { id: "voice", label: "Voice / TTS", icon: Mic, color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30" },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as CreativeArtifactType)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all shrink-0 ${
                isActive
                  ? `${tab.color} text-white font-semibold shadow-lg`
                  : "bg-white/5 border-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Configuration Area */}
      <form onSubmit={handleSubmit} className="space-y-3 pt-2">
        {/* Dynamic Controls based on selected mode */}
        {activeTab === "image" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <label className="text-[11px] text-zinc-400 uppercase font-bold tracking-wider">
                Aspect Ratio
              </label>
              <div className="flex items-center gap-1.5">
                {(["1:1", "16:9", "9:16"] as ImageAspectRatio[]).map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setAspectRatio(ratio)}
                    className={`flex-1 py-1 rounded-lg border text-xs font-medium transition-all ${
                      aspectRatio === ratio
                        ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                        : "bg-white/5 border-white/5 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {ratio === "1:1" ? "1:1 Square" : ratio === "16:9" ? "16:9 Land" : "9:16 Story"}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-zinc-400 uppercase font-bold tracking-wider">
                Visual Style
              </label>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value as ImageStylePreset)}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-purple-500"
              >
                <option value="cinematic">Cinematic 8K</option>
                <option value="realistic">Photorealistic</option>
                <option value="3d">3D Octane Render</option>
                <option value="anime">Anime / Manga</option>
                <option value="product">Studio Product Shot</option>
                <option value="logo">Vector Logo & Badge</option>
                <option value="social">Social Media Aesthetic</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === "edited-image" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <label className="text-[11px] text-zinc-400 uppercase font-bold tracking-wider">
                Edit Operation
              </label>
              <select
                value={editOperation}
                onChange={(e) => setEditOperation(e.target.value as any)}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-pink-500"
              >
                <option value="remove-bg">Remove Background (Cutout)</option>
                <option value="replace-bg">Replace Background</option>
                <option value="colorize">Color Grading & Tint</option>
                <option value="stylize">Artistic Style Transfer</option>
                <option value="restore">Clarity & Photo Restoration</option>
              </select>
            </div>

            {editOperation === "replace-bg" && (
              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400 uppercase font-bold tracking-wider">
                  Target Scene
                </label>
                <input
                  type="text"
                  value={targetBackground}
                  onChange={(e) => setTargetBackground(e.target.value)}
                  placeholder="e.g. beach at sunset, neon cyberpunk..."
                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-pink-500"
                />
              </div>
            )}
          </div>
        )}

        {activeTab === "lyrics" && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 uppercase font-bold">Language</label>
              <select
                value={lyricsLanguage}
                onChange={(e) => setLyricsLanguage(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-xs text-white"
              >
                <option value="Tamil">Tamil (தமிழ்)</option>
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
                <option value="Spanish">Spanish</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 uppercase font-bold">Genre</label>
              <select
                value={lyricsGenre}
                onChange={(e) => setLyricsGenre(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-xs text-white"
              >
                <option value="Romantic Melody">Melody</option>
                <option value="Pop">Pop</option>
                <option value="Rap / Hip-Hop">Rap / Hip-Hop</option>
                <option value="Folk / Acoustic">Folk / Kuthu</option>
                <option value="Rock">Rock</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 uppercase font-bold">Mood</label>
              <select
                value={lyricsMood}
                onChange={(e) => setLyricsMood(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-xs text-white"
              >
                <option value="Love">Love</option>
                <option value="Melancholy">Sad / Heartbreak</option>
                <option value="Motivational">Motivational</option>
                <option value="Friendship">Friendship</option>
                <option value="Celebration">Celebration</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 uppercase font-bold">Vocals</label>
              <select
                value={lyricsVocal}
                onChange={(e) => setLyricsVocal(e.target.value as any)}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-xs text-white"
              >
                <option value="Duet">Duet</option>
                <option value="Male">Male Solo</option>
                <option value="Female">Female Solo</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === "music" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 uppercase font-bold">Musical Genre</label>
              <select
                value={musicGenre}
                onChange={(e) => setMusicGenre(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-xs text-white"
              >
                <option value="Tamil Melody">Tamil Romantic Melody</option>
                <option value="Lo-Fi Chill">Lo-Fi Chillhop</option>
                <option value="Cinematic Orchestral">Cinematic Orchestral</option>
                <option value="Synthwave Electronic">Synthwave / EDM</option>
                <option value="Acoustic Piano">Acoustic Piano Ballad</option>
                <option value="Hip-Hop Beat">Hip-Hop Beat</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 uppercase font-bold">Mood</label>
              <select
                value={musicMood}
                onChange={(e) => setMusicMood(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-xs text-white"
              >
                <option value="Romantic">Romantic</option>
                <option value="Melancholic">Melancholic</option>
                <option value="Energetic">Energetic</option>
                <option value="Peaceful">Peaceful</option>
              </select>
            </div>

            <div className="space-y-1 flex flex-col justify-end">
              <button
                type="button"
                onClick={() => setIsInstrumental(!isInstrumental)}
                className={`py-1 px-2.5 rounded-lg border text-xs font-medium transition-all ${
                  isInstrumental
                    ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                    : "bg-white/5 border-white/5 text-zinc-400"
                }`}
              >
                {isInstrumental ? "✓ Instrumental Only" : "Vocal Accompaniment"}
              </button>
            </div>
          </div>
        )}

        {/* Input prompt & Submit */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              activeTab === "image"
                ? "Describe your image (e.g. futuristic skyline at twilight with neon bridges)..."
                : activeTab === "edited-image"
                ? "Describe edits (e.g. replace background with a beach)..."
                : activeTab === "lyrics"
                ? "Song theme (e.g. first love in the rain, never giving up)..."
                : activeTab === "music"
                ? "Music theme (e.g. gentle piano and acoustic guitar Tamil melody)..."
                : "Enter text to convert to voice..."
            }
            className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
          />

          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-purple-500/25 active:scale-95 transition-all"
          >
            <span>Create</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
}

