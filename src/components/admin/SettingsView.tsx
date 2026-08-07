import React, { useState } from 'react';
import { KitchenSettings, PromotionalBanner } from '../../types';
import { useCart } from '../../context/CartContext';
import { Save, Image as ImageIcon, Plus, Check } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

interface SettingsViewProps {
  banners: PromotionalBanner[];
  onAddBanner: (b: PromotionalBanner) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ banners, onAddBanner }) => {
  const { settings, updateSettings } = useCart();
  const [formData, setFormData] = useState<KitchenSettings>({ ...settings });
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  // New banner states
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerPosterUrl, setBannerPosterUrl] = useState('');
  const [bannerLink, setBannerLink] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError('');
    updateSettings(formData);

    if (isSupabaseConfigured) {
      // Database failures come back in `error` rather than as thrown
      // exceptions, so check it before showing the "saved" confirmation.
      const { error } = await supabase.from('kitchen_settings').upsert([formData]);
      if (error) {
        console.error('Failed to update kitchen settings in Supabase', error);
        setSaveError(`Could not save settings: ${error.message}`);
        return;
      }
    }

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handlePublishBanner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerTitle || !bannerPosterUrl) return;

    onAddBanner({
      id: 'banner-' + Date.now(),
      title: bannerTitle,
      poster_url: bannerPosterUrl,
      link_url: bannerLink,
      is_active: true
    });

    setBannerTitle('');
    setBannerPosterUrl('');
    setBannerLink('');
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-8">
      
      <div>
        <h1 className="text-2xl font-black text-gray-900 font-serif">System settings</h1>
      </div>

      {/* Main Settings Form matching video frame 2:42 */}
      <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
        
        {/* Restaurant Status ON/OFF */}
        <div className="flex items-center justify-between p-4 bg-orange-50/60 rounded-2xl border border-orange-200">
          <div>
            <h3 className="font-extrabold text-gray-900 text-sm">Restaurant status</h3>
            <p className="text-xs text-gray-500">
              {formData.is_open ? 'Open — customers can place orders.' : 'Closed — ordering is disabled platform-wide.'}
            </p>
          </div>

          <div className="flex items-center bg-gray-200 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, is_open: true })}
              className={`px-4 py-1.5 rounded-lg text-xs font-black transition ${
                formData.is_open ? 'bg-orange-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ON Open
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, is_open: false })}
              className={`px-4 py-1.5 rounded-lg text-xs font-black transition ${
                !formData.is_open ? 'bg-red-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              OFF Closed
            </button>
          </div>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="font-bold text-gray-700 block mb-1">Opening time</label>
            <input
              type="text"
              value={formData.opening_time}
              onChange={(e) => setFormData({ ...formData, opening_time: e.target.value })}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none"
            />
          </div>

          <div>
            <label className="font-bold text-gray-700 block mb-1">Closing time</label>
            <input
              type="text"
              value={formData.closing_time}
              onChange={(e) => setFormData({ ...formData, closing_time: e.target.value })}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none"
            />
          </div>

          <div>
            <label className="font-bold text-gray-700 block mb-1">Minimum order value (₹)</label>
            <input
              type="number"
              value={formData.min_order_value}
              onChange={(e) => setFormData({ ...formData, min_order_value: Number(e.target.value) })}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none"
            />
          </div>

          <div>
            <label className="font-bold text-gray-700 block mb-1">Free delivery above (₹)</label>
            <input
              type="number"
              value={formData.free_delivery_above}
              onChange={(e) => setFormData({ ...formData, free_delivery_above: Number(e.target.value) })}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none"
            />
          </div>

          <div>
            <label className="font-bold text-gray-700 block mb-1">Delivery charge (₹)</label>
            <input
              type="number"
              value={formData.delivery_charge}
              onChange={(e) => setFormData({ ...formData, delivery_charge: Number(e.target.value) })}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none"
            />
          </div>

          <div>
            <label className="font-bold text-gray-700 block mb-1">Tax (%)</label>
            <input
              type="number"
              value={formData.tax_percent}
              onChange={(e) => setFormData({ ...formData, tax_percent: Number(e.target.value) })}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none"
            />
          </div>

          <div>
            <label className="font-bold text-gray-700 block mb-1">Estimated delivery (minutes)</label>
            <input
              type="number"
              value={formData.estimated_delivery_mins}
              onChange={(e) => setFormData({ ...formData, estimated_delivery_mins: Number(e.target.value) })}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none"
            />
          </div>

          <div>
            <label className="font-bold text-gray-700 block mb-1">Restaurant UPI ID</label>
            <input
              type="text"
              value={formData.restaurant_upi_id}
              onChange={(e) => setFormData({ ...formData, restaurant_upi_id: e.target.value })}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none font-mono"
            />
          </div>

          <div>
            <label className="font-bold text-gray-700 block mb-1">WhatsApp number</label>
            <input
              type="text"
              value={formData.whatsapp_number}
              onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none font-mono"
            />
          </div>
        </div>

        <div>
          <label className="font-bold text-gray-700 block mb-1 text-xs">Closed banner message</label>
          <input
            type="text"
            value={formData.closed_banner_message}
            onChange={(e) => setFormData({ ...formData, closed_banner_message: e.target.value })}
            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-xs"
          />
        </div>

        <button
          type="submit"
          className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-md transition flex items-center gap-2 text-xs"
        >
          {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          <span>{isSaved ? 'Settings saved!' : 'Save settings'}</span>
        </button>

        {saveError && (
          <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
            {saveError}
          </p>
        )}

      </form>

      {/* Promotional Banners Publisher matching video frame 2:48 */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div>
          <h3 className="font-extrabold text-gray-900 text-sm">Promotional banners</h3>
          <p className="text-xs text-gray-500">Active banners pop up once per day for each customer.</p>
        </div>

        <form onSubmit={handlePublishBanner} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <input
            type="text"
            placeholder="Title"
            value={bannerTitle}
            onChange={(e) => setBannerTitle(e.target.value)}
            required
            className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none"
          />
          <input
            type="text"
            placeholder="Poster / GIF URL"
            value={bannerPosterUrl}
            onChange={(e) => setBannerPosterUrl(e.target.value)}
            required
            className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none"
          />
          <input
            type="text"
            placeholder="Link (optional)"
            value={bannerLink}
            onChange={(e) => setBannerLink(e.target.value)}
            className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none"
          />
          <button
            type="submit"
            className="py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-md transition"
          >
            Publish banner
          </button>
        </form>

        {banners.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-gray-100">
            {banners.map((b) => (
              <div key={b.id} className="p-3 bg-gray-50 rounded-xl flex items-center gap-3 border border-gray-200">
                <img src={b.poster_url} alt={b.title} className="w-16 h-12 rounded-lg object-cover" />
                <div>
                  <h4 className="font-bold text-gray-900 text-xs">{b.title}</h4>
                  <p className="text-[10px] text-emerald-600 font-bold">Active Banner</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
