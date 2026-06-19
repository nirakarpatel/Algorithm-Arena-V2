import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import PageHeader from '../components/PageHeader';
import BaseCard from '../components/BaseCard';
import SkeletonCard from '../components/SkeletonCard';
import { FiLock } from 'react-icons/fi';

const Badges = () => {


  const { data: badges = [], isLoading } = useQuery({
    queryKey: ['badges'],
    queryFn: async () => {
      const res = await api.get('/api/badges');
      return res.data.data;
    }
  });

  const getRarityColor = (rarity) => {
    switch(rarity) {
      case 'LEGENDARY': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
      case 'EPIC': return 'text-purple-400 bg-purple-400/10 border-purple-400/30';
      case 'RARE': return 'text-blue-400 bg-blue-400/10 border-blue-400/30';
      case 'COMMON': return 'text-green-400 bg-green-400/10 border-green-400/30';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asset Inventory"
        subtitle="Your collection of secured achievements and honors."
        showBack={true}
      />

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {badges.map((badge) => {
            const isUnlocked = badge.isUnlocked;

            return (
              <BaseCard
                key={badge._id}
                className={`p-6 flex flex-col items-center text-center gap-3 relative overflow-hidden transition-all duration-300 ${isUnlocked ? 'hover:-translate-y-1 hover:shadow-lg' : 'opacity-60 grayscale'}`}
              >
                {!isUnlocked && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center">
                    <FiLock size={24} className="text-white/50 mb-2" />
                    <span className="text-xs font-bold text-white/50 uppercase tracking-widest">Locked</span>
                  </div>
                )}

                <div className={`text-5xl mb-2 ${!isUnlocked && 'opacity-50'}`}>{badge.icon}</div>
                <h3 className={`font-bold ${isUnlocked ? 'text-primary' : 'text-secondary'}`}>{badge.name}</h3>
                <p className="text-xs text-secondary leading-relaxed line-clamp-3">{badge.description}</p>
                <div className={`mt-auto px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getRarityColor(badge.rarity)}`}>
                  {badge.rarity}
                </div>
              </BaseCard>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Badges;
