# Supabase Storage Setup & Asset Management

Storage configuration guide for **Trippy's Mehfill**.

---

## 1. Storage Bucket Creation

1. Open Supabase Dashboard $\rightarrow$ **Storage**.
2. Click **New Bucket**.
3. Bucket Name: `restaurant-assets`.
4. Toggle **Public Bucket** to `ON` (enables public image URLs).

---

## 2. Bucket RLS Policies

Execute in Supabase SQL Editor:

```sql
-- Allow public access to view images
CREATE POLICY "Public Read Assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'restaurant-assets');

-- Allow authenticated admins and staff to upload images
CREATE POLICY "Staff Upload Assets" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'restaurant-assets'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin'::user_role, 'staff'::user_role)
    )
  );

-- Allow authenticated admins to delete images
CREATE POLICY "Admin Delete Assets" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'restaurant-assets'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'::user_role
    )
  );
```

---

## 3. Storage API Service

Implemented in [`src/services/supabase/storage.ts`](../src/services/supabase/storage.ts):

```typescript
import { storageService } from './services/supabase';

// Upload image file and get permanent public URL
const publicUrl = await storageService.uploadAsset(file, 'menu');
```

Used by:
- `MenuManagerView` (Food dish photos)
- `GalleryView` (Food showcase photos)
- `SettingsView` (Restaurant logo & banners)
