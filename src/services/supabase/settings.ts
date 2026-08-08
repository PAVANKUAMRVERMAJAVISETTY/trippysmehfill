import { supabase } from '../../lib/supabase';
import { KitchenSettings } from '../../types';

export const settingsService = {
  async fetchKitchenSettings(): Promise<KitchenSettings> {
    const { data, error } = await supabase
      .from('kitchen_settings')
      .select('*')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching kitchen settings:', error);
      throw error;
    }

    if (!data) {
      return {
        kitchen_name: "Trippy's Mehfill",
        is_open: true,
        opening_time: "09:00 AM",
        closing_time: "10:00 PM",
        min_order_value: 80,
        free_delivery_above: 200,
        delivery_charge: 30,
        tax_percent: 0,
        estimated_delivery_mins: 30,
          // Deliberately EMPTY. This fallback is used when the settings row
          // cannot be read, and a hardcoded VPA here would silently route real
          // customer payments to whatever account was last committed -- which
          // was 7671018757@ybl while the live restaurant uses 7671018717-2@ybl.
          // A missing UPI ID disables UPI at checkout; it must never guess.
          restaurant_upi_id: "",
        whatsapp_number: "8569955029",
        closed_banner_message: "RESTAURANT IS CURRENTLY CLOSED (Opening Hours: 9:00 AM to 10:00 PM) - you can still browse the menu.",
        lat: 17.4483,
        lng: 78.3915,
        max_cod_radius_km: 15,
      };
    }

    return {
      id: data.id,
      kitchen_name: data.kitchen_name,
      is_open: data.is_open,
      opening_time: data.opening_time,
      closing_time: data.closing_time,
      min_order_value: Number(data.min_order_value),
      free_delivery_above: Number(data.free_delivery_above),
      delivery_charge: Number(data.delivery_charge),
      tax_percent: Number(data.tax_percent),
      estimated_delivery_mins: Number(data.estimated_delivery_mins),
      restaurant_upi_id: data.restaurant_upi_id,
      whatsapp_number: data.whatsapp_number,
      closed_banner_message: data.closed_banner_message,
      lat: data.lat ? Number(data.lat) : undefined,
      lng: data.lng ? Number(data.lng) : undefined,
      max_cod_radius_km: data.max_cod_radius_km ? Number(data.max_cod_radius_km) : undefined,
    };
  },

  async updateKitchenSettings(settings: KitchenSettings): Promise<KitchenSettings> {
    const payload = {
      kitchen_name: settings.kitchen_name,
      is_open: settings.is_open,
      opening_time: settings.opening_time,
      closing_time: settings.closing_time,
      min_order_value: settings.min_order_value,
      free_delivery_above: settings.free_delivery_above,
      delivery_charge: settings.delivery_charge,
      tax_percent: settings.tax_percent,
      estimated_delivery_mins: settings.estimated_delivery_mins,
      restaurant_upi_id: settings.restaurant_upi_id,
      whatsapp_number: settings.whatsapp_number,
      closed_banner_message: settings.closed_banner_message,
      lat: settings.lat || 17.4483,
      lng: settings.lng || 78.3915,
      max_cod_radius_km: settings.max_cod_radius_km || 15,
    };

    if (settings.id) {
      const { data, error } = await supabase
        .from('kitchen_settings')
        .update(payload)
        .eq('id', settings.id)
        .select()
        .single();

      if (error) throw error;
      return { ...settings, ...data };
    } else {
      const { data, error } = await supabase
        .from('kitchen_settings')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      return { ...settings, id: data.id };
    }
  },
};
