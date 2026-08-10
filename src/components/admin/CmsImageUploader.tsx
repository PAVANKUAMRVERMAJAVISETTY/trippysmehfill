import React, { useState } from 'react';
import { Upload, Trash2, RefreshCw, Image as ImageIcon, AlertCircle, CheckCircle2 } from 'lucide-react';
import { storageService } from '../../services/supabase/storage';

interface CmsImageUploaderProps {
  label: string;
  currentImageUrl?: string | null;
  category?: string;
  onImageSaved: (newUrl: string | null) => Promise<void>;
}

export const CmsImageUploader: React.FC<CmsImageUploaderProps> = ({
  label,
  currentImageUrl,
  category = 'website',
  onImageSaved,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    // Validate format
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setErrorMessage('Unsupported file format. Please upload JPG, PNG, or WEBP.');
      return;
    }

    // Validate size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('File size exceeds 5MB. Please choose a smaller image.');
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleUploadAndSave = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const oldUrl = currentImageUrl;

    try {
      // Step 1: Upload new image to Supabase Storage first
      const newUrl = await storageService.uploadAsset(selectedFile, category);

      if (!newUrl) {
        throw new Error('Failed to generate public URL for uploaded image.');
      }

      // Step 2: Update parent state & save to database
      await onImageSaved(newUrl);

      // Step 3: Only after database save succeeds, remove old asset if it's managed storage
      if (oldUrl && oldUrl !== newUrl && oldUrl.includes('supabase.co')) {
        await storageService.deleteAssetByUrl(oldUrl);
      }

      setSelectedFile(null);
      setPreviewUrl(null);
      setSuccessMessage('Image uploaded and saved successfully!');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Image upload failed:', err);
      setErrorMessage(err.message || 'Image upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!confirm(`Are you sure you want to remove the image for ${label}?`)) return;

    setIsUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const oldUrl = currentImageUrl;

    try {
      await onImageSaved(null);

      if (oldUrl && oldUrl.includes('supabase.co')) {
        await storageService.deleteAssetByUrl(oldUrl);
      }

      setSelectedFile(null);
      setPreviewUrl(null);
      setSuccessMessage('Image removed successfully.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Failed to remove image:', err);
      setErrorMessage(err.message || 'Failed to remove image.');
    } finally {
      setIsUploading(false);
    }
  };

  const displayUrl = previewUrl || currentImageUrl;

  return (
    <div className="bg-[#1A1A1A] border border-[#C5A059]/20 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-[#F7F2E8] font-medium text-sm flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-[#C5A059]" />
          {label}
        </label>
        {displayUrl && (
          <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
            Active Image
          </span>
        )}
      </div>

      {/* Image Preview Area */}
      <div className="relative w-full h-48 bg-[#121212] border border-[#C5A059]/30 rounded-lg overflow-hidden flex items-center justify-center group">
        {displayUrl ? (
          <img
            src={displayUrl}
            alt={label}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="text-center p-6 text-[#F7F2E8]/40 space-y-2">
            <ImageIcon className="w-10 h-10 mx-auto stroke-1" />
            <p className="text-xs">No image uploaded yet</p>
          </div>
        )}
      </div>

      {/* Error / Success Messages */}
      {errorMessage && (
        <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-300 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Action Controls */}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <label className="cursor-pointer flex-1 min-w-[140px] px-4 py-2.5 bg-[#242424] hover:bg-[#2A2A2A] border border-[#C5A059]/40 text-[#F7F2E8] text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors">
          <Upload className="w-4 h-4 text-[#C5A059]" />
          {displayUrl ? 'Replace Photo' : 'Upload New Photo'}
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
            disabled={isUploading}
          />
        </label>

        {selectedFile && (
          <button
            type="button"
            onClick={handleUploadAndSave}
            disabled={isUploading}
            className="px-4 py-2.5 bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:from-[#B38F48] hover:to-[#C5A059] text-black text-xs font-bold rounded-lg flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {isUploading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            Save Uploaded Photo
          </button>
        )}

        {currentImageUrl && !selectedFile && (
          <button
            type="button"
            onClick={handleRemoveImage}
            disabled={isUploading}
            className="px-3 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            Remove
          </button>
        )}
      </div>
      <p className="text-[11px] text-[#F7F2E8]/40">
        Accepted: JPG, PNG, WEBP (Max 5MB). High contrast, unblurred food/venue photos recommended.
      </p>
    </div>
  );
};
