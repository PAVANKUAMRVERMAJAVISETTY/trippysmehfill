import React, { createContext, useContext, useState, useEffect } from 'react';
import { RestaurantSettings } from '../types';
import { restaurantSettingsService, defaultRestaurantSettings } from '../services/supabase/restaurantSettings';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface RestaurantSettingsContextType {
  restaurantSettings: RestaurantSettings;
  updateRestaurantSettings: (updates: Partial<RestaurantSettings>) => Promise<void>;
  refreshRestaurantSettings: () => Promise<void>;
}

const RestaurantSettingsContext = createContext<RestaurantSettingsContextType | undefined>(undefined);

export const RestaurantSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [restaurantSettings, setRestaurantSettings] = useState<RestaurantSettings>(defaultRestaurantSettings);

  const refreshRestaurantSettings = async () => {
    try {
      const data = await restaurantSettingsService.fetchSettings();
      setRestaurantSettings(data);
    } catch (err) {
      console.error('Failed to load restaurant identity settings:', err);
    }
  };

  useEffect(() => {
    refreshRestaurantSettings();
  }, []);

  // Realtime subscription to restaurant_settings table
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel('public:restaurant_settings:realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'restaurant_settings' },
        () => {
          refreshRestaurantSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const updateRestaurantSettings = async (updates: Partial<RestaurantSettings>) => {
    try {
      const saved = await restaurantSettingsService.updateSettings(updates);
      setRestaurantSettings(saved);
      await refreshRestaurantSettings();
    } catch (err) {
      console.error('Failed to update restaurant identity settings:', err);
      throw err;
    }
  };

  return (
    <RestaurantSettingsContext.Provider
      value={{
        restaurantSettings,
        updateRestaurantSettings,
        refreshRestaurantSettings,
      }}
    >
      {children}
    </RestaurantSettingsContext.Provider>
  );
};

export const useRestaurantSettings = () => {
  const context = useContext(RestaurantSettingsContext);
  if (!context) {
    // Graceful fallback if context is unmounted in a standalone test component
    return {
      restaurantSettings: defaultRestaurantSettings,
      updateRestaurantSettings: async () => {},
      refreshRestaurantSettings: async () => {},
    };
  }
  return context;
};
