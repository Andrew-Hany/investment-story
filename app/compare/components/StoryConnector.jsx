"use client";

import React from "react";

/**
 * StoryConnector
 * 
 * A visual story "bridge" between stages.
 * Shows: dashed line → arrow → chapter label → subtitle
 * 
 * Props:
 *   chapterNum  – e.g. "Chapter 2"
 *   title       – e.g. "Why Did the Business Win?"
 *   subtitle    – short teaser text
 *   icon        – emoji or string icon
 *   accent      – tailwind color key: "blue" | "purple" | "emerald" | "rose" | "amber" | "indigo"
 */
export default function StoryConnector({ chapterNum, title, subtitle, icon = "📖", accent = "indigo" }) {
  const accentMap = {
    blue: {
      bg: "bg-blue-50",
      border: "border-blue-100",
      text: "text-blue-600",
      badge: "bg-blue-100 text-blue-700",
      line: "border-blue-200",
      arrow: "text-blue-400",
    },
    purple: {
      bg: "bg-purple-50",
      border: "border-purple-100",
      text: "text-purple-600",
      badge: "bg-purple-100 text-purple-700",
      line: "border-purple-200",
      arrow: "text-purple-400",
    },
    emerald: {
      bg: "bg-emerald-50",
      border: "border-emerald-100",
      text: "text-emerald-600",
      badge: "bg-emerald-100 text-emerald-700",
      line: "border-emerald-200",
      arrow: "text-emerald-400",
    },
    rose: {
      bg: "bg-rose-50",
      border: "border-rose-100",
      text: "text-rose-600",
      badge: "bg-rose-100 text-rose-700",
      line: "border-rose-200",
      arrow: "text-rose-400",
    },
    amber: {
      bg: "bg-amber-50",
      border: "border-amber-100",
      text: "text-amber-600",
      badge: "bg-amber-100 text-amber-700",
      line: "border-amber-200",
      arrow: "text-amber-400",
    },
    indigo: {
      bg: "bg-indigo-50",
      border: "border-indigo-100",
      text: "text-indigo-600",
      badge: "bg-indigo-100 text-indigo-700",
      line: "border-indigo-200",
      arrow: "text-indigo-400",
    },
    slate: {
      bg: "bg-slate-50",
      border: "border-slate-200",
      text: "text-slate-600",
      badge: "bg-slate-100 text-slate-600",
      line: "border-slate-200",
      arrow: "text-slate-400",
    },
  };

  const c = accentMap[accent] || accentMap.indigo;

  return (
    <div className="flex flex-col items-center gap-0 select-none" aria-hidden="true">
      {/* Dashed vertical line coming down */}
      <div className={`w-0.5 h-8 border-l-2 border-dashed ${c.line}`} />

      {/* Arrow chevron */}
      <div className={`text-2xl leading-none ${c.arrow}`}>▼</div>

      {/* Chapter card */}
      <div className={`mt-2 flex items-center gap-3 px-5 py-3 rounded-2xl border ${c.border} ${c.bg} shadow-sm`}>
        <span className="text-xl">{icon}</span>
        <div className="text-left">
          <span className={`text-[9px] font-extrabold uppercase tracking-widest font-mono ${c.text} block`}>
            {chapterNum}
          </span>
          <span className="text-sm font-bold text-slate-800 block leading-tight">{title}</span>
          {subtitle && (
            <span className="text-[10px] text-slate-400 block mt-0.5 leading-snug">{subtitle}</span>
          )}
        </div>
      </div>

      {/* Short line below leading into next section */}
      <div className={`w-0.5 h-6 border-l-2 border-dashed ${c.line} mt-0`} />
    </div>
  );
}
