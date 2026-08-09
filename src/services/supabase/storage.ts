import { supabase } from '../../lib/supabase';

const BUCKET_MAP: Record<string, string> = {
  logo: 'restaurant-logo',
  menu: 'menu-images',
  banners: 'banner-images',
  banner: 'banner-images',
  gallery: 'gallery-images',
  profile: 'profile-images',
  profiles: 'profile-images',
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
};
