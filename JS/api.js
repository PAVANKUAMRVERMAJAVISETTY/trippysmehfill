import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// 1. Initialize Supabase Client Connection
// Use optional chaining when reading import.meta.env so the module can run in plain browsers
// (where import.meta.env may be undefined) and during static file serving.
const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL) || 'https://iptjevfvuwrdbqzgrzxg.supabase.co';
const supabaseKey = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) || 'sb_publishable_mcYrRu-GOqphMJjB2LlDuA_AABdVZ0p';

export const supabase = createClient(supabaseUrl, supabaseKey);

// 2. Central API Wrapper Object
export const API = {
  // --- CUSTOMER & PROFILES API ---
  profiles: {
    async getPending() {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'customer')
        .eq('is_approved', false);
      if (error) throw error;
      return data || [];
    },
    async getApproved() {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'customer')
        .eq('is_approved', true);
      if (error) throw error;
      return data || [];
    },
    async approve(id) {
      const { error } = await supabase.from('profiles').update({ is_approved: true }).eq('id', id);
      if (error) throw error;
    },
    async delete(id) {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;
    }
  },

  // --- ORDERS API ---
  orders: {
    async getAll() {
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    async create(orderData) {
      const { data, error } = await supabase.from('orders').insert([orderData]);
      if (error) throw error;
      return data;
    },
    async updateStatus(id, status) {
      const { error } = await supabase.from('orders').update({ status }).eq('id', id);
      if (error) throw error;
    },
    async delete(id) {
      const { error } = await supabase.from('orders').delete().eq('id', id);
      if (error) throw error;
    }
  },

  // --- MENU ITEMS & IMAGE BUCKET API ---
  menu: {
    async getAll() {
      const { data, error } = await supabase.from('menu_items').select('*');
      if (error) throw error;
      return data || [];
    },
    async uploadImage(file) {
      const fileName = `${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from('menu-bucket').upload(fileName, file);
      if (error) throw error;

      const { data } = supabase.storage.from('menu-bucket').getPublicUrl(fileName);
      return data.publicUrl;
    },
    async save(dishData) {
      const { data, error } = await supabase.from('menu_items').insert([dishData]);
      if (error) throw error;
      return data;
    },
    async delete(id) {
      const { error } = await supabase.from('menu_items').delete().eq('id', id);
      if (error) throw error;
    }
  },

  // --- GALLERY & EVENT PHOTOS API ---
  gallery: {
    async getAll() {
      const { data, error } = await supabase.from('gallery_images').select('*');
      if (error) throw error;
      return data || [];
    },
    async uploadPhoto(file, title, sectionType) {
      const fileName = `${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('gallery-bucket').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('gallery-bucket').getPublicUrl(fileName);
      const imageUrl = data.publicUrl;

      const { error: dbError } = await supabase.from('gallery_images').insert([{
        title,
        image_url: imageUrl,
        section_type: sectionType
      }]);
      if (dbError) throw dbError;
    }
  }
};
