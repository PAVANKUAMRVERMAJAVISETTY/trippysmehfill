import React, { useState, useRef } from 'react';
import { GalleryItem } from '../../types';
import { Image, Camera, Upload, Trash2, Edit2, Check, Plus, Eye, Sparkles, X, Loader2 } from 'lucide-react';
import { storageService } from '../../services/supabase/storage';


interface GalleryViewProps {
  galleryItems: GalleryItem[];
  onAddGalleryItem: (item: GalleryItem) => void;
  onUpdateGalleryItem: (item: GalleryItem) => void;
  onDeleteGalleryItem: (id: string) => void;
}

export const GalleryView: React.FC<GalleryViewProps> = ({
  galleryItems,
  onAddGalleryItem,
  onUpdateGalleryItem,
  onDeleteGalleryItem
}) => {
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCaption, setEditCaption] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const editFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isEditUploading, setIsEditUploading] = useState(false);

  const handleEditFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsEditUploading(true);
    try {
      const publicUrl = await storageService.uploadAsset(file, 'gallery');
      setEditImageUrl(publicUrl);
    } catch (err: any) {
      alert('Image upload failed: ' + err.message);
    } finally {
      setIsEditUploading(false);
    }
  };

  // Camera capture modal state
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // Uploading state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadErr(null);
    try {
      const publicUrl = await storageService.uploadAsset(file, 'gallery');
      setImageUrl(publicUrl);
    } catch (err: any) {
      console.error('Gallery image upload failed:', err);
      setUploadErr('Upload failed: ' + (err.message || 'Storage error'));
    } finally {
      setIsUploading(false);
    }
  };

  const startLiveCamera = async () => {
    try {
      setIsCameraOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Live camera access failed, falling back to camera file input:', err);
      if (cameraInputRef.current) {
        cameraInputRef.current.click();
      }
    }
  };

  const captureCameraPhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          const file = new File([blob], `gallery_camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
          setIsUploading(true);
          setUploadErr(null);
          try {
            const publicUrl = await storageService.uploadAsset(file, 'gallery');
            setImageUrl(publicUrl);
          } catch (err: any) {
            console.error('Camera photo upload failed:', err);
            setUploadErr('Photo upload failed: ' + err.message);
          } finally {
            setIsUploading(false);
            stopCamera();
          }
        }, 'image/jpeg', 0.85);
      }
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl) {
      alert('Please select or capture an image for the gallery.');
      return;
    }

    try {
      await onAddGalleryItem({
        id: '',
        title: title.trim() || 'Trippy Mehfill Gallery Item',
        caption: caption.trim() || 'Delicious moments at Trippy Mehfill',
        image_url: imageUrl,
        created_at: ''
      });
      setTitle('');
      setCaption('');
      setImageUrl('');
    } catch (err: any) {
      alert('Failed to publish gallery image: ' + (err.message || 'Database error'));
    }
  };

  const saveEdit = async (item: GalleryItem) => {
    if (!editTitle.trim()) {
      alert('Title cannot be empty.');
      return;
    }

    const newImageUrl = editImageUrl.trim() || item.image_url;
    const oldImageUrl = item.image_url;

    try {
      await onUpdateGalleryItem({
        ...item,
        title: editTitle.trim(),
        caption: editCaption.trim(),
        image_url: newImageUrl
      });

      setEditingId(null);

      // If image URL changed, clean up old storage object safely after successful DB update
      if (newImageUrl !== oldImageUrl && oldImageUrl) {
        storageService.deleteAssetByUrl(oldImageUrl).catch(err => {
          console.warn('Old storage image cleanup notice:', err);
        });
      }
    } catch (err: any) {
      console.error('Gallery item save edit failed:', err);
      alert('Update Failed: ' + (err.message || 'Failed to update database row.'));
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-7xl mx-auto space-y-8 text-[#1F2933]" style={{ backgroundColor: '#F4F1EA' }}>
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#252525] font-serif tracking-wide flex items-center gap-2">
            <Image className="w-7 h-7 text-[#B8862D]" />
            <span>Gallery Management</span>
          </h1>
          <p className="text-xs text-[#5F6368] mt-0.5">
            Manage public landing page image gallery with local upload & camera capture. Real-time updates.
          </p>
        </div>

        <div className="bg-white border border-[#DDD6C8] px-4 py-2 rounded-2xl flex items-center gap-2 text-xs shadow-sm">
          <Sparkles className="w-4 h-4 text-[#B8862D]" />
          <span className="text-[#5F6368]">Total Gallery Photos:</span>
          <span className="text-[#1F2933] font-extrabold text-sm">{galleryItems.length}</span>
        </div>
      </div>

      {/* Add New Gallery Image Panel */}
      <div className="bg-white p-6 rounded-2xl border border-[#DDD6C8] shadow-sm space-y-5">
        <h2 className="text-sm font-bold text-[#1F2933] font-serif flex items-center gap-2">
          <Plus className="w-4 h-4 text-[#D95F0A]" />
          <span>Upload New Gallery Image</span>
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Image Pick / Camera Capture */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-[#1F2933]">Image Source</label>
              
              {imageUrl ? (
                <div className="relative group rounded-xl overflow-hidden border border-[#DDD6C8] bg-[#F7F4EC] aspect-video">
                  <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:text-[#922B21] cursor-pointer"
                    title="Remove Image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-[#9F988A] rounded-2xl p-5 text-center bg-[#F8F6F0] space-y-3">
                  <div className="flex justify-center gap-3">
                    {/* Local File Selector */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2.5 bg-white border border-[#9F988A] hover:bg-[#F0E8D8] text-[#1F2933] font-bold text-xs rounded-xl flex items-center gap-2 transition cursor-pointer"
                    >
                      <Upload className="w-4 h-4 text-[#B8862D]" />
                      <span>Choose File</span>
                    </button>

                    {/* Camera Capture */}
                    <button
                      type="button"
                      onClick={startLiveCamera}
                      className="px-4 py-2.5 bg-[#D95F0A] hover:bg-[#B94D00] text-white font-extrabold text-xs rounded-xl flex items-center gap-2 shadow-sm border border-[#B94D00] transition cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Capture Photo</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-[#5F6368]">
                    Supports JPG, PNG, WEBP from file gallery or live camera feed.
                  </p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              )}

              {/* URL Direct Fallback */}
              <div>
                <input
                  type="url"
                  placeholder="Or paste external image URL..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F6F0] border border-[#9F988A] rounded-xl text-xs text-[#1F2933] placeholder-[#6B6B63] outline-none focus:border-[#D95F0A]"
                />
              </div>
            </div>

            {/* Right Column: Title and Caption */}
            <div className="lg:col-span-2 space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#1F2933] mb-1">Title / Dish Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Special Hyderabadi Dum Handi Biryani"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="w-full p-2.5 bg-[#F8F6F0] border border-[#9F988A] rounded-xl text-xs text-[#1F2933] placeholder-[#6B6B63] outline-none focus:border-[#D95F0A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1F2933] mb-1">Caption / Description</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Prepared with authentic spices, slow cooked on dum."
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F6F0] border border-[#9F988A] rounded-xl text-xs text-[#1F2933] placeholder-[#6B6B63] outline-none focus:border-[#D95F0A]"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="py-3 px-6 bg-[#D95F0A] hover:bg-[#B94D00] text-white font-extrabold rounded-xl shadow-sm border border-[#B94D00] transition flex items-center justify-center gap-2 text-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Publish to Gallery</span>
                </button>
              </div>
            </div>

          </div>
        </form>
      </div>

      {/* Live Camera Stream Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-5 max-w-lg w-full border border-[#DDD6C8] space-y-4 text-center text-[#1F2933] shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#DDD6C8] pb-3">
              <h3 className="font-bold text-[#1F2933] text-sm flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#D95F0A]" />
                <span>Live Camera Photo Capture</span>
              </h3>
              <button onClick={stopCamera} className="text-[#5F6368] hover:text-[#1F2933] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video border border-[#DDD6C8]">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <canvas ref={canvasRef} className="hidden" />
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={captureCameraPhoto}
                className="py-2.5 px-6 bg-[#D95F0A] hover:bg-[#B94D00] text-white font-extrabold rounded-xl shadow-sm border border-[#B94D00] transition flex items-center gap-2 text-xs cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Snap Photo</span>
              </button>

              <button
                type="button"
                onClick={stopCamera}
                className="py-2.5 px-4 bg-white border border-[#9F988A] text-[#1F2933] font-bold rounded-xl text-xs hover:bg-[#F0E8D8] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Existing Gallery Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-[#1F2933] font-serif tracking-wide">
          Live Public Gallery Grid ({galleryItems.length})
        </h2>

        {galleryItems.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-[#DDD6C8] shadow-sm">
            <Image className="w-12 h-12 text-[#5F6368] mx-auto mb-2" />
            <p className="text-[#1F2933] font-bold">No gallery images published yet.</p>
            <p className="text-xs text-[#5F6368] mt-1">Upload photos above to display them on the public gallery.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {galleryItems.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl overflow-hidden border border-[#DDD6C8] hover:border-[#B8862D] shadow-sm transition flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-video overflow-hidden bg-[#F7F4EC]">
                    <img
                      src={editingId === item.id ? (editImageUrl || item.image_url) : item.image_url}
                      alt={item.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                  </div>

                  <div className="p-4 space-y-2">
                    {editingId === item.id ? (
                      <div className="space-y-2 text-xs">
                        <label className="block text-[10px] font-bold uppercase text-[#5F6368]">Replace Image</label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="url"
                            placeholder="Image URL..."
                            value={editImageUrl}
                            onChange={(e) => setEditImageUrl(e.target.value)}
                            className="w-full p-2 bg-[#F8F6F0] border border-[#B8862D] rounded-lg text-xs text-[#1F2933]"
                          />
                          <label className="px-2.5 py-2 bg-white border border-[#B8862D] rounded-lg font-bold cursor-pointer hover:bg-[#F0E8D8] text-[#1F2933] shrink-0 text-[10px] flex items-center gap-1">
                            <Upload className="w-3 h-3" />
                            <span>{isEditUploading ? '...' : 'Upload'}</span>
                            <input type="file" accept="image/*" onChange={handleEditFileUpload} className="hidden" />
                          </label>
                        </div>
                        <input
                          type="text"
                          placeholder="Title / Dish Name"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full p-2 bg-[#F8F6F0] border border-[#B8862D] rounded-lg text-xs text-[#1F2933]"
                        />
                        <textarea
                          rows={2}
                          placeholder="Caption..."
                          value={editCaption}
                          onChange={(e) => setEditCaption(e.target.value)}
                          className="w-full p-2 bg-[#F8F6F0] border border-[#B8862D] rounded-lg text-xs text-[#1F2933]"
                        />
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => saveEdit(item)}
                            className="flex-1 py-1.5 bg-[#B8862D] hover:bg-[#966b20] text-white font-extrabold text-xs rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" /> Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-[#1F2933] font-bold text-xs rounded-lg cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h3 className="font-bold text-[#1F2933] text-sm">{item.title}</h3>
                        {item.caption && <p className="text-xs text-[#5F6368] line-clamp-2">{item.caption}</p>}
                      </>
                    )}
                  </div>
                </div>

                <div className="p-4 pt-0 flex items-center justify-between border-t border-[#DDD6C8] text-xs text-[#5F6368] mt-2">
                  <span>{item.created_at}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingId(item.id);
                        setEditTitle(item.title);
                        setEditCaption(item.caption || '');
                        setEditImageUrl(item.image_url || '');
                      }}
                      className="p-1.5 rounded-lg bg-white text-[#1F2933] hover:text-[#D95F0A] border border-[#9F988A] cursor-pointer"
                      title="Edit Title / Caption / Image"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm(`Delete "${item.title}" from gallery?`)) {
                          try {
                            await onDeleteGalleryItem(item.id);
                            if (item.image_url) {
                              storageService.deleteAssetByUrl(item.image_url).catch(err => {
                                console.warn('Gallery storage cleanup notice:', err);
                              });
                            }
                          } catch (err: any) {
                            console.error('Gallery item database delete error:', err);
                            alert('Delete Failed: ' + (err.message || 'Database error'));
                          }
                        }
                      }}
                      className="p-1.5 rounded-lg bg-white text-[#1F2933] hover:text-[#922B21] border border-[#9F988A] cursor-pointer"
                      title="Delete Image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
