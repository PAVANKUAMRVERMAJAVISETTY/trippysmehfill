import { supabase } from '../../lib/supabase';

const BUCKET_MAP: Record<string, string> = {
  logo: 'restaurant-logo',
  menu: 'menu-images',
  banners: 'banner-images',
  banner: 'banner-images',
  gallery: 'gallery-images',
  profile: 'profile-images',
  profiles: 'profile-images',
  hero: 'banner-images',
  chef: 'gallery-images',
  events: 'gallery-images',
  hall: 'gallery-images',
  guesthouse: 'gallery-images',
  website: 'banner-images',
};

export const storageService = {
  async uploadAsset(file: File, category: string = 'menu'): Promise<string> {
    const bucket = BUCKET_MAP[category.toLowerCase()] || 'menu-images';
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error(`Error uploading asset to bucket "${bucket}":`, uploadError);
      throw uploadError;
    }

    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return data.publicUrl;
  },

  /**
   * Safely deletes a file from Supabase storage by parsing its public URL.
   * If the URL doesn't point to a managed bucket or deletion fails, it returns
   * gracefully without throwing or interrupting the database workflow.
   */
  async deleteAssetByUrl(publicUrl: string): Promise<boolean> {
    if (!publicUrl) return false;
    try {
      const match = publicUrl.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
      if (!match) return false;

      const bucket = match[1];
      const filePath = decodeURIComponent(match[2]);

      const { error } = await supabase.storage.from(bucket).remove([filePath]);
      if (error) {
        console.warn(`Storage cleanup notice: could not remove file "${filePath}" from bucket "${bucket}":`, error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Storage cleanup exception:', err);
      return false;
    }
  },
};
