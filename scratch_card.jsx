import React, { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  FiX, FiZap, FiTarget, FiStar, FiCalendar, FiUsers, FiShield, FiActivity
} from "react-icons/fi";
import { toPng } from "html-to-image";
import saveAs from "file-saver";
import { api } from "../lib/api";

const fd = (delay = 0) => ({
  initial: { opacity: 0, scale: 0.95, y: 20 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } },
  transition: { duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] },
});

/* ── Full Profile Modal (Identity Card Design) ───────────────────────── */
const MemberModal = ({ userId, username, onClose }) => {
  const cardRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);

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

  const handleExport = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      await new Promise(r => setTimeout(r, 100));
      const url = await toPng(cardRef.current, {
        cacheBust: true,
        backgroundColor: "#050507",
        pixelRatio: 2,
        style: { borderRadius: "0px" }
      });
      saveAs(url, `${username || "user"}-identity-card.png`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  const p = profileQ.data;

  return createPortal(
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-4 sm:p-6"
        style={{ background: "rgba(5, 5, 8, 0.85)", backdropFilter: "blur(16px)" }}
        onClick={onClose}
      >
        <div className="w-full max-w-3xl flex justify-between mb-6 z-10" onClick={e => e.stopPropagation()}>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/5 border border-white/10 text-secondary hover:text-white hover:bg-white/10 transition-colors">
            <FiX size={20} />
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="btn-secondary flex items-center gap-2 text-xs font-black uppercase tracking-widest px-6 py-2.5 !rounded-xl"
          >
            {isExporting ? "Exporting..." : "Download Identity"}
          </button>
        </div>

        {profileQ.isLoading ? (
           <div className="w-full max-w-3xl h-[500px] rounded-[2.5rem] border border-white/[0.08] bg-[#09090b] flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
           </div>
        ) : !p ? (
           <div className="w-full max-w-3xl h-[500px] rounded-[2.5rem] border border-white/[0.08] bg-[#09090b] flex items-center justify-center flex-col text-secondary">
              <FiZap size={40} className="mb-4 text-red-500/50" />
              <p className="font-mono uppercase tracking-widest">Entity Not Found.</p>
           </div>
        ) : (() => {
          const xp = p.totalPoints || 0;
          const level = Math.floor(xp / 500) + 1;
          const xpInLevel = xp % 500;
          const xpPct = (xpInLevel / 500) * 100;
          const diff = p.difficultyBreakdown || { easy: { solved: 0, total: 1 }, medium: { solved: 0, total: 1 }, hard: { solved: 0, total: 1 } };
          
          return (
            <motion.div
              ref={cardRef}
              {...fd(0)}
              onClick={e => e.stopPropagation()}
              className="relative w-full max-w-3xl overflow-hidden rounded-[2.5rem] border border-white/[0.08] bg-[#09090b] shadow-2xl"
              style={{ boxShadow: "0 0 80px rgba(0,0,0,0.5), inset 0 0 40px rgba(var(--accent-rgb), 0.05)" }}
            >
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
              
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-accent to-transparent opacity-50" />

              <div className="relative p-8 md:p-12">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-10">
                  {/* Avatar */}
                  <div className="relative group shrink-0">
                    <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl bg-black border-2 border-accent/20 flex items-center justify-center text-5xl font-black text-white relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-50" />
                      {p.profilePicture ? (
                        <img src={p.profilePicture} className="relative z-10 w-full h-full object-cover" alt="" />
                      ) : (
                        <span className="relative z-10">{(p.username || "?")[0].toUpperCase()}</span>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/5 to-transparent h-1/2 w-full animate-scan pointer-events-none" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-[#09090b] shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 text-center md:text-left pt-2">
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2">{p.username}</h1>
                    <p className="text-lg italic text-secondary mb-6 font-medium">"{p.bio || "Expert Algorithmist"}"</p>
                    
                    <div className="flex flex-wrap justify-center md:justify-start gap-3">
                      <div className="px-4 py-1.5 rounded-lg bg-accent/10 border border-accent/20 text-[10px] font-black uppercase tracking-widest text-accent flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                        {p.role === "admin" ? "ADMINISTRATOR" : p.role === "chief" ? "CLAN CHIEF" : "ELITE CODER"}
                      </div>
                      {p.clan && (
                        <div className="px-4 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[10px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-2">
                          <FiActivity size={12} />
                          {p.clan.name || "CLAN MEMBER"}
                        </div>
                      )}
                      <div className="px-4 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-[10px] font-black uppercase tracking-widest text-purple-400 flex items-center gap-2">
                        <FiZap size={12} />
                        GDG SOA
                      </div>
                    </div>
                  </div>
                </div>

                <div className="w-full h-px bg-white/[0.05] mb-10" />

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-tertiary mb-3">Current Level</p>
                      <div className="flex items-baseline gap-3 mb-3">
                        <span className="text-4xl font-black text-white">Lv. {level}</span>
                        <span className="text-sm font-mono text-tertiary">{xpInLevel} <span className="text-white/20">/</span> 500 XP</span>
                      </div>
                      <div className="h-2 w-full bg-white/[0.03] border border-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }} animate={{ width: `${xpPct}%` }} transition={{ duration: 1.5, ease: "easeOut" }}
                          className="h-full bg-accent shadow-[0_0_15px_rgba(var(--accent-rgb),0.5)]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col items-center gap-2 group hover:bg-white/[0.04] transition-all">
                        <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400">
                          <FiTarget size={20} />
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] font-black uppercase tracking-widest text-tertiary">Solved</p>
                          <p className="text-2xl font-black text-white">{p.acceptedCount || 0}</p>
                        </div>
                      </div>
                      <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col items-center gap-2 group hover:bg-white/[0.04] transition-all">
                        <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400">
                          <FiActivity size={20} />
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] font-black uppercase tracking-widest text-tertiary">Streak</p>
                          <p className="text-2xl font-black text-white">{p.streak || 0} <span className="text-xs text-tertiary font-bold">Days</span></p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="flex items-center gap-2 text-tertiary">
                      <FiZap size={14} className="text-accent" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em]">Performance Matrix</p>
                    </div>

                    <div className="space-y-6">
                      {[
                        { label: "EASY", value: diff.easy.solved, total: Math.max(diff.easy.total, 1), color: "text-green-400", bg: "bg-green-500" },
                        { label: "MEDIUM", value: diff.medium.solved, total: Math.max(diff.medium.total, 1), color: "text-yellow-400", bg: "bg-yellow-500" },
                        { label: "HARD", value: diff.hard.solved, total: Math.max(diff.hard.total, 1), color: "text-red-400", bg: "bg-red-500" },
                      ].map((item) => (
                        <div key={item.label} className="space-y-2">
                          <div className="flex justify-between text-[10px] font-black tracking-widest">
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

                <div className="w-full h-px bg-white/[0.05] my-10" />

                <div className="flex flex-col md:flex-row justify-between gap-8">
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-tertiary">Metadata</p>
                    <div className="flex items-center gap-2 text-secondary text-sm font-medium">
                      <FiCalendar className="text-accent" />
                      <span>Activated {new Date(p.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3 text-center md:text-right">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-tertiary">Recent Honors</p>
                    <p className="text-sm italic text-tertiary font-medium">No honors accumulated yet.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })()}
      </div>
    </AnimatePresence>,
    document.body
  );
};

/* ── Smart Position Hover Tooltip ───────────────────────────────── */
const HoverTooltip = ({ data, onExpand, position }) => {
  const xp = data?.totalPoints || 0;
  const level = Math.floor(xp / 500) + 1;
  const easy = data?.difficultyBreakdown?.easy || { solved: 0, total: 0 };
  const medium = data?.difficultyBreakdown?.medium || { solved: 0, total: 0 };
  const hard = data?.difficultyBreakdown?.hard || { solved: 0, total: 0 };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: position.yOffset }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: position.yOffset, transition: { duration: 0.15 } }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="absolute z-[9999] w-72 rounded-[20px] overflow-hidden cursor-pointer backdrop-blur-xl"
      style={{
        top: position.top, left: position.left,
        background: "linear-gradient(145deg, rgba(16, 16, 24, 0.85) 0%, rgba(10, 10, 15, 0.95) 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 10px 40px -10px rgba(0,0,0,0.8), 0 0 20px rgba(var(--accent-rgb), 0.1)",
      }}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onExpand(); }}
    >
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-accent/80 to-transparent" />
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-accent/20 blur-[40px] rounded-full pointer-events-none" />

      <div className="p-5 flex flex-col gap-4 relative z-10">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-xl p-[1px] bg-gradient-to-br from-white/20 to-transparent">
               <div className="w-full h-full rounded-[11px] overflow-hidden bg-[#0a0a0f] flex items-center justify-center">
                 {data?.profilePicture ? (
                   <img src={data.profilePicture} alt="" className="w-full h-full object-cover" />
                 ) : (
                   <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-br from-accent to-purple-400">
                     {(data?.username || "?")[0].toUpperCase()}
                   </span>
                 )}
               </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-[#101018] rounded-full flex items-center justify-center">
               <div className="w-2 h-2 bg-green-500 rounded-full" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-base font-black text-white truncate">{data?.username}</p>
              {data?.role === "admin" && <FiShield className="text-accent shrink-0" size={12} />}
            </div>
            <div className="flex items-center gap-2">
               <span className="text-xs font-bold text-accent">Lv. {level}</span>
               <span className="text-[10px] text-tertiary font-mono">|</span>
               <span className="text-[10px] font-mono text-secondary">{xp} XP</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { l: "Easy", v: easy.solved, c: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" },
            { l: "Med", v: medium.solved, c: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
            { l: "Hard", v: hard.solved, c: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
          ].map((stat) => (
            <div key={stat.l} className={`flex flex-col items-center justify-center py-2 rounded-lg border ${stat.border} ${stat.bg}`}>
              <span className={`text-sm font-black ${stat.c}`}>{stat.v}</span>
              <span className="text-[8px] uppercase tracking-widest text-white/50">{stat.l}</span>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-white/5 flex items-center justify-between">
           <span className="text-[9px] uppercase tracking-widest text-tertiary">Access Protocol</span>
           <span className="text-[10px] text-accent font-bold animate-pulse flex items-center gap-1">
             Expand <FiZap size={10} />
           </span>
        </div>
      </div>
    </motion.div>
  );
};

/* ══════════════════════════════════════════════════════
   MAIN WRAPPER COMPONENT
   ══════════════════════════════════════════════════════ */
const MemberHoverCard = ({ userId, username, children, className = "" }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [showModal, setShowModal] = useState(false);
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
    enabled: (showTooltip || showModal) && !!(userId || username),
    refetchInterval: 10000,
  });

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipWidth = 288;
    const tooltipHeight = 200;
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

  const handleClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    clearTimeout(hoverTimeoutRef.current);
    setShowTooltip(false);
    setShowModal(true);
  }, []);

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
          {showTooltip && !showModal && profileQ.data && (
            <div className="fixed inset-0 z-[9998] pointer-events-none" onMouseEnter={handleTooltipEnter} onMouseLeave={handleMouseLeave}>
              <div className="pointer-events-auto">
                <HoverTooltip data={profileQ.data} position={tooltipPos} onExpand={handleClick} />
              </div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {showModal && (
        <MemberModal userId={userId} username={username} onClose={(e) => { if (e) e.stopPropagation(); setShowModal(false); }} />
      )}
    </>
  );
};

export default MemberHoverCard;
