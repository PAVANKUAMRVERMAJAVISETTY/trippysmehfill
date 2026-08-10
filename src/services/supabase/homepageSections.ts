import { supabase } from '../../lib/supabase';
import { isTableNotProvisioned } from './optionalTable';
import { HomepageSection, HomepageSectionKey } from '../../types';

export const DEFAULT_HOMEPAGE_SECTIONS: Record<string, HomepageSection> = {
  hero: {
    section_key: 'hero',
    title: 'Great Food. Memorable Celebrations. Comfortable Stays.',
    subtitle: 'RESTAURANT • CLOUD KITCHEN • VENUE • GUEST HOUSE',
    description: 'Authentic multi-cuisine dining, event celebrations, catering and comfortable guest-house stays at GLS Sohna.',
    image_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=1600&q=80',
    button_text: '🍽️ Explore Menu',
    button_link: 'menu-section',
    secondary_button_text: '🎉 Plan Your Celebration',
    secondary_button_link: 'events-section',
    is_visible: true,
    display_order: 1,
  },
  chef_corner: {
    section_key: 'chef_corner',
    title: 'Crafted by an Experienced Continental Chef',
    subtitle: 'EXPERIENCED CULINARY TEAM',
    description: 'At Trippy\'s Mehfill, every dish is an artful fusion of authentic flavors, premium ingredients, and expert culinary techniques. Guided by an experienced Continental Chef, our kitchen prepares authentic multi-cuisine delicacies, signature specials, and party platters fresh to order.',
    image_url: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=1200&q=80',
    button_text: 'Explore Menu',
    button_link: 'menu-section',
    is_visible: true,
    display_order: 2,
  },
  food_dining: {
    section_key: 'food_dining',
    title: 'Everything You Need Under One Roof',
    subtitle: 'ALL-IN-ONE HOSPITALITY HUB',
    description: 'Experience premium multi-cuisine dining, memorable party celebrations, function hall venue hosting, and comfortable guest house stays at GLS Sohna.',
    image_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=1200&q=80',
    button_text: 'Explore Menu',
    button_link: 'menu-section',
    is_visible: true,
    display_order: 3,
  },
  events_parties: {
    section_key: 'events_parties',
    title: 'Celebrate Your Special Moments',
    subtitle: 'CELEBRATIONS & VENUE',
    description: 'From intimate birthday gatherings to grand family functions and corporate meetups, Trippy\'s Mehfill offers full event planning, venue setups, and exquisite multi-cuisine catering at GLS Sohna.',
    image_url: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=1200&q=80',
    button_text: 'WhatsApp Us',
    button_link: 'https://wa.me/918569955929',
    secondary_button_text: 'Call Us',
    secondary_button_link: 'tel:8569955929',
    is_visible: true,
    display_order: 4,
  },
  function_hall: {
    section_key: 'function_hall',
    title: 'Spacious Function Hall at GLS Sohna',
    subtitle: 'EVENT VENUE SHOWCASE',
    description: 'Host your next birthday party, private dinner, family gathering, or corporate function in our ambient event hall. Supported by our on-site cloud kitchen, we provide seamless catering, custom seating, and attentive service.',
    image_url: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80',
    button_text: 'Enquire Hall Availability',
    button_link: 'https://wa.me/918569955929',
    secondary_button_text: 'Call Venue Manager',
    secondary_button_link: 'tel:8569955929',
    is_visible: true,
    display_order: 5,
  },
  guest_house: {
    section_key: 'guest_house',
    title: 'Stay Comfortable at GLS Sohna',
    subtitle: 'GUEST ACCOMMODATIONS',
    description: 'Whether visiting for campus events, late-night stays, or regional trips in Sohna, our guest house rooms offer clean, comfortable, and peaceful accommodations with direct food delivery from our kitchen.',
    image_url: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=80',
    button_text: 'Enquire About Rooms',
    button_link: 'https://wa.me/918569955929',
    secondary_button_text: 'Call Desk',
    secondary_button_link: 'tel:8569955929',
    is_visible: true,
    display_order: 6,
  },
  gallery_intro: {
    section_key: 'gallery_intro',
    title: 'Gallery & Ambience',
    subtitle: 'VISUAL HOSPITALITY SHOWCASE',
    description: 'Sharp high-resolution photography of multi-cuisine food, birthday party setups, function hall, and guest house rooms at GLS Sohna.',
    button_text: 'Launch Fullscreen Slideshow',
    button_link: 'gallery-section',
    is_visible: true,
    display_order: 7,
  },
  offers_intro: {
    section_key: 'offers_intro',
    title: 'LATEST PROMO OFFERS',
    subtitle: 'EXCLUSIVE SAVINGS',
    description: 'Exclusive discount promo codes for multi-cuisine food delivery & party orders',
    is_visible: true,
    display_order: 8,
  },
  contact_intro: {
    section_key: 'contact_intro',
    title: 'We Are Here For You',
    subtitle: 'FIND & CONTACT US',
    description: 'Have questions about food delivery, birthday party venue bookings, catering menus, or guest house room stays? Reach out to us directly.',
    button_text: 'Chat on WhatsApp',
    button_link: 'https://wa.me/918569955929',
    secondary_button_text: 'Call Us Now',
    secondary_button_link: 'tel:8569955929',
    is_visible: true,
    display_order: 9,
  },
};

export const homepageSectionsService = {
  async fetchSections(): Promise<Record<string, HomepageSection>> {
    try {
      const { data, error } = await supabase
        .from('homepage_sections')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) {
        if (isTableNotProvisioned(error, 'homepage_sections')) {
          return { ...DEFAULT_HOMEPAGE_SECTIONS };
        }
        console.warn('Unable to read homepage_sections from Supabase:', error.message);
        return { ...DEFAULT_HOMEPAGE_SECTIONS };
      }

      if (!data || data.length === 0) {
        return { ...DEFAULT_HOMEPAGE_SECTIONS };
      }

      const map: Record<string, HomepageSection> = { ...DEFAULT_HOMEPAGE_SECTIONS };
      data.forEach((row) => {
        map[row.section_key] = {
          id: row.id,
          section_key: row.section_key,
          title: row.title || DEFAULT_HOMEPAGE_SECTIONS[row.section_key]?.title || '',
          subtitle: row.subtitle || DEFAULT_HOMEPAGE_SECTIONS[row.section_key]?.subtitle,
          description: row.description || DEFAULT_HOMEPAGE_SECTIONS[row.section_key]?.description,
          image_url: row.image_url ?? DEFAULT_HOMEPAGE_SECTIONS[row.section_key]?.image_url ?? null,
          mobile_image_url: row.mobile_image_url ?? null,
          button_text: row.button_text ?? DEFAULT_HOMEPAGE_SECTIONS[row.section_key]?.button_text ?? null,
          button_link: row.button_link ?? DEFAULT_HOMEPAGE_SECTIONS[row.section_key]?.button_link ?? null,
          secondary_button_text: row.secondary_button_text ?? DEFAULT_HOMEPAGE_SECTIONS[row.section_key]?.secondary_button_text ?? null,
          secondary_button_link: row.secondary_button_link ?? DEFAULT_HOMEPAGE_SECTIONS[row.section_key]?.secondary_button_link ?? null,
          is_visible: row.is_visible ?? true,
          display_order: row.display_order ?? 0,
          created_at: row.created_at,
          updated_at: row.updated_at,
        };
      });

      return map;
    } catch (err) {
      console.warn('Error in fetchSections, using default homepage sections:', err);
      return { ...DEFAULT_HOMEPAGE_SECTIONS };
    }
  },

  async updateSection(
    section_key: string,
    updates: Partial<HomepageSection>
  ): Promise<HomepageSection> {
    const currentMap = await this.fetchSections();
    const current = currentMap[section_key] || DEFAULT_HOMEPAGE_SECTIONS[section_key] || {
      section_key,
      title: '',
      is_visible: true,
      display_order: 0,
    };

    const merged: HomepageSection = {
      ...current,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const payload: Record<string, any> = {
      section_key,
      title: merged.title,
      subtitle: merged.subtitle || null,
      description: merged.description || null,
      image_url: merged.image_url !== undefined ? merged.image_url : null,
      mobile_image_url: merged.mobile_image_url !== undefined ? merged.mobile_image_url : null,
      button_text: merged.button_text !== undefined ? merged.button_text : null,
      button_link: merged.button_link !== undefined ? merged.button_link : null,
      secondary_button_text: merged.secondary_button_text !== undefined ? merged.secondary_button_text : null,
      secondary_button_link: merged.secondary_button_link !== undefined ? merged.secondary_button_link : null,
      is_visible: merged.is_visible ?? true,
      display_order: merged.display_order ?? 0,
      updated_at: merged.updated_at,
    };

    const { data, error } = await supabase
      .from('homepage_sections')
      .upsert([payload], { onConflict: 'section_key' })
      .select('*')
      .single();

    if (error) {
      console.error(`Error upserting homepage_sections row [${section_key}]:`, error);
      throw new Error(`Database upsert failed for ${section_key}: ${error.message}`);
    }

    return {
      id: data.id,
      section_key: data.section_key,
      title: data.title,
      subtitle: data.subtitle || undefined,
      description: data.description || undefined,
      image_url: data.image_url ?? null,
      mobile_image_url: data.mobile_image_url ?? null,
      button_text: data.button_text ?? null,
      button_link: data.button_link ?? null,
      secondary_button_text: data.secondary_button_text ?? null,
      secondary_button_link: data.secondary_button_link ?? null,
      is_visible: data.is_visible ?? true,
      display_order: data.display_order ?? 0,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  },
};
