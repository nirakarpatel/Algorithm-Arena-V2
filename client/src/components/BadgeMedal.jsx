import React from 'react';

const BadgeMedal = ({ rarity, icon, isUnlocked }) => {
  let outerGradient, innerGradient, shadowColor, ribbonColor;

  switch(rarity) {
    case 'LEGENDARY':
      outerGradient = 'from-yellow-600 via-yellow-300 to-yellow-600';
      innerGradient = 'from-yellow-900 to-black';
      shadowColor = 'shadow-yellow-500/50';
      ribbonColor = 'bg-yellow-500';
      break;
    case 'EPIC':
      outerGradient = 'from-purple-600 via-purple-300 to-purple-600';
      innerGradient = 'from-purple-900 to-black';
      shadowColor = 'shadow-purple-500/50';
      ribbonColor = 'bg-purple-500';
      break;
    case 'RARE':
      outerGradient = 'from-blue-600 via-blue-300 to-blue-600';
      innerGradient = 'from-blue-900 to-black';
      shadowColor = 'shadow-blue-500/50';
      ribbonColor = 'bg-blue-500';
      break;
    case 'COMMON':
      outerGradient = 'from-green-600 via-green-300 to-green-600';
      innerGradient = 'from-green-900 to-black';
      shadowColor = 'shadow-green-500/50';
      ribbonColor = 'bg-green-500';
      break;
    default:
      outerGradient = 'from-gray-500 via-gray-200 to-gray-500';
      innerGradient = 'from-gray-800 to-black';
      shadowColor = 'shadow-gray-500/50';
      ribbonColor = 'bg-gray-500';
      break;
  }

  if (!isUnlocked) {
    outerGradient = 'from-gray-800 via-gray-600 to-gray-800';
    innerGradient = 'from-gray-900 to-black';
    shadowColor = 'shadow-black/50';
    ribbonColor = 'bg-gray-700';
  }

  return (
    <div className="relative flex flex-col items-center justify-center w-24 h-28 group">
      {/* Glossy Overlay for realistic 3D feel */}
      <div className={`absolute top-2 w-20 h-20 rounded-full z-20 pointer-events-none ${isUnlocked ? 'bg-gradient-to-br from-white/40 to-transparent' : 'bg-gradient-to-br from-white/10 to-transparent'}`} style={{ clipPath: 'ellipse(70% 40% at 50% 20%)' }}></div>

      {/* Ribbon (Optional: a small tab at the top) */}
      <div className={`absolute top-0 w-8 h-6 ${ribbonColor} rounded-t-sm z-0 before:content-[''] before:absolute before:w-full before:h-2 before:bg-black/20 before:bottom-0`}></div>

      {/* The 3D Coin/Medal Shape */}
      <div className={`relative z-10 w-20 h-20 rounded-full bg-gradient-to-br ${outerGradient} p-1.5 shadow-xl ${shadowColor} flex items-center justify-center transition-transform duration-500 group-hover:rotate-y-12 group-hover:scale-105`}
           style={{ boxShadow: isUnlocked ? '0 10px 25px -5px var(--tw-shadow-color), inset 0 -4px 6px rgba(0,0,0,0.4), inset 0 4px 6px rgba(255,255,255,0.4)' : 'inset 0 -4px 6px rgba(0,0,0,0.6)' }}>
        
        {/* Inner engraved section */}
        <div className={`w-full h-full rounded-full bg-gradient-to-br ${innerGradient} flex items-center justify-center`}
             style={{ boxShadow: 'inset 0 4px 8px rgba(0,0,0,0.8)' }}>
             
             {/* The Icon */}
             <div className={`text-4xl filter drop-shadow-md transition-all duration-300 ${!isUnlocked && 'opacity-40 grayscale'} ${isUnlocked && 'group-hover:scale-110'}`}>
               {icon}
             </div>
        </div>
      </div>
      
      {/* 3D Base/Stand underneath */}
      <div className="w-12 h-2 bg-black/40 rounded-[100%] blur-sm absolute bottom-0"></div>
    </div>
  );
};

export default BadgeMedal;
