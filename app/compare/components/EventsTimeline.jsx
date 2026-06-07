"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "../../context/ThemeContext";
import { chartColors } from "./chartColors";

export default function EventsTimeline({ result, currency }) {
  const { dark } = useTheme();
  const cc = chartColors(dark);

  const [selectedEvent, setSelectedEvent] = useState(null);

  const tickerA = result?.tickerA;
  const tickerB = result?.tickerB;
  const timeline = result?.timeline || [];

  const getSymbol = () => {
    if (currency === "EUR") return "€";
    if (currency === "GBP") return "£";
    if (currency === "CAD") return "C$";
    if (currency === "EGP") return "E£";
    if (currency === "AED") return "د.إ";
    return "$";
  };

  const startLimitStr = timeline[0]?.date || "";
  const endLimitStr = timeline[timeline.length - 1]?.date || "";

  const processEvents = (data, ticker, isA) => {
          if (!data || !data.timeline_events) return [];
          
          let rawEvents = data.timeline_events.map(e => {
            let type = "company";
            if (e.event_type === "Earnings Announcement") type = "earnings";
            else if (e.event_type === "Product Launch") type = "product";
            else if (e.event_type === "Dividend Payment") type = "company"; 
            else if (e.event_type === "Stock Split") type = "company";

            // Infer impact
            let impact = "neutral";
            if (e.details?.surprise_pct !== undefined && e.details?.surprise_pct !== null) {
              impact = e.details.surprise_pct > 0 ? "positive" : "negative";
            } else if (e.description?.toLowerCase().includes("appointed")) {
              impact = "positive";
            } else if (e.description?.toLowerCase().includes("resigned")) {
              impact = "negative";
            }

            const confidence = e.details?.source?.includes("SEC") || e.event_type === "Earnings Announcement" ? "high" : "medium";

             return {
              date: e.date,
              type,
              title: e.event_type,
              summary: e.description,
              impact,
              confidence,
              source: e.details?.source || "Yahoo Finance",
              ticker,
              details: e.details
            };
          });

          // Filter within period dates
          rawEvents = rawEvents.filter(e => e.date >= startLimitStr && e.date <= endLimitStr);

          // Check if event has a high impact on the price over 5 days, 1 month, and 3 months forward
          rawEvents = rawEvents.filter(evt => {
            const idx = timeline.findIndex(d => d.date >= evt.date);
            if (idx === -1) {
              return false;
            }
            
            const startPrice = isA ? timeline[idx].wealthA : timeline[idx].wealthB;
            
            // 5-day change
            const idx5 = Math.min(timeline.length - 1, idx + 5);
            const endPrice5 = isA ? timeline[idx5].wealthA : timeline[idx5].wealthB;
            const pctChange5 = startPrice ? ((endPrice5 - startPrice) / startPrice) * 100 : 0;
 
            // 1-month change (20 trading days)
            const idx20 = Math.min(timeline.length - 1, idx + 20);
            const endPrice20 = isA ? timeline[idx20].wealthA : timeline[idx20].wealthB;
            const pctChange20 = startPrice ? ((endPrice20 - startPrice) / startPrice) * 100 : 0;
 
            // 3-month change (60 trading days)
            const idx60 = Math.min(timeline.length - 1, idx + 60);
            const endPrice60 = isA ? timeline[idx60].wealthA : timeline[idx60].wealthB;
            const pctChange60 = startPrice ? ((endPrice60 - startPrice) / startPrice) * 100 : 0;
 
            // Save calculated shifts
            evt.windowPctChange5 = pctChange5;
            evt.windowPctChange20 = pctChange20;
            evt.windowPctChange60 = pctChange60;
 
            const isEarningsSurprise = evt.title?.includes("Earnings") && Math.abs(evt.details?.surprise_pct || 0) > 2;
            const hasBigMarketImpact = Math.abs(pctChange5) > 3.0;
 
            return isEarningsSurprise || hasBigMarketImpact;
          });

          // Prioritize earnings and corporate actions
          const priority = (e) => {
            if (e.title?.includes("Split")) return 4;
            if (e.title?.includes("Milestone") || e.summary?.includes("CEO") || e.summary?.includes("CFO")) return 3;
            if (e.title?.includes("Earnings")) return 2;
            return 1;
          };

          rawEvents.sort((a, b) => priority(b) - priority(a));
          const selected = rawEvents.slice(0, 5); // Keep up to 5 highest impact events
          
          selected.sort((a, b) => a.date.localeCompare(b.date));
          return selected;
        };

  const eventsA = processEvents(result?.eventsA, tickerA, true);
  const eventsB = processEvents(result?.eventsB, tickerB, false);

  const hasA = eventsA.length > 0;
  const hasB = eventsB.length > 0;

  if (!hasA && !hasB) {
    return (
      <div className="bg-white dark:bg-slate-950 border border-glass-border rounded-2xl p-8 shadow-premium text-left space-y-4 animate-fadeIn">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-900 px-2.5 py-0.5 text-xs font-semibold text-slate-500 font-mono">
            Stage 4 / Events Timeline
          </span>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-2">
            What Happened Along the Way?
          </h2>
        </div>
        <div className="p-6 bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800/40 rounded-xl text-center text-slate-500 dark:text-slate-400 text-xs font-medium">
          ⚠️ No high-impact operational events identified for these assets during this timeframe.
        </div>
      </div>
    );
  }

  const winner = result.finalA >= result.finalB ? tickerA : tickerB;
  const winnerEventsCount = (winner === tickerA ? eventsA : eventsB).filter(e => e.impact === "positive").length;
  const dynamicAnswer = `${winner} won the outcome, backed by ${winnerEventsCount} positive operational surprises that catalyzed major jumps in its price chart.`;

  // Dynamic zoom window filtering
  let displayTimeline = timeline;
  let zoomMode = false;
  let zoomedEventInfo = null;

  if (selectedEvent) {
    const eventIdx = timeline.findIndex(d => d.date >= selectedEvent.date);
    if (eventIdx !== -1) {
      zoomMode = true;
      // Visually cover the full 3-month (60-day) forward window: show 10 days before and 70 days after.
      const zoomStart = Math.max(0, eventIdx - 10);
      const zoomEnd = Math.min(timeline.length - 1, eventIdx + 70);
      displayTimeline = timeline.slice(zoomStart, zoomEnd);
      zoomedEventInfo = selectedEvent;
    }
  }

  return (
    <div className="space-y-8 animate-fadeIn text-left">
      
      {/* HEADER */}
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 dark:bg-slate-900 px-2.5 py-0.5 text-xs font-semibold text-brand-primary dark:text-slate-300 font-mono">
          Stage 4
        </span>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight mt-2">
          What Happened Along the Way?
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Explore key high-impact milestones. Click on any numbered marker on the chart to zoom in on the price move and view details.
        </p>
      </div>

      {/* Beginner One-Sentence Summary */}
      <div className="bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800/60 rounded-xl p-4 text-sm font-medium text-slate-700 dark:text-slate-300">
        💡 {dynamicAnswer}
      </div>

      {/* WARNING BANNER */}
      <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100/50 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 text-xs rounded-xl font-medium">
        ⚠️ <strong>Events correlation warning:</strong> Events are matched to nearby market moves. They explain possible drivers, not guaranteed causality.
      </div>

      {/* CHART OVERLAY WITH SVG ZOOM */}
      <div className="bg-white dark:bg-slate-950 border border-glass-border rounded-2xl p-6 shadow-premium relative">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-6 flex justify-between items-center">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">
              {zoomMode ? "🔍 Zoomed-In Event Window View (3-Month Horizon)" : "Timeline View"}
            </span>
            {zoomMode && (
              <button 
                onClick={() => setSelectedEvent(null)}
                className="text-[10px] text-blue-500 font-bold hover:underline text-left mt-0.5"
              >
                ◀ Reset Chart Zoom
              </button>
            )}
          </div>
          <div className="flex gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 font-bold text-blue-500">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              {tickerA}
            </span>
            <span className="flex items-center gap-1.5 font-bold text-purple-500">
              <span className="h-2 w-2 rounded-full bg-purple-500" />
              {tickerB}
            </span>
          </div>
        </div>

        {/* SVG Container - matches RiskPain layout with overflow-visible to prevent clipping */}
        <div className="aspect-[21/8] w-full bg-slate-50/50 dark:bg-slate-900/30 rounded-xl p-4 border border-slate-100 dark:border-slate-800 mt-4 relative overflow-visible"
             style={dark ? { backgroundColor: cc.canvasBg, borderColor: "rgba(255,255,255,0.07)" } : {}}>
          <svg className="w-full h-full overflow-visible min-h-[160px]" viewBox="0 0 800 220" preserveAspectRatio="none">
            {(() => {
              const activeIsA = zoomedEventInfo ? (zoomedEventInfo.ticker === tickerA) : true;
              const maxVal = Math.max(...displayTimeline.map(d => zoomMode ? (activeIsA ? d.wealthA : d.wealthB) : Math.max(d.wealthA, d.wealthB)), zoomMode ? 0 : 15000) * 1.02;
              const minVal = Math.max(0, Math.min(...displayTimeline.map(d => zoomMode ? (activeIsA ? d.wealthA : d.wealthB) : Math.min(d.wealthA, d.wealthB)), zoomMode ? Infinity : 5000) * 0.98);

              const scaleY = (val) => 180 - ((val - minVal) / (maxVal - minVal)) * 150;
              const scaleX = (idx) => 65 + (idx / (displayTimeline.length - 1)) * 715;

              const pointsA = [];
              const pointsB = [];
              
              displayTimeline.forEach((row, i) => {
                pointsA.push(`${scaleX(i)},${scaleY(row.wealthA)}`);
                pointsB.push(`${scaleX(i)},${scaleY(row.wealthB)}`);
              });

              // Format Y wealth labels
              const formatY = (v) => {
                const sym = getSymbol();
                if (v >= 1000000) return `${sym}${(v/1000000).toFixed(1)}M`;
                if (v >= 1000) return `${sym}${Math.round(v/1000)}k`;
                return `${sym}${Math.round(v)}`;
              };

              // Select 3 evenly spaced dates for X-axis labels
              const len = displayTimeline.length;
              const xIndexes = [0, Math.floor(len / 2), len - 1];

              // Plot markers only if they fall inside the visible window
              const renderMarkers = (eventsList, isA) => {
                return eventsList.map((evt, evtIdx) => {
                  const nearIdx = displayTimeline.findIndex(d => d.date >= evt.date);
                  if (nearIdx === -1) return null;
                  const x = scaleX(nearIdx);
                  const y = scaleY(isA ? displayTimeline[nearIdx].wealthA : displayTimeline[nearIdx].wealthB);

                  const isCurrentSelected = selectedEvent && selectedEvent.date === evt.date && selectedEvent.ticker === evt.ticker;

                  return (
                    <g 
                      key={evtIdx} 
                      className="cursor-pointer group"
                      onClick={() => setSelectedEvent(evt)}
                    >
                      <circle 
                        cx={x} 
                        cy={y} 
                        r={isCurrentSelected ? "14" : "10"} 
                        fill={isA ? "#3b82f6" : "#7c3aed"} 
                        className={`animate-pulse ${isCurrentSelected ? "opacity-45" : "opacity-25"}`}
                      />
                      <circle 
                        cx={x} 
                        cy={y} 
                        r={isCurrentSelected ? "10" : "8"} 
                        fill={isA ? "#3b82f6" : "#7c3aed"} 
                        stroke="#ffffff" 
                        strokeWidth="1.5" 
                        className="transition-transform duration-200 group-hover:scale-125"
                        style={{ transformOrigin: `${x}px ${y}px` }}
                      />
                      <text 
                        x={x} 
                        y={y + 3} 
                        textAnchor="middle" 
                        fill="#ffffff" 
                        fontSize={isCurrentSelected ? "9" : "8"} 
                        fontFamily="monospace" 
                        fontWeight="bold"
                        className="pointer-events-none"
                      >
                        {evtIdx + 1}
                      </text>
                    </g>
                  );
                });
              };

              return (
                <>
                  {/* Y-Axis Grid lines & Labels */}
                  <g>
                    {/* Bottom grid */}
                    <line x1="65" y1="180" x2="780" y2="180" stroke={cc.grid} strokeWidth="1.5" />
                    <text x="55" y="183" textAnchor="end" fill="#94a3b8" fontSize="8" fontFamily="monospace">{formatY(minVal)}</text>

                    {/* Middle grid 1 */}
                    <line x1="65" y1="130" x2="780" y2="130" stroke={cc.grid} strokeDasharray="3 3" />
                    <text x="55" y="133" textAnchor="end" fill="#94a3b8" fontSize="8" fontFamily="monospace">{formatY(minVal + (maxVal - minVal) * 0.33)}</text>

                    {/* Middle grid 2 */}
                    <line x1="65" y1="80" x2="780" y2="80" stroke={cc.grid} strokeDasharray="3 3" />
                    <text x="55" y="86" textAnchor="end" fill="#94a3b8" fontSize="8" fontFamily="monospace">{formatY(minVal + (maxVal - minVal) * 0.66)}</text>

                    {/* Top grid */}
                    <line x1="65" y1="30" x2="780" y2="30" stroke={cc.grid} strokeDasharray="3 3" />
                    <text x="55" y="33" textAnchor="end" fill="#94a3b8" fontSize="8" fontFamily="monospace">{formatY(maxVal)}</text>
                  </g>

                  {/* X-Axis Date Labels */}
                  <g>
                    {xIndexes.map((idx, i) => {
                      const row = displayTimeline[idx];
                      if (!row) return null;
                      const textAnchor = i === 0 ? "start" : i === 2 ? "end" : "middle";
                      return (
                        <text 
                          key={i} 
                          x={scaleX(idx)} 
                          y="205" 
                          textAnchor={textAnchor} 
                          fill="#94a3b8" 
                          fontSize="8" 
                          fontFamily="monospace"
                        >
                          {row.date}
                        </text>
                      );
                    })}
                  </g>

                  {/* Price Lines */}
                  {(!zoomMode || activeIsA) && (
                    <path d={`M ${pointsA.join(" L ")}`} fill="none" stroke="#3b82f6" strokeWidth={zoomMode ? "3.5" : "2"} strokeOpacity={zoomMode ? "0.9" : "0.4"} className="transition-all duration-300" />
                  )}
                  {(!zoomMode || !activeIsA) && (
                    <path d={`M ${pointsB.join(" L ")}`} fill="none" stroke="#7c3aed" strokeWidth={zoomMode ? "3.5" : "2"} strokeOpacity={zoomMode ? "0.9" : "0.4"} className="transition-all duration-300" />
                  )}

                  {/* Event Markers */}
                  {(!zoomMode || activeIsA) && renderMarkers(eventsA, true)}
                  {(!zoomMode || !activeIsA) && renderMarkers(eventsB, false)}
                </>
              );
            })()}
          </svg>
        </div>
      </div>

      {/* SINGLE DETAILS DETAIL CARD BELOW */}
      <div className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-premium">
        {!zoomedEventInfo ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs font-medium bg-slate-50/50 dark:bg-slate-900/10 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
            🖱️ <strong className="text-slate-800 dark:text-slate-200">Click on any event number marker</strong> on the chart above to zoom into that segment and inspect the detailed operational news catalyst.
          </div>
        ) : (() => {
          const evt = zoomedEventInfo;
          const isA = evt.ticker === tickerA;
          const changeVal = evt.windowPctChange || 0;
          const isPositiveChange = changeVal >= 0;

          const parseTransition = (e) => {
            let name = e.details?.executive_name || "";
            let role = e.details?.role || "";
            let action = e.details?.action || "";

            if (!name || !role) {
              const desc = e.summary || "";
              if (desc.includes(" appointed as ")) {
                const parts = desc.split(" appointed as ");
                name = parts[0].trim();
                role = parts[1].split(" of ")[0].trim();
                action = "appointed";
              } else if (desc.includes(" resigned from ")) {
                const parts = desc.split(" resigned from ");
                name = parts[0].trim();
                role = parts[1].split(" at ")[0].trim();
                action = "resigned";
              } else {
                name = "Board / Executive Member";
                role = "Director / Officer";
                action = desc.toLowerCase().includes("appointed") ? "appointed" : "resigned";
              }
            }

            const abbreviateRole = (str) => {
              const s = str.toLowerCase();
              if (s.includes("operating officer") || s === "coo") return "COO";
              if (s.includes("executive officer") || s === "ceo") return "CEO";
              if (s.includes("financial officer") || s === "cfo") return "CFO";
              if (s.includes("vice president") || s === "vp") return "VP";
              if (s.includes("board of directors") || s.includes("board")) return "BOARD";
              if (s.includes("director")) return "DIRECTOR";
              return str.toUpperCase();
            };

            const isAppointed = action === "appointed";
            let outgoing = "Previous Officer";
            let incoming = "Vacancy";

            if (isAppointed) {
              incoming = name;
              const descLower = (e.summary || "").toLowerCase();
              if (descLower.includes(" replacing ")) {
                outgoing = (e.summary || "").split(/ replacing /i)[1].split(/, |\. /)[0].trim();
              } else if (descLower.includes(" succeeds ")) {
                outgoing = (e.summary || "").split(/ succeeds /i)[1].split(/, |\. /)[0].trim();
              }
            } else {
              outgoing = name;
            }

            return { 
              outgoing, 
              incoming, 
              role: abbreviateRole(role), 
              fullRole: role,
              action 
            };
          };

          const parseEarnings = (e) => {
            let estimate = e.details?.eps_estimate;
            let actual = e.details?.eps_actual;
            let surprise = e.details?.surprise_pct;

            if (estimate === undefined || estimate === null) {
              const desc = e.summary || "";
              if (desc.includes("Est: ") && desc.includes("Reported EPS: ")) {
                const estPart = desc.split("Est: ")[1].split(/, | vs /)[0].trim();
                const actPart = desc.split("Reported EPS: ")[1].split(/, | vs /)[0].trim();
                estimate = parseFloat(estPart);
                actual = parseFloat(actPart);
              }
              if (desc.includes("Surprise: ")) {
                const surpPart = desc.split("Surprise: ")[1].replace(/%|\)/g, "").trim();
                surprise = parseFloat(surpPart);
              }
            }

            return { estimate, actual, surprise };
          };

          const badgeStyle = 
            evt.impact === "positive" 
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900" 
              : evt.impact === "negative" 
                ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-100 dark:border-rose-900" 
                : "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400 border-slate-200 dark:border-slate-800";

          return (
            <div className="animate-fadeIn space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-3">
                <div className="flex items-center gap-2.5">
                  <span className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-mono font-bold text-white shadow-sm ${
                    isA ? "bg-blue-500" : "bg-purple-500"
                  }`}>
                    {isA ? eventsA.indexOf(evt) + 1 : eventsB.indexOf(evt) + 1}
                  </span>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      {evt.title}
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono uppercase ${
                        isA 
                          ? "bg-blue-100/50 text-blue-700 dark:bg-blue-950/30" 
                          : "bg-purple-100/50 text-purple-700 dark:bg-purple-950/30"
                      }`}>
                        {evt.ticker}
                      </span>
                    </h3>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">Event Date: {evt.date}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono uppercase border ${badgeStyle}`}>
                    Impact: {evt.impact}
                  </span>
                  <button 
                    onClick={() => setSelectedEvent(null)}
                    className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-850 px-2 py-0.5 rounded transition-all"
                  >
                    Reset Zoom ✕
                  </button>
                </div>
              </div>

              {/* Core Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                <div className="md:col-span-2 space-y-3 text-xs text-slate-600 dark:text-slate-400">
                  {!evt.title?.includes("Earnings") && !evt.title?.includes("Milestone") && !evt.summary?.includes("CEO") && !evt.summary?.includes("CFO") && !evt.details?.executive_name && !evt.summary?.toLowerCase().includes("appointed") && !evt.summary?.toLowerCase().includes("resigned") && (
                    <div>
                      <strong className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Catalyst Narrative</strong>
                      <p className="mt-1.5 leading-relaxed text-xs text-slate-500 italic dark:text-slate-400 font-medium">{evt.summary}</p>
                    </div>
                  )}

                  {/* STANDALONE EARNINGS DETAILS DASHBOARD */}
                  {evt.title?.includes("Earnings") && (() => {
                    const earn = parseEarnings(evt);
                    const isBeat = earn.surprise !== undefined && earn.surprise > 0;
                    const surpriseText = earn.surprise !== undefined 
                      ? `${earn.surprise > 0 ? "+" : ""}${earn.surprise.toFixed(2)}% SURPRISE`
                      : "EARNINGS";
                    
                    return (
                      <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 rounded-xl p-4 mt-3 space-y-3">
                        <span className="block text-[10px] text-slate-400 font-extrabold uppercase tracking-wider font-mono">Earnings Release Flow</span>
                        
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2 px-1">
                          {/* EXPECTED / LEFT STATE */}
                          <div className="w-full sm:w-2/5 p-3 rounded-lg border text-center bg-slate-100/50 dark:bg-slate-900/50 border-dashed border-slate-200 dark:border-slate-800">
                            <span className="block text-[8px] text-slate-400 font-mono uppercase font-bold">EXPECTED EPS (ESTIMATE)</span>
                            <strong className="block text-xs mt-1 text-slate-500 dark:text-slate-400 font-mono">
                              {earn.estimate !== undefined && earn.estimate !== null ? `$${earn.estimate.toFixed(2)}` : "N/A"}
                            </strong>
                          </div>

                          {/* TRANSITION ARROW / SURPRISE OVERLAY */}
                          <div className="flex flex-col items-center justify-center w-full sm:w-1/5 min-w-[100px] text-center">
                            <span className={`text-[9px] font-bold font-mono uppercase px-2 py-0.5 rounded shadow-sm max-w-full truncate border ${
                              earn.surprise === undefined
                                ? "bg-slate-100 border-slate-200 text-slate-655 dark:bg-slate-850"
                                : isBeat
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900"
                                  : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-100 dark:border-rose-900"
                            }`}>
                              {surpriseText}
                            </span>
                            <span className="text-xl font-bold text-slate-400 mt-1 animate-pulse">➔</span>
                          </div>

                          {/* ACTUAL REPORT / RIGHT STATE */}
                          <div className={`w-full sm:w-2/5 p-3 rounded-lg border text-center ${
                            earn.surprise === undefined
                              ? "bg-slate-100/50 border-dashed border-slate-250 text-slate-600 dark:bg-slate-900"
                              : isBeat 
                                ? "bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/40" 
                                : "bg-rose-50/50 border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/40"
                          }`}>
                            <span className="block text-[8px] text-slate-400 font-mono uppercase font-bold">ACTUAL EPS (REPORTED)</span>
                            <strong className={`block text-xs mt-1 font-mono font-bold ${
                              earn.surprise === undefined
                                ? "text-slate-500"
                                : isBeat ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                            }`}>
                              {earn.actual !== undefined && earn.actual !== null ? `$${earn.actual.toFixed(2)}` : "N/A"}
                            </strong>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* STANDALONE EXECUTIVE TRANSITION CARD */}
                  {(evt.summary?.includes("CEO") || evt.summary?.includes("CFO") || evt.details?.executive_name || evt.summary?.toLowerCase().includes("appointed") || evt.summary?.toLowerCase().includes("resigned")) && (() => {
                    const trans = parseTransition(evt);
                    const isAppointed = trans.action === "appointed";
                    
                    return (
                      <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 rounded-xl p-4 mt-3 space-y-3">
                        <span className="block text-[10px] text-slate-400 font-extrabold uppercase tracking-wider font-mono">Leadership Transition Flow</span>
                        
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2 px-1">
                          {/* OUTGOING / LEFT STATE */}
                          <div className={`w-full sm:w-2/5 p-3 rounded-lg border text-center ${
                            !isAppointed 
                              ? "bg-rose-50/50 border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/40" 
                              : "bg-slate-100/50 dark:bg-slate-900/50 border-dashed border-slate-200 dark:border-slate-800"
                          }`}>
                            <span className="block text-[8px] text-slate-400 font-mono uppercase font-bold">OUTGOING</span>
                            <strong className={`block text-xs mt-1 ${!isAppointed ? "text-rose-600 dark:text-rose-400" : "text-slate-500 dark:text-slate-400"}`}>
                              {trans.outgoing}
                            </strong>
                          </div>

                          {/* TRANSITION ARROW / TITLE OVERLAY */}
                          <div className="flex flex-col items-center justify-center w-full sm:w-1/5 min-w-[100px] text-center">
                            <span className="text-[9px] font-bold text-slate-500 dark:text-slate-350 font-mono uppercase bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded shadow-sm max-w-full truncate" title={trans.fullRole}>
                              {trans.role}
                            </span>
                            <span className="text-xl font-bold text-slate-400 mt-1 animate-pulse">➔</span>
                          </div>

                          {/* INCOMING / RIGHT STATE */}
                          <div className={`w-full sm:w-2/5 p-3 rounded-lg border text-center ${
                            isAppointed 
                              ? "bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/40" 
                              : "bg-slate-100/50 dark:bg-slate-900/50 border-dashed border-slate-200 dark:border-slate-800"
                          }`}>
                            <span className="block text-[8px] text-slate-400 font-mono uppercase font-bold">INCOMING</span>
                            <strong className={`block text-xs mt-1 ${isAppointed ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`}>
                              {trans.incoming}
                            </strong>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  
                  <div className="grid grid-cols-2 gap-4 border-t border-slate-50 dark:border-slate-900 pt-3">
                    <div>
                      <strong className="block text-[9px] text-slate-400 font-mono">CONFIDENCE</strong>
                      <span className="text-xs text-slate-800 dark:text-slate-200 font-bold font-mono uppercase">{evt.confidence}</span>
                    </div>
                    <div>
                      <strong className="block text-[9px] text-slate-400 font-mono">SOURCE</strong>
                      <span className="text-xs text-slate-800 dark:text-slate-200 font-medium font-mono">{evt.source}</span>
                    </div>
                  </div>
                </div>

                {/* Multiple Analysis Windows Impact Cards Stacked */}
                <div className="flex flex-col gap-3">
                  <span className="block text-[9px] text-slate-400 font-extrabold uppercase tracking-wider font-mono px-1">
                    Multi-Horizon Analysis
                  </span>
                  
                  {/* 5-Day Card */}
                  {(() => {
                    const val = evt.windowPctChange5 ?? 0;
                    const isPos = val >= 0;
                    return (
                      <div className="bg-slate-50/60 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 rounded-xl p-3 flex justify-between items-center transition-all hover:bg-slate-100/50 dark:hover:bg-slate-900/60">
                        <div>
                          <strong className="block text-[10px] text-slate-800 dark:text-slate-200 font-bold font-mono">5-DAY WINDOW</strong>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 block">Immediate reaction</span>
                        </div>
                        <div className="text-right">
                          <span className={`text-sm font-extrabold font-mono ${isPos ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                            {isPos ? "+" : ""}{val.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* 1-Month Card */}
                  {(() => {
                    const val = evt.windowPctChange20 ?? 0;
                    const isPos = val >= 0;
                    return (
                      <div className="bg-slate-50/60 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 rounded-xl p-3 flex justify-between items-center transition-all hover:bg-slate-100/50 dark:hover:bg-slate-900/60">
                        <div>
                          <strong className="block text-[10px] text-slate-800 dark:text-slate-200 font-bold font-mono">1-MONTH WINDOW</strong>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 block">Medium-term momentum</span>
                        </div>
                        <div className="text-right">
                          <span className={`text-sm font-extrabold font-mono ${isPos ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                            {isPos ? "+" : ""}{val.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* 3-Month Card */}
                  {(() => {
                    const val = evt.windowPctChange60 ?? 0;
                    const isPos = val >= 0;
                    return (
                      <div className="bg-slate-50/60 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 rounded-xl p-3 flex justify-between items-center transition-all hover:bg-slate-100/50 dark:hover:bg-slate-900/60">
                        <div>
                          <strong className="block text-[10px] text-slate-800 dark:text-slate-200 font-bold font-mono">3-MONTH WINDOW</strong>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 block">Long-term trend</span>
                        </div>
                        <div className="text-right">
                          <span className={`text-sm font-extrabold font-mono ${isPos ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                            {isPos ? "+" : ""}{val.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="text-[8px] text-slate-400 dark:text-slate-500 font-mono mt-1 text-center">
                    Returns represent absolute performance post-catalyst.
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* CHAPTER VERDICT CARD */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 space-y-4">
        <div>
          <span className="text-[10px] font-extrabold text-brand-primary uppercase font-mono tracking-wider">
            Catalyst Verdict
          </span>
          <h4 className="text-lg font-extrabold text-slate-900 mt-1 flex items-center gap-2">
            🏆 Winner of this Chapter: <span className="font-mono text-brand-primary">{winner}</span>
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-indigo-100/60 pt-4 text-xs">
          <div>
            <span className="block text-[10px] text-indigo-400 font-bold uppercase tracking-wider font-mono">Did events support the winner?</span>
            <strong className="text-slate-800 block mt-1">
              Yes — the operational news cycle supported the returns outperformance.
            </strong>
          </div>
          <div>
            <span className="block text-[10px] text-indigo-400 font-bold uppercase tracking-wider font-mono">Plain-English Explanation</span>
            <p className="text-slate-600 mt-1 leading-relaxed">
              {winner} experienced highly critical operational catalysts during this window. By linking earnings surprises and SEC regulatory announcements to the timeline, we can directly justify the wealth divergence.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
