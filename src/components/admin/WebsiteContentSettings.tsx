import React, { useState } from 'react';
import {
  Building2,
  Phone,
  MessageSquare,
  Mail,
  MapPin,
  Utensils,
  Sparkles,
  PartyPopper,
  Building,
  Hotel,
  Image as ImageIcon,
  Tag,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Globe,
  HelpCircle,
} from 'lucide-react';
import { HomepageSection, RestaurantSettings } from '../../types';
import { CmsImageUploader } from './CmsImageUploader';

interface WebsiteContentSettingsProps {
  restaurantSettings: RestaurantSettings;
  onSaveRestaurantSettings: (settings: Partial<RestaurantSettings>) => Promise<void>;
  homepageSections: Record<string, HomepageSection>;
  onSaveHomepageSection: (sectionKey: string, updates: Partial<HomepageSection>) => Promise<void>;
}

type CmsTab =
  | 'general'
  | 'hero'
  | 'chef'
  | 'food_dining'
  | 'events'
  | 'hall'
  | 'guesthouse'
  | 'gallery'
  | 'offers';

export const WebsiteContentSettings: React.FC<WebsiteContentSettingsProps> = ({
  restaurantSettings,
  onSaveRestaurantSettings,
  homepageSections,
  onSaveHomepageSection,
}) => {
  const [activeTab, setActiveTab] = useState<CmsTab>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. General & Contact Settings Form State
  const [restName, setRestName] = useState(restaurantSettings.restaurant_name);
  const [brandTitle, setBrandTitle] = useState(restaurantSettings.brand_title || 'CLOUD KITCHEN ERP');
  const [address, setAddress] = useState(restaurantSettings.address);
  const [contactPhone, setContactPhone] = useState(restaurantSettings.contact_phone || '8569955929');
  const [whatsappNumbers, setWhatsappNumbers] = useState(restaurantSettings.whatsapp_numbers || '8569955929');
  const [email, setEmail] = useState(restaurantSettings.email || 'trippysmehfill.kitchen@gmail.com');

  React.useEffect(() => {
    setRestName(restaurantSettings.restaurant_name);
    setBrandTitle(restaurantSettings.brand_title || 'CLOUD KITCHEN ERP');
    setAddress(restaurantSettings.address);
    setContactPhone(restaurantSettings.contact_phone || '8569955929');
    setWhatsappNumbers(restaurantSettings.whatsapp_numbers || '8569955929');
    setEmail(restaurantSettings.email || 'trippysmehfill.kitchen@gmail.com');
  }, [restaurantSettings]);

  // Section Form States Helper
  const getSection = (key: string): HomepageSection => {
    return (
      homepageSections[key] || {
        section_key: key,
        title: '',
        subtitle: '',
        description: '',
        image_url: null,
        button_text: '',
        button_link: '',
        is_visible: true,
        display_order: 0,
      }
    );
  };

  const handleSaveGeneralInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await onSaveRestaurantSettings({
        restaurant_name: restName,
        brand_title: brandTitle,
        address,
        contact_phone: contactPhone,
        whatsapp_numbers: whatsappNumbers,
        email,
      });

      setSuccessMessage('Restaurant contact information saved successfully!');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Failed to save general settings:', err);
      setErrorMessage(err.message || 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSectionData = async (sectionKey: string, sectionData: Partial<HomepageSection>) => {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await onSaveHomepageSection(sectionKey, sectionData);
      setSuccessMessage(`Section "${sectionKey}" updated successfully!`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error(`Failed to update section [${sectionKey}]:`, err);
      setErrorMessage(err.message || 'Failed to update section.');
    } finally {
      setIsSaving(false);
    }
  };

  const tabs: { id: CmsTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'general', label: 'General & Contact', icon: Building2 },
    { id: 'hero', label: 'Hero Section', icon: Globe },
    { id: 'chef', label: 'Chef Corner', icon: Utensils },
    { id: 'food_dining', label: 'Food & Dining', icon: Sparkles },
    { id: 'events', label: 'Events & Parties', icon: PartyPopper },
    { id: 'hall', label: 'Function Hall', icon: Building },
    { id: 'guesthouse', label: 'Guest House', icon: Hotel },
    { id: 'gallery', label: 'Gallery Intro', icon: ImageIcon },
    { id: 'offers', label: 'Offers Intro', icon: Tag },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner Alert */}
      <div className="bg-[#1A1A1A] border border-[#C5A059]/30 rounded-xl p-5 flex items-start gap-4 shadow-lg">
        <div className="p-3 bg-[#C5A059]/10 rounded-lg text-[#C5A059] shrink-0">
          <Globe className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-[#F7F2E8] font-bold text-base">Website Content CMS</h3>
          <p className="text-xs text-[#F7F2E8]/70 mt-1 leading-relaxed">
            Manage customer-facing text, chef photos, venue images, guest house details, and contact information. All changes save directly to Supabase and reflect instantly on the website.
          </p>
        </div>
      </div>

      {/* Global Status Notifications */}
      {successMessage && (
        <div className="flex items-center gap-2 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-sm font-medium">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm font-medium">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#C5A059]/20 no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-2 transition-all ${
                isActive
                  ? 'bg-[#C5A059] text-black shadow-md'
                  : 'bg-[#1A1A1A] text-[#F7F2E8]/70 hover:text-[#F7F2E8] border border-[#C5A059]/20 hover:border-[#C5A059]/50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-black' : 'text-[#C5A059]'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. GENERAL INFORMATION & CONTACT */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'general' && (
        <form onSubmit={handleSaveGeneralInfo} className="bg-[#1A1A1A] border border-[#C5A059]/20 rounded-xl p-6 space-y-6">
          <div className="border-b border-[#C5A059]/20 pb-4">
            <h4 className="text-[#F7F2E8] font-bold text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#C5A059]" />
              Restaurant Identity & Customer Contact
            </h4>
            <p className="text-xs text-[#F7F2E8]/60 mt-1">
              These details are used exclusively for customer calls, WhatsApp orders, email enquiries, footer contact, and Google Maps location.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-medium text-[#F7F2E8]/80 mb-2">Restaurant Display Name</label>
              <input
                type="text"
                value={restName}
                onChange={(e) => setRestName(e.target.value)}
                className="w-full bg-[#121212] border border-[#C5A059]/30 rounded-lg px-4 py-2.5 text-sm text-[#F7F2E8] focus:outline-none focus:border-[#C5A059]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#F7F2E8]/80 mb-2">Brand Subtitle / Tagline</label>
              <input
                type="text"
                value={brandTitle}
                onChange={(e) => setBrandTitle(e.target.value)}
                className="w-full bg-[#121212] border border-[#C5A059]/30 rounded-lg px-4 py-2.5 text-sm text-[#F7F2E8] focus:outline-none focus:border-[#C5A059]"
                placeholder="e.g. CLOUD KITCHEN ERP"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#F7F2E8]/80 mb-2 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#C5A059]" />
                Customer Contact Phone
              </label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full bg-[#121212] border border-[#C5A059]/30 rounded-lg px-4 py-2.5 text-sm text-[#F7F2E8] focus:outline-none focus:border-[#C5A059]"
                placeholder="8569955929"
                required
              />
              <p className="text-[11px] text-[#C5A059] mt-1">Official Restaurant Phone: 8569955929</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#F7F2E8]/80 mb-2 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                Customer WhatsApp Number
              </label>
              <input
                type="text"
                value={whatsappNumbers}
                onChange={(e) => setWhatsappNumbers(e.target.value)}
                className="w-full bg-[#121212] border border-[#C5A059]/30 rounded-lg px-4 py-2.5 text-sm text-[#F7F2E8] focus:outline-none focus:border-[#C5A059]"
                placeholder="8569955929"
                required
              />
              <p className="text-[11px] text-[#C5A059] mt-1">Official WhatsApp Number: 8569955929</p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-[#F7F2E8]/80 mb-2 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#C5A059]" />
                Customer Contact Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#121212] border border-[#C5A059]/30 rounded-lg px-4 py-2.5 text-sm text-[#F7F2E8] focus:outline-none focus:border-[#C5A059]"
                placeholder="trippysmehfill.kitchen@gmail.com"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-[#F7F2E8]/80 mb-2 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#C5A059]" />
                Physical Address
              </label>
              <textarea
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-[#121212] border border-[#C5A059]/30 rounded-lg p-3 text-sm text-[#F7F2E8] focus:outline-none focus:border-[#C5A059]"
                placeholder="GLS Arawali Homes, Damdama Lake Rd, Sohna Rural, Haryana 122103"
                required
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-3 bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-black font-bold text-sm rounded-lg flex items-center gap-2 hover:opacity-95 transition-opacity disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Contact Settings'}
            </button>
          </div>
        </form>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. HERO SECTION */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'hero' && (
        <SectionForm
          sectionKey="hero"
          titleLabel="Hero Main Headline"
          subtitleLabel="Hero Subtitle Tagline"
          descriptionLabel="Hero Supporting Copy"
          imageLabel="Hero Background Image"
          category="hero"
          section={getSection('hero')}
          onSave={handleSaveSectionData}
          hasSecondaryButton
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. CHEF CORNER */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'chef' && (
        <SectionForm
          sectionKey="chef_corner"
          titleLabel="Chef Corner Heading"
          subtitleLabel="Badge Tagline"
          descriptionLabel="Chef Bio & Culinary Philosophy"
          imageLabel="Executive Chef Photo"
          category="chef"
          section={getSection('chef_corner')}
          onSave={handleSaveSectionData}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. FOOD & DINING */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'food_dining' && (
        <SectionForm
          sectionKey="food_dining"
          titleLabel="Food & Dining Title"
          subtitleLabel="Section Subtitle"
          descriptionLabel="Dining Overview"
          imageLabel="Food & Dining Showcase Photo"
          category="website"
          section={getSection('food_dining')}
          onSave={handleSaveSectionData}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. EVENTS & PARTIES */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'events' && (
        <SectionForm
          sectionKey="events_parties"
          titleLabel="Events Title"
          subtitleLabel="Badge Tagline"
          descriptionLabel="Events & Birthday Parties Description"
          imageLabel="Party & Events Showcase Photo"
          category="events"
          section={getSection('events_parties')}
          onSave={handleSaveSectionData}
          hasSecondaryButton
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. FUNCTION HALL */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'hall' && (
        <SectionForm
          sectionKey="function_hall"
          titleLabel="Function Hall Title"
          subtitleLabel="Badge Tagline"
          descriptionLabel="Function Hall Venue Details"
          imageLabel="Function Hall Photo"
          category="hall"
          section={getSection('function_hall')}
          onSave={handleSaveSectionData}
          hasSecondaryButton
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* 7. GUEST HOUSE */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'guesthouse' && (
        <SectionForm
          sectionKey="guest_house"
          titleLabel="Guest House Title"
          subtitleLabel="Badge Tagline"
          descriptionLabel="Guest House Room Details"
          imageLabel="Guest Room Photo"
          category="guesthouse"
          section={getSection('guest_house')}
          onSave={handleSaveSectionData}
          hasSecondaryButton
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* 8. GALLERY INTRO */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'gallery' && (
        <SectionForm
          sectionKey="gallery_intro"
          titleLabel="Gallery Section Title"
          subtitleLabel="Badge Tagline"
          descriptionLabel="Gallery Section Intro Text"
          imageLabel="Gallery Banner Cover"
          category="website"
          section={getSection('gallery_intro')}
          onSave={handleSaveSectionData}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* 9. OFFERS INTRO */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'offers' && (
        <SectionForm
          sectionKey="offers_intro"
          titleLabel="Offers Section Title"
          subtitleLabel="Badge Tagline"
          descriptionLabel="Offers Section Intro Text"
          imageLabel="Offers Banner Image"
          category="website"
          section={getSection('offers_intro')}
          onSave={handleSaveSectionData}
        />
      )}
    </div>
  );
};

// Subcomponent for individual section CMS forms
interface SectionFormProps {
  sectionKey: string;
  titleLabel: string;
  subtitleLabel: string;
  descriptionLabel: string;
  imageLabel: string;
  category: string;
  section: HomepageSection;
  onSave: (key: string, updates: Partial<HomepageSection>) => Promise<void>;
  hasSecondaryButton?: boolean;
}

const SectionForm: React.FC<SectionFormProps> = ({
  sectionKey,
  titleLabel,
  subtitleLabel,
  descriptionLabel,
  imageLabel,
  category,
  section,
  onSave,
  hasSecondaryButton = false,
}) => {
  const [title, setTitle] = useState(section.title || '');
  const [subtitle, setSubtitle] = useState(section.subtitle || '');
  const [description, setDescription] = useState(section.description || '');
  const [buttonText, setButtonText] = useState(section.button_text || '');
  const [buttonLink, setButtonLink] = useState(section.button_link || '');
  const [secButtonText, setSecButtonText] = useState(section.secondary_button_text || '');
  const [secButtonLink, setSecButtonLink] = useState(section.secondary_button_link || '');
  const [isVisible, setIsVisible] = useState(section.is_visible ?? true);
  const [imageUrl, setImageUrl] = useState<string | null>(section.image_url || null);
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    setTitle(section.title || '');
    setSubtitle(section.subtitle || '');
    setDescription(section.description || '');
    setButtonText(section.button_text || '');
    setButtonLink(section.button_link || '');
    setSecButtonText(section.secondary_button_text || '');
    setSecButtonLink(section.secondary_button_link || '');
    setIsVisible(section.is_visible ?? true);
    setImageUrl(section.image_url || null);
  }, [section]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(sectionKey, {
        title,
        subtitle,
        description,
        button_text: buttonText || null,
        button_link: buttonLink || null,
        secondary_button_text: secButtonText || null,
        secondary_button_link: secButtonLink || null,
        is_visible: isVisible,
        image_url: imageUrl,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageSaved = async (newUrl: string | null) => {
    setImageUrl(newUrl);
    await onSave(sectionKey, {
      title,
      subtitle,
      description,
      button_text: buttonText || null,
      button_link: buttonLink || null,
      secondary_button_text: secButtonText || null,
      secondary_button_link: secButtonLink || null,
      is_visible: isVisible,
      image_url: newUrl,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[#1A1A1A] border border-[#C5A059]/20 rounded-xl p-6 space-y-6">
      {/* Section Header Controls */}
      <div className="flex items-center justify-between border-b border-[#C5A059]/20 pb-4">
        <div>
          <h4 className="text-[#F7F2E8] font-bold text-lg capitalize">{sectionKey.replace('_', ' ')} CMS Editor</h4>
          <p className="text-xs text-[#F7F2E8]/60 mt-0.5">
            Configure heading, body text, action links, and section visibility.
          </p>
        </div>

        {/* Section Visibility Toggle */}
        <button
          type="button"
          onClick={() => setIsVisible(!isVisible)}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 border transition-all ${
            isVisible
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
              : 'bg-red-500/10 text-red-300 border-red-500/30 hover:bg-red-500/20'
          }`}
        >
          {isVisible ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4 text-red-400" />}
          {isVisible ? 'Section Visible on Website' : 'Section Hidden from Website'}
        </button>
      </div>

      {/* Image Uploader */}
      <CmsImageUploader
        label={imageLabel}
        currentImageUrl={imageUrl}
        category={category}
        onImageSaved={handleImageSaved}
      />

      {/* Fields Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-xs font-medium text-[#F7F2E8]/80 mb-2">{titleLabel}</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-[#121212] border border-[#C5A059]/30 rounded-lg px-4 py-2.5 text-sm text-[#F7F2E8] focus:outline-none focus:border-[#C5A059]"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#F7F2E8]/80 mb-2">{subtitleLabel}</label>
          <input
            type="text"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            className="w-full bg-[#121212] border border-[#C5A059]/30 rounded-lg px-4 py-2.5 text-sm text-[#F7F2E8] focus:outline-none focus:border-[#C5A059]"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-[#F7F2E8]/80 mb-2">{descriptionLabel}</label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-[#121212] border border-[#C5A059]/30 rounded-lg p-3 text-sm text-[#F7F2E8] focus:outline-none focus:border-[#C5A059] leading-relaxed"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#F7F2E8]/80 mb-2">Primary Button Text</label>
          <input
            type="text"
            value={buttonText}
            onChange={(e) => setButtonText(e.target.value)}
            className="w-full bg-[#121212] border border-[#C5A059]/30 rounded-lg px-4 py-2.5 text-sm text-[#F7F2E8] focus:outline-none focus:border-[#C5A059]"
            placeholder="e.g. Explore Menu"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#F7F2E8]/80 mb-2">Primary Button Destination</label>
          <input
            type="text"
            value={buttonLink}
            onChange={(e) => setButtonLink(e.target.value)}
            className="w-full bg-[#121212] border border-[#C5A059]/30 rounded-lg px-4 py-2.5 text-sm text-[#F7F2E8] focus:outline-none focus:border-[#C5A059]"
            placeholder="e.g. menu-section or https://wa.me/918569955929"
          />
        </div>

        {hasSecondaryButton && (
          <>
            <div>
              <label className="block text-xs font-medium text-[#F7F2E8]/80 mb-2">Secondary Button Text</label>
              <input
                type="text"
                value={secButtonText}
                onChange={(e) => setSecButtonText(e.target.value)}
                className="w-full bg-[#121212] border border-[#C5A059]/30 rounded-lg px-4 py-2.5 text-sm text-[#F7F2E8] focus:outline-none focus:border-[#C5A059]"
                placeholder="e.g. Call Us"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#F7F2E8]/80 mb-2">Secondary Button Destination</label>
              <input
                type="text"
                value={secButtonLink}
                onChange={(e) => setSecButtonLink(e.target.value)}
                className="w-full bg-[#121212] border border-[#C5A059]/30 rounded-lg px-4 py-2.5 text-sm text-[#F7F2E8] focus:outline-none focus:border-[#C5A059]"
                placeholder="e.g. tel:8569955929"
              />
            </div>
          </>
        )}
      </div>

      <div className="pt-4 flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="px-6 py-3 bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-black font-bold text-sm rounded-lg flex items-center gap-2 hover:opacity-95 transition-opacity disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving Changes...' : `Save ${sectionKey.replace('_', ' ')} Content`}
        </button>
      </div>
    </form>
  );
};
