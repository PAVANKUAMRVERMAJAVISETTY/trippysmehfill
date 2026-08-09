import { supabase } from '../../lib/supabase';
import { RestaurantSettings } from '../../types';

export const defaultRestaurantSettings: RestaurantSettings = {
  restaurant_name: "Trippy's Mehfill",
  brand_title: "CLOUD KITCHEN ERP",
  address: 'GLS Arawali Homes, Damdama Lake Rd, Sohna Rural, Haryana 122103',
  contact_phone: '8569955929',
  whatsapp_numbers: '8569955929',
  logo_url: null,
  created_by: 'Naga Pavan Kumar',
};

export const restaurantSettingsService = {
  async fetchSettings(): Promise<RestaurantSettings> {
    try {
      const { data, error } = await supabase
        .from('restaurant_settings')
        .select('id, restaurant_name, brand_title, address, contact_phone, whatsapp_numbers, logo_url, created_by, updated_at')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn('Could not read restaurant_settings from Supabase, using defaults:', error.message);
        return { ...defaultRestaurantSettings };
      }

      if (!data) {
        return { ...defaultRestaurantSettings };
      }

      return {
        id: data.id,
        restaurant_name: data.restaurant_name || defaultRestaurantSettings.restaurant_name,
        brand_title: data.brand_title || defaultRestaurantSettings.brand_title,
        address: data.address || defaultRestaurantSettings.address,
        contact_phone: data.contact_phone || defaultRestaurantSettings.contact_phone,
        whatsapp_numbers: data.whatsapp_numbers || defaultRestaurantSettings.whatsapp_numbers,
        logo_url: data.logo_url ?? null,
        created_by: data.created_by || defaultRestaurantSettings.created_by,
        updated_at: data.updated_at,
      };
    } catch (err) {
      console.warn('Error in fetchSettings, using default restaurant settings:', err);
      return { ...defaultRestaurantSettings };
    }
  },

  async updateSettings(updates: Partial<RestaurantSettings>): Promise<RestaurantSettings> {
    // 1. Fetch current settings to merge updates
    const current = await this.fetchSettings();

    // 2. Identify the existing row ID from updates, current, or directly querying the database
    let existingId: string | undefined = updates.id || current.id;

    if (!existingId) {
      const { data: existingRow, error: fetchErr } = await supabase
        .from('restaurant_settings')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (fetchErr) {
        console.warn('Warning fetching existing restaurant_settings row:', fetchErr.message);
      }

      if (existingRow?.id) {
        existingId = existingRow.id;
      }
    }

    const merged: RestaurantSettings = {
      ...current,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const payload: Record<string, any> = {
      restaurant_name: merged.restaurant_name,
      brand_title: merged.brand_title,
      address: merged.address,
      contact_phone: merged.contact_phone,
      whatsapp_numbers: merged.whatsapp_numbers,
      logo_url: merged.logo_url !== undefined ? merged.logo_url : null,
      created_by: merged.created_by || 'Naga Pavan Kumar',
      updated_at: merged.updated_at,
    };

    if (existingId) {
      const { data, error } = await supabase
        .from('restaurant_settings')
        .update(payload)
        .eq('id', existingId)
        .select('id, restaurant_name, brand_title, address, contact_phone, whatsapp_numbers, logo_url, created_by, updated_at')
        .single();

      if (error) {
        console.error('Error updating restaurant_settings:', error);
        throw new Error(`Database UPDATE failed: ${error.message || JSON.stringify(error)}`);
      }

      if (!data) {
        throw new Error('Database UPDATE failed: No data returned from restaurant_settings update.');
      }

      return {
        id: data.id,
        restaurant_name: data.restaurant_name,
        brand_title: data.brand_title,
        address: data.address,
        contact_phone: data.contact_phone,
        whatsapp_numbers: data.whatsapp_numbers,
        logo_url: data.logo_url ?? null,
        created_by: data.created_by,
        updated_at: data.updated_at,
      };
    } else {
      const { data, error } = await supabase
        .from('restaurant_settings')
        .insert([payload])
        .select('id, restaurant_name, brand_title, address, contact_phone, whatsapp_numbers, logo_url, created_by, updated_at')
        .single();

      if (error) {
        console.error('Error inserting restaurant_settings:', error);
        throw new Error(`Database INSERT failed: ${error.message || JSON.stringify(error)}`);
      }

      if (!data) {
        throw new Error('Database INSERT failed: No data returned from restaurant_settings insert.');
      }

      return {
        id: data.id,
        restaurant_name: data.restaurant_name,
        brand_title: data.brand_title,
        address: data.address,
        contact_phone: data.contact_phone,
        whatsapp_numbers: data.whatsapp_numbers,
        logo_url: data.logo_url ?? null,
        created_by: data.created_by,
        updated_at: data.updated_at,
      };
    }
  },
};
