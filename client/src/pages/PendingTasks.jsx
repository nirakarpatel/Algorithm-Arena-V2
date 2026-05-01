import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiClock, FiPlay } from 'react-icons/fi';
import PageHeader from '../components/PageHeader';
import { mockChallenges } from '../lib/mockData';

const PendingTasks = () => {
  const navigate = useNavigate();
  const mockTasks = mockChallenges.slice(0, 5).map((ch, index) => ({
    id: ch._id,
    title: ch.title,
    priority: ch.difficulty === 'Hard' ? 'High' : ch.difficulty === 'Medium' ? 'Med' : 'Low',
    due: ['2h left', 'Tomorrow', '3 days', '5h left', '2 days'][index],
    category: ch.category || 'General',
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Pending Tasks"
        subtitle="Manage and resume your ongoing missions and assignments."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {mockTasks.map((task, index) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => navigate(`/challenge/${task.id}`)}
            className="group macos-glass p-6 hover:border-accent transition-all cursor-pointer bg-white/[0.02]"
          >
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs text-tertiary uppercase font-black tracking-widest">{task.category}</span>
              <span className={`text-[10px] px-2 py-1 rounded uppercase font-black ${
                task.priority === 'High' ? 'bg-red-500/20 text-red-500' : 
                task.priority === 'Med' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-blue-500/20 text-blue-400'
              }`}>
                {task.priority} Priority
              </span>
            </div>
            <h3 className="font-bold text-xl leading-tight group-hover:text-accent transition-colors mb-6">{task.title}</h3>
            
            <div className="w-full bg-white/5 h-1.5 rounded-full mb-6 overflow-hidden">
              <div className="bg-accent h-full w-[45%]"></div>
            </div>

            <div className="flex items-center justify-between mt-auto pt-4 border-t border-glass-border/40">
              <div className="flex items-center gap-2">
                <FiClock size={14} className="text-accent" />
                <span className="text-xs text-secondary font-medium">Due {task.due}</span>
              </div>
              <button className="flex items-center gap-2 text-xs bg-accent/10 text-accent px-4 py-2 rounded-lg font-bold hover:bg-accent/20 transition-colors">
                <FiPlay size={12} />
                Resume
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default PendingTasks;
