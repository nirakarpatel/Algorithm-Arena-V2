import React from 'react';

const shimmer = 'animate-pulse bg-black/10 dark:bg-white/10 rounded';

// Variants mirror the real component dimensions so content swap causes
// zero layout shift. "card" ≈ Card p-6, "row" ≈ challenge list row,
// "stat" ≈ dashboard stat tile.
const SkeletonCard = ({ className = '', variant = 'card' }) => {
  if (variant === 'row') {
    return (
      <div className={`surface-card card-static flex items-center gap-4 px-4 py-3 min-h-[56px] ${className}`}>
        <div className={`${shimmer} w-5 h-5 rounded-full shrink-0`} />
        <div className={`${shimmer} h-4 flex-1 max-w-[45%]`} />
        <div className={`${shimmer} h-5 w-16 rounded-full ml-auto`} />
        <div className={`${shimmer} h-4 w-10`} />
      </div>
    );
  }
  if (variant === 'stat') {
    return (
      <div className={`surface-card card-static p-4 min-h-[88px] ${className}`}>
        <div className={`${shimmer} h-3 w-1/2 mb-3`} />
        <div className={`${shimmer} h-6 w-1/3`} />
      </div>
    );
  }
  return (
    <div className={`surface-card card-static p-6 ${className}`}>
      <div className={`${shimmer} h-4 w-1/3 mb-4`} />
      <div className={`${shimmer} h-3 w-full mb-2`} />
      <div className={`${shimmer} h-3 w-5/6 mb-2`} />
      <div className={`${shimmer} h-3 w-2/3`} />
    </div>
  );
};

export default SkeletonCard;
