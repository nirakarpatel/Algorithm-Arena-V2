import React, { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiActivity } from "react-icons/fi";

const WEEKS = 53;
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* Green intensity levels */
const cellClass = (count, future) => {
  if (future)    return "bg-black/[0.02] dark:bg-white/[0.02] border border-transparent cursor-default";
  if (count === 0) return "bg-black/[0.04] dark:bg-[#161b22] border border-black/[0.06] dark:border-[#30363d] hover:border-green-600/30 dark:hover:border-green-900/60 cursor-default";
  if (count === 1) return "bg-green-100 dark:bg-green-950 border border-green-200/50 dark:border-green-900/50 hover:bg-green-200 dark:hover:bg-green-900 cursor-pointer";
  if (count === 2) return "bg-green-300 dark:bg-green-900 border border-green-400/50 dark:border-green-700/50 hover:bg-green-400 dark:hover:bg-green-800 cursor-pointer shadow-[0_0_4px_rgba(34,197,94,0.1)] dark:shadow-[0_0_4px_rgba(34,197,94,0.15)]";
  if (count === 3) return "bg-green-500 dark:bg-green-700 border border-green-400/60 dark:border-green-500/60 hover:bg-green-600 dark:hover:bg-green-600 cursor-pointer shadow-[0_0_5px_rgba(34,197,94,0.2)] dark:shadow-[0_0_5px_rgba(34,197,94,0.25)]";
  return "bg-green-600 dark:bg-green-500 border border-green-500/70 dark:border-green-400/70 hover:bg-green-700 dark:hover:bg-green-400 cursor-pointer shadow-[0_0_8px_rgba(34,197,94,0.3)] dark:shadow-[0_0_8px_rgba(74,222,128,0.5)]";
};

const ActivityHeatmap = ({ submissions = [] }) => {
  const [tooltip, setTooltip] = useState(null);
  const scrollContainerRef = useRef(null);

  const today = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  }, []);

  const countMap = useMemo(() => {
    const map = {};
    submissions.forEach(s => {
      if (!s?.submittedAt) return;
      const d = new Date(s.submittedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [submissions]);

  /* Build grid col-by-col (week × day) */
  const { grid, monthMarkers, totalWeeks } = useMemo(() => {
    // Find earliest submission year
    let startYear = today.getFullYear();
    submissions.forEach(s => {
      if (!s?.submittedAt) return;
      const d = new Date(s.submittedAt);
      const y = d.getFullYear();
      if (y < startYear) {
        startYear = y;
      }
    });

    // Start grid at January 1st of the startYear
    const startDate = new Date(startYear, 0, 1);
    
    // Adjust startDate to Sunday of that week
    const dayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - dayOfWeek);

    // End date is December 31st of the current year
    const endDate = new Date(today.getFullYear(), 11, 31);
    
    // Adjust endDate to Saturday of that week
    const endDayOfWeek = endDate.getDay();
    endDate.setDate(endDate.getDate() + (6 - endDayOfWeek));

    // Calculate total weeks between startDate and endDate
    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const totalWeeks = Math.ceil(diffDays / 7);

    const grid = [];
    const monthMarkers = {}; // weekIndex → month label
    const seenMonths = new Set();

    for (let wi = 0; wi < totalWeeks; wi++) {
      const week = [];
      for (let di = 0; di < 7; di++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + wi * 7 + di);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        week.push({ date: key, count: countMap[key] || 0, future: d > today, d });
        if (di === 0) {
          const mLabel = MONTHS[d.getMonth()];
          const seenKey = `${d.getFullYear()}-${mLabel}`;
          if (!seenMonths.has(seenKey)) {
            seenMonths.add(seenKey);
            monthMarkers[wi] = mLabel;
          }
        }
      }
      grid.push(week);
    }
    return { grid, monthMarkers, totalWeeks };
  }, [countMap, today, submissions]);

  const yearGroups = useMemo(() => {
    const groups = [];
    let currentYear = null;
    let currentGroup = null;
    grid.forEach((week, wi) => {
      const y = week[0].d.getFullYear();
      if (y !== currentYear) {
        currentYear = y;
        currentGroup = { year: y, startIndex: wi, weeksCount: 0 };
        groups.push(currentGroup);
      }
      currentGroup.weeksCount++;
    });
    return groups;
  }, [grid]);

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

  // Find the start week index based on earliest submission
  const startWeekIndex = useMemo(() => {
    if (submissions.length === 0) {
      return totalWeeks - 1; // Default to recent end
    }
    let earliestDate = null;
    submissions.forEach(s => {
      if (!s?.submittedAt) return;
      const d = new Date(s.submittedAt);
      if (!earliestDate || d < earliestDate) {
        earliestDate = d;
      }
    });
    if (!earliestDate) return totalWeeks - 1;

    let startYear = today.getFullYear();
    submissions.forEach(s => {
      if (!s?.submittedAt) return;
      const d = new Date(s.submittedAt);
      const y = d.getFullYear();
      if (y < startYear) startYear = y;
    });
    const startDate = new Date(startYear, 0, 1);
    const dayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - dayOfWeek);

    const diffTime = earliestDate.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 0;
    const weekIdx = Math.floor(diffDays / 7);
    return Math.min(Math.max(weekIdx, 0), totalWeeks - 1);
  }, [submissions, today, totalWeeks]);

  // Center scroll position on mount or data change
  useEffect(() => {
    if (scrollContainerRef.current) {
      let weekLeft = 28; // Padding-left
      for (let i = 0; i < startWeekIndex; i++) {
        const isStart = i > 0 && grid[i][0].d.getFullYear() !== grid[i - 1][0].d.getFullYear();
        if (isStart) weekLeft += 16; // 16px spacing for breaker
        weekLeft += 16; // 13px width + 3px gap
      }
      const containerWidth = scrollContainerRef.current.clientWidth;
      scrollContainerRef.current.scrollLeft = weekLeft - containerWidth / 2 + 8;
    }
  }, [startWeekIndex, grid]);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs font-black text-secondary uppercase tracking-widest flex items-center gap-1.5">
          <FiActivity size={12} className="text-green-600 dark:text-green-400" />
          <span className="text-green-600 dark:text-green-400 font-black">{totalContribs}</span> submissions in history
          {maxStreak > 1 && <span className="ml-2 text-tertiary">• 🔥 {maxStreak}-day streak</span>}
        </p>
        <div className="flex items-center gap-1.5 text-[10px] text-tertiary">
          <span>Less</span>
          {[
            "bg-black/[0.04] dark:bg-[#161b22] border border-black/[0.06] dark:border-[#30363d]",
            "bg-green-100 dark:bg-green-950 border border-green-200/50 dark:border-green-900/50",
            "bg-green-300 dark:bg-green-900 border border-green-400/50 dark:border-green-700/50",
            "bg-green-500 dark:bg-green-700 border border-green-400/60 dark:border-green-500/60",
            "bg-green-600 dark:bg-green-500 border border-green-500/70 dark:border-green-400/70 shadow-[0_0_6px_rgba(34,197,94,0.3)] dark:shadow-[0_0_6px_rgba(74,222,128,0.5)]"
          ].map((c, i) => <div key={i} className={`w-2.5 h-2.5 rounded-[3px] ${c}`} />)}
          <span>More</span>
        </div>
      </div>

      {/* Scrollable Container */}
      <div ref={scrollContainerRef} className="overflow-x-auto custom-scrollbar pb-2">
        <div className="min-w-max">
          {/* Year boxes */}
          <div className="flex gap-[3px] pl-7 mb-1.5">
            {yearGroups.map((yg, ygi) => {
              const width = yg.weeksCount * 16 - 3;
              return (
                <React.Fragment key={yg.year}>
                  {ygi > 0 && (
                    <div className="w-4 flex items-center justify-center flex-shrink-0">
                      <div className="w-[1px] h-full bg-black/10 dark:bg-white/10" />
                    </div>
                  )}
                  <div
                    style={{ width: `${width}px` }}
                    className="relative flex-shrink-0 text-[10px] font-bold py-1 bg-black/[0.03] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 rounded text-secondary overflow-visible"
                  >
                    <span className="sticky left-0 right-0 mx-auto block w-max whitespace-nowrap">
                      {yg.year}
                    </span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          {/* Month labels */}
          <div className="flex gap-[3px] pl-7">
            {grid.map((_, wi) => {
              const isStart = wi > 0 && grid[wi][0].d.getFullYear() !== grid[wi - 1][0].d.getFullYear();
              return (
                <React.Fragment key={wi}>
                  {isStart && (
                    <div className="w-4 flex items-center justify-center flex-shrink-0">
                      <div className="w-[1px] h-full bg-black/10 dark:bg-white/10" />
                    </div>
                  )}
                  <div className="w-[13px] flex-shrink-0 text-[9px] text-tertiary font-bold text-center">
                    {monthMarkers[wi] || ""}
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          {/* Grid */}
          <div className="relative flex gap-[3px] pt-1">
            {/* Day labels */}
            <div className="flex flex-col gap-[3px] pr-1 flex-shrink-0">
              {DAY_LABELS.map((label, i) => (
                <div key={i} className="h-[13px] w-6 text-[9px] text-tertiary flex items-center justify-end pr-1 font-bold">
                  {label}
                </div>
              ))}
            </div>

            {/* Weeks */}
            {grid.map((week, wi) => {
              const isStart = wi > 0 && grid[wi][0].d.getFullYear() !== grid[wi - 1][0].d.getFullYear();
              return (
                <React.Fragment key={wi}>
                  {isStart && (
                    <div className="w-4 flex flex-col gap-[3px] items-center justify-center flex-shrink-0 py-0.5">
                      <div className="w-[1px] h-full border-l border-dashed border-black/20 dark:border-white/20" />
                    </div>
                  )}
                  <div className="flex flex-col gap-[3px] flex-shrink-0">
                    {week.map((day, di) => (
                      <div
                        key={di}
                        className={`w-[13px] h-[13px] rounded-[3px] transition-all duration-150 ${cellClass(day.count, day.future)}`}
                        onMouseEnter={e => !day.future && setTooltip({ day, x: e.clientX, y: e.clientY })}
                        onMouseLeave={() => setTooltip(null)}
                      />
                    ))}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {tooltip && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.12 }}
            className="fixed z-50 pointer-events-none px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#1c2026] border border-black/10 dark:border-white/10 text-[11px] font-bold text-primary shadow-xl backdrop-blur-md bg-opacity-95 dark:bg-opacity-95"
            style={{ left: tooltip.x + 12, top: tooltip.y - 36 }}
          >
            <span className="text-green-600 dark:text-green-400">{tooltip.day.count}</span>
            {" submission"}{tooltip.day.count !== 1 ? "s" : ""} on{" "}
            {new Date(tooltip.day.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ActivityHeatmap;
