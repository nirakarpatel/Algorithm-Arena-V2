import React, { useState } from 'react';
import { motion } from 'framer-motion';

const LegendItem = ({ label, solved, total, color, onMouseEnter, onMouseLeave, isActive }) => (
  <div
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
    className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${isActive ? 'bg-black/[0.06] dark:bg-white/[0.06] border-black/[0.1] dark:border-white/[0.1] scale-105' : 'bg-black/[0.02] dark:bg-white/[0.02] border-black/[0.04] dark:border-white/[0.04] hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'}`}
  >
    <div className="flex items-center gap-2.5">
      <span className={`text-[10px] font-black uppercase tracking-wider ${color}`}>{label}</span>
    </div>
    <span className="text-[11px] font-mono text-primary font-bold">{solved}<span className="text-tertiary/50 text-[9px] ml-0.5">/{total}</span></span>
  </div>
);

const MasteryPieChart = ({ easy, medium, hard, total, solvedPct }) => {
  const easyPct = total > 0 ? (easy.solved / total) * 100 : 0;
  const mediumPct = total > 0 ? (medium.solved / total) * 100 : 0;
  const hardPct = total > 0 ? (hard.solved / total) * 100 : 0;

  const [hovered, setHovered] = useState(null);

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-10 justify-center h-full mt-4">
      <div className="relative w-32 h-32 md:w-36 md:h-36 shrink-0">
        <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90 drop-shadow-2xl">
          {/* Background circle (Unsolved) */}
          <path className="text-black/[0.03] dark:text-white/[0.03]" strokeWidth="4" stroke="currentColor" fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />

          {/* Easy Segment */}
          {easyPct > 0 && (
            <motion.path
              initial={{ strokeDasharray: `0, 100` }}
              animate={{ strokeDasharray: `${easyPct}, 100` }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              onMouseEnter={() => setHovered('easy')}
              onMouseLeave={() => setHovered(null)}
              className="text-green-500 cursor-pointer hover:opacity-80 transition-opacity" strokeWidth={hovered === 'easy' ? "5" : "4"} strokeDashoffset="0" strokeLinecap="butt" stroke="currentColor" fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
          )}

          {/* Medium Segment */}
          {mediumPct > 0 && (
            <motion.path
              initial={{ strokeDasharray: `0, 100` }}
              animate={{ strokeDasharray: `${mediumPct}, 100` }}
              transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
              onMouseEnter={() => setHovered('medium')}
              onMouseLeave={() => setHovered(null)}
              className="text-yellow-500 cursor-pointer hover:opacity-80 transition-opacity" strokeWidth={hovered === 'medium' ? "5" : "4"} strokeDashoffset={`-${easyPct}`} strokeLinecap="butt" stroke="currentColor" fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
          )}

          {/* Hard Segment */}
          {hardPct > 0 && (
            <motion.path
              initial={{ strokeDasharray: `0, 100` }}
              animate={{ strokeDasharray: `${hardPct}, 100` }}
              transition={{ duration: 1.2, ease: "easeOut", delay: 0.4 }}
              onMouseEnter={() => setHovered('hard')}
              onMouseLeave={() => setHovered(null)}
              className="text-red-500 cursor-pointer hover:opacity-80 transition-opacity" strokeWidth={hovered === 'hard' ? "5" : "4"} strokeDashoffset={`-${easyPct + mediumPct}`} strokeLinecap="butt" stroke="currentColor" fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {hovered === 'easy' ? (
            <>
              <span className="text-xl font-black text-green-500">{easy.solved}/{easy.total}</span>
              <span className="text-[8px] uppercase tracking-widest text-green-500/70 font-bold mt-0.5">Easy</span>
            </>
          ) : hovered === 'medium' ? (
            <>
              <span className="text-xl font-black text-yellow-500">{medium.solved}/{medium.total}</span>
              <span className="text-[8px] uppercase tracking-widest text-yellow-500/70 font-bold mt-0.5">Medium</span>
            </>
          ) : hovered === 'hard' ? (
            <>
              <span className="text-xl font-black text-red-500">{hard.solved}/{hard.total}</span>
              <span className="text-[8px] uppercase tracking-widest text-red-500/70 font-bold mt-0.5">Hard</span>
            </>
          ) : (
            <>
              <span className="text-3xl font-black text-primary">{solvedPct}%</span>
              <span className="text-[8px] uppercase tracking-widest text-tertiary font-bold mt-0.5">Solved</span>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2.5 w-full sm:w-auto min-w-[140px]">
        <LegendItem
          label="Easy" solved={easy.solved} total={easy.total}
          color="text-green-500"
          onMouseEnter={() => setHovered('easy')} onMouseLeave={() => setHovered(null)}
          isActive={hovered === 'easy'}
        />
        <LegendItem
          label="Medium" solved={medium.solved} total={medium.total}
          color="text-yellow-500"
          onMouseEnter={() => setHovered('medium')} onMouseLeave={() => setHovered(null)}
          isActive={hovered === 'medium'}
        />
        <LegendItem
          label="Hard" solved={hard.solved} total={hard.total}
          color="text-red-500"
          onMouseEnter={() => setHovered('hard')} onMouseLeave={() => setHovered(null)}
          isActive={hovered === 'hard'}
        />
      </div>
    </div>
  );
};

export default MasteryPieChart;
