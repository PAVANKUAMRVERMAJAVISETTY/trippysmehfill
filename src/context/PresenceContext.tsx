import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface CustomerPresenceSession {
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  hostel_address?: string;
  is_whatsapp_verified?: boolean;
  activity: string;
  last_seen: string;
}

interface PresenceContextType {
  liveCustomers: CustomerPresenceSession[];
  liveCount: number;
  isLiveModalOpen: boolean;
  setIsLiveModalOpen: (open: boolean) => void;
  updateCurrentActivity: (activity: string) => void;
}

const PresenceContext = createContext<PresenceContextType | undefined>(undefined);

const PRESENCE_TIMEOUT_MS = 60000; // 60 seconds inactivity timeout
const HEARTBEAT_INTERVAL_MS = 15000; // 15 seconds heartbeat interval

export const PresenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [liveCustomersMap, setLiveCustomersMap] = useState<Record<string, CustomerPresenceSession>>({});
  const [isLiveModalOpen, setIsLiveModalOpen] = useState(false);
  const currentActivityRef = useRef<string>('Active on website');
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);

  const updateCurrentActivity = useCallback((activity: string) => {
    currentActivityRef.current = activity;
  }, []);

  // Filter out stale presence sessions (last_seen older than PRESENCE_TIMEOUT_MS)
  const liveCustomers = React.useMemo(() => {
    const now = Date.now();
    return Object.values(liveCustomersMap).filter((session) => {
      const lastSeenTime = new Date(session.last_seen).getTime();
      return !isNaN(lastSeenTime) && now - lastSeenTime <= PRESENCE_TIMEOUT_MS;
    });
  }, [liveCustomersMap]);

  const liveCount = liveCustomers.length;

  // Helper to get or generate persistent guest session ID for unauthenticated visitors
  const getGuestId = useCallback((): string => {
    try {
      let gid = sessionStorage.getItem('trippys_guest_id');
      if (!gid) {
        gid = 'guest-' + Math.random().toString(36).substring(2, 9);
        sessionStorage.setItem('trippys_guest_id', gid);
      }
      return gid;
    } catch {
      return 'guest-' + Math.random().toString(36).substring(2, 9);
    }
  }, []);

  // 1. PRESENCE TRACKER FOR ALL VISITORS (CUSTOMERS & GUESTS)
  useEffect(() => {
    // Admins and Staff act as listeners, not customer room members
    if (user && (user.role === 'admin' || user.role === 'staff')) {
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
        presenceChannelRef.current = null;
      }
      return;
    }

    const userId = user ? user.id : getGuestId();
    const sessionData = (): CustomerPresenceSession => ({
      user_id: userId,
      full_name: user ? (user.full_name || 'Customer') : 'Guest Visitor',
      email: user ? (user.email || '') : '',
      phone: user ? (user.phone || '') : '',
      hostel_address: user ? (user.hostel_address || '') : '',
      is_whatsapp_verified: user ? Boolean(user.is_whatsapp_verified) : false,
      activity: currentActivityRef.current || 'Active on website',
      last_seen: new Date().toISOString()
    });

    let heartbeatTimer: NodeJS.Timeout | null = null;
    let localBroadcastChannel: BroadcastChannel | null = null;

    // Use Web BroadcastChannel for instant local multi-tab sync
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        localBroadcastChannel = new BroadcastChannel('trippys_presence_sync');
      }
    } catch (e) {
      // Fallback gracefully
    }

    const sendHeartbeat = async () => {
      const data = sessionData();
      if (presenceChannelRef.current && isSupabaseConfigured) {
        try {
          await presenceChannelRef.current.track(data);
        } catch (err) {
          // Silent catch
        }
      }
      if (localBroadcastChannel) {
        localBroadcastChannel.postMessage({ type: 'PRESENCE_UPDATE', session: data });
      }
    };

    if (isSupabaseConfigured) {
      const channel = supabase.channel('customer_presence_room', {
        config: {
          presence: {
            key: userId
          }
        }
      });

      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track(sessionData());
        }
      });

      presenceChannelRef.current = channel;
    } else {
      // Send initial local heartbeat
      if (localBroadcastChannel) {
        localBroadcastChannel.postMessage({ type: 'PRESENCE_UPDATE', session: sessionData() });
      }
    }

    // Set up heartbeat timer
    heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

    // Clean up on tab close / unmount
    const handleUnload = () => {
      if (presenceChannelRef.current && isSupabaseConfigured) {
        presenceChannelRef.current.untrack();
      }
      if (localBroadcastChannel) {
        localBroadcastChannel.postMessage({ type: 'PRESENCE_LEAVE', userId });
      }
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      window.removeEventListener('beforeunload', handleUnload);
      handleUnload();
      if (presenceChannelRef.current && isSupabaseConfigured) {
        supabase.removeChannel(presenceChannelRef.current);
        presenceChannelRef.current = null;
      }
      if (localBroadcastChannel) {
        localBroadcastChannel.close();
      }
    };
  }, [user]);

  // 2. PRESENCE LISTENER FOR ADMIN / STAFF
  useEffect(() => {
    if (!user || (user.role !== 'admin' && user.role !== 'staff')) {
      return;
    }

    let localBroadcastChannel: BroadcastChannel | null = null;

    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        localBroadcastChannel = new BroadcastChannel('trippys_presence_sync');
        localBroadcastChannel.onmessage = (event) => {
          if (event.data?.type === 'PRESENCE_UPDATE' && event.data?.session) {
            const sess: CustomerPresenceSession = event.data.session;
            setLiveCustomersMap((prev) => ({
              ...prev,
              [sess.user_id]: sess
            }));
          } else if (event.data?.type === 'PRESENCE_LEAVE' && event.data?.userId) {
            const uid = event.data.userId;
            setLiveCustomersMap((prev) => {
              const copy = { ...prev };
              delete copy[uid];
              return copy;
            });
          }
        };
      }
    } catch (e) {
      // Fallback
    }

    let channel: RealtimeChannel | null = null;

    if (isSupabaseConfigured) {
      channel = supabase.channel('customer_presence_room');

      const syncState = () => {
        if (!channel) return;
        const state = channel.presenceState();
        const updatedMap: Record<string, CustomerPresenceSession> = {};

        Object.keys(state).forEach((key) => {
          const presences = state[key] as any[];
          if (presences && presences.length > 0) {
            const latest = presences[presences.length - 1] as CustomerPresenceSession;
            if (latest && latest.user_id) {
              updatedMap[latest.user_id] = latest;
            }
          }
        });

        setLiveCustomersMap((prev) => ({
          ...prev,
          ...updatedMap
        }));
      };

      channel
        .on('presence', { event: 'sync' }, syncState)
        .on('presence', { event: 'join' }, syncState)
        .on('presence', { event: 'leave' }, ({ key }) => {
          setLiveCustomersMap((prev) => {
            const copy = { ...prev };
            delete copy[key];
            return copy;
          });
        })
        .subscribe();
    }

    // Periodic cleanup of stale sessions
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setLiveCustomersMap((prev) => {
        let changed = false;
        const copy = { ...prev };
        Object.keys(copy).forEach((uid) => {
          const lastSeenTime = new Date(copy[uid].last_seen).getTime();
          if (isNaN(lastSeenTime) || now - lastSeenTime > PRESENCE_TIMEOUT_MS) {
            delete copy[uid];
            changed = true;
          }
        });
        return changed ? copy : prev;
      });
    }, 10000);

    return () => {
      clearInterval(cleanupInterval);
      if (channel && isSupabaseConfigured) {
        supabase.removeChannel(channel);
      }
      if (localBroadcastChannel) {
        localBroadcastChannel.close();
      }
    };
  }, [user]);

  return (
    <PresenceContext.Provider
      value={{
        liveCustomers,
        liveCount,
        isLiveModalOpen,
        setIsLiveModalOpen,
        updateCurrentActivity
      }}
    >
      {children}
    </PresenceContext.Provider>
  );
};

export const usePresence = () => {
  const context = useContext(PresenceContext);
  if (!context) {
    throw new Error('usePresence must be used within a PresenceProvider');
  }
  return context;
};
