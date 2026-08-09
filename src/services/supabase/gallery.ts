import { supabase } from '../../lib/supabase';
import { isTableNotProvisioned } from './optionalTable';
import { GalleryItem } from '../../types';

export const galleryService = {
  async fetchGalleryItems(): Promise<GalleryItem[]> {
    let { data, error } = await supabase
      .from('gallery_items')
      .select('*')
      .order('display_order', { ascending: true });

    if (error && !isTableNotProvisioned(error, 'gallery_items')) {
      const fallback = await supabase.from('gallery_items').select('*');
      if (!fallback.error) {
        data = fallback.data;
        error = null;
      }
    }

    if (error) {
      if (isTableNotProvisioned(error, 'gallery_items')) return [];
      console.warn('Unable to fetch gallery items:', error.message);
      return [];
    }

    return (data || []).map((item) => ({
      id: item.id,
      title: item.title,
      caption: item.caption || undefined,
      image_url: item.image_url,
      created_at: item.created_at,
    }));
  },

  async addGalleryItem(item: Omit<GalleryItem, 'id' | 'created_at'>): Promise<GalleryItem> {
    const { data, error } = await supabase
      .from('gallery_items')
      .insert([
        {
          title: item.title,
          caption: item.caption || null,
          image_url: item.image_url,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error adding gallery item:', error);
      throw error;
    }

    return {
      id: data.id,
      title: data.title,
      caption: data.caption || undefined,
      image_url: data.image_url,
      created_at: data.created_at,
    };
  },

  async updateGalleryItem(id: string, updates: Partial<GalleryItem>): Promise<GalleryItem> {
    const payload: Record<string, any> = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.caption !== undefined) payload.caption = updates.caption;
    if (updates.image_url !== undefined) payload.image_url = updates.image_url;

    const { data, error } = await supabase
      .from('gallery_items')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating gallery item:', error);
      throw error;
    }

    return {
      id: data.id,
      title: data.title,
      caption: data.caption || undefined,
      image_url: data.image_url,
      created_at: data.created_at,
    };
  },

  async deleteGalleryItem(id: string): Promise<void> {
    const { error } = await supabase
      .from('gallery_items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting gallery item:', error);
      throw error;
    }
  },
};

