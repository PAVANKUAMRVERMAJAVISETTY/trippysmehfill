import { supabase } from '../../lib/supabase';
import { Feedback } from '../../types';

export const feedbackService = {
  async fetchFeedback(): Promise<Feedback[]> {
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching feedback:', error);
      throw error;
    }

    return (data || []).map((row) => ({
      id: row.id,
      order_id: row.order_id || '',
      customer_name: row.customer_name,
      customer_email: row.customer_email || undefined,
      food_rating: row.food_rating,
      taste_rating: row.taste_rating,
      packing_rating: row.packing_rating,
      delivery_rating: row.delivery_rating,
      driver_name: row.driver_name || undefined,
      comment: row.comment || undefined,
      created_at: row.created_at,
    }));
  },

  async submitFeedback(feedback: Omit<Feedback, 'id' | 'created_at'>): Promise<Feedback> {
    const { data, error } = await supabase
      .from('feedback')
      .insert([
        {
          order_id: feedback.order_id && feedback.order_id.length > 20 ? feedback.order_id : null,
          customer_name: feedback.customer_name,
          customer_email: feedback.customer_email || null,
          food_rating: feedback.food_rating,
          taste_rating: feedback.taste_rating,
          packing_rating: feedback.packing_rating,
          delivery_rating: feedback.delivery_rating,
          driver_name: feedback.driver_name || null,
          comment: feedback.comment || null,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error submitting feedback:', error);
      throw error;
    }

    return {
      id: data.id,
      order_id: data.order_id || '',
      customer_name: data.customer_name,
      customer_email: data.customer_email || undefined,
      food_rating: data.food_rating,
      taste_rating: data.taste_rating,
      packing_rating: data.packing_rating,
      delivery_rating: data.delivery_rating,
      driver_name: data.driver_name || undefined,
      comment: data.comment || undefined,
      created_at: data.created_at,
    };
  },
};
