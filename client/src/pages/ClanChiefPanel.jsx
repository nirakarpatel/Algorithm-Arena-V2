import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUsers, FiActivity, FiShield, FiFileText, FiBell, FiAlertCircle, FiAward } from 'react-icons/fi';
import { clsx } from 'clsx';
import { api } from '../lib/api';

import PageHeader from '../components/PageHeader';
import PermissionLegend from '../components/PermissionLegend';
import ChiefDashboardTab from './chief/ChiefDashboardTab';
import ChiefMembersTab from './chief/ChiefMembersTab';
import ChiefReviewTab from './chief/ChiefReviewTab';
import ChiefBadgesTab from './chief/ChiefBadgesTab';

const ClanChiefPanel = () => {
  const [searchParams] = useSearchParams();
  const validTabs = ['dashboard', 'members', 'review', 'badges'];
  const initialTab = validTabs.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'dashboard';
  const [activeTab, setActiveTab] = useState(initialTab);

  const tabs = [
    { id: 'dashboard', label: 'Clan Overview',      icon: FiActivity },
    { id: 'members',   label: 'Member Roster',       icon: FiUsers },
    { id: 'review',    label: 'Review Submissions',  icon: FiFileText },
    { id: 'badges',    label: 'Award Badges',        icon: FiAward },
  ];

  const chiefQuery = useQuery({
    queryKey: ['chief-clan-info'],
    queryFn: async () => {
      const res = await api.get('/api/clans/mine');
      return res.data.data;
    }
  });

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeader 
          title="Chief Command Center" 
          subtitle={chiefQuery.data ? `Managing Clan: ${chiefQuery.data.name}` : "Loading clan details..."}
          showBack={true}
          backUrl="/dashboard"
        />
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold text-xs uppercase tracking-widest shadow-[0_0_15px_rgba(59,130,246,0.2)]">
          <FiShield className="text-blue-500" />
          Chief Access Granted
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex overflow-x-auto custom-scrollbar pb-2 gap-2">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all duration-300",
                isActive 
                  ? "bg-accent text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]" 
                  : "bg-white/[0.03] text-secondary hover:bg-white/[0.08] hover:text-primary border border-white/[0.05]"
              )}
            >
              <Icon size={16} className={isActive ? "text-white" : "text-tertiary"} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <PermissionLegend
        title="Clan Access Rules"
        note="Actions below are filtered by the current clan mapping and archive status."
        items={[
          {
            icon: FiShield,
            iconClass: 'bg-blue-500/10 text-blue-400',
            label: 'Mapped chief access',
            description: 'Chief-only actions work only when your clan-chief role is linked to this clan.',
          },
          {
            icon: FiAlertCircle,
            iconClass: 'bg-amber-500/10 text-amber-300',
            label: 'Archived clan lock',
            description: 'Archived clans are read-only until an admin restores them.',
          },
          {
            icon: FiUsers,
            iconClass: 'bg-emerald-500/10 text-emerald-300',
            label: 'Member management',
            description: 'Level changes, warnings, notices, and reviews are limited to your assigned clan.',
          },
        ]}
      />

      {/* Tab Content Area */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
        >
          {chiefQuery.isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            </div>
          ) : chiefQuery.isError ? (
            <div className="p-8 text-center">
              <p className="text-red-400 font-bold text-sm">Failed to load clan data.</p>
              <p className="text-tertiary text-xs mt-1">{chiefQuery.error?.message}</p>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && <ChiefDashboardTab clan={chiefQuery.data} onTabChange={setActiveTab} />}
              {activeTab === 'members'   && <ChiefMembersTab clan={chiefQuery.data} />}
              {activeTab === 'review'    && <ChiefReviewTab clan={chiefQuery.data} />}
              {activeTab === 'badges'    && <ChiefBadgesTab clan={chiefQuery.data} />}
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default ClanChiefPanel;
