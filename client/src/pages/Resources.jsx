import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FiDownload, FiFileText, FiFolder, FiLink, FiCheckCircle } from 'react-icons/fi';
import { api, API_BASE_URL } from '../lib/api';
import PageHeader from '../components/PageHeader';
import BaseCard from '../components/BaseCard';
import SkeletonCard from '../components/SkeletonCard';
import EmptyState from '../components/EmptyState';

const Resources = () => {
  const [activeFolder, setActiveFolder] = useState('');
  const [activeType, setActiveType] = useState('All');

  const { data: resources = [], isLoading } = useQuery({
    queryKey: ['resources', activeFolder],
    queryFn: async () => {
      const url = activeFolder
        ? `/api/resources?folder=${encodeURIComponent(activeFolder)}`
        : '/api/resources';
      const res = await api.get(url);
      return res.data.data;
    }
  });

  const folders = ['All', 'Arrays', 'Linked Lists', 'DP', 'Graphs', 'Trees', 'Stacks & Queues', 'Strings', 'Sorting', 'Solutions'];

  // Uploaded files are stored as a relative backend path; external links are absolute.
  const resolveFileUrl = (url) => (!url || url.startsWith('http') ? url : `${API_BASE_URL}${url}`);

  const getIcon = (type) => {
    if (type === 'PDF') return <FiFileText className="text-red-400" />;
    return <FiLink className="text-blue-400" />;
  };

  const getBlobClass = (type) => {
    if (type === 'PDF') return 'bg-red-500/10 dark:bg-red-500/20';
    return 'bg-blue-500/10 dark:bg-blue-500/20';
  };

  const filteredResources = resources.filter(res => {
    if (res.type === 'JSON') return false; // Filter out JSON completely
    if (activeType === 'All') return !res.isSolution; // Hide solutions in All tab by default
    if (activeType === 'PDF') return res.type === 'PDF' && !res.isSolution;
    if (activeType === 'Link') return res.type !== 'PDF' && !res.isSolution;
    if (activeType === 'Solution') return res.isSolution;
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Intel Archives"
        subtitle="Access curriculum documents, algorithms, and study materials."
        showBack={true}
        backUrl="/dashboard"
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-black/[0.06] dark:border-white/[0.06]">
        {/* Folders list */}
        <div className="flex gap-2 overflow-x-auto py-1 scrollbar-none flex-1">
          {folders.map(folder => (
            <button
              key={folder}
              onClick={() => setActiveFolder(folder === 'All' ? '' : folder)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap border ${(activeFolder === folder || (folder === 'All' && !activeFolder))
                  ? 'bg-accent/10 text-accent dark:border-white/20 shadow-sm'
                  : 'bg-black/[0.02] dark:bg-white/5 text-secondary border-transparent hover:bg-black/[0.04] dark:hover:bg-white/10'
                }`}
            >
              {folder}
            </button>
          ))}
        </div>

        {/* Resource Type Filter */}
        <div className="flex bg-black/[0.03] dark:bg-white/5 border border-black/[0.06] dark:border-white/10 rounded-xl p-1 shrink-0 w-max">
          {[
            { id: 'All', label: 'All', icon: FiFolder },
            { id: 'PDF', label: 'PDFs', icon: FiFileText, iconColor: 'text-red-400' },
            { id: 'Link', label: 'Links', icon: FiLink, iconColor: 'text-blue-400' },
            { id: 'Solution', label: 'Solutions', icon: FiCheckCircle, iconColor: 'text-emerald-400' },
          ].map(type => {
            const Icon = type.icon;
            const isActive = activeType === type.id;
            return (
              <button
                key={type.id}
                onClick={() => setActiveType(type.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black transition-all ${isActive
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-secondary hover:text-primary'
                  }`}
              >
                <Icon size={13} className={isActive ? 'text-white' : type.iconColor} />
                <span>{type.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : filteredResources.length === 0 ? (
        <EmptyState title="No Intel Found" description="No documents match the selected filters." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredResources.map(res => (
            <BaseCard key={res._id} className="relative overflow-hidden flex flex-col gap-4" hover={true}>
              <div className="relative z-10 flex flex-col gap-4 h-full">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 relative rounded-xl bg-black/[0.02] dark:bg-white/5 border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center text-xl shrink-0 overflow-visible">
                      {/* Colored blurred gradient blob right behind the icon itself */}
                      <div
                        className={`absolute inset-0.5 rounded-full blur-[10px] opacity-60 dark:opacity-75 pointer-events-none transition-transform duration-300 group-hover:scale-125 z-0 ${getBlobClass(res.type)}`}
                      />
                      <span className="relative z-10">{getIcon(res.type)}</span>
                    </div>
                    <div>
                      <h3 className="font-black text-primary leading-snug tracking-tight text-sm md:text-base">{res.title}</h3>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[9px] uppercase font-black tracking-wider text-secondary bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06] px-2 py-0.5 rounded-md">
                          {res.folder}
                        </span>
                        {res.isSolution && (
                          <span className="text-[9px] uppercase font-black tracking-wider text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                            Solution
                          </span>
                        )}
                        <span className="text-[9px] uppercase font-black tracking-wider text-tertiary">
                          {res.sizeBytes ? `${(res.sizeBytes / 1024 / 1024).toFixed(2)} MB` : 'LINK'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <a
                  href={resolveFileUrl(res.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-auto flex items-center justify-center gap-1.5 w-full py-2 bg-accent/10 hover:bg-accent/20 text-accent rounded-xl text-xs font-bold transition-all duration-200 border dark:border-white/15 shadow-sm active:scale-[0.98]"
                >
                  <FiDownload size={13} /> Access File
                </a>
              </div>
            </BaseCard>
          ))}
        </div>
      )}
    </div>
  );
};

export default Resources;
