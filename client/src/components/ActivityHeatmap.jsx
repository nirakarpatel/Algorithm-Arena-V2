import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiActivity } from "react-icons/fi";

const WEEKS = 26;
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

/* Green intensity levels */
const cellClass = (count, future) => {
  if (future)    return "bg-white/[0.02] cursor-default";
  if (count === 0) return "bg-[#161b22] border border-[#30363d] hover:border-green-900/60 cursor-default";
  if (count === 1) return "bg-green-950 border border-green-900/50 hover:bg-green-900 cursor-pointer";
  if (count === 2) return "bg-green-900 border border-green-700/50 hover:bg-green-800 cursor-pointer shadow-[0_0_4px_rgba(34,197,94,0.15)]";
  if (count === 3) return "bg-green-700 border border-green-500/60 hover:bg-green-600 cursor-pointer shadow-[0_0_5px_rgba(34,197,94,0.25)]";
  return "bg-green-500 border border-green-400/70 hover:bg-green-400 cursor-pointer shadow-[0_0_8px_rgba(74,222,128,0.5)]";
};

const ActivityHeatmap = ({ submissions = [] }) => {
  const [tooltip, setTooltip] = useState(null);

  const today = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  }, []);

  const countMap = useMemo(() => {
    const map = {};
    submissions.forEach(s => {
      if (!s?.submittedAt) return;
      const d = new Date(s.submittedAt); d.setHours(0,0,0,0);
      const key = d.toISOString().slice(0, 10);
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [submissions]);

  /* Build grid col-by-col (week × day) */
  const { grid, monthMarkers } = useMemo(() => {
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - WEEKS * 7 + 1);

    const grid = [];
    const seenMonths = new Set();
    const monthMarkers = {}; // weekIndex → month label

    for (let wi = 0; wi < WEEKS; wi++) {
      const week = [];
      for (let di = 0; di < 7; di++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + wi * 7 + di);
        const key = d.toISOString().slice(0, 10);
        week.push({ date: key, count: countMap[key] || 0, future: d > today, d });
        if (di === 0) {
          const mLabel = MONTHS[d.getMonth()];
          if (!seenMonths.has(mLabel)) { seenMonths.add(mLabel); monthMarkers[wi] = mLabel; }
        }
      }
      grid.push(week);
    }
    return { grid, monthMarkers };
  }, [countMap, today]);

  const totalContribs = Object.values(countMap).reduce((a, b) => a + b, 0);
  const maxStreak = useMemo(() => {
    let best = 0, cur = 0;
    const keys = Object.keys(countMap).sort();
    keys.forEach((k, i) => {
      if (i === 0) { cur = countMap[k] > 0 ? 1 : 0; }
      else {
        const prev = new Date(keys[i-1]); prev.setDate(prev.getDate()+1);
        if (prev.toISOString().slice(0,10) === k && countMap[k] > 0) cur++;
        else cur = countMap[k] > 0 ? 1 : 0;
      }
      best = Math.max(best, cur);
    });
    return best;
  }, [countMap]);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs font-black text-secondary uppercase tracking-widest flex items-center gap-1.5">
          <FiActivity size={12} className="text-green-400" />
          <span className="text-green-400 font-black">{totalContribs}</span> submissions in the last {WEEKS} weeks
          {maxStreak > 1 && <span className="ml-2 text-tertiary">• 🔥 {maxStreak}-day streak</span>}
        </p>
        <div className="flex items-center gap-1.5 text-[10px] text-tertiary">
          <span>Less</span>
          {[
            "bg-[#161b22] border border-[#30363d]",
            "bg-green-950 border border-green-900/50",
            "bg-green-900 border border-green-700/50",
            "bg-green-700 border border-green-500/60",
            "bg-green-500 shadow-[0_0_6px_rgba(74,222,128,0.5)]"
          ].map((c, i) => <div key={i} className={`w-2.5 h-2.5 rounded-[3px] ${c}`} />)}
          <span>More</span>
        </div>
      </div>

      {/* Month labels */}
      <div className="flex gap-[3px] pl-7 overflow-x-auto custom-scrollbar">
        {grid.map((_, wi) => (
          <div key={wi} className="w-[13px] flex-shrink-0 text-[9px] text-tertiary font-bold text-center">
            {monthMarkers[wi] || ""}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="relative flex gap-[3px] overflow-x-auto custom-scrollbar pb-1">
        {/* Day labels */}
        <div className="flex flex-col gap-[3px] pr-1 flex-shrink-0">
          {DAY_LABELS.map((label, i) => (
            <div key={i} className="h-[13px] w-6 text-[9px] text-tertiary flex items-center justify-end pr-1 font-bold">
              {label}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {grid.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px] flex-shrink-0">
            {week.map((day, di) => (
              <div
                key={di}
                className={`w-[13px] h-[13px] rounded-[3px] transition-all duration-150 ${cellClass(day.count, day.future)}`}
                onMouseEnter={e => !day.future && setTooltip({ day, x: e.clientX, y: e.clientY })}
                onMouseLeave={() => setTooltip(null)}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {tooltip && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.12 }}
            className="fixed z-50 pointer-events-none px-2.5 py-1.5 rounded-lg bg-[#1c2026] border border-white/10 text-[11px] font-bold text-primary shadow-xl"
            style={{ left: tooltip.x + 12, top: tooltip.y - 36 }}
          >
            <span className="text-green-400">{tooltip.day.count}</span>
            {" submission"}{tooltip.day.count !== 1 ? "s" : ""} on{" "}
            {new Date(tooltip.day.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ActivityHeatmap;
