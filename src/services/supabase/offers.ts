import { supabase } from '../../lib/supabase';
import { isTableNotProvisioned } from './optionalTable';
import { Offer } from '../../types';

export const offersService = {
  async fetchOffers(): Promise<Offer[]> {
    let { data, error } = await supabase
      .from('offers')
      .select('*')
      .order('display_order', { ascending: true });

    if (error && !isTableNotProvisioned(error, 'offers')) {
      const fallback = await supabase.from('offers').select('*');
      if (!fallback.error) {
        data = fallback.data;
        error = null;
      }
    }

    if (error) {
      if (isTableNotProvisioned(error, 'offers')) return [];
      console.warn('Unable to fetch offers from Supabase:', error.message);
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description || undefined,
      code: row.code,
      discount_label: row.discount_label || 'DISCOUNT',
      discount_type: row.discount_type || 'percentage',
      discount_value: row.discount_value ? Number(row.discount_value) : 0,
      min_order_amount: row.min_order_amount ? Number(row.min_order_amount) : 0,
      image_url: row.image_url || undefined,
      is_active: row.is_active,
      display_order: row.display_order || 0,
      valid_until: row.valid_until || undefined,
      created_at: row.created_at,
    }));
  },

  async createOffer(offer: Omit<Offer, 'id'>): Promise<Offer> {
    const { data, error } = await supabase
      .from('offers')
      .insert([
        {
          title: offer.title,
          description: offer.description || null,
          code: offer.code.trim().toUpperCase(),
          discount_label: offer.discount_label || 'DISCOUNT',
          discount_type: offer.discount_type || 'percentage',
          discount_value: offer.discount_value || 0,
          min_order_amount: offer.min_order_amount || 0,
          image_url: offer.image_url || null,
          is_active: offer.is_active ?? true,
          display_order: offer.display_order || 0,
          valid_until: offer.valid_until || null,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating offer:', error);
      throw error;
    }

    return {
      id: data.id,
      title: data.title,
      description: data.description || undefined,
      code: data.code,
      discount_label: data.discount_label || 'DISCOUNT',
      discount_type: data.discount_type || 'percentage',
      discount_value: data.discount_value ? Number(data.discount_value) : 0,
      min_order_amount: data.min_order_amount ? Number(data.min_order_amount) : 0,
      image_url: data.image_url || undefined,
      is_active: data.is_active,
      display_order: data.display_order,
      valid_until: data.valid_until || undefined,
      created_at: data.created_at,
    };
  },

  async updateOffer(id: string, updates: Partial<Offer>): Promise<Offer> {
    const payload: Record<string, any> = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.code !== undefined) payload.code = updates.code.trim().toUpperCase();
    if (updates.discount_label !== undefined) payload.discount_label = updates.discount_label;
    if (updates.discount_type !== undefined) payload.discount_type = updates.discount_type;
    if (updates.discount_value !== undefined) payload.discount_value = updates.discount_value;
    if (updates.min_order_amount !== undefined) payload.min_order_amount = updates.min_order_amount;
    if (updates.image_url !== undefined) payload.image_url = updates.image_url;
    if (updates.is_active !== undefined) payload.is_active = updates.is_active;
    if (updates.display_order !== undefined) payload.display_order = updates.display_order;
    if (updates.valid_until !== undefined) payload.valid_until = updates.valid_until;

    const { data, error } = await supabase
      .from('offers')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating offer:', error);
      throw error;
    }

    return {
      id: data.id,
      title: data.title,
      description: data.description || undefined,
      code: data.code,
      discount_label: data.discount_label || 'DISCOUNT',
      discount_type: data.discount_type || 'percentage',
      discount_value: data.discount_value ? Number(data.discount_value) : 0,
      min_order_amount: data.min_order_amount ? Number(data.min_order_amount) : 0,
      image_url: data.image_url || undefined,
      is_active: data.is_active,
      display_order: data.display_order,
      valid_until: data.valid_until || undefined,
      created_at: data.created_at,
    };
  },

  async deleteOffer(id: string): Promise<void> {
    const { error } = await supabase
      .from('offers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting offer:', error);
      throw error;
    }
  },
};
