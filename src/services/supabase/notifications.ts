import { supabase } from '../../lib/supabase';
import { isTableNotProvisioned } from './optionalTable';

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export const notificationsService = {
  async fetchNotifications(userId: string): Promise<AppNotification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      // A table that was never provisioned is a dormant feature, not a
      // failure. Without this every page load threw and logged an error.
      if (isTableNotProvisioned(error)) return [];
      console.error('Error fetching notifications:', error);
      throw error;
    }

    return data || [];
  },

  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  async sendNotification(userId: string, title: string, message: string, type: string = 'info'): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .insert([
        {
          user_id: userId,
          title,
          message,
          type,
        },
      ]);

    if (error) {
      console.error('Error sending notification:', error);
    }
  },
};
