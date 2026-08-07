import React, { useState, useRef } from 'react';
import { MenuItem } from '../../types';
import { formatCurrency } from '../../lib/format';
import {
  Plus,
  Edit3,
  Trash2,
  X,
  Check,
  Upload,
  Image as ImageIcon,
  Camera,
  FileImage,
  Sparkles,
  RefreshCw,
  Flame,
  CheckCircle2
} from 'lucide-react';

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
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // Quick preset food images
  const sampleFoodImages = [
    { label: 'Biryani', url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&q=80' },
    { label: 'Kebab Starter', url: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&q=80' },
    { label: 'Chicken Curry', url: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&q=80' },
    { label: 'Dosa / Tiffin', url: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=500&q=80' },
    { label: 'Paneer Tikka', url: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=500&q=80' },
    { label: 'Beverage / Lassi', url: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=500&q=80' }
  ];

  const handleOpenAdd = () => {
    setEditingDish({
      id: 'm-' + Date.now(),
      name: '',
      description: '',
      price: 100,
      category: 'Biryani',
      image_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&q=80',
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

  // Process selected image file (from Camera or Gallery input)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        if (result && editingDish) {
          setEditingDish({ ...editingDish, image_url: result });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Start Live Camera Stream
  const startLiveCamera = async () => {
    setCameraError(null);
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
      setCameraError('Live camera preview not supported in this iframe. Opening native device camera...');
      stopLiveCamera();
      // Fallback directly to native camera file picker
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

  // Snap photo from live camera canvas
  const capturePhotoFromStream = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      if (editingDish) {
        setEditingDish({ ...editingDish, image_url: dataUrl });
      }
      stopLiveCamera();
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDish || !editingDish.name) return;
    stopLiveCamera();
    onSaveDish(editingDish as MenuItem);
    setIsModalOpen(false);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 font-serif">Menu & Dishes Manager</h1>
          <p className="text-xs text-gray-500">
            Add new dishes, upload photos from your device gallery or camera, and manage prices.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-extrabold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Dish</span>
        </button>
      </div>

      {/* Menu Dish Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {menuItems.map((dish) => (
          <div
            key={dish.id}
            className="bg-white rounded-2xl p-5 border border-orange-100 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition relative group"
          >
            <div>
              <div className="flex gap-3 mb-2">
                
                {/* Dish Thumbnail with Quick Image Edit Badge */}
                <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-gray-200 shadow-sm group/img">
                  <img
                    src={dish.image_url}
                    alt={dish.name}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => {
                      handleOpenEdit(dish);
                    }}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition flex flex-col items-center justify-center text-white text-[9px] font-bold gap-0.5"
                    title="Change Photo"
                  >
                    <Camera className="w-4 h-4 text-orange-400" />
                    <span>Change</span>
                  </button>
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                      dish.is_veg ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {dish.is_veg ? 'VEG' : 'NON VEG'}
                    </span>
                    <span className="text-base font-black text-gray-900">{formatCurrency(dish.price)}</span>
                  </div>
                  <h3 className="font-extrabold text-gray-900 text-sm line-clamp-1">{dish.name}</h3>
                  <p className="text-xs text-gray-500 line-clamp-2 mt-1">{dish.description}</p>
                </div>
              </div>

              {/* Toggles Bar */}
              <div className="pt-3 border-t border-gray-100 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-700">Available</span>
                  <button
                    onClick={() => onToggleAvailable(dish.id)}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                      dish.is_available ? 'bg-emerald-500 justify-end' : 'bg-gray-300 justify-start'
                    }`}
                  >
                    <span className="bg-white w-4 h-4 rounded-full shadow-md" />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-700">Today's special</span>
                  <button
                    onClick={() => onToggleSpecial(dish.id)}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                      dish.is_todays_special ? 'bg-orange-600 justify-end' : 'bg-gray-300 justify-start'
                    }`}
                  >
                    <span className="bg-white w-4 h-4 rounded-full shadow-md" />
                  </button>
                </div>
              </div>
            </div>

            {/* Card Footer Actions */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => handleOpenEdit(dish)}
                className="py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
              >
                <Edit3 className="w-3.5 h-3.5 text-orange-600" />
                <span>Edit Dish</span>
              </button>
              <button
                onClick={() => onDeleteDish(dish.id)}
                className="py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit / Add Dish Modal with Camera & Gallery Upload */}
      {isModalOpen && editingDish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-orange-100 my-auto">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-orange-50/50">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-orange-600" />
                <h2 className="text-lg font-extrabold text-gray-900 font-serif">
                  {editingDish.id?.startsWith('m-') ? 'Add New Dish' : 'Edit Dish Details'}
                </h2>
              </div>
              <button
                onClick={() => {
                  stopLiveCamera();
                  setIsModalOpen(false);
                }}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-200/50 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleFormSubmit} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              
              {/* IMAGE UPLOAD SECTION (CAMERA & GALLERY) */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-orange-200/80 space-y-3">
                <label className="font-extrabold text-gray-900 text-xs flex items-center justify-between">
                  <span>Dish Photo & Media</span>
                  <span className="text-[10px] text-orange-600 font-bold uppercase">Camera or Gallery</span>
                </label>

                {/* Live Camera Viewfinder Overlay if Active */}
                {isCameraActive ? (
                  <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex flex-col items-center justify-center border-2 border-orange-500 shadow-xl">
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
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold rounded-xl shadow-lg flex items-center gap-1.5 text-xs"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Snap Photo</span>
                      </button>
                      <button
                        type="button"
                        onClick={stopLiveCamera}
                        className="px-3 py-2 bg-gray-900/80 hover:bg-black text-white font-bold rounded-xl text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Current Image Preview & Dual Buttons */
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="relative w-28 h-28 rounded-2xl overflow-hidden border-2 border-orange-300 bg-gray-200 shrink-0 shadow-md">
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
                      <p className="text-[11px] text-gray-500">
                        Upload high quality dish photo using your camera or phone gallery.
                      </p>

                      <div className="grid grid-cols-2 gap-2">
                        {/* CAMERA BUTTON */}
                        <button
                          type="button"
                          onClick={() => {
                            if (cameraInputRef.current) {
                              cameraInputRef.current.click();
                            }
                          }}
                          className="py-2.5 px-3 bg-orange-600 hover:bg-orange-700 text-white font-extrabold rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-orange-600/20 transition text-xs"
                        >
                          <Camera className="w-4 h-4" />
                          <span>Take Photo</span>
                        </button>

                        {/* GALLERY BUTTON */}
                        <button
                          type="button"
                          onClick={() => {
                            if (galleryInputRef.current) {
                              galleryInputRef.current.click();
                            }
                          }}
                          className="py-2.5 px-3 bg-gray-900 hover:bg-black text-white font-extrabold rounded-xl flex items-center justify-center gap-1.5 shadow-md transition text-xs"
                        >
                          <FileImage className="w-4 h-4 text-orange-400" />
                          <span>Choose Gallery</span>
                        </button>
                      </div>

                      {/* Live Viewfinder Secondary Trigger */}
                      <button
                        type="button"
                        onClick={startLiveCamera}
                        className="w-full py-1.5 bg-orange-100 hover:bg-orange-200 text-orange-800 font-bold rounded-lg text-[11px] flex items-center justify-center gap-1 transition"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-orange-600" />
                        <span>Open Live Web Cam Viewfinder</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Preset Photo Library Quick Selector */}
                <div className="pt-2 border-t border-gray-200">
                  <span className="text-[10px] font-extrabold text-gray-600 uppercase block mb-1.5">
                    Or pick sample food photo:
                  </span>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {sampleFoodImages.map((sample, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setEditingDish({ ...editingDish, image_url: sample.url })}
                        className={`relative shrink-0 w-12 h-12 rounded-xl overflow-hidden border-2 transition ${
                          editingDish.image_url === sample.url ? 'border-orange-600 scale-105 shadow-md' : 'border-gray-200 opacity-60 hover:opacity-100'
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
                  <label className="font-bold text-gray-600 text-[10px] block mb-1">
                    Or custom Image URL string:
                  </label>
                  <input
                    type="text"
                    value={editingDish.image_url || ''}
                    onChange={(e) => setEditingDish({ ...editingDish, image_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full p-2 bg-white border border-gray-200 rounded-xl outline-none focus:border-orange-500 font-mono text-[11px]"
                  />
                </div>
              </div>

              {/* NAME */}
              <div>
                <label className="font-extrabold text-gray-700 block mb-1">Dish Name</label>
                <input
                  type="text"
                  value={editingDish.name || ''}
                  onChange={(e) => setEditingDish({ ...editingDish, name: e.target.value })}
                  placeholder="e.g. Special Hyderabadi Dum Biryani"
                  required
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-orange-500 text-xs font-bold"
                />
              </div>

              {/* DESCRIPTION */}
              <div>
                <label className="font-extrabold text-gray-700 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingDish.description || ''}
                  onChange={(e) => setEditingDish({ ...editingDish, description: e.target.value })}
                  placeholder="Aromatic basmati rice cooked with authentic spices..."
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-orange-500 text-xs"
                />
              </div>

              {/* PRICE & CATEGORY */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-gray-700 block mb-1">Price (₹)</label>
                  <input
                    type="number"
                    value={editingDish.price || 0}
                    onChange={(e) => setEditingDish({ ...editingDish, price: Number(e.target.value) })}
                    required
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-orange-500 font-mono text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="font-extrabold text-gray-700 block mb-1">Category</label>
                  <select
                    value={editingDish.category || 'Biryani'}
                    onChange={(e) => setEditingDish({ ...editingDish, category: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-orange-500 text-xs font-bold"
                  >
                    <option value="Biryani">Biryani</option>
                    <option value="South Indian">South Indian</option>
                    <option value="Veg">Veg</option>
                    <option value="Non-Veg">Non-Veg</option>
                    <option value="Pizza">Pizza</option>
                    <option value="Desserts">Desserts</option>
                  </select>
                </div>
              </div>

              {/* CHECKBOXES */}
              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 font-bold text-gray-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingDish.is_veg || false}
                    onChange={(e) => setEditingDish({ ...editingDish, is_veg: e.target.checked })}
                    className="w-4 h-4 text-orange-600 rounded accent-orange-600"
                  />
                  <span>Vegetarian Dish</span>
                </label>

                <label className="flex items-center gap-2 font-bold text-gray-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingDish.is_todays_special || false}
                    onChange={(e) => setEditingDish({ ...editingDish, is_todays_special: e.target.checked })}
                    className="w-4 h-4 text-orange-600 rounded accent-orange-600"
                  />
                  <span>Today's Special</span>
                </label>
              </div>

              {/* MODAL BUTTONS */}
              <div className="pt-4 border-t border-gray-100 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    stopLiveCamera();
                    setIsModalOpen(false);
                  }}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-extrabold rounded-2xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white font-extrabold rounded-2xl shadow-lg shadow-orange-600/30 transition flex items-center justify-center gap-1.5"
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
