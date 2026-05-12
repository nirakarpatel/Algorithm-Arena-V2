import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { FiClock, FiRadio } from 'react-icons/fi';
import { api } from '../lib/api';
import PageHeader from '../components/PageHeader';
import BaseCard from '../components/BaseCard';
import SkeletonCard from '../components/SkeletonCard';

const PendingAssignment = () => {
  const { data: notices = [], isLoading } = useQuery({
    queryKey: ['notices'],
    queryFn: async () => {
      const res = await api.get('/api/notices');
      return res.data.data;
    }
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <BaseCard className="text-center py-16 border-dashed border-accent/40 bg-accent/5" hover={false}>
        <div className="w-20 h-20 mx-auto bg-accent/10 rounded-full flex items-center justify-center mb-6">
          <FiClock className="text-4xl text-accent animate-pulse" />
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-primary mb-4 tracking-tight">
          Awaiting <span className="text-accent underline decoration-accent/30 underline-offset-8">Assignment</span>
        </h1>
        <p className="text-secondary max-w-lg mx-auto">
          Your operative profile is currently under review. A Clan Chief will assign you to a squadron shortly. Keep an eye on global transmissions below.
        </p>
      </BaseCard>

      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <FiRadio className="text-blue-400" /> Global Transmissions
        </h2>
        
        {isLoading ? (
          <SkeletonCard />
        ) : notices.length === 0 ? (
          <BaseCard className="py-8 text-center text-secondary text-sm">
            No active transmissions.
          </BaseCard>
        ) : (
          <div className="space-y-3">
            {notices.map(notice => (
              <BaseCard key={notice._id} className="p-5 border-l-4 border-l-blue-500">
                <h3 className="font-bold text-primary mb-1">{notice.title}</h3>
                <p className="text-sm text-secondary">{notice.content}</p>
                <div className="mt-3 text-[10px] uppercase font-black tracking-widest text-tertiary">
                  Transmitted on {new Date(notice.createdAt).toLocaleDateString()}
                </div>
              </BaseCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PendingAssignment;
