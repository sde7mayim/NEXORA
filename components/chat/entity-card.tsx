"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Laptop,
  Smartphone,
  User,
  MapPin,
  Headphones,
  Building2,
  Film,
  Sparkles,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  ShieldCheck,
  Maximize2,
  Calendar,
  Compass,
  Award,
  Layers,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { EntityCardData, EntityCategory } from "@/lib/ai/entities/entity-types";

interface EntityCardProps {
  card: EntityCardData;
}

export function EntityCard({ card }: EntityCardProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [specsExpanded, setSpecsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "specs" | "proscons" | "visiting">("overview");
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const images = card.images || [];
  const currentImage = images[activeImageIndex] || null;

  const getCategoryConfig = (cat: EntityCategory) => {
    switch (cat) {
      case "laptop":
        return {
          label: "Laptop & Computing",
          icon: Laptop,
          badgeColor: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
        };
      case "smartphone":
        return {
          label: "Smartphone",
          icon: Smartphone,
          badgeColor: "bg-blue-500/10 text-blue-300 border-blue-500/30",
        };
      case "celebrity":
        return {
          label: "Public Figure & Celebrity",
          icon: User,
          badgeColor: "bg-purple-500/10 text-purple-300 border-purple-500/30",
        };
      case "place":
        return {
          label: "Destination & Landmark",
          icon: MapPin,
          badgeColor: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
        };
      case "electronics":
        return {
          label: "Consumer Electronics",
          icon: Headphones,
          badgeColor: "bg-indigo-500/10 text-indigo-300 border-indigo-500/30",
        };
      case "company":
        return {
          label: "Company & Brand",
          icon: Building2,
          badgeColor: "bg-amber-500/10 text-amber-300 border-amber-500/30",
        };
      default:
        return {
          label: "Verified Entity",
          icon: Sparkles,
          badgeColor: "bg-zinc-500/10 text-zinc-300 border-zinc-500/30",
        };
    }
  };

  const catConfig = getCategoryConfig(card.category);
  const CategoryIcon = catConfig.icon;

  const hasSpecs = Boolean(card.specGroups && card.specGroups.length > 0);
  const hasProsCons = Boolean((card.pros && card.pros.length > 0) || (card.cons && card.cons.length > 0));
  const hasVisiting = Boolean(card.visitingInfo || (card.attractions && card.attractions.length > 0));

  return (
    <div className="my-4 rounded-2xl glass-card border border-white/10 bg-slate-900/90 shadow-2xl overflow-hidden transition-all duration-300 hover:border-indigo-500/30">
      {/* Card Header */}
      <div className="p-4 sm:p-5 pb-3 sm:pb-4 border-b border-white/5 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wider border ${catConfig.badgeColor}`}
            >
              <CategoryIcon className="w-3.5 h-3.5" />
              <span>{catConfig.label}</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-medium">
              <ShieldCheck className="w-3 h-3" />
              <span>Verified Facts</span>
            </span>
          </div>

          {card.sources && card.sources.length > 0 && (
            <a
              href={card.sources[0].url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-zinc-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
              title="View source"
            >
              <span className="truncate max-w-[140px] sm:max-w-xs">{card.sources[0].title}</span>
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          )}
        </div>

        <div>
          <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">{card.name}</h3>
          {card.subtitle && (
            <p className="text-xs sm:text-sm text-indigo-300/90 font-medium mt-0.5">{card.subtitle}</p>
          )}
        </div>
      </div>

      {/* Main Body: Image Gallery + Quick Details */}
      <div className="p-4 sm:p-5 space-y-4">
        {/* Visual Gallery (if images exist) */}
        {currentImage && (
          <div className="space-y-2">
            <div className="relative w-full h-52 sm:h-64 md:h-72 rounded-xl overflow-hidden bg-slate-950 border border-white/5 group">
              <img
                src={currentImage.url}
                alt={currentImage.caption || card.name}
                className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.02] cursor-pointer"
                onClick={() => setLightboxOpen(true)}
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />

              {/* Lightbox zoom trigger */}
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                className="absolute top-3 right-3 p-2 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-all opacity-0 group-hover:opacity-100"
                title="View full image"
                aria-label="Expand image"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>

              {/* Multi-image carousel navigation */}
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
                    }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-all"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-all"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}

              {/* Caption and photo credit */}
              <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] text-zinc-300">
                <span className="truncate pr-2 font-medium drop-shadow-md">
                  {currentImage.caption || card.name}
                </span>
                {currentImage.source && (
                  <span className="shrink-0 text-[10px] text-zinc-400 font-mono bg-black/50 px-2 py-0.5 rounded backdrop-blur-sm">
                    {currentImage.source}
                  </span>
                )}
              </div>
            </div>

            {/* Thumbnail Navigation Strip */}
            {images.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 touch-scroll">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative w-14 h-10 sm:w-16 sm:h-12 rounded-lg overflow-hidden shrink-0 border transition-all ${
                      idx === activeImageIndex
                        ? "border-indigo-500 ring-2 ring-indigo-500/40 opacity-100"
                        : "border-white/10 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={img.url} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quick Facts Grid */}
        {card.quickFacts && card.quickFacts.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {card.quickFacts.map((fact, i) => (
              <div
                key={i}
                className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex flex-col justify-center"
              >
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                  {fact.label}
                </span>
                <span className="text-xs font-semibold text-zinc-200 mt-0.5 truncate" title={fact.value}>
                  {fact.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Description summary */}
        {card.description && (
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">{card.description}</p>
        )}

        {/* Navigation Tabs for detailed sections */}
        {(hasSpecs || hasProsCons || hasVisiting) && (
          <div className="pt-2 border-t border-white/5">
            <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-950/70 border border-white/5 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("overview")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  activeTab === "overview"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Highlights
              </button>

              {hasSpecs && (
                <button
                  type="button"
                  onClick={() => setActiveTab("specs")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    activeTab === "specs"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Full Specifications
                </button>
              )}

              {hasProsCons && (
                <button
                  type="button"
                  onClick={() => setActiveTab("proscons")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    activeTab === "proscons"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Pros &amp; Cons
                </button>
              )}

              {hasVisiting && (
                <button
                  type="button"
                  onClick={() => setActiveTab("visiting")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    activeTab === "visiting"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {card.category === "place" ? "Attractions & Guide" : "Achievements"}
                </button>
              )}
            </div>

            {/* TAB CONTENT: Highlights & Suitable For */}
            {activeTab === "overview" && (
              <div className="pt-3 space-y-3">
                {card.features && card.features.length > 0 && (
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-semibold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Key Features</span>
                    </h4>
                    <ul className="space-y-1 text-xs text-zinc-300">
                      {card.features.map((feat, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-indigo-400 mt-0.5">•</span>
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {card.suitableFor && card.suitableFor.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5" />
                      <span>Recommended Use Cases</span>
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {card.suitableFor.map((useCase, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 font-medium"
                        >
                          {useCase}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {card.variants && card.variants.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Available Configurations &amp; Finishes</span>
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {card.variants.map((v, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] text-zinc-300"
                        >
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: Specifications */}
            {activeTab === "specs" && card.specGroups && (
              <div className="pt-3 space-y-3">
                {card.specGroups
                  .slice(0, specsExpanded ? undefined : 2)
                  .map((group, gIdx) => (
                    <div key={gIdx} className="rounded-xl bg-white/5 border border-white/5 p-3 space-y-2">
                      <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                        {group.groupName}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {group.specs.map((item, sIdx) => (
                          <div key={sIdx} className="flex flex-col">
                            <span className="text-[10px] text-zinc-400 font-medium">{item.label}</span>
                            <span className="text-xs text-zinc-100 font-medium leading-relaxed">
                              {item.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                {card.specGroups.length > 2 && (
                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setSpecsExpanded(!specsExpanded)}
                      className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
                    >
                      <span>{specsExpanded ? "Collapse Specifications" : "View All Specifications"}</span>
                      {specsExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: Pros & Cons */}
            {activeTab === "proscons" && (
              <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {card.pros && card.pros.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20 space-y-2">
                    <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>Advantages (Pros)</span>
                    </div>
                    <ul className="space-y-1.5 text-xs text-zinc-200">
                      {card.pros.map((p, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {card.cons && card.cons.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/20 space-y-2">
                    <div className="flex items-center gap-1.5 text-rose-400 text-xs font-bold uppercase tracking-wider">
                      <ThumbsDown className="w-3.5 h-3.5" />
                      <span>Disadvantages (Cons)</span>
                    </div>
                    <ul className="space-y-1.5 text-xs text-zinc-200">
                      {card.cons.map((c, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <X className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: Visiting & Attractions (Places) or Celebrity Info */}
            {activeTab === "visiting" && (
              <div className="pt-3 space-y-3">
                {/* Attractions list */}
                {card.attractions && card.attractions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Famous Attractions &amp; Sightseeing</span>
                    </h4>
                    <div className="space-y-1.5">
                      {card.attractions.map((att, i) => (
                        <div key={i} className="p-2.5 rounded-lg bg-white/5 border border-white/5 text-xs text-zinc-200 flex items-start gap-2">
                          <span className="font-bold text-indigo-400 shrink-0">#{i + 1}</span>
                          <span>{att}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Visiting info metadata */}
                {card.visitingInfo && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                    {card.visitingInfo.bestTimeToVisit && (
                      <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                        <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                          Best Time to Visit
                        </span>
                        <span className="text-zinc-200 font-medium mt-0.5 block">
                          {card.visitingInfo.bestTimeToVisit}
                        </span>
                      </div>
                    )}

                    {card.visitingInfo.idealDuration && (
                      <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                        <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                          Recommended Duration
                        </span>
                        <span className="text-zinc-200 font-medium mt-0.5 block">
                          {card.visitingInfo.idealDuration}
                        </span>
                      </div>
                    )}

                    {card.visitingInfo.weatherOverview && (
                      <div className="p-3 rounded-xl bg-white/5 border border-white/5 col-span-1 sm:col-span-2">
                        <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                          Weather &amp; Climate Overview
                        </span>
                        <span className="text-zinc-200 font-medium mt-0.5 block">
                          {card.visitingInfo.weatherOverview}
                        </span>
                      </div>
                    )}

                    {card.visitingInfo.nearbyDestinations && card.visitingInfo.nearbyDestinations.length > 0 && (
                      <div className="p-3 rounded-xl bg-white/5 border border-white/5 col-span-1 sm:col-span-2 space-y-1">
                        <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                          Nearby Destinations
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {card.visitingInfo.nearbyDestinations.map((dest, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] text-zinc-300"
                            >
                              {dest}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Celebrity achievements */}
                {card.celebrityInfo?.majorAchievements && card.celebrityInfo.majorAchievements.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-amber-400" />
                      <span>Major Honors &amp; Achievements</span>
                    </h4>
                    <ul className="space-y-1.5 text-xs text-zinc-200">
                      {card.celebrityInfo.majorAchievements.map((ach, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-amber-400">★</span>
                          <span>{ach}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && currentImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="absolute -top-10 right-0 p-2 text-white/80 hover:text-white"
              aria-label="Close modal"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={currentImage.url}
              alt={currentImage.caption || card.name}
              className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <p className="text-xs text-zinc-300 text-center mt-3">
              {currentImage.caption || card.name} ({currentImage.source || "Verified Source"})
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

