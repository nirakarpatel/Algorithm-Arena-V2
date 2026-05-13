import React, { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  FiX, FiZap, FiTarget, FiStar, FiCalendar, FiUsers, FiShield, FiActivity
} from "react-icons/fi";

import { api } from "../lib/api";



/* ── Full Profile Modal (Identity Card Design) ───────────────────────── */
const IdentityHoverCard = ({ userId, username, position }) => {
  

  const profileQ = useQuery({
    queryKey: ["member-profile", userId || username],
    queryFn: async () => {
      try {
        const endpoint = userId
          ? `/api/profile/user/${userId}`
          : `/api/profile/username/${username}`;
        const res = await api.get(endpoint);
        return res.data.data;
      } catch {
        return null;
      }
    },
    enabled: !!(userId || username),
    refetchInterval: 10000,
  });

  
  const p = profileQ.data;

  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: position?.yOffset || 0 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: position?.yOffset || 0, transition: { duration: 0.15 } }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="absolute z-[9999] cursor-pointer origin-top-left"
      style={{
        top: position?.top || 0, left: position?.left || 0,
        width: 600,
      }}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
        {profileQ.isLoading ? (
           <div className="w-full h-[350px] rounded-[2rem] border border-white/[0.08] bg-[#09090b] flex items-center justify-center shadow-2xl">
              <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
           </div>
        ) : !p ? (
           <div className="w-full h-[350px] rounded-[2rem] border border-white/[0.08] bg-[#09090b] flex items-center justify-center flex-col text-secondary shadow-2xl">
              <FiZap size={30} className="mb-3 text-red-500/50" />
              <p className="font-mono uppercase tracking-widest text-xs">Entity Not Found.</p>
           </div>
        ) : (() => {
          const xp = p.totalPoints || 0;
          const level = Math.floor(xp / 500) + 1;
          const xpInLevel = xp % 500;
          const xpPct = (xpInLevel / 500) * 100;
          const diff = p.difficultyBreakdown || { easy: { solved: 0, total: 1 }, medium: { solved: 0, total: 1 }, hard: { solved: 0, total: 1 } };
          
          return (
            <div
              className="relative w-full overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#09090b] shadow-2xl"
              style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.8), inset 0 0 40px rgba(var(--accent-rgb), 0.05)" }}
            >
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
              
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-accent to-transparent opacity-50" />

              <div className="relative p-6 md:p-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8">
                  {/* Avatar */}
                  <div className="relative group shrink-0">
                    <div className="w-24 h-24 md:w-28 md:h-28 rounded-[1.5rem] bg-black border-2 border-accent/20 flex items-center justify-center text-4xl font-black text-white relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-50" />
                      {p.profilePicture ? (
                        <img src={p.profilePicture} className="relative z-10 w-full h-full object-cover" alt="" />
                      ) : (
                        <span className="relative z-10">{(p.username || "?")[0].toUpperCase()}</span>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/5 to-transparent h-1/2 w-full animate-scan pointer-events-none" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-[3px] border-[#09090b] shadow-[0_0_12px_rgba(34,197,94,0.5)]" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 text-center md:text-left pt-1">
                    <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-1 truncate">{p.username}</h1>
                    <p className="text-sm italic text-secondary mb-4 font-medium truncate">"{p.bio || "Expert Algorithmist"}"</p>
                    
                    <div className="flex flex-wrap justify-center md:justify-start gap-2">
                      <div className="px-3 py-1 rounded-lg bg-accent/10 border border-accent/20 text-[9px] font-black uppercase tracking-widest text-accent flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                        {p.role === "admin" ? "ADMIN" : p.role === "chief" ? "CHIEF" : "CODER"}
                      </div>
                      {p.clan && (
                        <div className="px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[9px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-1.5">
                          <FiActivity size={10} />
                          {p.clan.name || "MEMBER"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="w-full h-px bg-white/[0.05] mb-8" />

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-tertiary mb-2">Current Level</p>
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-3xl font-black text-white">Lv. {level}</span>
                        <span className="text-xs font-mono text-tertiary">{xpInLevel} <span className="text-white/20">/</span> 500 XP</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/[0.03] border border-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }} animate={{ width: `${xpPct}%` }} transition={{ duration: 1.5, ease: "easeOut" }}
                          className="h-full bg-accent shadow-[0_0_15px_rgba(var(--accent-rgb),0.5)]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col items-center gap-1 group hover:bg-white/[0.04] transition-all">
                        <div className="w-8 h-8 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400">
                          <FiTarget size={16} />
                        </div>
                        <div className="text-center mt-1">
                          <p className="text-[9px] font-black uppercase tracking-widest text-tertiary">Solved</p>
                          <p className="text-xl font-black text-white">{p.acceptedCount || 0}</p>
                        </div>
                      </div>
                      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col items-center gap-1 group hover:bg-white/[0.04] transition-all">
                        <div className="w-8 h-8 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400">
                          <FiActivity size={16} />
                        </div>
                        <div className="text-center mt-1">
                          <p className="text-[9px] font-black uppercase tracking-widest text-tertiary">Streak</p>
                          <p className="text-xl font-black text-white">{p.streak || 0}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-2 text-tertiary">
                      <FiZap size={12} className="text-accent" />
                      <p className="text-[9px] font-black uppercase tracking-[0.2em]">Performance Matrix</p>
                    </div>

                    <div className="space-y-4">
                      {[
                        { label: "EASY", value: diff.easy.solved, total: Math.max(diff.easy.total, 1), color: "text-green-400", bg: "bg-green-500" },
                        { label: "MEDIUM", value: diff.medium.solved, total: Math.max(diff.medium.total, 1), color: "text-yellow-400", bg: "bg-yellow-500" },
                        { label: "HARD", value: diff.hard.solved, total: Math.max(diff.hard.total, 1), color: "text-red-400", bg: "bg-red-500" },
                      ].map((item) => (
                        <div key={item.label} className="space-y-1.5">
                          <div className="flex justify-between text-[9px] font-black tracking-widest">
                            <span className={item.color}>{item.label}</span>
                            <span className="text-tertiary font-mono">{item.value} <span className="text-white/20">/</span> {item.total === 1 && item.value === 0 ? 0 : item.total}</span>
                          </div>
                          <div className="h-1.5 w-full bg-white/[0.03] border border-white/5 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }} animate={{ width: `${(item.value / item.total) * 100}%` }} transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                              className={`h-full ${item.bg} opacity-80`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
    </motion.div>
  );

};

/* ══════════════════════════════════════════════════════
   MAIN WRAPPER COMPONENT
   ══════════════════════════════════════════════════════ */
const MemberHoverCard = ({ userId, username, children, className = "" }) => {
  const [showTooltip, setShowTooltip] = useState(false);
    const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0, yOffset: 10 });
  const triggerRef = useRef(null);
  const hoverTimeoutRef = useRef(null);

  const profileQ = useQuery({
    queryKey: ["member-hover", userId || username],
    queryFn: async () => {
      try {
        const endpoint = userId
          ? `/api/profile/user/${userId}`
          : `/api/profile/username/${username}`;
        const res = await api.get(endpoint);
        return res.data.data;
      } catch {
        return { username, totalPoints: 0, difficultyBreakdown: {} };
      }
    },
    enabled: showTooltip && !!(userId || username),
    refetchInterval: 10000,
  });

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipWidth = 600;
    const tooltipHeight = 420;
    const gap = 12;

    let top = rect.bottom + gap;
    let left = rect.left;
    let yOffset = -10;

    if (rect.bottom + tooltipHeight + gap > window.innerHeight) {
      top = rect.top - tooltipHeight - gap;
      yOffset = 10;
    }
    if (left + tooltipWidth > window.innerWidth) left = window.innerWidth - tooltipWidth - gap;
    if (left < gap) left = gap;

    setTooltipPos({ top, left, yOffset });
  }, []);

  const handleMouseEnter = useCallback(() => {
    clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      calculatePosition();
      setShowTooltip(true);
    }, 400);
  }, [calculatePosition]);

  const handleMouseLeave = useCallback(() => {
    clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => setShowTooltip(false), 300);
  }, []);

  const handleTooltipEnter = useCallback(() => clearTimeout(hoverTimeoutRef.current), []);

  const navigate = useNavigate();
  const handleClick = useCallback((e) => { e.preventDefault(); e.stopPropagation(); navigate(`/profile/${username}`); }, [navigate, username]);

  useEffect(() => {
    if (!showTooltip) return;
    const updatePos = () => calculatePosition();
    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);
    return () => {
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [showTooltip, calculatePosition]);

  return (
    <>
      <span
        ref={triggerRef}
        className={`relative inline-block cursor-pointer hover:text-accent transition-colors ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        {children}
        <span className="absolute left-0 bottom-0 w-0 h-[1px] bg-accent transition-all duration-300 group-hover:w-full opacity-0 group-hover:opacity-100" />
      </span>

      {createPortal(
        <AnimatePresence>
          {showTooltip && profileQ.data && (
            <div className="fixed inset-0 z-[9998] pointer-events-none" onMouseEnter={handleTooltipEnter} onMouseLeave={handleMouseLeave}>
              <div className="pointer-events-auto">
                <IdentityHoverCard userId={userId} username={username} position={tooltipPos} />
              </div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

export default MemberHoverCard;
