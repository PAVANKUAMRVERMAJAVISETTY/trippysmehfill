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
  Check,
  Flame
} from 'lucide-react';

interface GallerySectionProps {
  galleryItems: GalleryItem[];
}

export const GallerySection: React.FC<GallerySectionProps> = ({ galleryItems }) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

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

  // Auto slideshow timer when popup is open and playing
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

  if (!galleryItems || galleryItems.length === 0) return null;

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
      // Swiped Left -> Next
      handleNext();
    } else if (diff < -50) {
      // Swiped Right -> Prev
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
    <section id="gallery-section" className="py-12 bg-[#F4F1E8] border-t border-[#DDD6C8] text-[#1F2933]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
        
        {/* Section Heading with Popup Launcher */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#DDD6C8] pb-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F7F4EC] border border-[#DDD6C8] text-[#B8862D] text-xs font-extrabold tracking-wider uppercase">
              <Sparkles className="w-3.5 h-3.5 text-[#B8862D]" />
              <span>Visual Food Showcase</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-serif tracking-tight text-[#1F2933]">
              Gallery & Ambiance
            </h2>
            <p className="text-xs sm:text-sm text-[#5F6368] max-w-xl">
              High-resolution food photography, kitchen ambiance, and chef specials. Click any photo for interactive lightbox zoom.
            </p>
          </div>

          <div>
            <button
              onClick={() => {
                setSelectedIndex(0);
                setZoomLevel(1);
              }}
              className="px-5 py-2.5 bg-[#D95F0A] hover:bg-[#B94D00] text-white font-extrabold text-xs rounded-2xl shadow-md border border-[#B94D00] transition flex items-center gap-2 cursor-pointer"
            >
              <Maximize2 className="w-4 h-4 text-white" />
              <span>Open Popup Showcase (1 by 1)</span>
            </button>
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {galleryItems.map((item, idx) => (
            <div
              key={item.id}
              onClick={() => {
                setSelectedIndex(idx);
                setZoomLevel(1);
              }}
              className="group relative cursor-pointer overflow-hidden rounded-2xl bg-white border border-[#DDD6C8] hover:border-[#B8862D] transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-1"
            >
              {/* Today's Special Ribbon */}
              {(idx % 2 === 0 || item.title.toLowerCase().includes('special')) && (
                <div className="absolute top-3 left-3 z-10 bg-[#D95F0A] text-white text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-md flex items-center gap-1 border border-[#B94D00]">
                  <Flame className="w-3 h-3 fill-current text-white" />
                  <span>Today's Special</span>
                </div>
              )}

              <div className="aspect-video overflow-hidden bg-[#F7F4EC]">
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                />
              </div>

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-95 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-white text-sm sm:text-base font-serif group-hover:text-amber-300 transition-colors">
                      {item.title}
                    </h3>
                    {item.caption && (
                      <p className="text-xs text-gray-200 line-clamp-2 mt-1">
                        {item.caption}
                      </p>
                    )}
                  </div>
                  <div className="p-2 rounded-full bg-black/70 text-amber-400 group-hover:bg-[#D95F0A] group-hover:text-white transition-all shrink-0">
                    <Maximize2 className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Lightbox Interactive Popup Modal */}
      {selectedItem && (
        <div
          onClick={() => {
            setSelectedIndex(null);
            setZoomLevel(1);
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 transition-all duration-300"
        >
          {/* Top Bar Controls */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-white z-20">
            <div className="flex items-center gap-2 bg-black/70 px-3.5 py-1.5 rounded-full border border-white/20 text-xs font-mono font-bold">
              <ImageIcon className="w-4 h-4 text-[#B8862D]" />
              <span>Image {selectedIndex! + 1} of {galleryItems.length}</span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Zoom Buttons */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setZoomLevel(prev => (prev >= 2 ? 1 : prev + 0.5));
                }}
                className="p-2 rounded-full bg-black/60 border border-white/20 text-white hover:bg-white/20 transition text-xs font-bold flex items-center gap-1 cursor-pointer"
                title="Toggle Zoom"
              >
                {zoomLevel > 1 ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
                <span className="hidden sm:inline font-mono">{zoomLevel}x</span>
              </button>

              {/* Share Button */}
              <button
                onClick={(e) => handleShare(selectedItem, e)}
                className="p-2 rounded-full bg-black/60 border border-white/20 text-white hover:bg-[#D95F0A] transition text-xs font-bold flex items-center gap-1 cursor-pointer"
                title="Share Image"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                <span className="hidden sm:inline">{copiedLink ? 'Copied!' : 'Share'}</span>
              </button>

              {/* Slideshow Toggle */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPlaying(!isPlaying);
                }}
                className={`p-2 sm:px-3 sm:py-1.5 rounded-full border transition flex items-center gap-1.5 text-xs font-bold cursor-pointer ${
                  isPlaying
                    ? 'bg-[#D95F0A] text-white border-[#B94D00]'
                    : 'bg-black/60 text-white border-white/20 hover:bg-white/20'
                }`}
                title={isPlaying ? 'Pause Auto Slideshow' : 'Play Auto Slideshow'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span className="hidden sm:inline">{isPlaying ? 'Slideshow Playing' : 'Paused'}</span>
              </button>

              {/* Close Button */}
              <button
                onClick={() => {
                  setSelectedIndex(null);
                  setZoomLevel(1);
                }}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                title="Close Lightbox (Esc)"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Navigation Controls */}
          {galleryItems.length > 1 && (
            <>
              <button
                onClick={handlePrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3.5 rounded-full bg-black/70 border border-white/20 hover:bg-[#D95F0A] text-white transition z-20 shadow-2xl cursor-pointer"
                title="Previous Image (Left Arrow)"
              >
                <ChevronLeft className="w-7 h-7" />
              </button>

              <button
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3.5 rounded-full bg-black/70 border border-white/20 hover:bg-[#D95F0A] text-white transition z-20 shadow-2xl cursor-pointer"
                title="Next Image (Right Arrow)"
              >
                <ChevronRight className="w-7 h-7" />
              </button>
            </>
          )}

          {/* Main Lightbox Content Card */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-4xl w-full bg-white border border-[#DDD6C8] rounded-3xl overflow-hidden shadow-2xl space-y-0 transform transition-all scale-100 my-auto relative text-[#1F2933]"
          >
            <div className="relative max-h-[65vh] bg-[#F7F4EC] flex items-center justify-center overflow-hidden p-2">
              <img
                src={selectedItem.image_url}
                alt={selectedItem.title}
                style={{ transform: `scale(${zoomLevel})` }}
                className="max-h-[65vh] w-auto object-contain mx-auto rounded-xl shadow-md transition-transform duration-300 cursor-zoom-in"
                onClick={() => setZoomLevel(prev => (prev >= 2 ? 1 : prev + 0.5))}
              />

              {/* Today's Special Badge Overlay */}
              {(selectedIndex! % 2 === 0 || selectedItem.title.toLowerCase().includes('special')) && (
                <div className="absolute top-4 left-4 z-10 bg-[#D95F0A] text-white text-xs font-black uppercase px-3 py-1.5 rounded-full shadow-md flex items-center gap-1 border border-[#B94D00]">
                  <Flame className="w-4 h-4 fill-current text-white" />
                  <span>Today's Chef Special</span>
                </div>
              )}
            </div>

            <div className="p-5 bg-white border-t border-[#DDD6C8] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold font-serif text-[#1F2933]">{selectedItem.title}</h3>
                  {selectedItem.caption && (
                    <p className="text-xs sm:text-sm text-[#5F6368] mt-1">{selectedItem.caption}</p>
                  )}
                </div>

                <div className="text-xs text-[#5F6368] font-mono shrink-0">
                  Published: {selectedItem.created_at}
                </div>
              </div>

              {/* Thumbnails Bar */}
              <div className="flex items-center gap-2.5 overflow-x-auto pt-2 border-t border-[#DDD6C8] pb-1 scrollbar-none">
                {galleryItems.map((thumb, tIdx) => (
                  <button
                    key={thumb.id}
                    onClick={() => {
                      setSelectedIndex(tIdx);
                      setZoomLevel(1);
                    }}
                    className={`relative w-16 h-12 shrink-0 rounded-xl overflow-hidden border-2 transition cursor-pointer ${
                      tIdx === selectedIndex
                        ? 'border-[#B8862D] scale-105 shadow-md'
                        : 'border-[#DDD6C8] opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={thumb.image_url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}

    </section>
  );
};
