import { supabase } from '../../lib/supabase';
import { isTableNotProvisioned, isTableKnownNotProvisioned } from './optionalTable';

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

const TABLE = 'notifications';

export const notificationsService = {
  async fetchNotifications(userId: string): Promise<AppNotification[]> {
    if (isTableKnownNotProvisioned(TABLE)) {
      return [];
    }

    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      if (isTableNotProvisioned(error, TABLE)) return [];
      console.error('Error fetching notifications:', error);
      throw error;
    }

    return data || [];
  },

  async markAsRead(notificationId: string): Promise<void> {
    if (isTableKnownNotProvisioned(TABLE)) return;

    const { error } = await supabase
      .from(TABLE)
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) {
      if (isTableNotProvisioned(error, TABLE)) return;
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  async sendNotification(userId: string, title: string, message: string, type: string = 'info'): Promise<void> {
    if (isTableKnownNotProvisioned(TABLE)) return;

    const { error } = await supabase
      .from(TABLE)
      .insert([
        {
          user_id: userId,
          title,
          message,
          type,
        },
      ]);

    if (error) {
      if (isTableNotProvisioned(error, TABLE)) return;
      console.error('Error sending notification:', error);
    }
  },
};

