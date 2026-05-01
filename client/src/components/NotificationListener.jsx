import React from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { FiZap, FiAward } from 'react-icons/fi';

const NotificationListener = () => {
  const navigate = useNavigate();

  // Listen for new challenges
  useSocket('new_challenge', (data) => {
    toast((t) => (
      <div 
        className="flex items-center gap-3 cursor-pointer"
        onClick={() => {
          toast.dismiss(t.id);
          navigate(`/challenge/${data.challengeId}`);
        }}
      >
        <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent">
          <FiZap />
        </div>
        <div>
          <p className="font-bold text-sm">New Mission Available!</p>
          <p className="text-xs text-secondary">{data.title} ({data.difficulty})</p>
        </div>
      </div>
    ), {
      duration: 6000,
      position: 'top-right',
    });
  });

  // Listen for leaderboard updates (optional: show a generic toast or just let the page handle it)
  useSocket('leaderboard_update', (data) => {
    console.log('Leaderboard updated in real-time', data);
  });

  return null;
};

export default NotificationListener;
