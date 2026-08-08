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

  // Sync formData when global settings updates (e.g. via Supabase Realtime)
  React.useEffect(() => {
    setFormData({ ...settings });
  }, [settings]);

  // New banner states
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerPosterUrl, setBannerPosterUrl] = useState('');
  const [bannerLink, setBannerLink] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings(formData);

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

  const inputStyle = "w-full p-2.5 bg-[#F8F6F0] border border-[#9F988A] rounded-xl text-[#1F2933] font-bold placeholder-[#6B6B63] outline-none focus:border-[#D95F0A] shadow-sm transition";

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-7xl mx-auto space-y-8 text-[#1F2933]" style={{ backgroundColor: '#F4F0E8' }}>
      
      <div>
        <h1 className="text-2xl font-black text-[#252525] font-serif">System settings</h1>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border border-[#DDD6C8] shadow-sm space-y-6">
        
        {/* Restaurant Status ON/OFF */}
        <div className="flex items-center justify-between p-4 bg-[#FFF0CC] rounded-2xl border border-[#E8C66A]">
          <div>
            <h3 className="font-extrabold text-[#8A5A00] text-sm">Restaurant status</h3>
            <p className="text-xs text-[#5F6368]">
              {formData.is_open ? 'Open — customers can place orders.' : 'Closed — ordering is disabled platform-wide.'}
            </p>
          </div>

          <div className="flex items-center bg-[#F7F4EC] p-1 rounded-xl border border-[#DDD6C8]">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, is_open: true })}
              className={`px-4 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                formData.is_open ? 'bg-[#D95F0A] text-white shadow-sm border border-[#B94D00]' : 'text-[#5F6368] hover:text-[#1F2933]'
              }`}
            >
              ON Open
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, is_open: false })}
              className={`px-4 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                !formData.is_open ? 'bg-[#C0392B] text-white shadow-sm border border-[#922B21]' : 'text-[#5F6368] hover:text-[#1F2933]'
              }`}
            >
              OFF Closed
            </button>
          </div>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="font-bold text-[#1F2933] block mb-1">Opening time</label>
            <input
              type="text"
              value={formData.opening_time}
              onChange={(e) => setFormData({ ...formData, opening_time: e.target.value })}
              placeholder="e.g. 09:00 AM"
              className={inputStyle}
            />
          </div>

          <div>
            <label className="font-bold text-[#1F2933] block mb-1">Closing time</label>
            <input
              type="text"
              value={formData.closing_time}
              onChange={(e) => setFormData({ ...formData, closing_time: e.target.value })}
              placeholder="e.g. 10:00 PM"
              className={inputStyle}
            />
          </div>

          <div>
            <label className="font-bold text-[#1F2933] block mb-1">Minimum order value (₹)</label>
            <input
              type="number"
              value={formData.min_order_value}
              onChange={(e) => setFormData({ ...formData, min_order_value: Number(e.target.value) })}
              placeholder="Minimum Order ₹"
              className={inputStyle}
            />
          </div>

          <div>
            <label className="font-bold text-[#1F2933] block mb-1">Free delivery above (₹)</label>
            <input
              type="number"
              value={formData.free_delivery_above}
              onChange={(e) => setFormData({ ...formData, free_delivery_above: Number(e.target.value) })}
              placeholder="Free Delivery Threshold ₹"
              className={inputStyle}
            />
          </div>

          <div>
            <label className="font-bold text-[#1F2933] block mb-1">Delivery charge (₹)</label>
            <input
              type="number"
              value={formData.delivery_charge}
              onChange={(e) => setFormData({ ...formData, delivery_charge: Number(e.target.value) })}
              placeholder="Delivery Fee ₹"
              className={inputStyle}
            />
          </div>

          <div>
            <label className="font-bold text-[#1F2933] block mb-1">Tax (%)</label>
            <input
              type="number"
              value={formData.tax_percent}
              onChange={(e) => setFormData({ ...formData, tax_percent: Number(e.target.value) })}
              placeholder="Tax %"
              className={inputStyle}
            />
          </div>

          <div>
            <label className="font-bold text-[#1F2933] block mb-1">Estimated delivery (minutes)</label>
            <input
              type="number"
              value={formData.estimated_delivery_mins}
              onChange={(e) => setFormData({ ...formData, estimated_delivery_mins: Number(e.target.value) })}
              placeholder="Estimated Mins"
              className={inputStyle}
            />
          </div>

          <div>
            <label className="font-bold text-[#1F2933] block mb-1">Restaurant UPI ID</label>
            <input
              type="text"
              value={formData.restaurant_upi_id}
              onChange={(e) => setFormData({ ...formData, restaurant_upi_id: e.target.value })}
              placeholder="e.g. 9876543210@ybl"
              className={`${inputStyle} font-mono`}
            />
          </div>

          <div>
            <label className="font-bold text-[#1F2933] block mb-1">WhatsApp number</label>
            <input
              type="text"
              value={formData.whatsapp_number}
              onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
              placeholder="e.g. +91 98765 43210"
              className={`${inputStyle} font-mono`}
            />
          </div>
        </div>

        <div>
          <label className="font-bold text-[#1F2933] block mb-1 text-xs">Closed banner message</label>
          <input
            type="text"
            value={formData.closed_banner_message}
            onChange={(e) => setFormData({ ...formData, closed_banner_message: e.target.value })}
            placeholder="e.g. We are currently not accepting orders. Please visit us again during business hours."
            className={inputStyle}
          />
        </div>

        <button
          type="submit"
          className="px-6 py-3 bg-[#D95F0A] hover:bg-[#B94D00] text-white font-bold rounded-xl shadow-sm border border-[#B94D00] transition flex items-center gap-2 text-xs cursor-pointer"
        >
          {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          <span>{isSaved ? 'Settings saved!' : 'Save settings'}</span>
        </button>

      </form>

      {/* Promotional Banners Publisher */}
      <div className="bg-white p-6 rounded-2xl border border-[#DDD6C8] shadow-sm space-y-4">
        <div>
          <h3 className="font-extrabold text-[#1F2933] text-sm">Promotional banners</h3>
          <p className="text-xs text-[#5F6368]">Active banners pop up once per day for each customer.</p>
        </div>

        <form onSubmit={handlePublishBanner} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <input
            type="text"
            placeholder="Title"
            value={bannerTitle}
            onChange={(e) => setBannerTitle(e.target.value)}
            required
            className="p-2.5 bg-[#F8F6F0] border border-[#9F988A] rounded-xl outline-none text-[#1F2933] placeholder-[#6B6B63] focus:border-[#D95F0A]"
          />
          <input
            type="text"
            placeholder="Poster / GIF URL"
            value={bannerPosterUrl}
            onChange={(e) => setBannerPosterUrl(e.target.value)}
            required
            className="p-2.5 bg-[#F8F6F0] border border-[#9F988A] rounded-xl outline-none text-[#1F2933] placeholder-[#6B6B63] focus:border-[#D95F0A]"
          />
          <input
            type="text"
            placeholder="Link (optional)"
            value={bannerLink}
            onChange={(e) => setBannerLink(e.target.value)}
            className="p-2.5 bg-[#F8F6F0] border border-[#9F988A] rounded-xl outline-none text-[#1F2933] placeholder-[#6B6B63] focus:border-[#D95F0A]"
          />
          <button
            type="submit"
            className="py-2.5 bg-[#D95F0A] hover:bg-[#B94D00] text-white font-bold rounded-xl shadow-sm border border-[#B94D00] transition cursor-pointer"
          >
            Publish banner
          </button>
        </form>

        {banners.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[#DDD6C8]">
            {banners.map((b) => (
              <div key={b.id} className="p-3 bg-[#F7F4EC] rounded-xl flex items-center gap-3 border border-[#DDD6C8]">
                <img src={b.poster_url} alt={b.title} className="w-16 h-12 rounded-lg object-cover" />
                <div>
                  <h4 className="font-bold text-[#1F2933] text-xs">{b.title}</h4>
                  <p className="text-[10px] text-[#146C43] font-bold">Active Banner</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
