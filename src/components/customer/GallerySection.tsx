import React, { useState, useEffect, useRef } from 'react';
import { GalleryItem } from '../../types';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Maximize2,
  Sparkles,
  Play,
  Pause,
  Image as ImageIcon,
  Share2,
  ZoomIn,
  ZoomOut,
  Check
} from 'lucide-react';

interface GallerySectionProps {
  galleryItems: GalleryItem[];
}

export const GallerySection: React.FC<GallerySectionProps> = ({ galleryItems }) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('All');

  // Touch Swipe coordinates
  const touchStartX = useRef<number | null>(null);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedIndex === null) return;
      if (e.key === 'ArrowLeft') {
        setSelectedIndex((prev) => (prev !== null ? (prev - 1 + galleryItems.length) % galleryItems.length : 0));
        setZoomLevel(1);
      } else if (e.key === 'ArrowRight') {
        setSelectedIndex((prev) => (prev !== null ? (prev + 1) % galleryItems.length : 0));
        setZoomLevel(1);
      } else if (e.key === 'Escape') {
        setSelectedIndex(null);
        setZoomLevel(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, galleryItems.length]);

  // Auto slideshow timer when popup is open
  useEffect(() => {
    let timer: any = null;
    if (selectedIndex !== null && isPlaying && galleryItems.length > 1) {
      timer = setInterval(() => {
        setSelectedIndex((prev) => (prev !== null ? (prev + 1) % galleryItems.length : 0));
        setZoomLevel(1);
      }, 3500);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [selectedIndex, isPlaying, galleryItems.length]);

  if (!galleryItems || galleryItems.length === 0) {
    return (
      <section id="gallery-section" className="py-16 bg-[#121212] border-t border-[#333333] text-[#F7F2E8] select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1A1A1A] border border-[#C5A059]/30 text-[#C5A059] text-xs font-black tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>VISUAL HOSPITALITY SHOWCASE</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black font-serif tracking-tight text-white">
            Gallery & Ambience
          </h2>
          <div className="py-12 bg-[#1A1A1A] rounded-2xl border border-[#333333] shadow-xl max-w-xl mx-auto space-y-2">
            <p className="text-base font-bold text-white">No gallery images yet.</p>
            <p className="text-xs text-gray-400">Add gallery images from the Admin Gallery panel.</p>
          </div>
        </div>
      </section>
    );
  }

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (selectedIndex !== null) {
      setSelectedIndex((selectedIndex - 1 + galleryItems.length) % galleryItems.length);
      setZoomLevel(1);
    }
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (selectedIndex !== null) {
      setSelectedIndex((selectedIndex + 1) % galleryItems.length);
      setZoomLevel(1);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || selectedIndex === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 50) {
      handleNext();
    } else if (diff < -50) {
      handlePrev();
    }
    touchStartX.current = null;
  };

  const handleShare = (item: GalleryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: item.title,
        text: item.caption || `Check out ${item.title} on Trippy's Mehfill!`,
        url: shareUrl
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const selectedItem = selectedIndex !== null ? galleryItems[selectedIndex] : null;

  return (
    <section id="gallery-section" className="py-16 bg-[#121212] border-t border-[#333333] text-[#F7F2E8] select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
        
        {/* Section Heading */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#333333] pb-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1A1A1A] border border-[#C5A059]/30 text-[#C5A059] text-xs font-black tracking-wider uppercase">
              <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>VISUAL HOSPITALITY SHOWCASE</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black font-serif tracking-tight text-white">
              Gallery & Ambience
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 max-w-xl">
              Sharp high-resolution photography of multi-cuisine food, birthday party setups, function hall, and guest house rooms at GLS Sohna.
            </p>
          </div>

          <div>
            <button
              onClick={() => {
                setSelectedIndex(0);
                setZoomLevel(1);
              }}
              className="px-5 py-2.5 bg-[#C5A059] hover:bg-[#b58f48] text-black font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              <Maximize2 className="w-4 h-4 text-black" />
              <span>Launch Fullscreen Slideshow</span>
            </button>
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {galleryItems.map((item, idx) => (
            <div
              key={item.id}
              onClick={() => {
                setSelectedIndex(idx);
                setZoomLevel(1);
              }}
              className="group relative bg-[#1A1A1A] rounded-2xl overflow-hidden border border-[#C5A059]/20 hover:border-[#C5A059] shadow-xl cursor-pointer transition-all duration-300 aspect-4/3"
            >
              <img
                src={item.image_url}
                alt={item.title}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-500 select-none"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                <h3 className="text-sm font-black font-serif text-white group-hover:text-[#C5A059] transition-colors">
                  {item.title}
                </h3>
                {item.caption && (
                  <p className="text-[11px] text-gray-300 line-clamp-1 mt-0.5">
                    {item.caption}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* FULLSCREEN LIGHTBOX MODAL */}
      {selectedItem !== null && selectedIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 select-none"
          onClick={() => setSelectedIndex(null)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Top Control Bar */}
          <div
            className="absolute top-4 inset-x-4 flex items-center justify-between z-10 text-white max-w-7xl mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold bg-[#1A1A1A] px-3 py-1.5 rounded-full border border-[#C5A059]/40 text-[#C5A059]">
                {selectedIndex + 1} / {galleryItems.length}
              </span>
              <h3 className="font-extrabold text-sm font-serif truncate max-w-[200px] sm:max-w-md text-white">
                {selectedItem.title}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2.5 bg-[#1A1A1A] hover:bg-[#252525] rounded-xl border border-[#333333] text-white transition cursor-pointer"
                title={isPlaying ? 'Pause Slideshow' : 'Play Slideshow'}
              >
                {isPlaying ? <Pause className="w-4 h-4 text-[#C5A059]" /> : <Play className="w-4 h-4 text-[#C5A059]" />}
              </button>

              <button
                onClick={() => setZoomLevel((z) => (z >= 2 ? 1 : z + 0.5))}
                className="p-2.5 bg-[#1A1A1A] hover:bg-[#252525] rounded-xl border border-[#333333] text-white transition cursor-pointer"
                title="Zoom Image"
              >
                {zoomLevel > 1 ? <ZoomOut className="w-4 h-4 text-[#C5A059]" /> : <ZoomIn className="w-4 h-4 text-[#C5A059]" />}
              </button>

              <button
                onClick={(e) => handleShare(selectedItem, e)}
                className="p-2.5 bg-[#1A1A1A] hover:bg-[#252525] rounded-xl border border-[#333333] text-white transition cursor-pointer"
                title="Share Image"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4 text-[#C5A059]" />}
              </button>

              <button
                onClick={() => setSelectedIndex(null)}
                className="p-2.5 bg-red-950/60 hover:bg-red-900 text-red-300 rounded-xl border border-red-500/40 transition cursor-pointer ml-2"
                title="Close (Escape)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Previous & Next Navigation Buttons */}
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-[#1A1A1A]/80 hover:bg-[#C5A059] text-white hover:text-black border border-[#C5A059]/40 flex items-center justify-center transition cursor-pointer shadow-2xl"
            title="Previous (Left Arrow)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-[#1A1A1A]/80 hover:bg-[#C5A059] text-white hover:text-black border border-[#C5A059]/40 flex items-center justify-center transition cursor-pointer shadow-2xl"
            title="Next (Right Arrow)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Main Image Stage */}
          <div
            className="relative max-w-5xl max-h-[80vh] flex items-center justify-center overflow-hidden rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedItem.image_url}
              alt={selectedItem.title}
              style={{ transform: `scale(${zoomLevel})` }}
              className="max-w-full max-h-[75vh] object-contain transition-transform duration-300 shadow-2xl rounded-xl select-none"
            />
          </div>

          {/* Caption Footer */}
          {selectedItem.caption && (
            <div
              className="absolute bottom-6 inset-x-4 max-w-xl mx-auto p-3 bg-[#1A1A1A]/90 backdrop-blur-md rounded-2xl border border-[#C5A059]/40 text-center z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-xs text-gray-200 font-medium">
                {selectedItem.caption}
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
