import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Connects directly to YOUR Supabase instance
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://iptjevfvuwrdbqzgrzxg.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_mcYrRu-GOqphMJjB2LlDuA_AABdVZ0p';

export const supabase = createClient(supabaseUrl, supabaseKey);