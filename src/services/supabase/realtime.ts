import { supabase } from '../../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Channel topics must be unique per open subscription. removeChannel() resolves
 * asynchronously, so a re-subscribe (on sign-in, say) can briefly overlap the
 * teardown of the previous one -- reusing a fixed topic makes the new channel
 * collide with the dying one and silently receive nothing.
 */
let channelSequence = 0;
const uniqueTopic = (prefix: string) => `${prefix}_${++channelSequence}`;

export const realtimeService = {
  subscribeToOrders(onUpdate: (payload: any) => void): RealtimeChannel {
    const channel = supabase
      .channel(uniqueTopic('orders_realtime'))
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          onUpdate(payload);
        }
      )
      .subscribe();

    return channel;
  },

  subscribeToInventory(onUpdate: (payload: any) => void): RealtimeChannel {
    const channel = supabase
      .channel(uniqueTopic('inventory_realtime'))
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory' },
        (payload) => {
          onUpdate(payload);
        }
      )
      .subscribe();

    return channel;
  },

  subscribeToNotifications(userId: string, onUpdate: (payload: any) => void): RealtimeChannel {
    const channel = supabase
      .channel(`notifications_${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          onUpdate(payload);
        }
      )
      .subscribe();

    return channel;
  },

  unsubscribe(channel: RealtimeChannel): void {
    supabase.removeChannel(channel);
  },
};
