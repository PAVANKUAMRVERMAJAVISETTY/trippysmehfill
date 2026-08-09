import { supabase } from '../../lib/supabase';
import { isTableNotProvisioned } from './optionalTable';
import { HomePromotion } from '../../types';

export const homeContentService = {
  async fetchHomePromotions(): Promise<HomePromotion[]> {
    let { data, error } = await supabase
      .from('home_promotions')
      .select('*')
      .order('display_order', { ascending: true });

    if (error && !isTableNotProvisioned(error, 'home_promotions')) {
      const fallback = await supabase.from('home_promotions').select('*');
      if (!fallback.error) {
        data = fallback.data;
        error = null;
      }
    }

    if (error) {
      if (isTableNotProvisioned(error, 'home_promotions')) return [];
      console.warn('Unable to fetch home promotions from Supabase:', error.message);
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      title: row.title,
      subtitle: row.subtitle || undefined,
      image_url: row.image_url,
      button_text: row.button_text || undefined,
      button_link: row.button_link || undefined,
      badge: row.badge || undefined,
      is_active: row.is_active,
      display_order: row.display_order || 0,
      created_at: row.created_at,
    }));
  },

  async createHomePromotion(promo: Omit<HomePromotion, 'id'>): Promise<HomePromotion> {
    const { data, error } = await supabase
      .from('home_promotions')
      .insert([
        {
          title: promo.title,
          subtitle: promo.subtitle || null,
          image_url: promo.image_url,
          button_text: promo.button_text || 'Order Now',
          button_link: promo.button_link || 'menu-section',
          badge: promo.badge || 'SPECIAL PROMOTION',
          is_active: promo.is_active ?? true,
          display_order: promo.display_order || 0,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating home promotion:', error);
      throw error;
    }

    return {
      id: data.id,
      title: data.title,
      subtitle: data.subtitle || undefined,
      image_url: data.image_url,
      button_text: data.button_text || undefined,
      button_link: data.button_link || undefined,
      badge: data.badge || undefined,
      is_active: data.is_active,
      display_order: data.display_order,
      created_at: data.created_at,
    };
  },

  async updateHomePromotion(id: string, updates: Partial<HomePromotion>): Promise<HomePromotion> {
    const payload: Record<string, any> = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.subtitle !== undefined) payload.subtitle = updates.subtitle;
    if (updates.image_url !== undefined) payload.image_url = updates.image_url;
    if (updates.button_text !== undefined) payload.button_text = updates.button_text;
    if (updates.button_link !== undefined) payload.button_link = updates.button_link;
    if (updates.badge !== undefined) payload.badge = updates.badge;
    if (updates.is_active !== undefined) payload.is_active = updates.is_active;
    if (updates.display_order !== undefined) payload.display_order = updates.display_order;

    const { data, error } = await supabase
      .from('home_promotions')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating home promotion:', error);
      throw error;
    }

    return {
      id: data.id,
      title: data.title,
      subtitle: data.subtitle || undefined,
      image_url: data.image_url,
      button_text: data.button_text || undefined,
      button_link: data.button_link || undefined,
      badge: data.badge || undefined,
      is_active: data.is_active,
      display_order: data.display_order,
      created_at: data.created_at,
    };
  },

  async deleteHomePromotion(id: string): Promise<void> {
    const { error } = await supabase
      .from('home_promotions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting home promotion:', error);
      throw error;
    }
  },
};
