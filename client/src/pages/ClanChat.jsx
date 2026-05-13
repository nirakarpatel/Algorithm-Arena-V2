import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FiSend, FiMessageSquare } from 'react-icons/fi';
import { io } from 'socket.io-client';
import { api } from '../lib/api';
import { useAuth } from '../context/useAuth';
import PageHeader from '../components/PageHeader';
import BaseCard from '../components/BaseCard';
import MemberHoverCard from '../components/MemberHoverCard';

const SOCKET_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? window.location.origin : 'http://localhost:5000');

const ClanChat = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [isDoubt, setIsDoubt] = useState(false);
  const scrollRef = useRef(null);
  
  // Assuming user has a clanId populated or stored in state.
  const clanId = user?.clanId || user?.clan || 'default_clan';
  const hasClan = !!(user?.clanId || user?.clan);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['chat', clanId],
    queryFn: async () => {
      if (!hasClan) return [];
      const res = await api.get(`/api/chat/${clanId}`);
      return res.data.data;
    },
    enabled: hasClan,
  });

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 100);
  };

  useEffect(() => {
    if (!hasClan) return;

    const socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      socket.emit('join_clan', clanId);
    });

    socket.on('new_message', (newMsg) => {
      queryClient.setQueryData(['chat', clanId], (oldData = []) => {
        if (oldData.some(m => m._id === newMsg._id)) return oldData;
        return [...oldData, newMsg];
      });
      scrollToBottom();
    });

    return () => {
      socket.emit('leave_clan', clanId);
      socket.disconnect();
    };
  }, [clanId, hasClan, queryClient]);



  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: async (content) => {
      const res = await api.post(`/api/chat/${clanId}`, { content, isDoubt });
      return res.data.data;
    },
    onSuccess: () => {
      setMessage('');
      setIsDoubt(false);
    }
  });

  const handleSend = (e) => {
    e.preventDefault();
    if (!message.trim() || sendMutation.isLoading) return;
    sendMutation.mutate(message);
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col space-y-4">
      <PageHeader 
        title="Squadron Uplink" 
        subtitle="Secure comms channel with your active clan members." 
      />

      <BaseCard className="flex-1 flex flex-col p-0 overflow-hidden relative">
        {!hasClan ? (
          <div className="flex-1 flex flex-col items-center justify-center text-secondary">
            <FiMessageSquare className="text-4xl mb-4 opacity-20" />
            <p>You must be assigned to a Clan to access the Uplink.</p>
          </div>
        ) : (
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {isLoading ? (
                <p className="text-secondary text-sm text-center">Establishing secure connection...</p>
              ) : messages.length === 0 ? (
                <p className="text-secondary text-sm text-center">No transmissions yet. Be the first.</p>
              ) : (
                messages.map(msg => {
                  const isMe = msg.sender?._id === user?.id || msg.sender?._id === user?._id;
                  return (
                    <div key={msg._id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <MemberHoverCard userId={msg.sender?._id} username={msg.sender?.username}>
                          <span className="text-[10px] font-black uppercase text-tertiary cursor-pointer hover:text-accent transition-colors">
                            {msg.sender?.username || 'Unknown'}
                          </span>
                        </MemberHoverCard>
                        {msg.sender?.role === 'clan-chief' && (
                          <span className="text-[8px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-black tracking-widest uppercase">Chief</span>
                        )}
                      </div>
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${isMe ? 'bg-accent/20 text-primary border border-accent/30 rounded-tr-none' : 'bg-white/5 text-secondary border border-white/5 rounded-tl-none'}`}>
                        {msg.isDoubt && (
                          <div className="text-[10px] text-accent font-bold uppercase mb-1 flex items-center gap-1">
                            <FiMessageSquare size={10} /> Asked a Doubt
                          </div>
                        )}
                        {msg.content}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            <div className="p-4 border-t border-white/5 bg-black/20">
              <form onSubmit={handleSend} className="relative flex items-center gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsDoubt(!isDoubt)}
                  className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl border transition-colors ${isDoubt ? 'bg-accent/20 text-accent border-accent/30' : 'bg-white/5 text-tertiary border-white/10 hover:text-white hover:bg-white/10'}`}
                  title="Ask AI Doubt"
                >
                  <span className="font-black text-xs">AI</span>
                </button>
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder={isDoubt ? "Ask Clan AI..." : "Transmit message..."}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-sm text-primary placeholder-tertiary focus:outline-none focus:border-accent/50 transition-colors"
                  />
                  <button 
                    type="submit"
                    disabled={!message.trim() || sendMutation.isLoading}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg bg-accent/20 text-accent hover:bg-accent hover:text-white disabled:opacity-50 disabled:hover:bg-accent/20 disabled:hover:text-accent transition-colors"
                  >
                    <FiSend className="text-sm" />
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </BaseCard>
    </div>
  );
};

export default ClanChat;
