import React, { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  FiX, FiZap, FiTarget, FiStar, FiCalendar, FiUsers, FiShield, FiActivity, FiArrowRight
} from "react-icons/fi";

import { api } from "../lib/api";
import MemberHoverCard from "./MemberHoverCard";

/* ── Full Clan Identity Card Design ───────────────────────── */
const ClanIdentityHoverCard = ({ clanId, position }) => {
  const navigate = useNavigate();

  const clanQ = useQuery({
    queryKey: ["clan-hover-detail", clanId],
    queryFn: async () => {
      try {
        const res = await api.get(`/api/clans/${clanId}`);
        return res.data.data;
      } catch {
        return null;
      }
    },
    enabled: !!clanId,
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
  });

  const clan = clanQ.data;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6, transition: { duration: 0.12 } }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="absolute z-[9999] cursor-pointer origin-top-left"
      style={{
        top: position?.top || 0,
        left: position?.left || 0,
        width: 600,
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        navigate(`/clans`);
      }}
    >
      {clanQ.isLoading ? (
        <div className="w-full h-[320px] rounded-[2rem] border border-black/[0.08] dark:border-white/[0.08] bg-[var(--glass-surface)] backdrop-blur-md flex items-center justify-center shadow-2xl shadow-black/10 dark:shadow-black/60">
          <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !clan ? (
        <div className="w-full h-[320px] rounded-[2rem] border border-black/[0.08] dark:border-white/[0.08] bg-[var(--glass-surface)] backdrop-blur-md flex items-center justify-center flex-col text-secondary shadow-2xl shadow-black/10 dark:shadow-black/60">
          <FiUsers size={30} className="mb-3 text-red-500/50" />
          <p className="font-mono uppercase tracking-widest text-xs">Clan Not Found.</p>
        </div>
      ) : (() => {
        const members = clan.members || [];
        const totalXP = clan.totalPoints || 0;
        const avgXP = members.length > 0 ? Math.round(totalXP / members.length) : 0;
        const chiefName = clan.chief?.username || "None";

        return (
          <div
            className="relative w-full overflow-hidden rounded-[2rem] border border-black/[0.08] dark:border-white/[0.08] bg-[var(--glass-surface)] backdrop-blur-md shadow-2xl shadow-black/10 dark:shadow-black/60"
            style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.1), inset 0 0 40px rgba(var(--accent-rgb), 0.03)" }}
          >
            <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03] pointer-events-none"
              style={{ backgroundImage: "radial-gradient(var(--fg-primary) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-accent to-transparent opacity-50" />

            <div className="relative p-6 md:p-8">
              {/* Header Section */}
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-6">
                {/* Clan Banner/Icon */}
                <div className="relative group shrink-0">
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-black/[0.05] dark:bg-black border-2 border-white/20 flex flex-col items-center justify-center text-accent relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-50" />
                    <FiUsers size={32} className="relative z-10" />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/5 to-transparent h-1/2 w-full animate-scan pointer-events-none" />
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 text-center md:text-left pt-1">
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-1">
                    <h1 className="text-2xl md:text-3xl font-black text-primary tracking-tight truncate">{clan.name}</h1>
                    <span className="px-2.5 py-0.5 rounded-lg bg-accent/10 border border-accent/20 text-[10px] font-mono font-black text-accent">
                      [{clan.tag}]
                    </span>
                  </div>
                  <p className="text-xs text-secondary mb-4 italic max-h-[40px] overflow-hidden line-clamp-2">
                    {clan.description || "No description provided."}
                  </p>

                  <div className="flex flex-wrap justify-center md:justify-start gap-2">
                    <div className="px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[9px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-1.5">
                      <FiShield size={10} />
                      CHIEF: {chiefName}
                    </div>
                    {clan.status === "archived" && (
                      <div className="px-3 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-[9px] font-black uppercase tracking-widest text-red-400 flex items-center gap-1.5">
                        ARCHIVED
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="w-full h-px bg-black/[0.06] dark:bg-white/[0.05] mb-6" />

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 flex flex-col items-center gap-1">
                  <div className="w-8 h-8 rounded-xl border border-blue-500/20 flex items-center justify-center text-accent">
                    <FiUsers size={16} />
                  </div>
                  <div className="text-center mt-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-tertiary">Members</p>
                    <p className="text-lg font-black text-primary">{members.length}</p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 flex flex-col items-center gap-1">
                  <div className="w-8 h-8 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400">
                    <FiStar size={16} />
                  </div>
                  <div className="text-center mt-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-tertiary">Total XP</p>
                    <p className="text-lg font-black text-primary">{totalXP.toLocaleString()}</p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 flex flex-col items-center gap-1">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <FiTarget size={16} />
                  </div>
                  <div className="text-center mt-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-tertiary">Avg XP</p>
                    <p className="text-lg font-black text-primary">{avgXP.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Roster preview */}
              {members.length > 0 && (
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-tertiary mb-2">ROSTER PREVIEW</p>
                  <div className="flex flex-wrap gap-2">
                    {members.slice(0, 5).map((m) => (
                      <MemberHoverCard key={m._id} userId={m._id} username={m.username}>
                        <div
                          className="w-8 h-8 rounded-full bg-black/[0.05] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 flex items-center justify-center text-xs font-bold text-secondary hover:text-accent hover:border-accent/40 transition-all overflow-hidden"
                          title={m.username}
                        >
                          {m.profilePicture ? (
                            <img src={m.profilePicture} referrerPolicy="no-referrer" alt="" className="w-full h-full object-cover" />
                          ) : (
                            (m.username || "?")[0].toUpperCase()
                          )}
                        </div>
                      </MemberHoverCard>
                    ))}
                    {members.length > 5 && (
                      <div className="w-8 h-8 rounded-full bg-black/[0.03] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 flex items-center justify-center text-[10px] font-bold text-tertiary">
                        +{members.length - 5}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* watermark background icon */}
            <div className="absolute -bottom-10 -right-10 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
              <FiUsers size={180} />
            </div>
          </div>
        );
      })()}
    </motion.div>
  );
};

/* ─── Main ClanHoverCard Wrapper Component ─── */
const ClanHoverCard = ({ clanId, children, className = "" }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0, yOffset: 10 });
  const triggerRef = useRef(null);
  const hoverTimeoutRef = useRef(null);

  const clanQ = useQuery({
    queryKey: ["clan-hover", clanId],
    queryFn: async () => {
      try {
        const res = await api.get(`/api/clans/${clanId}`);
        return res.data.data;
      } catch {
        return { name: "Clan", tag: "", members: [] };
      }
    },
    enabled: showTooltip && !!clanId,
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
  });

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipWidth = 600;
    const tooltipHeight = 350;
    const gap = 12;

    let top = rect.bottom + gap;
    let left = rect.left;
    let yOffset = -10;

    // Check bottom overflow
    if (rect.bottom + tooltipHeight + gap > window.innerHeight) {
      top = rect.top - tooltipHeight - gap;
      yOffset = 10;
    }
    // Check right overflow
    if (left + tooltipWidth > window.innerWidth) {
      left = window.innerWidth - tooltipWidth - gap;
    }
    // Check left overflow
    if (left < gap) {
      left = gap;
    }

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

  const handleTooltipEnter = useCallback(() => {
    clearTimeout(hoverTimeoutRef.current);
  }, []);

  const navigate = useNavigate();
  const handleClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/clans`);
  }, [navigate]);

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
      </span>

      {createPortal(
        <AnimatePresence>
          {showTooltip && clanQ.data && (
            <div className="fixed inset-0 z-[9998] pointer-events-none" onMouseEnter={handleTooltipEnter} onMouseLeave={handleMouseLeave}>
              <div className="pointer-events-auto">
                <ClanIdentityHoverCard clanId={clanId} position={tooltipPos} />
              </div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

export default ClanHoverCard;
