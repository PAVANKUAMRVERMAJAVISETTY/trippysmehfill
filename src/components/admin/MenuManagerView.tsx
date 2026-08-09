import React, { useState, useRef } from 'react';
import { MenuItem, OFFICIAL_CATEGORIES, CategoryDefinition } from '../../types';
import {
  Plus,
  Edit3,
  Trash2,
  X,
  Image as ImageIcon,
  Camera,
  FileImage,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { storageService } from '../../services/supabase/storage';

interface MenuManagerViewProps {
  menuItems: MenuItem[];
  onSaveDish: (dish: MenuItem) => void;
  onDeleteDish: (dishId: string) => void;
  onToggleAvailable: (dishId: string) => void;
  onToggleSpecial: (dishId: string) => void;
}

export const MenuManagerView: React.FC<MenuManagerViewProps> = ({
  menuItems,
  onSaveDish,
  onDeleteDish,
  onToggleAvailable,
  onToggleSpecial
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDish, setEditingDish] = useState<Partial<MenuItem> | null>(null);

  // Camera & File Upload states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // Quick preset food images
  const sampleFoodImages = [
    { label: 'Biryani', url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&q=80' },
    { label: 'Pizza', url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&q=80' },
    { label: 'Burger', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80' },
    { label: 'Fried Chicken', url: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&q=80' },
    { label: 'Frankie / Roll', url: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&q=80' },
    { label: 'Snacks', url: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=500&q=80' }
  ];

  const handleOpenAdd = () => {
    setEditingDish({
      id: 'm-' + Date.now(),
      name: '',
      description: '',
      price: 100,
      category: OFFICIAL_CATEGORIES[0].name,
      image_url: sampleFoodImages[0].url,
      is_veg: false,
      is_available: true,
      is_todays_special: false,
      display_order: menuItems.length + 1
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (dish: MenuItem) => {
    setEditingDish({ ...dish });
    setIsModalOpen(true);
  };

  const handleDeleteWithConfirm = (dish: MenuItem) => {
    if (window.confirm(`Are you sure you want to delete "${dish.name}"? This will permanently remove the dish.`)) {
      onDeleteDish(dish.id);
    }
  };

  // Process selected image file (from Camera or Gallery input)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const publicUrl = await storageService.uploadAsset(file, 'menu');
      if (editingDish) {
        setEditingDish({ ...editingDish, image_url: publicUrl });
      }
    } catch (err: any) {
      console.error('Failed to upload dish photo to Supabase storage:', err);
      alert('Image upload failed: ' + (err.message || 'Storage error'));
    }
  };

  // Start Live Camera Stream
  const startLiveCamera = async () => {
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.warn('Live camera stream error, falling back to direct input', err);
      stopLiveCamera();
      if (cameraInputRef.current) {
        cameraInputRef.current.click();
      }
    }
  };

  // Stop Live Camera Stream
  const stopLiveCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Snap photo from live camera canvas and upload to Supabase Storage
  const capturePhotoFromStream = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `dish_camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
        try {
          const publicUrl = await storageService.uploadAsset(file, 'menu');
          if (editingDish) {
            setEditingDish({ ...editingDish, image_url: publicUrl });
          }
        } catch (err: any) {
          console.error('Failed to upload camera photo:', err);
          alert('Photo upload failed: ' + err.message);
        } finally {
          stopLiveCamera();
        }
      }, 'image/jpeg', 0.85);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDish || !editingDish.name) return;
    stopLiveCamera();
    onSaveDish(editingDish as MenuItem);
    setIsModalOpen(false);
  };

  // Group dishes category-wise in the exact required order
  const officialGrouped = OFFICIAL_CATEGORIES.map(cat => {
    const items = menuItems.filter(m => {
      const itemCat = (m.category || '').trim().toLowerCase();
      const catName = cat.name.toLowerCase();
      const catDisplay = cat.display.toLowerCase();
      return itemCat === catName || itemCat === catDisplay || itemCat === cat.id.toLowerCase();
    });
    return {
      ...cat,
      items
    };
  }).filter(group => group.items.length > 0); // Hide empty categories!

  // Handle any legacy categories that exist in production and have dishes
  const officialCatSet = new Set(OFFICIAL_CATEGORIES.map(c => c.name.toLowerCase()));
  const legacyCategoryNames = Array.from(new Set(
    menuItems
      .map(m => (m.category || '').trim())
      .filter(c => c && !officialCatSet.has(c.toLowerCase()) && !OFFICIAL_CATEGORIES.some(oc => oc.display.toLowerCase() === c.toLowerCase()))
  ));

  const legacyGrouped = legacyCategoryNames.map(legName => ({
    id: legName,
    name: legName,
    emoji: '🍽️',
    display: `🍽️ ${legName}`,
    items: menuItems.filter(m => (m.category || '').trim().toLowerCase() === legName.toLowerCase())
  })).filter(group => group.items.length > 0);

  const allCategoryGroups = [...officialGrouped, ...legacyGrouped];

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-7xl mx-auto space-y-8 text-[#1F2933]" style={{ backgroundColor: '#FFF5E8' }}>
      
      {/* Hidden File Inputs for Gallery & Camera Capture */}
      <input
        type="file"
        ref={galleryInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D8D2C5] pb-4">
        <div>
          <h1 className="text-2xl font-black text-[#252525] font-serif">Menu & Dishes Manager</h1>
          <p className="text-xs text-[#5F6368]">
            Organized category-wise. Add new dishes, upload photos from device gallery or camera, and manage availability.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-5 py-2.5 bg-[#D95F0A] hover:bg-[#B94D00] text-white font-extrabold rounded-2xl text-xs flex items-center justify-center gap-2 border border-[#B94D00] shadow-sm transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Dish</span>
        </button>
      </div>

      {/* Category-Wise Admin Menu Display */}
      {allCategoryGroups.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-[#DDD6C8] shadow-sm">
          <p className="text-[#1F2933] font-bold">No menu dishes found.</p>
          <p className="text-xs text-[#5F6368] mt-1">Click "Add New Dish" above to create your first menu item.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {allCategoryGroups.map((group) => (
            <section key={group.id} className="space-y-4">
              
              {/* Category Header */}
              <div className="border-b-2 border-[#D95F0A]/30 pb-2 flex items-center justify-between">
                <h2 className="text-lg font-black text-[#1F2933] font-serif uppercase tracking-wider flex items-center gap-2">
                  <span className="text-xl">{group.emoji}</span>
                  <span>{group.name}</span>
                  <span className="text-xs font-mono font-bold bg-[#F4F1EA] text-[#5F6368] px-2.5 py-0.5 rounded-full border border-[#DDD6C8]">
                    {group.items.length} {group.items.length === 1 ? 'dish' : 'dishes'}
                  </span>
                </h2>
              </div>

              {/* Category Dishes Grid (NO 6-DISH LIMIT) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {group.items.map((dish) => (
                  <div
                    key={dish.id}
                    className={`bg-white rounded-2xl p-5 border shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition relative group ${
                      dish.is_available ? 'border-[#DDD6C8]' : 'border-red-300 bg-red-50/20'
                    }`}
                  >
                    <div>
                      <div className="flex gap-3 mb-2">
                        
                        {/* Dish Thumbnail */}
                        <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-[#DDD6C8] shadow-sm group/img bg-[#F7F4EC]">
                          <img
                            src={dish.image_url || sampleFoodImages[0].url}
                            alt={dish.name}
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={() => handleOpenEdit(dish)}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition flex flex-col items-center justify-center text-white text-[9px] font-bold gap-0.5 cursor-pointer"
                            title="Change Photo"
                          >
                            <Camera className="w-4 h-4 text-[#D95F0A]" />
                            <span>Change</span>
                          </button>
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                              dish.is_veg ? 'bg-[#D1FAE5] text-[#146C43] border-[#86EFAC]' : 'bg-[#FDE2E1] text-[#922B21] border-[#F5A6A1]'
                            }`}>
                              {dish.is_veg ? 'VEG' : 'NON VEG'}
                            </span>
                            <span className="text-base font-black text-[#1F2933]">₹{dish.price}</span>
                          </div>
                          <h3 className="font-extrabold text-[#1F2933] text-sm line-clamp-1">{dish.name}</h3>
                          <p className="text-xs text-[#5F6368] line-clamp-2 mt-1">{dish.description}</p>
                        </div>
                      </div>

                      {/* Toggles Bar */}
                      <div className="pt-3 border-t border-[#DDD6C8] space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[#1F2933]">Available</span>
                            {!dish.is_available && (
                              <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.2 font-extrabold rounded">
                                OFF (Hidden from Customers)
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => onToggleAvailable(dish.id)}
                            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                              dish.is_available ? 'bg-[#198754] justify-end' : 'bg-[#DDD6C8] justify-start'
                            }`}
                          >
                            <span className="bg-white w-4 h-4 rounded-full shadow-md" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#1F2933]">Today's special</span>
                          <button
                            onClick={() => onToggleSpecial(dish.id)}
                            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                              dish.is_todays_special ? 'bg-[#D95F0A] justify-end' : 'bg-[#DDD6C8] justify-start'
                            }`}
                          >
                            <span className="bg-white w-4 h-4 rounded-full shadow-md" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#DDD6C8]">
                      <button
                        onClick={() => handleOpenEdit(dish)}
                        className="py-2 bg-white hover:bg-[#F0E8D8] text-[#1F2933] border border-[#9F988A] font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-[#D95F0A]" />
                        <span>Edit Dish</span>
                      </button>
                      <button
                        onClick={() => handleDeleteWithConfirm(dish)}
                        className="py-2 bg-[#C0392B] hover:bg-[#922B21] text-white border border-[#922B21] font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

            </section>
          ))}
        </div>
      )}

      {/* Edit / Add Dish Modal with Camera & Gallery Upload */}
      {isModalOpen && editingDish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-[#DDD6C8] my-auto text-[#1F2933]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-[#DDD6C8] flex items-center justify-between bg-[#F7F4EC]">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-[#D95F0A]" />
                <h2 className="text-lg font-extrabold text-[#1F2933] font-serif">
                  {editingDish.id?.startsWith('m-') ? 'Add New Dish' : 'Edit Dish Details'}
                </h2>
              </div>
              <button
                onClick={() => {
                  stopLiveCamera();
                  setIsModalOpen(false);
                }}
                className="p-1.5 text-[#5F6368] hover:text-[#1F2933] rounded-full hover:bg-[#F0E8D8] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleFormSubmit} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              
              {/* IMAGE UPLOAD SECTION (CAMERA & GALLERY) */}
              <div className="bg-[#F7F4EC] p-4 rounded-2xl border border-[#DDD6C8] space-y-3">
                <label className="font-extrabold text-[#1F2933] text-xs flex items-center justify-between">
                  <span>Dish Photo & Media</span>
                  <span className="text-[10px] text-[#D95F0A] font-bold uppercase">Camera or Gallery</span>
                </label>

                {/* Live Camera Viewfinder Overlay if Active */}
                {isCameraActive ? (
                  <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex flex-col items-center justify-center border-2 border-[#D95F0A] shadow-xl">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-3 z-10">
                      <button
                        type="button"
                        onClick={capturePhotoFromStream}
                        className="px-4 py-2 bg-[#198754] hover:bg-[#146C43] text-white font-extrabold rounded-xl shadow-lg flex items-center gap-1.5 text-xs cursor-pointer border border-[#146C43]"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Snap Photo</span>
                      </button>
                      <button
                        type="button"
                        onClick={stopLiveCamera}
                        className="px-3 py-2 bg-gray-900/80 hover:bg-black text-white font-bold rounded-xl text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Current Image Preview & Dual Buttons */
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="relative w-28 h-28 rounded-2xl overflow-hidden border-2 border-[#DDD6C8] bg-white shrink-0 shadow-md">
                      <img
                        src={editingDish.image_url || sampleFoodImages[0].url}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/70 text-white text-[9px] font-mono rounded">
                        Preview
                      </span>
                    </div>

                    <div className="flex-1 w-full space-y-2">
                      <p className="text-[11px] text-[#5F6368]">
                        Upload high quality dish photo using your camera or phone gallery.
                      </p>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => cameraInputRef.current?.click()}
                          className="py-2.5 px-3 bg-[#D95F0A] hover:bg-[#B94D00] text-white font-extrabold rounded-xl flex items-center justify-center gap-1.5 border border-[#B94D00] shadow-sm transition text-xs cursor-pointer"
                        >
                          <Camera className="w-4 h-4" />
                          <span>Take Photo</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => galleryInputRef.current?.click()}
                          className="py-2.5 px-3 bg-[#1F2933] hover:bg-black text-white font-extrabold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition text-xs cursor-pointer"
                        >
                          <FileImage className="w-4 h-4 text-[#B8862D]" />
                          <span>Choose Gallery</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={startLiveCamera}
                        className="w-full py-1.5 bg-[#FFF0CC] hover:bg-[#FFE5A3] text-[#8A5A00] border border-[#E8C66A] font-bold rounded-lg text-[11px] flex items-center justify-center gap-1 transition cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#D95F0A]" />
                        <span>Open Live Web Cam Viewfinder</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Preset Photo Library Quick Selector */}
                <div className="pt-2 border-t border-[#DDD6C8]">
                  <span className="text-[10px] font-extrabold text-[#5F6368] uppercase block mb-1.5">
                    Or pick sample food photo:
                  </span>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {sampleFoodImages.map((sample, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setEditingDish({ ...editingDish, image_url: sample.url })}
                        className={`relative shrink-0 w-12 h-12 rounded-xl overflow-hidden border-2 transition cursor-pointer ${
                          editingDish.image_url === sample.url ? 'border-[#D95F0A] scale-105 shadow-md' : 'border-[#DDD6C8] opacity-60 hover:opacity-100'
                        }`}
                        title={sample.label}
                      >
                        <img src={sample.url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Direct Image URL input */}
                <div>
                  <label className="font-bold text-[#5F6368] text-[10px] block mb-1">
                    Or custom Image URL string:
                  </label>
                  <input
                    type="text"
                    value={editingDish.image_url || ''}
                    onChange={(e) => setEditingDish({ ...editingDish, image_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full p-2 bg-[#F8F6F0] border border-[#9F988A] rounded-xl outline-none focus:border-[#D95F0A] font-mono text-[11px] text-[#1F2933]"
                  />
                </div>
              </div>

              {/* NAME */}
              <div>
                <label className="font-extrabold text-[#1F2933] block mb-1">Dish Name</label>
                <input
                  type="text"
                  value={editingDish.name || ''}
                  onChange={(e) => setEditingDish({ ...editingDish, name: e.target.value })}
                  placeholder="e.g. Special Hyderabadi Dum Biryani"
                  required
                  className="w-full p-2.5 bg-[#F8F6F0] border border-[#9F988A] rounded-xl outline-none focus:border-[#D95F0A] text-xs font-bold text-[#1F2933] placeholder-[#6B6B63]"
                />
              </div>

              {/* DESCRIPTION */}
              <div>
                <label className="font-extrabold text-[#1F2933] block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingDish.description || ''}
                  onChange={(e) => setEditingDish({ ...editingDish, description: e.target.value })}
                  placeholder="Aromatic basmati rice cooked with authentic spices..."
                  className="w-full p-2.5 bg-[#F8F6F0] border border-[#9F988A] rounded-xl outline-none focus:border-[#D95F0A] text-xs text-[#1F2933] placeholder-[#6B6B63]"
                />
              </div>

              {/* PRICE & CATEGORY */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-[#1F2933] block mb-1">Price (₹)</label>
                  <input
                    type="number"
                    value={editingDish.price || 0}
                    onChange={(e) => setEditingDish({ ...editingDish, price: Number(e.target.value) })}
                    required
                    className="w-full p-2.5 bg-[#F8F6F0] border border-[#9F988A] rounded-xl outline-none focus:border-[#D95F0A] font-mono text-xs font-bold text-[#1F2933]"
                  />
                </div>

                <div>
                  <label className="font-extrabold text-[#1F2933] block mb-1">Category</label>
                  <select
                    value={editingDish.category || OFFICIAL_CATEGORIES[0].name}
                    onChange={(e) => setEditingDish({ ...editingDish, category: e.target.value })}
                    className="w-full p-2.5 bg-[#F8F6F0] border border-[#9F988A] rounded-xl outline-none focus:border-[#D95F0A] text-xs font-bold text-[#1F2933]"
                  >
                    {OFFICIAL_CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.display}</option>
                    ))}
                    {/* Preserve existing legacy category if present */}
                    {editingDish.category && !OFFICIAL_CATEGORIES.some(c => c.name.toLowerCase() === editingDish.category?.toLowerCase()) && (
                      <option value={editingDish.category}>{editingDish.category}</option>
                    )}
                  </select>
                </div>
              </div>

              {/* CHECKBOXES */}
              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 font-bold text-[#1F2933] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingDish.is_veg || false}
                    onChange={(e) => setEditingDish({ ...editingDish, is_veg: e.target.checked })}
                    className="w-4 h-4 text-[#D95F0A] rounded accent-[#D95F0A]"
                  />
                  <span>Vegetarian Dish</span>
                </label>

                <label className="flex items-center gap-2 font-bold text-[#1F2933] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingDish.is_todays_special || false}
                    onChange={(e) => setEditingDish({ ...editingDish, is_todays_special: e.target.checked })}
                    className="w-4 h-4 text-[#D95F0A] rounded accent-[#D95F0A]"
                  />
                  <span>Today's Special</span>
                </label>
              </div>

              {/* MODAL BUTTONS */}
              <div className="pt-4 border-t border-[#DDD6C8] flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    stopLiveCamera();
                    setIsModalOpen(false);
                  }}
                  className="flex-1 py-3 bg-white hover:bg-[#F0E8D8] text-[#1F2933] border border-[#9F988A] font-extrabold rounded-2xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#D95F0A] hover:bg-[#B94D00] text-white font-extrabold rounded-2xl border border-[#B94D00] shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Dish</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
