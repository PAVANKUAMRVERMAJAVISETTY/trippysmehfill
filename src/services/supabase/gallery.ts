import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { isTableNotProvisioned } from './optionalTable';
import { GalleryItem } from '../../types';

export const galleryService = {
  async fetchGalleryItems(): Promise<GalleryItem[]> {
    let { data, error } = await supabase
      .from('gallery_items')
      .select('id,title,caption,image_url,display_order,created_at')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error && !isTableNotProvisioned(error, 'gallery_items')) {
      const fallback = await supabase
        .from('gallery_items')
        .select('id,title,caption,image_url,display_order,created_at');
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

  async addGalleryItem(item: Omit<GalleryItem, 'id' | 'created_at'> & { display_order?: number }): Promise<GalleryItem> {
    const { data, error } = await supabase
      .from('gallery_items')
      .insert([
        {
          title: item.title,
          caption: item.caption || null,
          image_url: item.image_url,
          display_order: item.display_order ?? 0,
        },
      ])
      .select('id,title,caption,image_url,display_order,created_at')
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

  async updateGalleryItem(id: string, updates: Partial<GalleryItem> & { display_order?: number }): Promise<GalleryItem> {
    const payload: Record<string, any> = {};
    if (updates.title !== undefined && updates.title !== null) payload.title = updates.title.trim();
    if (updates.caption !== undefined) payload.caption = updates.caption ? updates.caption.trim() : null;
    if (updates.image_url !== undefined && updates.image_url !== '') payload.image_url = updates.image_url;
    if (updates.display_order !== undefined) payload.display_order = updates.display_order;

    console.log('[galleryService] Executing UPDATE on public.gallery_items:', { id, payload });

    let data: any = null;
    let error: any = null;

    // Primary: direct table UPDATE
    const res = await supabase
      .from('gallery_items')
      .update(payload)
      .eq('id', id)
      .select('id,title,caption,image_url,display_order,created_at')
      .maybeSingle();

    data = res.data;
    error = res.error;

    // Fallback: RPC update_gallery_item if RLS policy on anon blocks direct table PATCH
    if ((error || !data) && isSupabaseConfigured) {
      console.warn('[galleryService] Direct update yielded no row or error, attempting RPC update_gallery_item...');
      const rpcRes = await supabase.rpc('update_gallery_item', {
        p_id: id,
        p_title: payload.title,
        p_caption: payload.caption,
        p_image_url: payload.image_url,
        p_display_order: payload.display_order
      });

      if (!rpcRes.error && rpcRes.data) {
        data = rpcRes.data;
        error = null;
      }
    }

    if (error) {
      console.error('[galleryService] Supabase UPDATE error for gallery item:', error);
      throw error;
    }

    if (!data) {
      const msg = `No row returned after UPDATE on gallery_items with id: ${id}`;
      console.error('[galleryService]', msg);
      throw new Error(msg);
    }

    console.log('[galleryService] UPDATE successful, returned database row:', data);

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

