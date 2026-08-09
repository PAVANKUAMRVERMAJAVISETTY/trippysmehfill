import React, { useState, useEffect } from 'react';
import { Save, Check, Upload, Trash2, Eye, EyeOff, Plus, Image as ImageIcon, Tag, Camera, Building, Phone, MessageSquare, Store } from 'lucide-react';
import { KitchenSettings, PromotionalBanner, HomePromotion, Offer } from '../../types';
import { useCart } from '../../context/CartContext';
import { useRestaurantSettings } from '../../context/RestaurantSettingsContext';
import { storageService } from '../../services/supabase/storage';

interface SettingsViewProps {
  banners: PromotionalBanner[];
  onAddBanner: (b: PromotionalBanner) => void;
  onDeleteBanner?: (id: string) => void;
  onToggleBannerActive?: (id: string) => void;

  homePromotions?: HomePromotion[];
  onAddHomePromotion?: (promo: Omit<HomePromotion, 'id'>) => void;
  onUpdateHomePromotion?: (id: string, updates: Partial<HomePromotion>) => void;
  onDeleteHomePromotion?: (id: string) => void;

  offers?: Offer[];
  onAddOffer?: (offer: Omit<Offer, 'id'>) => void;
  onUpdateOffer?: (id: string, updates: Partial<Offer>) => void;
  onDeleteOffer?: (id: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  banners,
  onAddBanner,
  onDeleteBanner,
  onToggleBannerActive,
  homePromotions = [],
  onAddHomePromotion,
  onUpdateHomePromotion,
  onDeleteHomePromotion,
  offers = [],
  onAddOffer,
  onUpdateOffer,
  onDeleteOffer
}) => {
  const { settings, updateSettings } = useCart();
  const { restaurantSettings, updateRestaurantSettings } = useRestaurantSettings();
  const [formData, setFormData] = useState<KitchenSettings>({ ...settings });
  const [isSaved, setIsSaved] = useState(false);

  // Sync formData when global settings updates (e.g. via Supabase Realtime)
  React.useEffect(() => {
    setFormData({ ...settings });
  }, [settings]);

  // Restaurant Branding States
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoSuccessMessage, setLogoSuccessMessage] = useState<string | null>(null);

  // Restaurant Identity & Address States
  const [restName, setRestName] = useState(restaurantSettings.restaurant_name);
  const [restAddress, setRestAddress] = useState(restaurantSettings.address);
  const [restContact, setRestContact] = useState(restaurantSettings.primary_contact);
  const [restWhatsapp, setRestWhatsapp] = useState(restaurantSettings.whatsapp_numbers);
  const [isRestInfoSaved, setIsRestInfoSaved] = useState(false);

  useEffect(() => {
    setRestName(restaurantSettings.restaurant_name);
    setRestAddress(restaurantSettings.address);
    setRestContact(restaurantSettings.primary_contact);
    setRestWhatsapp(restaurantSettings.whatsapp_numbers);
  }, [restaurantSettings]);

  const handleLogoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPG, PNG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit. Please select a smaller image.');
      return;
    }

    setSelectedLogoFile(file);
    const localUrl = URL.createObjectURL(file);
    setLogoPreviewUrl(localUrl);
  };

  const handleSaveLogo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLogoFile && !logoPreviewUrl) return;

    setIsUploadingLogo(true);
    try {
      let finalUrl = restaurantSettings.logo_url;
      if (selectedLogoFile) {
        finalUrl = await storageService.uploadAsset(selectedLogoFile, 'logo');
      }
      await updateRestaurantSettings({ logo_url: finalUrl });
      setSelectedLogoFile(null);
      setLogoPreviewUrl(null);
      setLogoSuccessMessage('Restaurant logo saved successfully!');
      setTimeout(() => setLogoSuccessMessage(null), 3000);
    } catch (err: any) {
      alert('Logo upload failed: ' + err.message);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!confirm('Are you sure you want to remove the restaurant logo?')) return;
    setIsUploadingLogo(true);
    try {
      await updateRestaurantSettings({ logo_url: null });
      setSelectedLogoFile(null);
      setLogoPreviewUrl(null);
      setLogoSuccessMessage('Logo removed successfully.');
      setTimeout(() => setLogoSuccessMessage(null), 3000);
    } catch (err: any) {
      alert('Failed to remove logo: ' + err.message);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSaveRestInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateRestaurantSettings({
        restaurant_name: restName,
        address: restAddress,
        primary_contact: restContact,
        whatsapp_numbers: restWhatsapp,
      });
      setIsRestInfoSaved(true);
      setTimeout(() => setIsRestInfoSaved(false), 2500);
    } catch (err: any) {
      alert('Failed to save restaurant information: ' + err.message);
    }
  };

  // New banner states
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerPosterUrl, setBannerPosterUrl] = useState('');
  const [bannerLink, setBannerLink] = useState('');
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  // Home promotion states
  const [hpTitle, setHpTitle] = useState('');
  const [hpSubtitle, setHpSubtitle] = useState('');
  const [hpImageUrl, setHpImageUrl] = useState('');
  const [hpButtonText, setHpButtonText] = useState('Order Now');
  const [hpButtonLink, setHpButtonLink] = useState('menu-section');
  const [hpBadge, setHpBadge] = useState('SPECIAL PROMOTION');
  const [isUploadingHp, setIsUploadingHp] = useState(false);

  // Offers states
  const [offTitle, setOffTitle] = useState('');
  const [offDescription, setOffDescription] = useState('');
  const [offCode, setOffCode] = useState('');
  const [offDiscountLabel, setOffDiscountLabel] = useState('20% OFF');
  const [offDiscountType, setOffDiscountType] = useState<'percentage' | 'fixed' | 'free_delivery'>('percentage');
  const [offDiscountValue, setOffDiscountValue] = useState(20);
  const [offMinOrder, setOffMinOrder] = useState(0);

  const handlePublishOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!offTitle || !offCode || !onAddOffer) return;

    onAddOffer({
      title: offTitle,
      description: offDescription,
      code: offCode.trim().toUpperCase(),
      discount_label: offDiscountLabel || 'DISCOUNT',
      discount_type: offDiscountType,
      discount_value: Number(offDiscountValue) || 0,
      min_order_amount: Number(offMinOrder) || 0,
      is_active: true,
      display_order: offers.length
    });

    setOffTitle('');
    setOffDescription('');
    setOffCode('');
    setOffDiscountLabel('20% OFF');
    setOffDiscountType('percentage');
    setOffDiscountValue(20);
    setOffMinOrder(0);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings(formData);

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleBannerFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingBanner(true);
    try {
      const publicUrl = await storageService.uploadAsset(file, 'banners');
      setBannerPosterUrl(publicUrl);
    } catch (err: any) {
      alert('Banner upload failed: ' + err.message);
    } finally {
      setIsUploadingBanner(false);
    }
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

  const handleHpFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingHp(true);
    try {
      const publicUrl = await storageService.uploadAsset(file, 'banners');
      setHpImageUrl(publicUrl);
    } catch (err: any) {
      alert('Promo image upload failed: ' + err.message);
    } finally {
      setIsUploadingHp(false);
    }
  };

  const handlePublishHomePromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hpTitle || !hpImageUrl) return;

    if (onAddHomePromotion) {
      onAddHomePromotion({
        title: hpTitle,
        subtitle: hpSubtitle,
        image_url: hpImageUrl,
        button_text: hpButtonText,
        button_link: hpButtonLink,
        badge: hpBadge,
        is_active: true,
        display_order: homePromotions.length
      });
    }

    setHpTitle('');
    setHpSubtitle('');
    setHpImageUrl('');
    setHpButtonText('Order Now');
    setHpButtonLink('menu-section');
    setHpBadge('SPECIAL PROMOTION');
  };

  const inputStyle = "w-full p-2.5 bg-[#F8F6F0] border border-[#9F988A] rounded-xl text-[#1F2933] font-bold placeholder-[#6B6B63] outline-none focus:border-[#D95F0A] shadow-sm transition";

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-7xl mx-auto space-y-8 text-[#1F2933]" style={{ backgroundColor: '#F4F0E8' }}>
      
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-[#1F2933] font-serif">Kitchen & Operational Settings</h2>
        <p className="text-xs text-[#5F6368]">Configure restaurant identity, branding logo, address, store timing, ordering thresholds, and promotional content.</p>
      </div>

      {/* 1. RESTAURANT BRANDING */}
      <div className="bg-white p-6 rounded-2xl border border-[#DDD6C8] shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#DDD6C8] pb-3">
          <div>
            <h3 className="font-extrabold text-[#1F2933] text-base font-serif flex items-center gap-2">
              <Store className="w-5 h-5 text-[#D95F0A]" />
              <span>RESTAURANT BRANDING</span>
            </h3>
            <p className="text-xs text-[#5F6368]">Upload or change your official logo. Stored safely in Supabase Storage bucket (`restaurant-logo`).</p>
          </div>
          {restaurantSettings.logo_url && (
            <button
              type="button"
              onClick={handleRemoveLogo}
              disabled={isUploadingLogo}
              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl border border-red-200 transition cursor-pointer flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove Logo</span>
            </button>
          )}
        </div>

        {logoSuccessMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{logoSuccessMessage}</span>
          </div>
        )}

        <form onSubmit={handleSaveLogo} className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Current or Preview Logo Visual Box */}
            <div className="w-32 h-32 rounded-2xl border-2 border-dashed border-[#9F988A] bg-[#F8F6F0] flex items-center justify-center overflow-hidden shrink-0 relative group shadow-inner">
              {logoPreviewUrl ? (
                <img src={logoPreviewUrl} alt="New Logo Preview" className="w-full h-full object-contain p-2" />
              ) : restaurantSettings.logo_url ? (
                <img src={restaurantSettings.logo_url} alt="Current Logo" className="w-full h-full object-contain p-2" />
              ) : (
                <div className="text-center p-2">
                  <Camera className="w-8 h-8 text-[#9F988A] mx-auto mb-1" />
                  <span className="text-[10px] font-bold text-[#6B6B63] block">No Logo Uploaded</span>
                </div>
              )}
            </div>

            <div className="space-y-3 flex-1">
              <div>
                <label className="text-xs font-extrabold text-[#1F2933] block mb-1">Select New Logo Image</label>
                <p className="text-[11px] text-[#5F6368] mb-2">Supported formats: JPG, PNG, WEBP. Max size: 5MB. Camera capture supported on mobile devices.</p>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="px-4 py-2.5 bg-[#F8F6F0] hover:bg-[#E8E4D9] text-[#1F2933] font-extrabold text-xs rounded-xl border border-[#9F988A] cursor-pointer transition flex items-center gap-2 shadow-xs">
                    <Upload className="w-4 h-4 text-[#D95F0A]" />
                    <span>{selectedLogoFile ? selectedLogoFile.name : 'Choose File / Take Photo'}</span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/webp, image/svg+xml"
                      capture="environment"
                      onChange={handleLogoFileSelect}
                      className="hidden"
                    />
                  </label>

                  {selectedLogoFile && (
                    <button
                      type="button"
                      onClick={() => { setSelectedLogoFile(null); setLogoPreviewUrl(null); }}
                      className="text-xs text-red-600 font-bold hover:underline cursor-pointer"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>
              </div>

              {(selectedLogoFile || logoPreviewUrl) && (
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isUploadingLogo}
                    className="px-6 py-2.5 bg-[#D95F0A] hover:bg-[#B94D00] text-white font-extrabold text-xs rounded-xl shadow-md border border-[#B94D00] transition flex items-center gap-2 cursor-pointer"
                  >
                    {isUploadingLogo ? (
                      <span>Uploading & Saving...</span>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save Logo Changes</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* 2. CENTRAL RESTAURANT ADDRESS & CONTACT */}
      <div className="bg-white p-6 rounded-2xl border border-[#DDD6C8] shadow-sm space-y-4">
        <div className="border-b border-[#DDD6C8] pb-3">
          <h3 className="font-extrabold text-[#1F2933] text-base font-serif flex items-center gap-2">
            <Building className="w-5 h-5 text-[#D95F0A]" />
            <span>RESTAURANT ADDRESS & CONTACT</span>
          </h3>
          <p className="text-xs text-[#5F6368]">Central source of truth for restaurant branding, address, and customer contact numbers.</p>
        </div>

        {isRestInfoSaved && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Restaurant Information updated successfully across the application!</span>
          </div>
        )}

        <form onSubmit={handleSaveRestInfo} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-[#5F6368] uppercase block mb-1">Restaurant Name</label>
              <input
                type="text"
                value={restName}
                onChange={(e) => setRestName(e.target.value)}
                required
                className={inputStyle}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#5F6368] uppercase block mb-1">Primary Contact Phone</label>
              <input
                type="text"
                value={restContact}
                onChange={(e) => setRestContact(e.target.value)}
                required
                className={inputStyle}
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-[#5F6368] uppercase block mb-1">Full Restaurant Address</label>
            <input
              type="text"
              value={restAddress}
              onChange={(e) => setRestAddress(e.target.value)}
              required
              className={inputStyle}
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-[#5F6368] uppercase block mb-1">WhatsApp Numbers (Display & Links)</label>
            <input
              type="text"
              value={restWhatsapp}
              onChange={(e) => setRestWhatsapp(e.target.value)}
              placeholder="e.g. 6301196547 / 9030196547"
              required
              className={inputStyle}
            />
          </div>

          <button
            type="submit"
            className="px-6 py-2.5 bg-[#D95F0A] hover:bg-[#B94D00] text-white font-extrabold text-xs rounded-xl shadow-md border border-[#B94D00] transition flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Restaurant Information</span>
          </button>
        </form>
      </div>

      <form onSubmit={handleSave} className="space-y-6">

        {/* Operational Status */}
        <div className="bg-white p-6 rounded-2xl border border-[#DDD6C8] shadow-sm space-y-4">
          <h3 className="font-extrabold text-[#1F2933] text-sm border-b border-[#DDD6C8] pb-2">Store Operation & Mode</h3>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-[#1F2933]">
              <input
                type="checkbox"
                checked={formData.is_open}
                onChange={(e) => setFormData({ ...formData, is_open: e.target.checked })}
                className="w-4 h-4 accent-[#D95F0A]"
              />
              <span>Kitchen Currently Open</span>
            </label>
          </div>
          <div>
            <label className="text-[10px] font-bold text-[#5F6368] uppercase">Closed Banner Notice (When closed)</label>
            <input
              type="text"
              value={formData.closed_banner_message || ''}
              onChange={(e) => setFormData({ ...formData, closed_banner_message: e.target.value })}
              className={inputStyle}
            />
          </div>
        </div>

        {/* Order Fees & Thresholds */}
        <div className="bg-white p-6 rounded-2xl border border-[#DDD6C8] shadow-sm space-y-4">
          <h3 className="font-extrabold text-[#1F2933] text-sm border-b border-[#DDD6C8] pb-2">Order Fees & Delivery Rules</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="text-[10px] font-bold text-[#5F6368] uppercase">Min Order Value (₹)</label>
              <input
                type="number"
                value={formData.min_order_value}
                onChange={(e) => setFormData({ ...formData, min_order_value: Number(e.target.value) })}
                className={inputStyle}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#5F6368] uppercase">Delivery Charge (₹)</label>
              <input
                type="number"
                value={formData.delivery_charge}
                onChange={(e) => setFormData({ ...formData, delivery_charge: Number(e.target.value) })}
                className={inputStyle}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#5F6368] uppercase">Free Delivery Above (₹)</label>
              <input
                type="number"
                value={formData.free_delivery_above}
                onChange={(e) => setFormData({ ...formData, free_delivery_above: Number(e.target.value) })}
                className={inputStyle}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#5F6368] uppercase">Est. Delivery Time (Mins)</label>
              <input
                type="number"
                value={formData.estimated_delivery_mins}
                onChange={(e) => setFormData({ ...formData, estimated_delivery_mins: Number(e.target.value) })}
                className={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* Payment & Contact Settings */}
        <div className="bg-white p-6 rounded-2xl border border-[#DDD6C8] shadow-sm space-y-4">
          <h3 className="font-extrabold text-[#1F2933] text-sm border-b border-[#DDD6C8] pb-2">UPI Payment & Contact Details</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-[10px] font-bold text-[#5F6368] uppercase">UPI VPA ID (For QR Code Payments)</label>
              <input
                type="text"
                value={formData.restaurant_upi_id || ''}
                onChange={(e) => setFormData({ ...formData, restaurant_upi_id: e.target.value })}
                placeholder="e.g. 9876543210@paytm"
                className={inputStyle}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#5F6368] uppercase">Support WhatsApp Number</label>
              <input
                type="text"
                value={formData.whatsapp_number || ''}
                onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                placeholder="e.g. +919876543210"
                className={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button
          type="submit"
          className="px-6 py-3 bg-[#D95F0A] hover:bg-[#B94D00] text-white font-extrabold rounded-xl shadow-md border border-[#B94D00] transition flex items-center gap-2 cursor-pointer"
        >
          {isSaved ? <Check className="w-5 h-5 text-white" /> : <Save className="w-5 h-5 text-white" />}
          <span>{isSaved ? 'Settings saved!' : 'Save settings'}</span>
        </button>

      </form>

      {/* Promotional Banners Publisher */}
      <div className="bg-white p-6 rounded-2xl border border-[#DDD6C8] shadow-sm space-y-4">
        <div>
          <h3 className="font-extrabold text-[#1F2933] text-sm">Promotional banners</h3>
          <p className="text-xs text-[#5F6368]">Active banners pop up once per day for each customer.</p>
        </div>

        <form onSubmit={handlePublishBanner} className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs items-end">
          <div className="sm:col-span-3">
            <label className="text-[10px] font-bold text-[#5F6368] uppercase">Banner Title</label>
            <input
              type="text"
              placeholder="Title"
              value={bannerTitle}
              onChange={(e) => setBannerTitle(e.target.value)}
              required
              className="w-full p-2.5 bg-[#F8F6F0] border border-[#9F988A] rounded-xl outline-none text-[#1F2933] placeholder-[#6B6B63] focus:border-[#D95F0A]"
            />
          </div>
          <div className="sm:col-span-4">
            <label className="text-[10px] font-bold text-[#5F6368] uppercase">Poster / GIF Image</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Image URL"
                value={bannerPosterUrl}
                onChange={(e) => setBannerPosterUrl(e.target.value)}
                required
                className="w-full p-2.5 bg-[#F8F6F0] border border-[#9F988A] rounded-xl outline-none text-[#1F2933] placeholder-[#6B6B63] focus:border-[#D95F0A]"
              />
              <label className="px-3 py-2.5 bg-[#F4F0E8] border border-[#9F988A] rounded-xl font-bold cursor-pointer hover:bg-[#E8E0D0] text-[#1F2933] shrink-0 flex items-center gap-1">
                <Upload className="w-3.5 h-3.5" />
                <span>{isUploadingBanner ? '...' : 'Upload'}</span>
                <input type="file" accept="image/*" onChange={handleBannerFileUpload} className="hidden" />
              </label>
            </div>
          </div>
          <div className="sm:col-span-3">
            <label className="text-[10px] font-bold text-[#5F6368] uppercase">Link URL (optional)</label>
            <input
              type="text"
              placeholder="Link URL"
              value={bannerLink}
              onChange={(e) => setBannerLink(e.target.value)}
              className="w-full p-2.5 bg-[#F8F6F0] border border-[#9F988A] rounded-xl outline-none text-[#1F2933] placeholder-[#6B6B63] focus:border-[#D95F0A]"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="w-full py-2.5 bg-[#D95F0A] hover:bg-[#B94D00] text-white font-bold rounded-xl shadow-sm border border-[#B94D00] transition cursor-pointer"
            >
              Publish banner
            </button>
          </div>
        </form>

        {banners.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[#DDD6C8]">
            {banners.map((b) => (
              <div key={b.id} className="p-3 bg-[#F7F4EC] rounded-xl flex items-center justify-between gap-3 border border-[#DDD6C8]">
                <div className="flex items-center gap-3">
                  <img src={b.poster_url} alt={b.title} className="w-16 h-12 rounded-lg object-cover" />
                  <div>
                    <h4 className="font-bold text-[#1F2933] text-xs">{b.title}</h4>
                    <p className={`text-[10px] font-bold ${b.is_active ? 'text-[#146C43]' : 'text-[#6B6B63]'}`}>
                      {b.is_active ? 'Active Banner' : 'Disabled Banner'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {onDeleteBanner && (
                    <button
                      onClick={() => onDeleteBanner(b.id)}
                      className="p-1.5 text-[#B91C1C] hover:bg-red-50 rounded-lg cursor-pointer"
                      title="Delete banner"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* HOME PAGE CONTENT MANAGEMENT SECTION */}
      <div className="bg-white p-6 rounded-2xl border border-[#DDD6C8] shadow-sm space-y-4">
        <div>
          <h3 className="font-extrabold text-[#1F2933] text-base font-serif flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-[#D95F0A]" />
            <span>HOME PAGE CONTENT MANAGEMENT</span>
          </h3>
          <p className="text-xs text-[#5F6368]">Manage interactive food promotional slides & banners displayed on the customer home page hero carousel.</p>
        </div>

        {/* Add Home Promo Form */}
        <form onSubmit={handlePublishHomePromo} className="bg-[#F8F6F0] p-4 rounded-xl border border-[#DDD6C8] space-y-3 text-xs">
          <h4 className="font-bold text-[#1F2933] text-xs">Add New Home Promo / Slide</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold text-[#5F6368] uppercase">Slide Title</label>
              <input
                type="text"
                placeholder="e.g. AUTHENTIC DUM BIRYANI"
                value={hpTitle}
                onChange={(e) => setHpTitle(e.target.value)}
                required
                className="w-full p-2.5 bg-white border border-[#9F988A] rounded-xl outline-none text-[#1F2933]"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#5F6368] uppercase">Subtitle / Description</label>
              <input
                type="text"
                placeholder="e.g. Aromatic basmati rice cooked fresh..."
                value={hpSubtitle}
                onChange={(e) => setHpSubtitle(e.target.value)}
                className="w-full p-2.5 bg-white border border-[#9F988A] rounded-xl outline-none text-[#1F2933]"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#5F6368] uppercase">Badge Tag</label>
              <input
                type="text"
                placeholder="e.g. HYDERABAD SPECIAL"
                value={hpBadge}
                onChange={(e) => setHpBadge(e.target.value)}
                className="w-full p-2.5 bg-white border border-[#9F988A] rounded-xl outline-none text-[#1F2933]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold text-[#5F6368] uppercase">Promo Image / Background</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Image URL"
                  value={hpImageUrl}
                  onChange={(e) => setHpImageUrl(e.target.value)}
                  required
                  className="w-full p-2.5 bg-white border border-[#9F988A] rounded-xl outline-none text-[#1F2933]"
                />
                <label className="px-3 py-2.5 bg-white border border-[#9F988A] rounded-xl font-bold cursor-pointer hover:bg-[#F0E8D8] text-[#1F2933] shrink-0 flex items-center gap-1">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isUploadingHp ? '...' : 'Upload Image'}</span>
                  <input type="file" accept="image/*" onChange={handleHpFileUpload} className="hidden" />
                </label>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-[#5F6368] uppercase">Button Text</label>
                <input
                  type="text"
                  placeholder="Order Now"
                  value={hpButtonText}
                  onChange={(e) => setHpButtonText(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#9F988A] rounded-xl outline-none text-[#1F2933]"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-bold text-[#5F6368] uppercase">Button Link</label>
                <input
                  type="text"
                  placeholder="menu-section"
                  value={hpButtonLink}
                  onChange={(e) => setHpButtonLink(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#9F988A] rounded-xl outline-none text-[#1F2933]"
                />
              </div>
            </div>
          </div>

          {/* Live Preview Thumbnail of Uploaded Image */}
          {hpImageUrl && (
            <div className="p-3.5 bg-white rounded-xl border border-[#DDD6C8] shadow-sm space-y-2">
              <span className="text-[10px] font-black uppercase text-[#5F6368] tracking-wider block">Live Hero Slide Visual Preview</span>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="w-28 h-20 rounded-xl overflow-hidden border border-[#9F988A] shrink-0 bg-[#F7F4EC] relative">
                  <img src={hpImageUrl} alt="Live Slide Preview" className="w-full h-full object-cover object-center" />
                </div>
                <div className="min-w-0 text-xs space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-300 text-amber-800 text-[10px] font-black uppercase">
                      {hpBadge || 'PROMOTION'}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 text-[9px] font-bold">
                      <Check className="w-3 h-3 text-emerald-600" /> Active on Publish
                    </span>
                  </div>
                  <h5 className="font-extrabold text-[#1F2933] text-sm truncate">{hpTitle || 'Slide Title Preview'}</h5>
                  <p className="text-xs text-[#5F6368] line-clamp-1">{hpSubtitle || 'Subtitle description preview...'}</p>
                  <div className="text-[10px] font-bold text-[#D95F0A] pt-0.5">
                    Button: <span className="underline">{hpButtonText || 'Order Now'}</span> (Target: #{hpButtonLink || 'menu-section'})
                  </div>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="px-6 py-2.5 bg-[#D95F0A] hover:bg-[#B94D00] text-white font-bold rounded-xl shadow-sm border border-[#B94D00] transition cursor-pointer flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Publish to Home Page</span>
          </button>
        </form>

        {/* Existing Home Promotions List */}
        {homePromotions.length > 0 && (
          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-[#1F2933] text-xs">Active Home Page Promos ({homePromotions.length})</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {homePromotions.map((hp) => (
                <div key={hp.id} className="p-3 bg-[#F7F4EC] rounded-xl flex items-center justify-between gap-3 border border-[#DDD6C8] hover:border-[#B8862D] transition shadow-xs">
                  <div className="flex items-center gap-3 overflow-hidden min-w-0">
                    <img src={hp.image_url} alt={hp.title} className="w-20 h-16 rounded-xl object-cover object-center border border-[#DDD6C8] shrink-0" />
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9px] font-black uppercase text-[#B8862D] bg-white px-2 py-0.5 rounded-full border border-[#DDD6C8]">{hp.badge}</span>
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${hp.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'}`}>
                          {hp.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                      <h5 className="font-extrabold text-[#1F2933] text-xs truncate">{hp.title}</h5>
                      {hp.subtitle && <p className="text-[10px] text-[#5F6368] truncate">{hp.subtitle}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {onUpdateHomePromotion && (
                      <button
                        onClick={() => onUpdateHomePromotion(hp.id, { is_active: !hp.is_active })}
                        className={`p-2 rounded-xl border transition cursor-pointer ${
                          hp.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                            : 'bg-gray-100 text-gray-500 border-gray-300 hover:bg-gray-200'
                        }`}
                        title={hp.is_active ? 'Disable from Hero Carousel' : 'Enable in Hero Carousel'}
                      >
                        {hp.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    )}
                    {onDeleteHomePromotion && (
                      <button
                        onClick={() => onDeleteHomePromotion(hp.id)}
                        className="p-2 text-[#B91C1C] hover:bg-red-50 rounded-xl border border-red-200 transition cursor-pointer"
                        title="Delete promo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* OFFERS & COUPONS MANAGEMENT SECTION */}
      <div className="bg-white p-6 rounded-2xl border border-[#DDD6C8] shadow-sm space-y-4">
        <div>
          <h3 className="font-extrabold text-[#1F2933] text-base font-serif flex items-center gap-2">
            <Tag className="w-5 h-5 text-[#B8862D]" />
            <span>OFFERS & COUPONS MANAGEMENT</span>
          </h3>
          <p className="text-xs text-[#5F6368]">Configure promotional discount codes displayed dynamically on the customer Home Page latest offers section.</p>
        </div>

        {/* Add Offer Form */}
        <form onSubmit={handlePublishOffer} className="bg-[#F8F6F0] p-4 rounded-xl border border-[#DDD6C8] space-y-3 text-xs">
          <h4 className="font-bold text-[#1F2933] text-xs">Add New Offer / Promo Code</h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold text-[#5F6368] uppercase">Offer Title</label>
              <input
                type="text"
                placeholder="e.g. 20% OFF on First Order"
                value={offTitle}
                onChange={(e) => setOffTitle(e.target.value)}
                required
                className="w-full p-2.5 bg-white border border-[#9F988A] rounded-xl outline-none text-[#1F2933]"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#5F6368] uppercase">Coupon Code</label>
              <input
                type="text"
                placeholder="e.g. WELCOME20"
                value={offCode}
                onChange={(e) => setOffCode(e.target.value)}
                required
                className="w-full p-2.5 bg-white border border-[#9F988A] rounded-xl outline-none text-[#1F2933] font-mono font-bold uppercase"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#5F6368] uppercase">Discount Badge Label</label>
              <input
                type="text"
                placeholder="e.g. 20% OFF or FREE DEL"
                value={offDiscountLabel}
                onChange={(e) => setOffDiscountLabel(e.target.value)}
                required
                className="w-full p-2.5 bg-white border border-[#9F988A] rounded-xl outline-none text-[#1F2933]"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-[#5F6368] uppercase">Description / Terms</label>
            <input
              type="text"
              placeholder="e.g. Sign up now and get 20% off your first order..."
              value={offDescription}
              onChange={(e) => setOffDescription(e.target.value)}
              className="w-full p-2.5 bg-white border border-[#9F988A] rounded-xl outline-none text-[#1F2933]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold text-[#5F6368] uppercase">Discount Type</label>
              <select
                value={offDiscountType}
                onChange={(e: any) => setOffDiscountType(e.target.value)}
                className="w-full p-2.5 bg-white border border-[#9F988A] rounded-xl outline-none text-[#1F2933] font-bold"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₹)</option>
                <option value="free_delivery">Free Delivery</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#5F6368] uppercase">Discount Value</label>
              <input
                type="number"
                placeholder="20"
                value={offDiscountValue}
                onChange={(e) => setOffDiscountValue(Number(e.target.value))}
                className="w-full p-2.5 bg-white border border-[#9F988A] rounded-xl outline-none text-[#1F2933]"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#5F6368] uppercase">Min Order Amount (₹)</label>
              <input
                type="number"
                placeholder="0"
                value={offMinOrder}
                onChange={(e) => setOffMinOrder(Number(e.target.value))}
                className="w-full p-2.5 bg-white border border-[#9F988A] rounded-xl outline-none text-[#1F2933]"
              />
            </div>
          </div>

          {/* Live Preview Card */}
          {offCode && (
            <div className="p-3.5 bg-white rounded-xl border border-[#DDD6C8] shadow-sm space-y-1">
              <span className="text-[10px] font-black uppercase text-[#5F6368] tracking-wider block">Live Offer Card Preview</span>
              <div className="flex items-center justify-between border-b border-[#DDD6C8] pb-2">
                <span className="text-xs font-bold text-[#1F2933]">{offTitle || 'Offer Title Preview'}</span>
                <span className="text-lg font-black text-[#D95F0A]">{offDiscountLabel || 'DISCOUNT'}</span>
              </div>
              <p className="text-xs text-[#5F6368]">{offDescription || 'Terms & description preview...'}</p>
              <div className="flex items-center gap-2 pt-1">
                <span className="bg-[#F7F4EC] text-[#B8862D] px-2.5 py-1 rounded-lg border border-[#DDD6C8] font-mono font-bold text-xs">{offCode.toUpperCase()}</span>
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-300">Active on Publish</span>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="px-6 py-2.5 bg-[#D95F0A] hover:bg-[#B94D00] text-white font-bold rounded-xl shadow-sm border border-[#B94D00] transition cursor-pointer flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Publish Offer Code</span>
          </button>
        </form>

        {/* Existing Offers List */}
        {offers.length > 0 && (
          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-[#1F2933] text-xs">Active Offers ({offers.length})</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {offers.map((off) => (
                <div key={off.id} className="p-3 bg-[#F7F4EC] rounded-xl flex items-center justify-between gap-3 border border-[#DDD6C8] hover:border-[#B8862D] transition shadow-xs">
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-mono font-black text-[#B8862D] bg-white px-2 py-0.5 rounded-full border border-[#DDD6C8]">{off.code}</span>
                      <span className="text-[10px] font-black text-[#D95F0A]">{off.discount_label}</span>
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${off.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'}`}>
                        {off.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    <h5 className="font-extrabold text-[#1F2933] text-xs truncate">{off.title}</h5>
                    {off.description && <p className="text-[10px] text-[#5F6368] truncate">{off.description}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {onUpdateOffer && (
                      <button
                        onClick={() => onUpdateOffer(off.id, { is_active: !off.is_active })}
                        className={`p-2 rounded-xl border transition cursor-pointer ${
                          off.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                            : 'bg-gray-100 text-gray-500 border-gray-300 hover:bg-gray-200'
                        }`}
                        title={off.is_active ? 'Disable offer' : 'Enable offer'}
                      >
                        {off.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    )}
                    {onDeleteOffer && (
                      <button
                        onClick={() => onDeleteOffer(off.id)}
                        className="p-2 text-[#B91C1C] hover:bg-red-50 rounded-xl border border-red-200 transition cursor-pointer"
                        title="Delete offer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
