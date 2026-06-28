import React from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { FiZap, FiAward } from 'react-icons/fi';
import { api } from '../lib/api';
import { useAuth } from '../context/useAuth';

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
  useSocket('leaderboard_update', () => {
    // Other components (like Leaderboard/Clans) will refetch automatically
  });

  // Listen for points updates (e.g. when a submission is accepted/reverted)
  const { user, refreshMe } = useAuth();
  
  // Track previously unlocked badges to detect new ones
  const unlockedBadgesRef = React.useRef(new Set());

  // Function to check badges
  const checkBadges = React.useCallback(async (notify = false) => {
    if (!user) return;
    try {
      const res = await api.get('/api/badges');
      const badges = res.data?.data || [];
      const newlyUnlocked = [];
      
      badges.forEach(b => {
        if (b.isUnlocked) {
          if (notify && !unlockedBadgesRef.current.has(b.name)) {
            newlyUnlocked.push(b);
          }
          unlockedBadgesRef.current.add(b.name);
        } else {
          unlockedBadgesRef.current.delete(b.name);
        }
      });

      if (notify && newlyUnlocked.length > 0) {
        newlyUnlocked.forEach(badge => {
          toast((t) => (
            <div 
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => {
                toast.dismiss(t.id);
                navigate('/badges');
              }}
            >
              <div className="text-4xl">{badge.icon}</div>
              <div>
                <p className="font-bold text-sm text-accent uppercase tracking-wider">Badge Unlocked!</p>
                <p className="text-sm font-bold text-primary">{badge.name}</p>
              </div>
            </div>
          ), {
            duration: 8000,
            position: 'top-center',
            style: {
              background: '#0f1115',
              border: '1px solid rgba(168,85,247,0.4)',
              boxShadow: '0 0 30px rgba(168,85,247,0.2)',
            }
          });
        });
      }
    // eslint-disable-next-line no-unused-vars
    } catch (e) {
      // ignore
    }
  }, [user, navigate]);

  // Initial load
  React.useEffect(() => {
    checkBadges(false);
  }, [checkBadges]);

  useSocket('points_update', (data) => {
    if (user && data.userId === user.id) {
      if (data.status === 'Accepted') {
        toast.success('Your submission was Accepted! XP awarded.', {
          duration: 5000,
          style: {
            background: '#0f1115',
            color: '#22c55e',
            border: '1px solid rgba(34,197,94,0.3)',
          },
          icon: '✅',
        });
        checkBadges(true); // Check for new badges!
      } else if (data.status === 'Reverted') {
        toast.error('A previously accepted submission was reverted.', {
          duration: 5000,
          style: {
            background: '#0f1115',
            color: '#ef4444',
            border: '1px solid rgba(239,68,68,0.3)',
          },
        });
        checkBadges(false); // Update ref but don't notify on revert
      }
      refreshMe();
    }
  });

  return null;
};

export default NotificationListener;
