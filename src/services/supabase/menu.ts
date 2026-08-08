import { supabase } from '../../lib/supabase';
import { MenuItem } from '../../types';

export const menuService = {
  async fetchMenuItems(): Promise<MenuItem[]> {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching menu items:', error);
      throw error;
    }

    return (data || []).map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description || '',
      price: Number(item.price),
      category: item.category,
      image_url: item.image_url,
      is_veg: item.is_veg,
      is_available: item.is_available,
      is_todays_special: item.is_todays_special,
      display_order: item.display_order,
      created_at: item.created_at,
    }));
  },

  async createMenuItem(item: Omit<MenuItem, 'id'>): Promise<MenuItem> {
    const { data, error } = await supabase
      .from('menu_items')
      .insert([
        {
          name: item.name,
          description: item.description,
          price: item.price,
          category: item.category,
          image_url: item.image_url,
          is_veg: item.is_veg,
          is_available: item.is_available,
          is_todays_special: item.is_todays_special,
          display_order: item.display_order || 0,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating menu item:', error);
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      description: data.description || '',
      price: Number(data.price),
      category: data.category,
      image_url: data.image_url,
      is_veg: data.is_veg,
      is_available: data.is_available,
      is_todays_special: data.is_todays_special,
      display_order: data.display_order,
      created_at: data.created_at,
    };
  },

  async updateMenuItem(id: string, updates: Partial<MenuItem>): Promise<MenuItem> {
    const payload: Record<string, any> = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.price !== undefined) payload.price = updates.price;
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.image_url !== undefined) payload.image_url = updates.image_url;
    if (updates.is_veg !== undefined) payload.is_veg = updates.is_veg;
    if (updates.is_available !== undefined) payload.is_available = updates.is_available;
    if (updates.is_todays_special !== undefined) payload.is_todays_special = updates.is_todays_special;
    if (updates.display_order !== undefined) payload.display_order = updates.display_order;

    const { data, error } = await supabase
      .from('menu_items')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating menu item:', error);
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      description: data.description || '',
      price: Number(data.price),
      category: data.category,
      image_url: data.image_url,
      is_veg: data.is_veg,
      is_available: data.is_available,
      is_todays_special: data.is_todays_special,
      display_order: data.display_order,
      created_at: data.created_at,
    };
  },

  /**
   * Retires a dish by making it unavailable.
   *
   * The production schema has no `is_deleted` column, and the row is
   * deliberately NOT deleted: past orders reference these dishes, so removing
   * one would rewrite history. Setting `is_available = false` takes it off the
   * menu while leaving every record intact.
   */
  async deleteMenuItem(id: string): Promise<void> {
    const { error } = await supabase
      .from('menu_items')
      .update({ is_available: false })
      .eq('id', id);

    if (error) {
      console.error('Error retiring menu item:', error);
      throw error;
    }
  },
};
