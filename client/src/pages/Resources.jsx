import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FiDownload, FiFileText, FiFolder, FiLink } from 'react-icons/fi';
import { api, API_BASE_URL } from '../lib/api';
import PageHeader from '../components/PageHeader';
import BaseCard from '../components/BaseCard';
import SkeletonCard from '../components/SkeletonCard';
import EmptyState from '../components/EmptyState';

const Resources = () => {
  const [activeFolder, setActiveFolder] = useState('');

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

  const folders = ['All', 'Arrays', 'Linked Lists', 'DP', 'Graphs', 'Trees', 'Stacks & Queues', 'Strings', 'Sorting'];

  // Uploaded files are stored as a relative backend path; external links are absolute.
  const resolveFileUrl = (url) => (!url || url.startsWith('http') ? url : `${API_BASE_URL}${url}`);

  const getIcon = (type) => {
    if (type === 'PDF') return <FiFileText className="text-red-400" />;
    if (type === 'JSON') return <FiFileText className="text-green-400" />;
    return <FiLink className="text-blue-400" />;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Intel Archives"
        subtitle="Access curriculum documents, algorithms, and study materials."
        showBack={true}
        backUrl="/dashboard"
      />

      <div className="flex gap-2 pb-4 overflow-x-auto">
        {folders.map(folder => (
          <button
            key={folder}
            onClick={() => setActiveFolder(folder === 'All' ? '' : folder)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${
              (activeFolder === folder || (folder === 'All' && !activeFolder))
                ? 'bg-accent/20 text-accent border border-white/30'
                : 'bg-white/5 text-secondary border border-transparent hover:bg-white/10'
            }`}
          >
            {folder}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : resources.length === 0 ? (
        <EmptyState title="No Intel Found" description="No documents match this category yet." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map(res => (
            <BaseCard key={res._id} className="p-5 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-xl">
                    {getIcon(res.type)}
                  </div>
                  <div>
                    <h3 className="font-bold text-primary leading-tight">{res.title}</h3>
                    <div className="flex gap-2 mt-1">
                      <span className="text-[10px] uppercase font-black tracking-wider text-tertiary bg-white/5 px-2 rounded">
                        {res.folder}
                      </span>
                      <span className="text-[10px] uppercase font-black tracking-wider text-tertiary">
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
                className="mt-auto flex items-center justify-center gap-2 w-full py-2 bg-accent/10 hover:bg-accent/20 text-accent rounded-lg text-sm font-bold transition-colors"
              >
                <FiDownload /> Access File
              </a>
            </BaseCard>
          ))}
        </div>
      )}
    </div>
  );
};

export default Resources;
