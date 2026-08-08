import { supabase } from '../../lib/supabase';

export const storageService = {
  async uploadAsset(file: File, folder: string = 'menu'): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('restaurant-assets')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading storage asset:', uploadError);
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('restaurant-assets')
      .getPublicUrl(fileName);

    return data.publicUrl;
  },
};
