import { supabase } from '../../lib/supabase';
import { isTableNotProvisioned } from './optionalTable';
import { PromotionalBanner } from '../../types';

export const bannersService = {
  async fetchBanners(): Promise<PromotionalBanner[]> {
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      // A table that was never provisioned is a dormant feature, not a
      // failure. Without this every page load threw and logged an error.
      if (isTableNotProvisioned(error)) return [];
      console.error('Error fetching banners:', error);
      throw error;
    }

    return (data || []).map((row) => ({
      id: row.id,
      title: row.title,
      poster_url: row.poster_url,
      link_url: row.link_url || undefined,
      is_active: row.is_active,
      created_at: row.created_at,
    }));
  },

  async createBanner(banner: Omit<PromotionalBanner, 'id'>): Promise<PromotionalBanner> {
    const { data, error } = await supabase
      .from('banners')
      .insert([
        {
          title: banner.title,
          poster_url: banner.poster_url,
          link_url: banner.link_url || null,
          is_active: banner.is_active,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating banner:', error);
      throw error;
    }

    return {
      id: data.id,
      title: data.title,
      poster_url: data.poster_url,
      link_url: data.link_url || undefined,
      is_active: data.is_active,
      created_at: data.created_at,
    };
  },

  async updateBanner(id: string, updates: Partial<PromotionalBanner>): Promise<PromotionalBanner> {
    const payload: Record<string, any> = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.poster_url !== undefined) payload.poster_url = updates.poster_url;
    if (updates.link_url !== undefined) payload.link_url = updates.link_url;
    if (updates.is_active !== undefined) payload.is_active = updates.is_active;

    const { data, error } = await supabase
      .from('banners')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating banner:', error);
      throw error;
    }

    return {
      id: data.id,
      title: data.title,
      poster_url: data.poster_url,
      link_url: data.link_url || undefined,
      is_active: data.is_active,
      created_at: data.created_at,
    };
  },

  async deleteBanner(id: string): Promise<void> {
    const { error } = await supabase
      .from('banners')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting banner:', error);
      throw error;
    }
  },
};
