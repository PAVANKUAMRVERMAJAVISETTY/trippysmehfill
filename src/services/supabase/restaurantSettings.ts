import { supabase } from '../../lib/supabase';
import { RestaurantSettings } from '../../types';

export const defaultRestaurantSettings: RestaurantSettings = {
  restaurant_name: "Trippy's Mehfill",
  address: 'Sohna GLS Homes (Near GD Goenka University, GDGU), Sohna, Haryana',
  primary_contact: '6301196547',
  whatsapp_numbers: '6301196547 / 9030196547',
  logo_url: null,
};

export const restaurantSettingsService = {
  async fetchSettings(): Promise<RestaurantSettings> {
    try {
      const { data, error } = await supabase
        .from('restaurant_settings')
        .select('*')
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
        restaurant_name: data.restaurant_name || data.name || defaultRestaurantSettings.restaurant_name,
        address: data.address || defaultRestaurantSettings.address,
        primary_contact: data.primary_contact || data.phone || defaultRestaurantSettings.primary_contact,
        whatsapp_numbers: data.whatsapp_numbers || data.whatsapp || defaultRestaurantSettings.whatsapp_numbers,
        logo_url: data.logo_url || data.logo || null,
        updated_at: data.updated_at,
      };
    } catch (err) {
      console.warn('Error in fetchSettings, using default restaurant settings:', err);
      return { ...defaultRestaurantSettings };
    }
  },

  async updateSettings(updates: Partial<RestaurantSettings>): Promise<RestaurantSettings> {
    const current = await this.fetchSettings();
    const merged: RestaurantSettings = {
      ...current,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const payload: Record<string, any> = {
      restaurant_name: merged.restaurant_name,
      address: merged.address,
      primary_contact: merged.primary_contact,
      whatsapp_numbers: merged.whatsapp_numbers,
      logo_url: merged.logo_url ?? null,
      updated_at: merged.updated_at,
    };

    if (current.id) {
      const { data, error } = await supabase
        .from('restaurant_settings')
        .update(payload)
        .eq('id', current.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating restaurant_settings:', error);
        throw error;
      }
      return { ...merged, id: data.id };
    } else {
      const { data, error } = await supabase
        .from('restaurant_settings')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error('Error inserting restaurant_settings:', error);
        throw error;
      }
      return { ...merged, id: data.id };
    }
  },
};
