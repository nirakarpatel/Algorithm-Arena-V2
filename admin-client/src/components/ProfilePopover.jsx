import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiStar, FiActivity, FiZap } from 'react-icons/fi';

const ProfilePopover = ({ user, children, stats }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Default mock stats if not provided
  const userStats = stats || {
    xp: 2450,
    solved: { easy: 12, medium: 8, hard: 3 },
    rank: 'Gold II'
  };

  const totalSolved = userStats.solved.easy + userStats.solved.medium + userStats.solved.hard;

  const handleMouseEnter = () => {
    setIsHovered(true);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTimeout(() => {
      setIsOpen(false);
    }, 150); // slight delay to allow moving to popover
  };

  if (!user) return <>{children}</>;

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="cursor-pointer">
        {children}
      </div>

      <AnimatePresence>
        {(isOpen || isHovered) && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-3 w-72 macos-glass p-1 border-accent/30 shadow-[0_8px_32px_rgba(var(--accent-rgb),0.2)] rounded-2xl origin-bottom"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className="bg-[#111113]/90 rounded-xl overflow-hidden relative">
              {/* Header Banner */}
              <div className="h-16 bg-gradient-to-r from-accent/40 via-purple-500/20 to-transparent relative">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
              </div>

              {/* Avatar & Basic Info */}
              <div className="px-4 pb-4 -mt-8 relative z-10">
                <div className="flex justify-between items-end mb-2">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-accent to-purple-600 p-0.5 shadow-lg shadow-accent/20">
                    {user.profilePicture ? (
                      <img src={user.profilePicture} alt="Avatar" referrerPolicy="no-referrer" className="w-full h-full rounded-[10px] object-cover" />
                    ) : (
                      <div className="w-full h-full rounded-[10px] bg-[#1a1a1c] flex items-center justify-center text-xl text-white font-black uppercase">
                        {user.username?.[0] || 'U'}
                      </div>
                    )}
                  </div>
                  <div className="px-3 py-1 rounded-full bg-accent/20 border border-accent/30 flex items-center gap-1.5 backdrop-blur-md">
                    <FiStar className="text-accent text-xs" />
                    <span className="text-xs font-black text-white">{userStats.xp} XP</span>
                  </div>
                </div>

                <div className="mb-4">
                  <h3 className="text-lg font-black text-primary truncate leading-tight">{user.username}</h3>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-accent">{userStats.rank}</p>
                </div>

                {/* Stats Breakdown */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-secondary font-medium flex items-center gap-1"><FiActivity /> Challenges Solved</span>
                    <span className="text-primary font-bold">{totalSolved}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {/* Easy */}
                    <div className="bg-white/[0.03] rounded-lg p-2 border border-green-500/10 text-center transition-colors hover:border-green-500/30">
                      <p className="text-[10px] font-bold text-green-500 mb-0.5">EASY</p>
                      <p className="text-sm font-black text-primary">{userStats.solved.easy}</p>
                    </div>
                    {/* Medium */}
                    <div className="bg-white/[0.03] rounded-lg p-2 border border-yellow-500/10 text-center transition-colors hover:border-yellow-500/30">
                      <p className="text-[10px] font-bold text-yellow-500 mb-0.5">MED</p>
                      <p className="text-sm font-black text-primary">{userStats.solved.medium}</p>
                    </div>
                    {/* Hard */}
                    <div className="bg-white/[0.03] rounded-lg p-2 border border-red-500/10 text-center transition-colors hover:border-red-500/30">
                      <p className="text-[10px] font-bold text-red-500 mb-0.5">HARD</p>
                      <p className="text-sm font-black text-primary">{userStats.solved.hard}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Bottom glowing line */}
              <div className="h-1 w-full bg-gradient-to-r from-transparent via-accent to-transparent opacity-50"></div>
            </div>

            {/* Triangle pointer */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-accent/30 rotate-45 transform origin-center blur-[2px]"></div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfilePopover;
