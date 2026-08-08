import { supabase } from '../../lib/supabase';
import { isTableNotProvisioned } from './optionalTable';
import { GalleryItem } from '../../types';

export const galleryService = {
  async fetchGalleryItems(): Promise<GalleryItem[]> {
    const { data, error } = await supabase
      .from('gallery_items')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      // A table that was never provisioned is a dormant feature, not a
      // failure. Without this every page load threw and logged an error.
      if (isTableNotProvisioned(error)) return [];
      console.error('Error fetching gallery items:', error);
      throw error;
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
